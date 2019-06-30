# wp-salts-cli

[![npm](https://flat.badgen.net/npm/license/wp-salts-cli)](https://www.npmjs.org/package/wp-salts-cli)
[![npm](https://flat.badgen.net/npm/v/wp-salts-cli)](https://www.npmjs.org/package/wp-salts-cli)
[![CircleCI](https://flat.badgen.net/circleci/github/idleberg/node-wp-salts-cli)](https://circleci.com/gh/idleberg/node-wp-salts-cli)
[![David](https://flat.badgen.net/david/dep/idleberg/node-wp-salts-cli)](https://david-dm.org/idleberg/node-wp-salts-cli)

CLI tool to generate WordPress salts in various formats without the need of an internet-connection

## Installation

`npm install wp-salts-cli -g`

## Usage

You can now use the `wp-salts` command to output WordPress salts:

**Examples:**

```sh
# Standard usage
wp-salts

# Output as DotEnv
wp-salts --dotenv

# Output single strings as YAML
wp-salts SECURE_AUTH_KEY SECURE_AUTH_SALT --yaml
```

### Options

Running `wp-salts --help` list available flags

```
  -V, --version        output the version number
  --dotenv             output as DotENV
  --json               output as JSON
  --php                output as PHP
  --yaml               output as YAML
  -i, --indent <int>   indentation level for JSON output
  -l, --length <int>   length of the salt (default: 64)
  -s, --sort           sort keys alphabetically
  -u, --ugly           don't align JSON or PHP output
  -h, --help           output usage information
```

## Related

- [wp-salts](https://www.npmjs.org/package/wp-salts)

## License

This work is licensed under [The MIT License](https://opensource.org/licenses/MIT)

## Donate

You are welcome to support this project using [Flattr](https://flattr.com/submit/auto?user_id=idleberg&url=https://github.com/idleberg/node-wp-salts-cli) or Bitcoin `17CXJuPsmhuTzFV2k4RKYwpEHVjskJktRd`
