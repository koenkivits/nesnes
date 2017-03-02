import fs from 'fs';

/**
 * Wrapper around fs.readFile to make it easily replaceble by Browserify and to
 * handle converting to an ArrayBuffer in a single place.
 */
function readFile(filename, callback) {
  fs.readFile(filename, (err, data) => {
    if (err) {
      throw err;
    }

    const buffer = new Uint8Array(data).buffer;
    callback(buffer);
  });
}

export default {
  readFile,
};
