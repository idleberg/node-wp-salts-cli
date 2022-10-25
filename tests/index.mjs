import { dirname, resolve } from 'node:path';
import { execa } from 'execa';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

const __dirname = resolve(dirname(''));

const CLI_SCRIPT =  resolve(__dirname, 'bin/cli.mjs')
const WORDPRESS_KEYS = [
  'AUTH_KEY',
  'AUTH_SALT',
  'LOGGED_IN_KEY',
  'LOGGED_IN_SALT',
  'NONCE_KEY',
  'NONCE_SALT',
  'SECURE_AUTH_KEY',
  'SECURE_AUTH_SALT'
];

// Tests
test('Default: Key count', async t => {
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json'])).stdout;

  const actual = Object.keys(JSON.parse(jsonOut)).sort();
  const expected = WORDPRESS_KEYS;

  assert.equal(expected, actual);
});

test('Default: Key length (8-bit)', async t => {
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json'])).stdout;
  const salts = JSON.parse(jsonOut);
  let actual = 0;

  Object.keys(salts).sort().forEach( (key, index) => {
    actual += salts[key].length;
  });

  const expected = WORDPRESS_KEYS.length * 64;

  assert.is(expected, actual);
});

test('Default: Key length (16-bit)', async t => {
  const keyLength = 128;
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', `--length=${keyLength}`])).stdout;
  const salts = JSON.parse(jsonOut);

  let actual = 0;

  Object.keys(salts).sort().forEach( (key, index) => {
    actual += salts[key].length;
  });

  const expected = WORDPRESS_KEYS.length * keyLength;

  assert.is(expected, actual);
});

test('Default: Key length below minimum', async t => {
  const keyLength = 32;
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', `--length=${keyLength}`])).stdout;
  const salts = JSON.parse(jsonOut);

  let actual = 0;

  Object.keys(salts).sort().forEach( (key, index) => {
    actual += salts[key].length;
  });

  const expected = 512;

  assert.is(expected, actual);
});

test('Default: Indentation', async t => {
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', '--indent', '7'])).stdout;

  const actual = /\s{7}/g.test(jsonOut);
  const expected = true;

  assert.is(expected, actual);
});

test('Default: Line breaks', async t => {
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', '--ugly', '--break'])).stdout;

  const actual = jsonOut.includes('\n');
  const expected = true;

  assert.is(expected, actual);
});

test('Default: Sort results', async t => {
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', '--sort'])).stdout;
  const salts = JSON.parse(jsonOut);

  const actual = Object.keys(salts).join('|');
  const expected = WORDPRESS_KEYS.join('|');

  assert.is(expected, actual);
});

test('Default: Ugly JSON output', async t => {
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', '--ugly'])).stdout;

  const actual = jsonOut.includes('\n');
  const expected = false;

  assert.is(expected, actual);
});

test('Default: Ugly PHP output', async t => {
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--php', '--ugly'])).stdout;

  const actual = /\s{2,}/.test(jsonOut);
  const expected = false;

  assert.is(expected, actual);
});

test('Custom String: Key count', async t => {
  const defaultKey = 'test';
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', defaultKey])).stdout;

  const actual = Object.keys(JSON.parse(jsonOut)).sort();
  const expected = [ defaultKey ];

  assert.equal(expected, actual);
});

test('Custom String: Key length (8-bit)', async t => {
  const defaultKey = 'test';
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', defaultKey])).stdout;
  const salts = JSON.parse(jsonOut);

  const actual = salts[defaultKey].length;
  const expected = 64;

  assert.is(expected, actual);
});

test('Custom String: Key length (16-bit)', async t => {
  const defaultKey = 'test';
  const keyLength = 128;
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', `--length=${keyLength}`, defaultKey])).stdout;
  const salts = JSON.parse(jsonOut);

  const actual = salts[defaultKey].length;
  const expected = keyLength;

  assert.is(expected, actual);
});

test('Custom String: Key length below minimum', async t => {
  const defaultKey = 'test';
  const keyLength = 32;
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', `--length=${keyLength}`, defaultKey])).stdout;
  const salts = JSON.parse(jsonOut);

  const actual = salts[defaultKey].length;
  const expected = 64;

  assert.is(expected, actual);
});

test('Custom String: Indentation', async t => {
  const defaultKey = 'test';
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', '--indent', '7', defaultKey])).stdout;

  const actual = /\s{7}/g.test(jsonOut);
  const expected = true;

  assert.is(expected, actual);
});

test('Custom String: Line breaks', async t => {
  const defaultKey = 'test';
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', '--ugly', '--break', defaultKey])).stdout;

  const actual = jsonOut.includes('\n');
  const expected = true;

  assert.is(expected, actual);
});

test('Custom String: Ugly JSON output', async t => {
  const defaultKey = 'test';
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', '--ugly', defaultKey])).stdout;

  const actual = jsonOut.includes('\n');
  const expected = false;

  assert.is(expected, actual);
});

test('Custom Array: Key count', async t => {
  const defaultKeys = ['test1', 'test2', 'test3'];
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', ...defaultKeys])).stdout;

  const actual = Object.keys(JSON.parse(jsonOut)).sort();
  const expected = defaultKeys;

  assert.equal(expected, actual);
});

test('Custom Array: Key length (8-bit)', async t => {
  const defaultKeys = ['test1', 'test2', 'test3'];
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', ...defaultKeys])).stdout;
  const salts = JSON.parse(jsonOut);

  let actual = 0;

  defaultKeys.forEach( defaultKey => {
    actual += salts[defaultKey].length
  });

  const expected = defaultKeys.length * 64;

  assert.is(expected, actual);
});

test('Custom Array: Key length (16-bit)', async t => {
  const defaultKeys = ['test1', 'test2', 'test3'];
  const keyLength = 128;
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', `--length=${keyLength}`, ...defaultKeys])).stdout;
  const salts = JSON.parse(jsonOut);

  let actual = 0;

  defaultKeys.forEach( defaultKey => {
    actual += salts[defaultKey].length
  });

  const expected = defaultKeys.length * keyLength;

  assert.is(expected, actual);
});

test('Custom Array: Key length below minimum', async t => {
  const defaultKeys = ['test1', 'test2', 'test3'];
  const keyLength = 32;
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', `--length=${keyLength}`, ...defaultKeys])).stdout;
  const salts = JSON.parse(jsonOut);

  let actual = 0;

  defaultKeys.forEach( defaultKey => {
    actual += salts[defaultKey].length
  });

  const expected = 192;

  assert.is(expected, actual);
});

test('Custom Array: Indentation', async t => {
  const defaultKeys = ['test1', 'test2', 'test3'];
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', '--indent', '7', ...defaultKeys])).stdout;

  const actual = /\s{7}/g.test(jsonOut);
  const expected = true;

  assert.is(expected, actual);
});


test('Custom Array: Line breaks', async t => {
  const defaultKeys = ['test1', 'test2', 'test3'];
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', '--ugly', '--break', ...defaultKeys])).stdout;

  const actual = jsonOut.includes('\n');
  const expected = true;

  assert.is(expected, actual);
});

test('Custom Array: Sort results', async t => {
  const defaultKeys = ['A', 'C', 'B'];
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', '--sort', ...defaultKeys])).stdout;
  const salts = JSON.parse(jsonOut);

  const actual = Object.keys(salts).join('|');
  const expected = 'A|B|C';

  assert.is(expected, actual);
});

test('Custom Array: Ugly JSON output', async t => {
  const defaultKeys = ['test1', 'test2', 'test3'];
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--json', '--ugly', ...defaultKeys])).stdout;

  const actual = jsonOut.includes('\n');
  const expected = false;

  assert.is(expected, actual);
});

test('Custom Array: Ugly PHP output', async t => {
  const defaultKeys = ['A', 'B', 'C'];
  const jsonOut = (await execa('node', [CLI_SCRIPT, '--php', '--ugly', ...defaultKeys])).stdout;

  const actual = /\s{2,}/.test(jsonOut);
  const expected = false;

  assert.is(expected, actual);
});

test.run();
