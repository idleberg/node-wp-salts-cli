import pkg from '../package.json';

// Dependencies
import chalk from 'chalk';
import logSymbols from 'log-symbols';
import program from 'commander';
import sortKeys from 'sort-keys';
import { table, getBorderCharacters } from 'table';
import { wpSalts } from 'wp-salts';

// Action
program
  .description('CLI tool to generate WordPress salts in various formats')
  .version(pkg.version)
  .arguments('[options]')
  .usage('[options]')
  .option('-D, --dotenv', 'output as DotENV')
  .option('-J, --json', 'output as JSON')
  .option('-P, --php', 'output as PHP')
  .option('-Y, --yaml', 'output as YAML')
  .option('-b, --break', 'add line-breaks before and after the result')
  .option('-i, --indent <int>', 'indentation level for JSON output', parseInt)
  .option('-l, --length <int>', 'length of the salt (default: 64)', parseInt)
  .option('-s, --sort', 'sort keys alphabetically')
  .option('-u, --ugly', 'don\'t align JSON or PHP output')
  .parse(process.argv);

if (program.indent && program.ugly) {
  console.log(logSymbols.error, 'You cannot combine the indent and ugly flags');
  process.exit();
}

let indentation: number;

Object.freeze(program);

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

Object.freeze(salts);

lineBreak(program);

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
  const data: unknown[] = [
    [chalk.bold('Key'), chalk.bold('Salt')]
  ];

  Object.keys(salts).forEach( (key: string) => {
    data.push([key, salts[key]]);
  });

  const output: string = table(data, {border: getBorderCharacters('norc')});
  console.log(output);
}

lineBreak(program);

// Helpers
function getLongestString(input) {
  const map = input.map(x => x.length);
  const max = map.indexOf(Math.max(...map));

  return input[max];
}

function lineBreak(p) {
  if (p.break && (p.json || p.yaml || p.dotenv || p.php)) {
    console.log();
  }
}
