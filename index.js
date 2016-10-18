const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');

const Async = require('async');
const Nid = require('nid');
const Rimraf = require('rimraf');

const log = console;

/**
 * @param {string} text Words, sentences, etc.
 * @param {object} options
 * @param {string} [options.out] Target wav filename
 * @param {function} cb Callback - invoked with error, result. Result is an object with properties
 *  `output` (the output file path) and `parts`, an array of {sentence, duration} parts in order
 */
module.exports = function(text, options, cb) {
  const opts = options || {};

  let tempDir;

  const finalAudioPath = opts.out || path.join('.', `${Nid(8)}.wav`);

  Async.waterfall([
    createTempDir,
    genSilence,
    splitText,
    renderParts,
    makePlaylist,
    assembleAudio,
    processResult,
    cleanTempDir
  ], cb);

  function splitText(cb) {
    cb(null, text.match(/\(?[^\.\?\!\n]+[\.!\?\n]\)?/g).map(part => part.trim()).filter(part => !!part.length));
  }

  /**
   * @param <array.{object}> parts containing filePath, duration
   */
  function makePlaylist(parts, done) {
    const listFilePath = path.join(tempDir, 'list.txt');
    const listStream = fs.createWriteStream(listFilePath);
    const gapPath = path.join(tempDir, 'gap.wav');
    Async.eachSeries(parts, (part, cb) => {
      listStream.write(`file '${part.filePath}\nfile '${gapPath}'\n`, 'UTF-8', cb);
    }, (err, cb) => {
      if (err) {
        return done(err);
      }
      listStream.end();
      done(null, parts, listFilePath);
    });
  }

  function assembleAudio(parts, listFilePath, done) {
    const assembledAudioPath = path.join(tempDir, 'assembled.wav');
    childProcess.execFile('ffmpeg', [ '-f', 'concat', '-i', listFilePath, '-c', 'copy', assembledAudioPath ], (error, stdout, stderr) => {
      if (error) {
        return cb(error);
      }
      return done(null, parts, assembledAudioPath);
    });
  }

  function processResult(parts, assembledAudioPath, done) {
    fs.rename(assembledAudioPath, finalAudioPath, err => {
      if (err) {
        return done(err);
      }
      return done(null, {
        output: finalAudioPath,
        parts: parts.map(part => ({
          duration: part.duration,
          sentence: part.sentence
        }))
      });
    });
  }

  /**
   * Render an array of sentences to audio
   */
  function renderParts(parts, cb) {
    Async.mapValuesLimit(parts, 10, saySentence, (err, partsObj) => {
      if (err) {
        return cb(err);
      }
      // Deal with array-ish-like object output of mapValues
      return cb(null, Array.from(Object.assign(partsObj, { length: parts.length })));
    });
  }

  function saySentence(sentence, id, cb) {
    const filePath = path.join(tempDir, `${id}.wav`);
    const say = childProcess.spawn('say', [sentence, '-o', filePath, '--data-format', 'LEF32@16000']);
    say.on('close', code => {
      if (code) {
        return cb(new Error(code));
      }
      fetchDuration(filePath, (err, duration) => {
        cb(err, { sentence, filePath, duration });
      });
    });
  }

  function fetchDuration(filePath, cb) {
    childProcess.execFile('ffprobe', [ '-i', filePath, '-show_entries', 'format=duration', '-v', 'quiet', '-of', 'csv=p=0' ], (error, stdout, stderr) => {
      if (error) {
        return cb(error);
      }
      return cb(null, parseFloat(stdout.trim()));
    });
  }

  function createTempDir(cb) {
    fs.mkdtemp('/tmp/saytime-', (err, dir) => {
      tempDir = dir;
      cb(err);
    });
  }

  /**
   * Generate a silence audio file for inter-sentence pauses
   */
  function genSilence(cb) {
    childProcess.execFile('ffmpeg', [ '-f', 'lavfi', '-i', 'anullsrc=sample_rate=16000', '-t', '0.5', path.join(tempDir, 'gap.wav') ], error => cb(error));
  }

  function cleanTempDir(result, cb) {
    Rimraf(tempDir, err => cb(err, result));
  }
}
