import pkg from '../package.json';

// Dependencies
import chalk from 'chalk';
import logSymbols from 'log-symbols';
import program from 'commander';
import sortKeys from 'sort-keys';
import * as formatters from './formatters';
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

const options: ProgramOptioms = program.opts();

if (options.indent && options.ugly) {
  console.error(logSymbols.error, 'You cannot combine the indent and ugly flags\n');
  process.exit();
}

let indentation: number;

Object.freeze(program);

if (options.indent && !isNaN(options.indent)) {
  indentation = options.indent;
} else if (!options.indent && options.ugly) {
  indentation = 0;
} else {
  indentation = 2;
}

const saltLength: number = (options.length)
  ? options.length
  : 64;

let salts = program.args.length
  ? wpSalts(program.args, saltLength)
  : wpSalts('', saltLength);

if (options.sort) {
  salts = sortKeys(salts);
}

Object.freeze(salts);

lineBreak(options);

if (options.json) {
  console.log(
    JSON.stringify(salts, null, indentation)
  );
} else if (options.yaml) {
  console.log(formatters.toYAML(salts));
} else if (options.dotenv) {
  console.log(formatters.toDotEnv(salts));
} else if (options.php) {
  console.log(formatters.toPHP(salts, !options.ugly));
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

lineBreak(options);

// Helpers
function lineBreak(p) {
  if (p.break && (p.json || p.yaml || p.dotenv || p.php)) {
    console.log();
  }
}
