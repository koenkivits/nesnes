function readFile(filename, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', filename);
  xhr.responseType = 'arraybuffer';

  xhr.onload = () => {
    callback(xhr.response);
  };

  xhr.onerror = (e) => {
    throw e;
  };

  xhr.send(null);
}

export default {
  readFile,
};
