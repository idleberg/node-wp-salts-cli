#!/usr/bin/env node

const pkg = require('../package.json');

// Dependencies
const chalk = require('chalk');
const program = require('commander');
const sortKeys = require('sort-keys');
const { table, getBorderCharacters } = require('table');
const { wpSalts } = require('wp-salts');

const getLongestString = input => {
  const map = input.map(x => x.length);
  const max = map.indexOf(Math.max(...map));

  return input[max];
};

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
  .option('-l, --length <int>', 'length of the salt (default: 64)', parseInt)
  .option('-s, --sort', 'sort keys alphabetically', true)
  .option('-u, --ugly', 'don\'t align JSON or PHP output', true)
  .parse(process.argv);

let indentation: number;

if (!isNaN(program.indent)) {
  indentation = program.indent;
} else if (!program.indent && program.ugly) {
  indentation = 0;
} else {
  indentation = 2;
}

const saltLength: number = (program.length) ? program.length : 64;
let salts = (program.args.length) ? wpSalts(program.args, saltLength) : wpSalts('', saltLength);

if (program.sort) {
  salts = sortKeys(salts);
}

if (program.json) {
  console.log(
    JSON.stringify(salts, null, indentation)
  );
} else if (program.yaml) {
  Object.keys(salts).forEach( (key: string) => {
    console.log(`${key.toLowerCase()}:`, `"${salts[key]}"`);
  });
} else if (program.dotenv) {
  Object.keys(salts).forEach( (key: string) => {
    console.log(`${key}='${salts[key]}'`);
  });
} else if (program.php) {
  const maxLength = getLongestString(Object.keys(salts)).length;

  Object.keys(salts).forEach( (key: string) => {
    const whitespace = (program.ugly) ? '' : ' '.repeat(maxLength - key.length);
    console.log(`define('${key}', ${whitespace}'${salts[key]}');`);
  });
} else {
  const data: Object[] = [
    [chalk.bold('Key'), chalk.bold('Salt')]
  ];

  Object.keys(salts).forEach( (key: string) => {
    data.push([key, salts[key]]);
  });

  const output: string = table(data, {border: getBorderCharacters('norc')});
  console.log(output);
}