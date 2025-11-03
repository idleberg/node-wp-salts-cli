# wp-salts-cli

[![License](https://img.shields.io/github/license/idleberg/node-wp-salts-cli?color=blue&style=for-the-badge)](https://github.com/idleberg/node-wp-salts-cli/blob/main/LICENSE)
[![Version](https://img.shields.io/npm/v/wp-salts-cli?style=for-the-badge)](https://www.npmjs.org/package/wp-salts-cli)
![GitHub branch check runs](https://img.shields.io/github/check-runs/idleberg/node-wp-salts-cli/main?style=for-the-badge)

Generate WordPress salts right in your shell, even when offline. Supports plain-text output as well as DotEnv, PHP, JSON, or YAML.

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

# Output specific strings as YAML
wp-salts SECURE_AUTH_KEY SECURE_AUTH_SALT --yaml

# Combine short-form flags
wp-salts -Pbul 128
```

### Options

Running `wp-salts --help` list available flags

```
  -V, --version       output the version number
  -D, --dotenv        output as DotENV
  -J, --json          output as JSON
  -P, --php           output as PHP
  -Y, --yaml          output as YAML
  -b, --break         add line-breaks before and after the result
  -i, --indent <int>  indentation level for JSON output
  -l, --length <int>  length of the salt (default: 64)
  -s, --sort          sort keys alphabetically
  -u, --ugly          don't pretty-print JSON or PHP output
  -h, --help          display help for command
```

**Note:** The minimum length of each salt is 8-bit (64 characters)

## Related

- [wp-salts](https://www.npmjs.org/package/wp-salts)
- [atom-wordpress-salts](https://atom.io/packages/wordpress-salts)
- [vscode-wordpress-salts](https://marketplace.visualstudio.com/items?itemName=idleberg.wordpress-salts)

## License

This work is licensed under [The MIT License](LICENSE).
