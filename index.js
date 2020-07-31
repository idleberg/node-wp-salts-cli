#!/usr/bin/env node

const pkg = require('./package.json');
const updateNotifier = require('update-notifier');
const { resolve } = require('path');

/**
 * The TypeScript compiler does not support she-bangs,
 * so we need this stupid workaround 🙄
 */

require(resolve(__dirname, 'bin/cli.js'));
updateNotifier({
  pkg
}).notify();
