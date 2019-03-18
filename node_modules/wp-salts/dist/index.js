"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var wordpressKeys = [
    'AUTH_KEY',
    'SECURE_AUTH_KEY',
    'LOGGED_IN_KEY',
    'NONCE_KEY',
    'AUTH_SALT',
    'SECURE_AUTH_SALT',
    'LOGGED_IN_SALT',
    'NONCE_SALT',
];
/**
 * Returns object of default WordPress salts or any string/array or strings
 * @returns - object of salts
 */
var wpSalts = function (keys) {
    if (keys === void 0) { keys = ''; }
    var output = {};
    if (typeof keys === 'string') {
        keys = (keys.length > 0) ? [keys] : wordpressKeys;
    }
    keys.map(function (key) { return output[key] = util_1.generateSalt(); });
    return output;
};
exports.wpSalts = wpSalts;
