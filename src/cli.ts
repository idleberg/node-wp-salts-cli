import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { program } from 'commander';
import logSymbols from 'log-symbols';
import pico from 'picocolors';
import sortKeys from 'sort-keys';
import { getBorderCharacters, table } from 'table';
import { wpSalts } from 'wp-salts';
import * as formatters from './formatters';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { version } = JSON.parse(await fs.readFile(resolve(__dirname, '../package.json'), 'utf8'));

// Action
program
	.version(version)
	.description('CLI tool to generate WordPress salts in various formats')
	.arguments('[options]')
	.usage('[options]')
	.option('-D, --dotenv', 'output as DotENV')
	.option('-J, --json', 'output as JSON')
	.option('-P, --php', 'output as PHP')
	.option('-Y, --yaml', 'output as YAML')
	.option('-b, --break', 'add line-breaks before and after the result')
	.option('-i, --indent <int>', 'indentation level for JSON output', Number.parseInt)
	.option('-l, --length <int>', 'length of the salt (default: 64)', Number.parseInt)
	.option('-s, --sort', 'sort keys alphabetically')
	.option('-u, --ugly', "don't align JSON or PHP output")
	.parse(process.argv);

const options = program.opts();

if (options.indent && options.ugly) {
	console.error(logSymbols.error, 'You cannot combine the indent and ugly flags\n');
	process.exit();
}

let indentation: number;

Object.freeze(program);

if (options.indent && !Number.isNaN(options.indent)) {
	indentation = options.indent;
} else if (!options.indent && options.ugly) {
	indentation = 0;
} else {
	indentation = 2;
}

const saltLength: number = options.length ? options.length : 64;

let salts = program.args.length ? wpSalts(program.args, saltLength) : wpSalts('', saltLength);

if (options.sort) {
	salts = sortKeys(salts);
}

Object.freeze(salts);

lineBreak(options);

if (options.json) {
	console.log(JSON.stringify(salts, null, indentation));
} else if (options.yaml) {
	console.log(formatters.toYAML(salts));
} else if (options.dotenv) {
	console.log(formatters.toDotEnv(salts));
} else if (options.php) {
	console.log(formatters.toPHP(salts, !options.ugly));
} else {
	const data: unknown[][] = [[pico.bold('Key'), pico.bold('Salt')]];

	Object.keys(salts).forEach((key: string) => {
		data.push([key, salts[key]]);
	});

	const output: string = table(data, { border: getBorderCharacters('norc') });
	console.log(output);
}

lineBreak(options);

// Helpers
function lineBreak(p) {
	if (p.break && (p.json || p.yaml || p.dotenv || p.php)) {
		console.log();
	}
}
