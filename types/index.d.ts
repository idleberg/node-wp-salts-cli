declare namespace WordpressSaltsCLI {
	interface WordpressSalts {
		AUTH_KEY: string;
		SECURE_AUTH_KEY: string;
		LOGGED_IN_KEY: string;
		NONCE_KEY: string;
		AUTH_SALT: string;
		SECURE_AUTH_SALT: string;
		LOGGED_IN_SALT: string;
		NONCE_SALT: string;
	}

	type SaltObject = WordpressSalts | Record<string, string>;
}

export default WordpressSaltsCLI;
