const sayTime = require('..');

sayTime('Hello. How are you?', null, (err, result) => {
  console.log('Done', result);
});
