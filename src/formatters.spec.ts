import { describe, expect, it } from 'vitest';
import { toDotEnv, toPHP, toYAML } from './formatters.ts';

describe('formatters', () => {
	const mockSalts = {
		AUTH_KEY: 'test-auth-key-123',
		SECURE_AUTH_KEY: 'test-secure-auth-key-456',
		LOGGED_IN_KEY: 'test-logged-in-key-789',
		NONCE_KEY: 'test-nonce-key-012',
		AUTH_SALT: 'test-auth-salt-345',
		SECURE_AUTH_SALT: 'test-secure-auth-salt-678',
		LOGGED_IN_SALT: 'test-logged-in-salt-901',
		NONCE_SALT: 'test-nonce-salt-234',
	};

	describe('toDotEnv', () => {
		it('should convert salts object to DotEnv format', () => {
			const result = toDotEnv(mockSalts);

			expect(result).toContain("AUTH_KEY='test-auth-key-123'");
			expect(result).toContain("SECURE_AUTH_KEY='test-secure-auth-key-456'");
			expect(result).toContain("LOGGED_IN_KEY='test-logged-in-key-789'");
			expect(result).toContain("NONCE_KEY='test-nonce-key-012'");
		});

		it('should join all keys with newlines', () => {
			const result = toDotEnv(mockSalts);
			const lines = result.split('\n');

			expect(lines).toHaveLength(8);
		});

		it('should handle Record<string, string> type', () => {
			const customSalts = {
				CUSTOM_KEY_1: 'value1',
				CUSTOM_KEY_2: 'value2',
			};

			const result = toDotEnv(customSalts);

			expect(result).toContain("CUSTOM_KEY_1='value1'");
			expect(result).toContain("CUSTOM_KEY_2='value2'");
		});

		it('should handle empty object', () => {
			const result = toDotEnv({});

			expect(result).toBe('');
		});
	});

	describe('toPHP', () => {
		it('should convert salts object to PHP define statements', () => {
			const result = toPHP(mockSalts);

			expect(result).toContain("define('AUTH_KEY',");
			expect(result).toContain("'test-auth-key-123')");
			expect(result).toContain("define('SECURE_AUTH_KEY',");
			expect(result).toContain("'test-secure-auth-key-456')");
		});

		it('should pretty print with aligned values by default', () => {
			const result = toPHP(mockSalts);

			// SECURE_AUTH_SALT is the longest key, so shorter keys should have extra spaces
			const lines = result.split('\n');
			const authKeyLine = lines.find((line: string) => line.includes("'AUTH_KEY'"));
			const secureAuthSaltLine = lines.find((line: string) => line.includes("'SECURE_AUTH_SALT'"));

			expect(authKeyLine).toBeDefined();
			expect(secureAuthSaltLine).toBeDefined();

			// AUTH_KEY should have more whitespace between the key and value than SECURE_AUTH_SALT
			const authKeyMatch = authKeyLine?.match(/define\('AUTH_KEY',(\s+)'/);
			const secureAuthSaltMatch = secureAuthSaltLine?.match(/define\('SECURE_AUTH_SALT',(\s+)'/);

			expect(authKeyMatch).toBeTruthy();
			expect(secureAuthSaltMatch).toBeTruthy();

			if (authKeyMatch?.[1] && secureAuthSaltMatch?.[1]) {
				expect(authKeyMatch[1].length).toBeGreaterThan(secureAuthSaltMatch[1].length);
			}
		});

		it('should not pretty print when prettyPrint is false', () => {
			const result = toPHP(mockSalts, false);

			const lines = result.split('\n');
			const authKeyLine = lines.find((line) => line.includes('AUTH_KEY'));

			expect(authKeyLine).toContain("define('AUTH_KEY', 'test-auth-key-123')");
			expect(authKeyLine).not.toMatch(/AUTH_KEY',\s\s+'/);
		});

		it('should handle Record<string, string> type', () => {
			const customSalts = {
				KEY_A: 'value-a',
				KEY_B: 'value-b',
			};

			const result = toPHP(customSalts);

			expect(result).toContain("define('KEY_A',");
			expect(result).toContain("'value-a')");
			expect(result).toContain("define('KEY_B',");
			expect(result).toContain("'value-b')");
		});

		it('should handle empty object', () => {
			const result = toPHP({});

			expect(result).toBe('');
		});
	});

	describe('toYAML', () => {
		it('should convert salts object to YAML format', () => {
			const result = toYAML(mockSalts);

			expect(result).toContain('"AUTH_KEY": "test-auth-key-123"');
			expect(result).toContain('"SECURE_AUTH_KEY": "test-secure-auth-key-456"');
			expect(result).toContain('"LOGGED_IN_KEY": "test-logged-in-key-789"');
			expect(result).toContain('"NONCE_KEY": "test-nonce-key-012"');
		});

		it('should use double quotes for string values', () => {
			const result = toYAML(mockSalts);

			// Check that values are wrapped in double quotes
			expect(result).toMatch(/"test-auth-key-123"/);
			expect(result).toMatch(/"test-secure-auth-key-456"/);
		});

		it('should handle Record<string, string> type', () => {
			const customSalts = {
				YAML_KEY_1: 'yaml-value-1',
				YAML_KEY_2: 'yaml-value-2',
			};

			const result = toYAML(customSalts);

			expect(result).toContain('"YAML_KEY_1": "yaml-value-1"');
			expect(result).toContain('"YAML_KEY_2": "yaml-value-2"');
		});

		it('should handle empty object', () => {
			const result = toYAML({});

			expect(result).toBe('{}\n');
		});
	});
});
