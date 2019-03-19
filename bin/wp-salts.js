#!/usr/bin/env node

const pkg = require('../package.json');

// Dependencies
const chalk = require('chalk');
const program = require('commander');
const updateNotifier = require('update-notifier');
const { table, getBorderCharacters } = require('table');
const { wpSalts } = require('wp-salts');

updateNotifier({pkg}).notify();

// Action
program
  .description('CLI tool to generate WordPress salts in various formats')
  .version(pkg.version)
  .arguments('[options]')
  .usage('[options]')
  .option('--dotenv', 'output as DotENV', true)
  .option('--json', 'output as JSON', true)
  .option('--php', 'output as PHP', true)
  .option('--yaml', 'output as YAML', true)
  .option('-i, --indent <int>', 'indentation level for JSON output', parseInt)
  .option('-u, --ugly', 'doesn\'t align JSON or PHP output', true)
  .option('-d, --double-quotes', 'use double-quotes in PHP output', false)
  .parse(process.argv);

let indentation;

if (!isNaN(program.indent)) {
  indentation = program.indent;
} else if (!program.indent && program.ugly) {
  indentation = 0;
} else {
  indentation = 2;
}

const quotes = (program.doubleQuotes) ? '"' : '\'';
const salts = (program.args.length) ? wpSalts(program.args) : wpSalts();

if (program.json) {
  console.log(
    JSON.stringify(salts, null, indentation)
  );
} else if (program.yaml) {
  Object.keys(salts).forEach( key => {
    console.log(`${key.toLowerCase()}:`, `"${salts[key]}"`);
  });
} else if (program.dotenv) {
  Object.keys(salts).forEach( key => {
    console.log(`${key}='${salts[key]}'`);
  });
} else if (program.php) {
  const maxLength = 'SECURE_AUTH_SALT'.length;

  Object.keys(salts).forEach( key => {
    const whitespace = (program.ugly) ? ' ' : ' '.repeat(maxLength - key.length);
    console.log(`define(${quotes}${key}${quotes}, ${whitespace}${quotes}${salts[key]}${quotes});`);
  });
} else {
  const data = [
    [chalk.bold('Key'), chalk.bold('Salt')]
  ];

  Object.keys(salts).forEach( key => {
    data.push([key, salts[key]]);
  });

  const output = table(data, {border: getBorderCharacters('norc')});
  console.log(output);
}
