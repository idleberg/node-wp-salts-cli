# wp-salts

[![npm](https://flat.badgen.net/npm/license/wp-salts)](https://www.npmjs.org/package/wp-salts)
[![npm](https://flat.badgen.net/npm/v/wp-salts)](https://www.npmjs.org/package/wp-salts)
[![CircleCI](https://flat.badgen.net/circleci/github/idleberg/node-wp-salts)](https://circleci.com/gh/idleberg/node-wp-salts)
[![David](https://flat.badgen.net/david/dev/idleberg/node-wp-salts)](https://david-dm.org/idleberg/node-wp-salts?type=dev)

Generates an object of default WordPress salts (or any other string)

## Installation

`yarn add wp-salts || npm install wp-salts -S`

## Usage

Use ES6 imports or `require()` to include the module:

```js
const { wpSalts } = require('wp-salts');

// Standard WordPress salts
wpSalts();

// Custom salts
wpSalts('SECURE_AUTH_KEY');
wpSalts(['AUTH_KEY', 'AUTH_SALT']);
```

# Credits
- [roots.io](https://roots.io)
- [idleberg](http://github.com/idleberg)

## License

This work is licensed under [The MIT License](https://opensource.org/licenses/MIT)

## Donate

You are welcome to support this project using [Flattr](https://flattr.com/submit/auto?user_id=idleberg&url=https://github.com/idleberg/node-wp-salts) or Bitcoin `17CXJuPsmhuTzFV2k4RKYwpEHVjskJktRd`
