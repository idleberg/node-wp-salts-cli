import { stringify as yamlStringify } from 'yaml';

function getLongestString(input: string[]): string {
  const map = input.map(x => x.length);
  const max = map.indexOf(Math.max(...map));

  return input[max];
}

/**
 * Returns salts object as DotEnv string
 * @param input
 * @returns
 */
function toDotEnv(input: WpSaltsCli.CustomSalts): string {
  return Object.keys(input).map((key: string) => {
    return `${key}='${input[key]}'`;
  }).join('\n');
}

/**
 * Returns salts object as PHP code string
 * @param input
 * @returns
 */
function toPHP(input: WpSaltsCli.CustomSalts, prettyPrint = true): string {
  const maxLength = getLongestString(Object.keys(input)).length;

  return Object.keys(input).map((key: string) => {
    const whitespace = prettyPrint
      ? ' '.repeat(maxLength - key.length)
      : '';

    return `define('${key}', ${whitespace}'${input[key]}');`;
  }).join('\n');
}

/**
 * Returns salts object as YAML string
 * @param input
 * @returns
 */
function toYAML(input: unknown): string {
  return yamlStringify(input, {
		defaultStringType: 'QUOTE_DOUBLE'
	});
}

export {
  toDotEnv,
  toPHP,
  toYAML
}
