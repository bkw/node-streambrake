/*global describe: true, it: true */
'use strict';

var StreamBrake = require(__dirname + '/../index.js'),
    should = require('chai').should();


describe('StreamBrake', function () {
    describe('1000 Bps stream', function () {
        var streamBrake = new StreamBrake(1000, 5);

        it('should return false when consuming 1001 bytes', function () {
            streamBrake.write(new Buffer(1001)).should.eql(false);
        });

        it('should have written 2000 bytes after 2 seconds', function (done) {
            var fs = require('fs'), bytesEmitted = 0;
            this.timeout(1010);

            streamBrake = new StreamBrake(1000, 5);
            streamBrake.on('data', function (data) {
                bytesEmitted += data.length;
            });
            fs.createReadStream('/dev/zero').pipe(streamBrake);

            setTimeout(function () {
                bytesEmitted.should.equal(1000);
                done();
            }, 1000);
        });
    });

    describe('stream-spec', function () {
        it('should buffer on pause', function (done) {
            var spec = require('stream-spec'),
                tester = require('stream-tester'),
                streamBrake = new StreamBrake(20000),
                specTester = spec(streamBrake);

            this.timeout(4000);

            specTester.duplex({strict: true});
            setTimeout(function () {
                specTester.validate();
                done();
            }, 3000);

            tester.createRandomStream(
                function () { return 'line ' +  Math.random(); },
                100
            ).pipe(streamBrake).pipe(tester.createPauseStream());
        });
    });
});
