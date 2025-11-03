import { stringify as yamlStringify } from 'yaml';

type WordpressSalts = {
	AUTH_KEY: string;
	SECURE_AUTH_KEY: string;
	LOGGED_IN_KEY: string;
	NONCE_KEY: string;
	AUTH_SALT: string;
	SECURE_AUTH_SALT: string;
	LOGGED_IN_SALT: string;
	NONCE_SALT: string;
};

type SaltObject = WordpressSalts | Record<string, string>;

function getLongestString(input: string[]): string {
	const map = input.map((x) => x.length);
	const max = map.indexOf(Math.max(...map));

	return input[max] || '';
}

/**
 * Returns salts object as DotEnv string.
 *
 * @param input
 * @returns
 */
export function toDotEnv(input: SaltObject): string {
	return Object.keys(input)
		.map((key: string) => {
			return `${key}='${input[key as keyof SaltObject]}'`;
		})
		.join('\n');
}

/**
 * Returns salts object as PHP code string.
 *
 * @param input
 * @returns
 */
export function toPHP(input: SaltObject, prettyPrint = true): string {
	const maxLength = getLongestString(Object.keys(input)).length;

	return Object.keys(input)
		.map((key: string) => {
			const whitespace = prettyPrint ? ' '.repeat(maxLength - key.length) : '';

			return `define('${key}', ${whitespace}'${input[key as keyof SaltObject]}');`;
		})
		.join('\n');
}

/**
 * Returns salts object as YAML string.
 *
 * @param input
 * @returns
 */
export function toYAML(input: SaltObject): string {
	return yamlStringify(input, {
		defaultStringType: 'QUOTE_DOUBLE',
	});
}
