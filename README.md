# node-streambrake

A Node.js stream you can insert into a stream pipe to limit its throughput.
Throughput is measured by overlapping sliding windows and buffered it the limit
is exceeded. Also backpressure is used to throttle the writer.

## Install

```bash
npm install streambrake
```

## Usage

```js
var StreamBrake = require('streambrake'),
    fs = require('fs');

fs.createReadStream('/dev/random')
    .pipe(new StreamBrake(128000))
    .pipe(fs.createWriteStream('slowRandom'));
```

## API

### constructor(bytesPerSecond, [measurementsPerSecond])

Creates a readable and writable stream which will emit no more
than `bytesPerSecond` bytes per second.

`measurementsPerSecond` is an optional value of how often per second
to measure throughput and emit queued data. Default is 5.


