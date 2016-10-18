saytime
===

Saytime generates an audio file from provided text using the macOS `say` command.
In addition, it provides the timestamp and duration for each spoken sentence along with the text of each sentence.

That allows the output to be used for synchronized playback testing and video subtitle rendering verification.

# Compatibility

saytime requires:
* macOS with `say`
* Node 6+
* ffmpeg (providing the `ffmpeg` and `ffprobe` commands)

# Usage

See the `examples` directory for more.

```javascript
const saytime = require('saytime');
saytime(`
There once was a young lady named bright
Whose speed was much faster than light
She set out one day
In a relative way
And returned on the previous night.
`, { out: 'output.wav' }, (err, result) => {
  if (!err) {
    console.log('RESULT', result);
  }
});
```

Output:
```
RESULT { output: 'output.wav',
  parts:
   [ { duration: 2.341688,
       sentence: 'There once was a young lady named bright' },
     { duration: 2.406938,
       sentence: 'Whose speed was much faster than light' },
     { duration: 1.473625, sentence: 'She set out one day' },
     { duration: 1.162188, sentence: 'In a relative way' },
     { duration: 2.002438,
       sentence: 'And returned on the previous night.' } ] }
```
