interface ProgramOptions {
  dotenv?: boolean;
  json?: boolean;
  php?: boolean;
  yaml?: boolean;
  break?: boolean;
  indent?: number;
  length?: number;
  sort?: boolean;
  ugly?: boolean;
}

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

interface CustomSalts extends WordpressSalts {
  [key: string]: string;
}
