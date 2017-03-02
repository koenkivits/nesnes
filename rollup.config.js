import json from 'rollup-plugin-json';

export default {
  entry: 'index.js',
  format: 'iife',
  moduleName: 'NesNes',
  plugins: [json()],
  dest: 'dist/nesnes.js',
};
