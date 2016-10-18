const saytime = require('..');
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
