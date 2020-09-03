import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import typescript from '@rollup/plugin-typescript';

const defaults = {
  external: [ 'crypto' ],
  output: {
    dir: 'bin',
    format: 'cjs'
  },
  plugins: [
    commonjs(),
    json(),
    nodePolyfills(),
    nodeResolve(),
    typescript({
      allowSyntheticDefaultImports: true,
      moduleResolution: 'node'
    })
  ]
};

export default {
  ...defaults,
  input: 'src/cli.ts'
};
