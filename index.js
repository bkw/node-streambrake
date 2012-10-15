'use strict';

var util   = require('util')
  , Stream = require('stream').Stream
  , Buffy = require('buffy')
  , StreamBrake
  ;


StreamBrake = function (bps, numBuckets) {
    var that = this, i;
    Stream.call(this);

    this.numBuckets = numBuckets || 5;
    this.readable = true;
    this.writable = true;

    this.limit = bps;

    this.buckets = new Array(this.numBuckets);
    for (i = 0; i < this.numBuckets; ++i) {
        this.buckets[i] = 0;
    }

    this.buffer = Buffy.createReader();
    this.paused = false;
    this.relaser = null;
    this.endSoon = false;
};
util.inherits(StreamBrake, Stream);


StreamBrake.prototype.write = function (inBuffer) {
    var that = this,
        headRoom, i,
        err;

    // borrowed from substack's node-brake, which is the twin we didn't know of
    if (!this.writable) {
        err = new Error('stream not writable');
        err.code = 'EPIPE';
        this.emit('error', err);
        return false;
    }

    // start the relase-interval in first write:
    if (! this.releaser) {
        this.releaser = setInterval(function () {
            that.releaseBuffer();
        }, 1000 / that.numBuckets);
    }

    if (this.buffer.bytesAhead()) {
        this.buffer.write(inBuffer);
        return false;
    }

    headRoom = this.limit - this.buckets[0];
    if (headRoom) {
        // send as much as possible, buffer the rest
        if (inBuffer.length > headRoom) {
            this.buffer.write(inBuffer.slice(headRoom));
        }
        return this.send(inBuffer.slice(
            0, Math.min(inBuffer.length, headRoom))
        );
    }
};

StreamBrake.prototype.send = function (buffer) {
    if (this.paused) {
        // pass backpressure from reader to writer
        return false;
    }
    for (var i = 0; i < this.buckets.length; ++i) {
        this.buckets[i] += buffer.length;
    }
    this.emit('data', buffer);
    return this.buckets[0] < this.limit;
};

StreamBrake.prototype.releaseBuffer = function () {
    var toRelease;
    this.buckets = this.buckets.splice(1).concat(0);
    toRelease = Math.min(
        Math.max(0, this.limit - this.buckets[0]),
        this.buffer.bytesAhead()
    );
    if (toRelease) {
        this.send(this.buffer.buffer(toRelease));
    } else {
        if (this.endSoon && ! this.buffer.bytesAhead()) {
            // exit
            this.emit('end');
            this.destroy();
            return;
        }
    }
    if (0 === this.buffer.bytesAhead() && this.buckets[0] < this.limit) {
        this.emit('drain');
    }
};

StreamBrake.prototype.pause = function () {
    this.paused = true;
};

StreamBrake.prototype.resume = function () {
    this.paused = false;
};

StreamBrake.prototype.end = function (input) {
    if (input) {
        this.write(input);
    }
    this.readable = false;
    this.writable = false;
    this.endSoon = true;
};

StreamBrake.prototype.destroy = function () {
    if (this.releaser) {
        clearTimeout(this.releaser);
    }
    this.readable = false;
    this.writable = false;
    this.buckets = null;
    this.buffer = null;
    this.emit('close');
};


module.exports = StreamBrake;

