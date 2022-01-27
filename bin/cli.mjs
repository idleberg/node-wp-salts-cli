import require$$0 from 'events';
import require$$1 from 'child_process';
import require$$2 from 'path';
import require$$3 from 'fs';
import require$$1$1 from 'crypto';
import require$$0$1 from 'os';
import require$$1$2 from 'tty';
import { promises } from 'node:fs';

var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var commander = {exports: {}};

var argument = {};

var error = {};

// @ts-check

/**
 * CommanderError class
 * @class
 */
class CommanderError$1 extends Error {
  /**
   * Constructs the CommanderError class
   * @param {number} exitCode suggested exit code which could be used with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   * @constructor
   */
  constructor(exitCode, code, message) {
    super(message);
    // properly capture stack trace in Node.js
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.code = code;
    this.exitCode = exitCode;
    this.nestedError = undefined;
  }
}

/**
 * InvalidArgumentError class
 * @class
 */
class InvalidArgumentError$2 extends CommanderError$1 {
  /**
   * Constructs the InvalidArgumentError class
   * @param {string} [message] explanation of why argument is invalid
   * @constructor
   */
  constructor(message) {
    super(1, 'commander.invalidArgument', message);
    // properly capture stack trace in Node.js
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

error.CommanderError = CommanderError$1;
error.InvalidArgumentError = InvalidArgumentError$2;

const { InvalidArgumentError: InvalidArgumentError$1 } = error;

// @ts-check

class Argument$1 {
  /**
   * Initialize a new command argument with the given name and description.
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @param {string} name
   * @param {string} [description]
   */

  constructor(name, description) {
    this.description = description || '';
    this.variadic = false;
    this.parseArg = undefined;
    this.defaultValue = undefined;
    this.defaultValueDescription = undefined;
    this.argChoices = undefined;

    switch (name[0]) {
      case '<': // e.g. <required>
        this.required = true;
        this._name = name.slice(1, -1);
        break;
      case '[': // e.g. [optional]
        this.required = false;
        this._name = name.slice(1, -1);
        break;
      default:
        this.required = true;
        this._name = name;
        break;
    }

    if (this._name.length > 3 && this._name.slice(-3) === '...') {
      this.variadic = true;
      this._name = this._name.slice(0, -3);
    }
  }

  /**
   * Return argument name.
   *
   * @return {string}
   */

  name() {
    return this._name;
  };

  /**
   * @api private
   */

  _concatValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }

    return previous.concat(value);
  }

  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {any} value
   * @param {string} [description]
   * @return {Argument}
   */

  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  };

  /**
   * Set the custom handler for processing CLI command arguments into argument values.
   *
   * @param {Function} [fn]
   * @return {Argument}
   */

  argParser(fn) {
    this.parseArg = fn;
    return this;
  };

  /**
   * Only allow option value to be one of choices.
   *
   * @param {string[]} values
   * @return {Argument}
   */

  choices(values) {
    this.argChoices = values;
    this.parseArg = (arg, previous) => {
      if (!values.includes(arg)) {
        throw new InvalidArgumentError$1(`Allowed choices are ${values.join(', ')}.`);
      }
      if (this.variadic) {
        return this._concatValue(arg, previous);
      }
      return arg;
    };
    return this;
  };

  /**
   * Make option-argument required.
   */
  argRequired() {
    this.required = true;
    return this;
  }

  /**
   * Make option-argument optional.
   */
  argOptional() {
    this.required = false;
    return this;
  }
}

/**
 * Takes an argument and returns its human readable equivalent for help usage.
 *
 * @param {Argument} arg
 * @return {string}
 * @api private
 */

function humanReadableArgName$2(arg) {
  const nameOutput = arg.name() + (arg.variadic === true ? '...' : '');

  return arg.required
    ? '<' + nameOutput + '>'
    : '[' + nameOutput + ']';
}

argument.Argument = Argument$1;
argument.humanReadableArgName = humanReadableArgName$2;

var command = {};

var help = {};

const { humanReadableArgName: humanReadableArgName$1 } = argument;

/**
 * TypeScript import types for JSDoc, used by Visual Studio Code IntelliSense and `npm run typescript-checkJS`
 * https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#import-types
 * @typedef { import("./argument.js").Argument } Argument
 * @typedef { import("./command.js").Command } Command
 * @typedef { import("./option.js").Option } Option
 */

// @ts-check

// Although this is a class, methods are static in style to allow override using subclass or just functions.
class Help$1 {
  constructor() {
    this.helpWidth = undefined;
    this.sortSubcommands = false;
    this.sortOptions = false;
  }

  /**
   * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
   *
   * @param {Command} cmd
   * @returns {Command[]}
   */

  visibleCommands(cmd) {
    const visibleCommands = cmd.commands.filter(cmd => !cmd._hidden);
    if (cmd._hasImplicitHelpCommand()) {
      // Create a command matching the implicit help command.
      const [, helpName, helpArgs] = cmd._helpCommandnameAndArgs.match(/([^ ]+) *(.*)/);
      const helpCommand = cmd.createCommand(helpName)
        .helpOption(false);
      helpCommand.description(cmd._helpCommandDescription);
      if (helpArgs) helpCommand.arguments(helpArgs);
      visibleCommands.push(helpCommand);
    }
    if (this.sortSubcommands) {
      visibleCommands.sort((a, b) => {
        // @ts-ignore: overloaded return type
        return a.name().localeCompare(b.name());
      });
    }
    return visibleCommands;
  }

  /**
   * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
   *
   * @param {Command} cmd
   * @returns {Option[]}
   */

  visibleOptions(cmd) {
    const visibleOptions = cmd.options.filter((option) => !option.hidden);
    // Implicit help
    const showShortHelpFlag = cmd._hasHelpOption && cmd._helpShortFlag && !cmd._findOption(cmd._helpShortFlag);
    const showLongHelpFlag = cmd._hasHelpOption && !cmd._findOption(cmd._helpLongFlag);
    if (showShortHelpFlag || showLongHelpFlag) {
      let helpOption;
      if (!showShortHelpFlag) {
        helpOption = cmd.createOption(cmd._helpLongFlag, cmd._helpDescription);
      } else if (!showLongHelpFlag) {
        helpOption = cmd.createOption(cmd._helpShortFlag, cmd._helpDescription);
      } else {
        helpOption = cmd.createOption(cmd._helpFlags, cmd._helpDescription);
      }
      visibleOptions.push(helpOption);
    }
    if (this.sortOptions) {
      const getSortKey = (option) => {
        // WYSIWYG for order displayed in help with short before long, no special handling for negated.
        return option.short ? option.short.replace(/^-/, '') : option.long.replace(/^--/, '');
      };
      visibleOptions.sort((a, b) => {
        return getSortKey(a).localeCompare(getSortKey(b));
      });
    }
    return visibleOptions;
  }

  /**
   * Get an array of the arguments if any have a description.
   *
   * @param {Command} cmd
   * @returns {Argument[]}
   */

  visibleArguments(cmd) {
    // Side effect! Apply the legacy descriptions before the arguments are displayed.
    if (cmd._argsDescription) {
      cmd._args.forEach(argument => {
        argument.description = argument.description || cmd._argsDescription[argument.name()] || '';
      });
    }

    // If there are any arguments with a description then return all the arguments.
    if (cmd._args.find(argument => argument.description)) {
      return cmd._args;
    }    return [];
  }

  /**
   * Get the command term to show in the list of subcommands.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  subcommandTerm(cmd) {
    // Legacy. Ignores custom usage string, and nested commands.
    const args = cmd._args.map(arg => humanReadableArgName$1(arg)).join(' ');
    return cmd._name +
      (cmd._aliases[0] ? '|' + cmd._aliases[0] : '') +
      (cmd.options.length ? ' [options]' : '') + // simplistic check for non-help option
      (args ? ' ' + args : '');
  }

  /**
   * Get the option term to show in the list of options.
   *
   * @param {Option} option
   * @returns {string}
   */

  optionTerm(option) {
    return option.flags;
  }

  /**
   * Get the argument term to show in the list of arguments.
   *
   * @param {Argument} argument
   * @returns {string}
   */

  argumentTerm(argument) {
    return argument.name();
  }

  /**
   * Get the longest command term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestSubcommandTermLength(cmd, helper) {
    return helper.visibleCommands(cmd).reduce((max, command) => {
      return Math.max(max, helper.subcommandTerm(command).length);
    }, 0);
  };

  /**
   * Get the longest option term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestOptionTermLength(cmd, helper) {
    return helper.visibleOptions(cmd).reduce((max, option) => {
      return Math.max(max, helper.optionTerm(option).length);
    }, 0);
  };

  /**
   * Get the longest argument term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestArgumentTermLength(cmd, helper) {
    return helper.visibleArguments(cmd).reduce((max, argument) => {
      return Math.max(max, helper.argumentTerm(argument).length);
    }, 0);
  };

  /**
   * Get the command usage to be displayed at the top of the built-in help.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  commandUsage(cmd) {
    // Usage
    let cmdName = cmd._name;
    if (cmd._aliases[0]) {
      cmdName = cmdName + '|' + cmd._aliases[0];
    }
    let parentCmdNames = '';
    for (let parentCmd = cmd.parent; parentCmd; parentCmd = parentCmd.parent) {
      parentCmdNames = parentCmd.name() + ' ' + parentCmdNames;
    }
    return parentCmdNames + cmdName + ' ' + cmd.usage();
  }

  /**
   * Get the description for the command.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  commandDescription(cmd) {
    // @ts-ignore: overloaded return type
    return cmd.description();
  }

  /**
   * Get the command description to show in the list of subcommands.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  subcommandDescription(cmd) {
    // @ts-ignore: overloaded return type
    return cmd.description();
  }

  /**
   * Get the option description to show in the list of options.
   *
   * @param {Option} option
   * @return {string}
   */

  optionDescription(option) {
    const extraInfo = [];
    // Some of these do not make sense for negated boolean and suppress for backwards compatibility.

    if (option.argChoices && !option.negate) {
      extraInfo.push(
        // use stringify to match the display of the default value
        `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(', ')}`);
    }
    if (option.defaultValue !== undefined && !option.negate) {
      extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
    }
    if (option.envVar !== undefined) {
      extraInfo.push(`env: ${option.envVar}`);
    }
    if (extraInfo.length > 0) {
      return `${option.description} (${extraInfo.join(', ')})`;
    }

    return option.description;
  };

  /**
   * Get the argument description to show in the list of arguments.
   *
   * @param {Argument} argument
   * @return {string}
   */

  argumentDescription(argument) {
    const extraInfo = [];
    if (argument.argChoices) {
      extraInfo.push(
        // use stringify to match the display of the default value
        `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(', ')}`);
    }
    if (argument.defaultValue !== undefined) {
      extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
    }
    if (extraInfo.length > 0) {
      const extraDescripton = `(${extraInfo.join(', ')})`;
      if (argument.description) {
        return `${argument.description} ${extraDescripton}`;
      }
      return extraDescripton;
    }
    return argument.description;
  }

  /**
   * Generate the built-in help text.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {string}
   */

  formatHelp(cmd, helper) {
    const termWidth = helper.padWidth(cmd, helper);
    const helpWidth = helper.helpWidth || 80;
    const itemIndentWidth = 2;
    const itemSeparatorWidth = 2; // between term and description
    function formatItem(term, description) {
      if (description) {
        const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
        return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
      }
      return term;
    }    function formatList(textArray) {
      return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));
    }

    // Usage
    let output = [`Usage: ${helper.commandUsage(cmd)}`, ''];

    // Description
    const commandDescription = helper.commandDescription(cmd);
    if (commandDescription.length > 0) {
      output = output.concat([commandDescription, '']);
    }

    // Arguments
    const argumentList = helper.visibleArguments(cmd).map((argument) => {
      return formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument));
    });
    if (argumentList.length > 0) {
      output = output.concat(['Arguments:', formatList(argumentList), '']);
    }

    // Options
    const optionList = helper.visibleOptions(cmd).map((option) => {
      return formatItem(helper.optionTerm(option), helper.optionDescription(option));
    });
    if (optionList.length > 0) {
      output = output.concat(['Options:', formatList(optionList), '']);
    }

    // Commands
    const commandList = helper.visibleCommands(cmd).map((cmd) => {
      return formatItem(helper.subcommandTerm(cmd), helper.subcommandDescription(cmd));
    });
    if (commandList.length > 0) {
      output = output.concat(['Commands:', formatList(commandList), '']);
    }

    return output.join('\n');
  }

  /**
   * Calculate the pad width from the maximum term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  padWidth(cmd, helper) {
    return Math.max(
      helper.longestOptionTermLength(cmd, helper),
      helper.longestSubcommandTermLength(cmd, helper),
      helper.longestArgumentTermLength(cmd, helper)
    );
  };

  /**
   * Wrap the given string to width characters per line, with lines after the first indented.
   * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
   *
   * @param {string} str
   * @param {number} width
   * @param {number} indent
   * @param {number} [minColumnWidth=40]
   * @return {string}
   *
   */

  wrap(str, width, indent, minColumnWidth = 40) {
    // Detect manually wrapped and indented strings by searching for line breaks
    // followed by multiple spaces/tabs.
    if (str.match(/[\n]\s+/)) return str;
    // Do not wrap if not enough room for a wrapped column of text (as could end up with a word per line).
    const columnWidth = width - indent;
    if (columnWidth < minColumnWidth) return str;

    const leadingStr = str.substr(0, indent);
    const columnText = str.substr(indent);

    const indentString = ' '.repeat(indent);
    const regex = new RegExp('.{1,' + (columnWidth - 1) + '}([\\s\u200B]|$)|[^\\s\u200B]+?([\\s\u200B]|$)', 'g');
    const lines = columnText.match(regex) || [];
    return leadingStr + lines.map((line, i) => {
      if (line.slice(-1) === '\n') {
        line = line.slice(0, line.length - 1);
      }
      return ((i > 0) ? indentString : '') + line.trimRight();
    }).join('\n');
  }
}

help.Help = Help$1;

var option = {};

const { InvalidArgumentError } = error;

// @ts-check

class Option$1 {
  /**
   * Initialize a new `Option` with the given `flags` and `description`.
   *
   * @param {string} flags
   * @param {string} [description]
   */

  constructor(flags, description) {
    this.flags = flags;
    this.description = description || '';

    this.required = flags.includes('<'); // A value must be supplied when the option is specified.
    this.optional = flags.includes('['); // A value is optional when the option is specified.
    // variadic test ignores <value,...> et al which might be used to describe custom splitting of single argument
    this.variadic = /\w\.\.\.[>\]]$/.test(flags); // The option can take multiple values.
    this.mandatory = false; // The option must have a value after parsing, which usually means it must be specified on command line.
    const optionFlags = splitOptionFlags$1(flags);
    this.short = optionFlags.shortFlag;
    this.long = optionFlags.longFlag;
    this.negate = false;
    if (this.long) {
      this.negate = this.long.startsWith('--no-');
    }
    this.defaultValue = undefined;
    this.defaultValueDescription = undefined;
    this.envVar = undefined;
    this.parseArg = undefined;
    this.hidden = false;
    this.argChoices = undefined;
  }

  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {any} value
   * @param {string} [description]
   * @return {Option}
   */

  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  };

  /**
   * Set environment variable to check for option value.
   * Priority order of option values is default < env < cli
   *
   * @param {string} name
   * @return {Option}
   */

  env(name) {
    this.envVar = name;
    return this;
  };

  /**
   * Set the custom handler for processing CLI option arguments into option values.
   *
   * @param {Function} [fn]
   * @return {Option}
   */

  argParser(fn) {
    this.parseArg = fn;
    return this;
  };

  /**
   * Whether the option is mandatory and must have a value after parsing.
   *
   * @param {boolean} [mandatory=true]
   * @return {Option}
   */

  makeOptionMandatory(mandatory = true) {
    this.mandatory = !!mandatory;
    return this;
  };

  /**
   * Hide option in help.
   *
   * @param {boolean} [hide=true]
   * @return {Option}
   */

  hideHelp(hide = true) {
    this.hidden = !!hide;
    return this;
  };

  /**
   * @api private
   */

  _concatValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }

    return previous.concat(value);
  }

  /**
   * Only allow option value to be one of choices.
   *
   * @param {string[]} values
   * @return {Option}
   */

  choices(values) {
    this.argChoices = values;
    this.parseArg = (arg, previous) => {
      if (!values.includes(arg)) {
        throw new InvalidArgumentError(`Allowed choices are ${values.join(', ')}.`);
      }
      if (this.variadic) {
        return this._concatValue(arg, previous);
      }
      return arg;
    };
    return this;
  };

  /**
   * Return option name.
   *
   * @return {string}
   */

  name() {
    if (this.long) {
      return this.long.replace(/^--/, '');
    }
    return this.short.replace(/^-/, '');
  };

  /**
   * Return option name, in a camelcase format that can be used
   * as a object attribute key.
   *
   * @return {string}
   * @api private
   */

  attributeName() {
    return camelcase(this.name().replace(/^no-/, ''));
  };

  /**
   * Check if `arg` matches the short or long flag.
   *
   * @param {string} arg
   * @return {boolean}
   * @api private
   */

  is(arg) {
    return this.short === arg || this.long === arg;
  };
}

/**
 * Convert string from kebab-case to camelCase.
 *
 * @param {string} str
 * @return {string}
 * @api private
 */

function camelcase(str) {
  return str.split('-').reduce((str, word) => {
    return str + word[0].toUpperCase() + word.slice(1);
  });
}

/**
 * Split the short and long flag out of something like '-m,--mixed <value>'
 *
 * @api private
 */

function splitOptionFlags$1(flags) {
  let shortFlag;
  let longFlag;
  // Use original very loose parsing to maintain backwards compatibility for now,
  // which allowed for example unintended `-sw, --short-word` [sic].
  const flagParts = flags.split(/[ |,]+/);
  if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1])) shortFlag = flagParts.shift();
  longFlag = flagParts.shift();
  // Add support for lone short flag without significantly changing parsing!
  if (!shortFlag && /^-[^-]$/.test(longFlag)) {
    shortFlag = longFlag;
    longFlag = undefined;
  }
  return { shortFlag, longFlag };
}

option.Option = Option$1;
option.splitOptionFlags = splitOptionFlags$1;

var suggestSimilar$2 = {};

const maxDistance = 3;

function editDistance(a, b) {
  // https://en.wikipedia.org/wiki/Damerau–Levenshtein_distance
  // Calculating optimal string alignment distance, no substring is edited more than once.
  // (Simple implementation.)

  // Quick early exit, return worst case.
  if (Math.abs(a.length - b.length) > maxDistance) return Math.max(a.length, b.length);

  // distance between prefix substrings of a and b
  const d = [];

  // pure deletions turn a into empty string
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
  }
  // pure insertions turn empty string into b
  for (let j = 0; j <= b.length; j++) {
    d[0][j] = j;
  }

  // fill matrix
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      let cost = 1;
      if (a[i - 1] === b[j - 1]) {
        cost = 0;
      } else {
        cost = 1;
      }
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
      // transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[a.length][b.length];
}

/**
 * Find close matches, restricted to same number of edits.
 *
 * @param {string} word
 * @param {string[]} candidates
 * @returns {string}
 */

function suggestSimilar$1(word, candidates) {
  if (!candidates || candidates.length === 0) return '';
  // remove possible duplicates
  candidates = Array.from(new Set(candidates));

  const searchingOptions = word.startsWith('--');
  if (searchingOptions) {
    word = word.slice(2);
    candidates = candidates.map(candidate => candidate.slice(2));
  }

  let similar = [];
  let bestDistance = maxDistance;
  const minSimilarity = 0.4;
  candidates.forEach((candidate) => {
    if (candidate.length <= 1) return; // no one character guesses

    const distance = editDistance(word, candidate);
    const length = Math.max(word.length, candidate.length);
    const similarity = (length - distance) / length;
    if (similarity > minSimilarity) {
      if (distance < bestDistance) {
        // better edit distance, throw away previous worse matches
        bestDistance = distance;
        similar = [candidate];
      } else if (distance === bestDistance) {
        similar.push(candidate);
      }
    }
  });

  similar.sort((a, b) => a.localeCompare(b));
  if (searchingOptions) {
    similar = similar.map(candidate => `--${candidate}`);
  }

  if (similar.length > 1) {
    return `\n(Did you mean one of ${similar.join(', ')}?)`;
  }
  if (similar.length === 1) {
    return `\n(Did you mean ${similar[0]}?)`;
  }
  return '';
}

suggestSimilar$2.suggestSimilar = suggestSimilar$1;

const EventEmitter = require$$0.EventEmitter;
const childProcess = require$$1;
const path = require$$2;
const fs = require$$3;

const { Argument, humanReadableArgName } = argument;
const { CommanderError } = error;
const { Help } = help;
const { Option, splitOptionFlags } = option;
const { suggestSimilar } = suggestSimilar$2;

// @ts-check

class Command extends EventEmitter {
  /**
   * Initialize a new `Command`.
   *
   * @param {string} [name]
   */

  constructor(name) {
    super();
    /** @type {Command[]} */
    this.commands = [];
    /** @type {Option[]} */
    this.options = [];
    this.parent = null;
    this._allowUnknownOption = false;
    this._allowExcessArguments = true;
    /** @type {Argument[]} */
    this._args = [];
    /** @type {string[]} */
    this.args = []; // cli args with options removed
    this.rawArgs = [];
    this.processedArgs = []; // like .args but after custom processing and collecting variadic
    this._scriptPath = null;
    this._name = name || '';
    this._optionValues = {};
    this._optionValueSources = {}; // default < config < env < cli
    this._storeOptionsAsProperties = false;
    this._actionHandler = null;
    this._executableHandler = false;
    this._executableFile = null; // custom name for executable
    this._defaultCommandName = null;
    this._exitCallback = null;
    this._aliases = [];
    this._combineFlagAndOptionalValue = true;
    this._description = '';
    this._argsDescription = undefined; // legacy
    this._enablePositionalOptions = false;
    this._passThroughOptions = false;
    this._lifeCycleHooks = {}; // a hash of arrays
    /** @type {boolean | string} */
    this._showHelpAfterError = false;
    this._showSuggestionAfterError = false;

    // see .configureOutput() for docs
    this._outputConfiguration = {
      writeOut: (str) => process.stdout.write(str),
      writeErr: (str) => process.stderr.write(str),
      getOutHelpWidth: () => process.stdout.isTTY ? process.stdout.columns : undefined,
      getErrHelpWidth: () => process.stderr.isTTY ? process.stderr.columns : undefined,
      outputError: (str, write) => write(str)
    };

    this._hidden = false;
    this._hasHelpOption = true;
    this._helpFlags = '-h, --help';
    this._helpDescription = 'display help for command';
    this._helpShortFlag = '-h';
    this._helpLongFlag = '--help';
    this._addImplicitHelpCommand = undefined; // Deliberately undefined, not decided whether true or false
    this._helpCommandName = 'help';
    this._helpCommandnameAndArgs = 'help [command]';
    this._helpCommandDescription = 'display help for command';
    this._helpConfiguration = {};
  }

  /**
   * Copy settings that are useful to have in common across root command and subcommands.
   *
   * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
   *
   * @param {Command} sourceCommand
   * @return {Command} returns `this` for executable command
   */
  copyInheritedSettings(sourceCommand) {
    this._outputConfiguration = sourceCommand._outputConfiguration;
    this._hasHelpOption = sourceCommand._hasHelpOption;
    this._helpFlags = sourceCommand._helpFlags;
    this._helpDescription = sourceCommand._helpDescription;
    this._helpShortFlag = sourceCommand._helpShortFlag;
    this._helpLongFlag = sourceCommand._helpLongFlag;
    this._helpCommandName = sourceCommand._helpCommandName;
    this._helpCommandnameAndArgs = sourceCommand._helpCommandnameAndArgs;
    this._helpCommandDescription = sourceCommand._helpCommandDescription;
    this._helpConfiguration = sourceCommand._helpConfiguration;
    this._exitCallback = sourceCommand._exitCallback;
    this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
    this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
    this._allowExcessArguments = sourceCommand._allowExcessArguments;
    this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
    this._showHelpAfterError = sourceCommand._showHelpAfterError;
    this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;

    return this;
  }

  /**
   * Define a command.
   *
   * There are two styles of command: pay attention to where to put the description.
   *
   * @example
   * // Command implemented using action handler (description is supplied separately to `.command`)
   * program
   *   .command('clone <source> [destination]')
   *   .description('clone a repository into a newly created directory')
   *   .action((source, destination) => {
   *     console.log('clone command called');
   *   });
   *
   * // Command implemented using separate executable file (description is second parameter to `.command`)
   * program
   *   .command('start <service>', 'start named service')
   *   .command('stop [service]', 'stop named service, or all if no name supplied');
   *
   * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
   * @param {Object|string} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
   * @param {Object} [execOpts] - configuration options (for executable)
   * @return {Command} returns new command for action handler, or `this` for executable command
   */

  command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
    let desc = actionOptsOrExecDesc;
    let opts = execOpts;
    if (typeof desc === 'object' && desc !== null) {
      opts = desc;
      desc = null;
    }
    opts = opts || {};
    const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);

    const cmd = this.createCommand(name);
    if (desc) {
      cmd.description(desc);
      cmd._executableHandler = true;
    }
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    cmd._hidden = !!(opts.noHelp || opts.hidden); // noHelp is deprecated old name for hidden
    cmd._executableFile = opts.executableFile || null; // Custom name for executable file, set missing to null to match constructor
    if (args) cmd.arguments(args);
    this.commands.push(cmd);
    cmd.parent = this;
    cmd.copyInheritedSettings(this);

    if (desc) return this;
    return cmd;
  };

  /**
   * Factory routine to create a new unattached command.
   *
   * See .command() for creating an attached subcommand, which uses this routine to
   * create the command. You can override createCommand to customise subcommands.
   *
   * @param {string} [name]
   * @return {Command} new command
   */

  createCommand(name) {
    return new Command(name);
  };

  /**
   * You can customise the help with a subclass of Help by overriding createHelp,
   * or by overriding Help properties using configureHelp().
   *
   * @return {Help}
   */

  createHelp() {
    return Object.assign(new Help(), this.configureHelp());
  };

  /**
   * You can customise the help by overriding Help properties using configureHelp(),
   * or with a subclass of Help by overriding createHelp().
   *
   * @param {Object} [configuration] - configuration options
   * @return {Command|Object} `this` command for chaining, or stored configuration
   */

  configureHelp(configuration) {
    if (configuration === undefined) return this._helpConfiguration;

    this._helpConfiguration = configuration;
    return this;
  }

  /**
   * The default output goes to stdout and stderr. You can customise this for special
   * applications. You can also customise the display of errors by overriding outputError.
   *
   * The configuration properties are all functions:
   *
   *     // functions to change where being written, stdout and stderr
   *     writeOut(str)
   *     writeErr(str)
   *     // matching functions to specify width for wrapping help
   *     getOutHelpWidth()
   *     getErrHelpWidth()
   *     // functions based on what is being written out
   *     outputError(str, write) // used for displaying errors, and not used for displaying help
   *
   * @param {Object} [configuration] - configuration options
   * @return {Command|Object} `this` command for chaining, or stored configuration
   */

  configureOutput(configuration) {
    if (configuration === undefined) return this._outputConfiguration;

    Object.assign(this._outputConfiguration, configuration);
    return this;
  }

  /**
   * Display the help or a custom message after an error occurs.
   *
   * @param {boolean|string} [displayHelp]
   * @return {Command} `this` command for chaining
   */
  showHelpAfterError(displayHelp = true) {
    if (typeof displayHelp !== 'string') displayHelp = !!displayHelp;
    this._showHelpAfterError = displayHelp;
    return this;
  }

  /**
   * Display suggestion of similar commands for unknown commands, or options for unknown options.
   *
   * @param {boolean} [displaySuggestion]
   * @return {Command} `this` command for chaining
   */
  showSuggestionAfterError(displaySuggestion = true) {
    this._showSuggestionAfterError = !!displaySuggestion;
    return this;
  }

  /**
   * Add a prepared subcommand.
   *
   * See .command() for creating an attached subcommand which inherits settings from its parent.
   *
   * @param {Command} cmd - new subcommand
   * @param {Object} [opts] - configuration options
   * @return {Command} `this` command for chaining
   */

  addCommand(cmd, opts) {
    if (!cmd._name) throw new Error('Command passed to .addCommand() must have a name');

    // To keep things simple, block automatic name generation for deeply nested executables.
    // Fail fast and detect when adding rather than later when parsing.
    function checkExplicitNames(commandArray) {
      commandArray.forEach((cmd) => {
        if (cmd._executableHandler && !cmd._executableFile) {
          throw new Error(`Must specify executableFile for deeply nested executable: ${cmd.name()}`);
        }
        checkExplicitNames(cmd.commands);
      });
    }
    checkExplicitNames(cmd.commands);

    opts = opts || {};
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    if (opts.noHelp || opts.hidden) cmd._hidden = true; // modifying passed command due to existing implementation

    this.commands.push(cmd);
    cmd.parent = this;
    return this;
  };

  /**
   * Factory routine to create a new unattached argument.
   *
   * See .argument() for creating an attached argument, which uses this routine to
   * create the argument. You can override createArgument to return a custom argument.
   *
   * @param {string} name
   * @param {string} [description]
   * @return {Argument} new argument
   */

  createArgument(name, description) {
    return new Argument(name, description);
  };

  /**
   * Define argument syntax for command.
   *
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @example
   * program.argument('<input-file>');
   * program.argument('[output-file]');
   *
   * @param {string} name
   * @param {string} [description]
   * @param {Function|*} [fn] - custom argument processing function
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */
  argument(name, description, fn, defaultValue) {
    const argument = this.createArgument(name, description);
    if (typeof fn === 'function') {
      argument.default(defaultValue).argParser(fn);
    } else {
      argument.default(fn);
    }
    this.addArgument(argument);
    return this;
  }

  /**
   * Define argument syntax for command, adding multiple at once (without descriptions).
   *
   * See also .argument().
   *
   * @example
   * program.arguments('<cmd> [env]');
   *
   * @param {string} names
   * @return {Command} `this` command for chaining
   */

  arguments(names) {
    names.split(/ +/).forEach((detail) => {
      this.argument(detail);
    });
    return this;
  };

  /**
   * Define argument syntax for command, adding a prepared argument.
   *
   * @param {Argument} argument
   * @return {Command} `this` command for chaining
   */
  addArgument(argument) {
    const previousArgument = this._args.slice(-1)[0];
    if (previousArgument && previousArgument.variadic) {
      throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
    }
    if (argument.required && argument.defaultValue !== undefined && argument.parseArg === undefined) {
      throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
    }
    this._args.push(argument);
    return this;
  }

  /**
   * Override default decision whether to add implicit help command.
   *
   *    addHelpCommand() // force on
   *    addHelpCommand(false); // force off
   *    addHelpCommand('help [cmd]', 'display help for [cmd]'); // force on with custom details
   *
   * @return {Command} `this` command for chaining
   */

  addHelpCommand(enableOrNameAndArgs, description) {
    if (enableOrNameAndArgs === false) {
      this._addImplicitHelpCommand = false;
    } else {
      this._addImplicitHelpCommand = true;
      if (typeof enableOrNameAndArgs === 'string') {
        this._helpCommandName = enableOrNameAndArgs.split(' ')[0];
        this._helpCommandnameAndArgs = enableOrNameAndArgs;
      }
      this._helpCommandDescription = description || this._helpCommandDescription;
    }
    return this;
  };

  /**
   * @return {boolean}
   * @api private
   */

  _hasImplicitHelpCommand() {
    if (this._addImplicitHelpCommand === undefined) {
      return this.commands.length && !this._actionHandler && !this._findCommand('help');
    }
    return this._addImplicitHelpCommand;
  };

  /**
   * Add hook for life cycle event.
   *
   * @param {string} event
   * @param {Function} listener
   * @return {Command} `this` command for chaining
   */

  hook(event, listener) {
    const allowedValues = ['preAction', 'postAction'];
    if (!allowedValues.includes(event)) {
      throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    if (this._lifeCycleHooks[event]) {
      this._lifeCycleHooks[event].push(listener);
    } else {
      this._lifeCycleHooks[event] = [listener];
    }
    return this;
  }

  /**
   * Register callback to use as replacement for calling process.exit.
   *
   * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
   * @return {Command} `this` command for chaining
   */

  exitOverride(fn) {
    if (fn) {
      this._exitCallback = fn;
    } else {
      this._exitCallback = (err) => {
        if (err.code !== 'commander.executeSubCommandAsync') {
          throw err;
        }
      };
    }
    return this;
  };

  /**
   * Call process.exit, and _exitCallback if defined.
   *
   * @param {number} exitCode exit code for using with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   * @return never
   * @api private
   */

  _exit(exitCode, code, message) {
    if (this._exitCallback) {
      this._exitCallback(new CommanderError(exitCode, code, message));
      // Expecting this line is not reached.
    }
    process.exit(exitCode);
  };

  /**
   * Register callback `fn` for the command.
   *
   * @example
   * program
   *   .command('serve')
   *   .description('start service')
   *   .action(function() {
   *      // do work here
   *   });
   *
   * @param {Function} fn
   * @return {Command} `this` command for chaining
   */

  action(fn) {
    const listener = (args) => {
      // The .action callback takes an extra parameter which is the command or options.
      const expectedArgsCount = this._args.length;
      const actionArgs = args.slice(0, expectedArgsCount);
      if (this._storeOptionsAsProperties) {
        actionArgs[expectedArgsCount] = this; // backwards compatible "options"
      } else {
        actionArgs[expectedArgsCount] = this.opts();
      }
      actionArgs.push(this);

      return fn.apply(this, actionArgs);
    };
    this._actionHandler = listener;
    return this;
  };

  /**
   * Factory routine to create a new unattached option.
   *
   * See .option() for creating an attached option, which uses this routine to
   * create the option. You can override createOption to return a custom option.
   *
   * @param {string} flags
   * @param {string} [description]
   * @return {Option} new option
   */

  createOption(flags, description) {
    return new Option(flags, description);
  };

  /**
   * Add an option.
   *
   * @param {Option} option
   * @return {Command} `this` command for chaining
   */
  addOption(option) {
    const oname = option.name();
    const name = option.attributeName();

    let defaultValue = option.defaultValue;

    // preassign default value for --no-*, [optional], <required>, or plain flag if boolean value
    if (option.negate || option.optional || option.required || typeof defaultValue === 'boolean') {
      // when --no-foo we make sure default is true, unless a --foo option is already defined
      if (option.negate) {
        const positiveLongFlag = option.long.replace(/^--no-/, '--');
        defaultValue = this._findOption(positiveLongFlag) ? this.getOptionValue(name) : true;
      }
      // preassign only if we have a default
      if (defaultValue !== undefined) {
        this.setOptionValueWithSource(name, defaultValue, 'default');
      }
    }

    // register the option
    this.options.push(option);

    // handler for cli and env supplied values
    const handleOptionValue = (val, invalidValueMessage, valueSource) => {
      // Note: using closure to access lots of lexical scoped variables.
      const oldValue = this.getOptionValue(name);

      // custom processing
      if (val !== null && option.parseArg) {
        try {
          val = option.parseArg(val, oldValue === undefined ? defaultValue : oldValue);
        } catch (err) {
          if (err.code === 'commander.invalidArgument') {
            const message = `${invalidValueMessage} ${err.message}`;
            this._displayError(err.exitCode, err.code, message);
          }
          throw err;
        }
      } else if (val !== null && option.variadic) {
        val = option._concatValue(val, oldValue);
      }

      // unassigned or boolean value
      if (typeof oldValue === 'boolean' || typeof oldValue === 'undefined') {
        // if no value, negate false, and we have a default, then use it!
        if (val == null) {
          this.setOptionValueWithSource(name, option.negate ? false : defaultValue || true, valueSource);
        } else {
          this.setOptionValueWithSource(name, val, valueSource);
        }
      } else if (val !== null) {
        // reassign
        this.setOptionValueWithSource(name, option.negate ? false : val, valueSource);
      }
    };

    this.on('option:' + oname, (val) => {
      const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
      handleOptionValue(val, invalidValueMessage, 'cli');
    });

    if (option.envVar) {
      this.on('optionEnv:' + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, 'env');
      });
    }

    return this;
  }

  /**
   * Internal implementation shared by .option() and .requiredOption()
   *
   * @api private
   */
  _optionEx(config, flags, description, fn, defaultValue) {
    const option = this.createOption(flags, description);
    option.makeOptionMandatory(!!config.mandatory);
    if (typeof fn === 'function') {
      option.default(defaultValue).argParser(fn);
    } else if (fn instanceof RegExp) {
      // deprecated
      const regex = fn;
      fn = (val, def) => {
        const m = regex.exec(val);
        return m ? m[0] : def;
      };
      option.default(defaultValue).argParser(fn);
    } else {
      option.default(fn);
    }

    return this.addOption(option);
  }

  /**
   * Define option with `flags`, `description` and optional
   * coercion `fn`.
   *
   * The `flags` string contains the short and/or long flags,
   * separated by comma, a pipe or space. The following are all valid
   * all will output this way when `--help` is used.
   *
   *     "-p, --pepper"
   *     "-p|--pepper"
   *     "-p --pepper"
   *
   * @example
   * // simple boolean defaulting to undefined
   * program.option('-p, --pepper', 'add pepper');
   *
   * program.pepper
   * // => undefined
   *
   * --pepper
   * program.pepper
   * // => true
   *
   * // simple boolean defaulting to true (unless non-negated option is also defined)
   * program.option('-C, --no-cheese', 'remove cheese');
   *
   * program.cheese
   * // => true
   *
   * --no-cheese
   * program.cheese
   * // => false
   *
   * // required argument
   * program.option('-C, --chdir <path>', 'change the working directory');
   *
   * --chdir /tmp
   * program.chdir
   * // => "/tmp"
   *
   * // optional argument
   * program.option('-c, --cheese [type]', 'add cheese [marble]');
   *
   * @param {string} flags
   * @param {string} [description]
   * @param {Function|*} [fn] - custom option processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */

  option(flags, description, fn, defaultValue) {
    return this._optionEx({}, flags, description, fn, defaultValue);
  };

  /**
  * Add a required option which must have a value after parsing. This usually means
  * the option must be specified on the command line. (Otherwise the same as .option().)
  *
  * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
  *
  * @param {string} flags
  * @param {string} [description]
  * @param {Function|*} [fn] - custom option processing function or default value
  * @param {*} [defaultValue]
  * @return {Command} `this` command for chaining
  */

  requiredOption(flags, description, fn, defaultValue) {
    return this._optionEx({ mandatory: true }, flags, description, fn, defaultValue);
  };

  /**
   * Alter parsing of short flags with optional values.
   *
   * @example
   * // for `.option('-f,--flag [value]'):
   * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
   * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
   *
   * @param {Boolean} [combine=true] - if `true` or omitted, an optional value can be specified directly after the flag.
   */
  combineFlagAndOptionalValue(combine = true) {
    this._combineFlagAndOptionalValue = !!combine;
    return this;
  };

  /**
   * Allow unknown options on the command line.
   *
   * @param {Boolean} [allowUnknown=true] - if `true` or omitted, no error will be thrown
   * for unknown options.
   */
  allowUnknownOption(allowUnknown = true) {
    this._allowUnknownOption = !!allowUnknown;
    return this;
  };

  /**
   * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
   *
   * @param {Boolean} [allowExcess=true] - if `true` or omitted, no error will be thrown
   * for excess arguments.
   */
  allowExcessArguments(allowExcess = true) {
    this._allowExcessArguments = !!allowExcess;
    return this;
  };

  /**
   * Enable positional options. Positional means global options are specified before subcommands which lets
   * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
   * The default behaviour is non-positional and global options may appear anywhere on the command line.
   *
   * @param {Boolean} [positional=true]
   */
  enablePositionalOptions(positional = true) {
    this._enablePositionalOptions = !!positional;
    return this;
  };

  /**
   * Pass through options that come after command-arguments rather than treat them as command-options,
   * so actual command-options come before command-arguments. Turning this on for a subcommand requires
   * positional options to have been enabled on the program (parent commands).
   * The default behaviour is non-positional and options may appear before or after command-arguments.
   *
   * @param {Boolean} [passThrough=true]
   * for unknown options.
   */
  passThroughOptions(passThrough = true) {
    this._passThroughOptions = !!passThrough;
    if (!!this.parent && passThrough && !this.parent._enablePositionalOptions) {
      throw new Error('passThroughOptions can not be used without turning on enablePositionalOptions for parent command(s)');
    }
    return this;
  };

  /**
    * Whether to store option values as properties on command object,
    * or store separately (specify false). In both cases the option values can be accessed using .opts().
    *
    * @param {boolean} [storeAsProperties=true]
    * @return {Command} `this` command for chaining
    */

  storeOptionsAsProperties(storeAsProperties = true) {
    this._storeOptionsAsProperties = !!storeAsProperties;
    if (this.options.length) {
      throw new Error('call .storeOptionsAsProperties() before adding options');
    }
    return this;
  };

  /**
   * Retrieve option value.
   *
   * @param {string} key
   * @return {Object} value
   */

  getOptionValue(key) {
    if (this._storeOptionsAsProperties) {
      return this[key];
    }
    return this._optionValues[key];
  };

  /**
   * Store option value.
   *
   * @param {string} key
   * @param {Object} value
   * @return {Command} `this` command for chaining
   */

  setOptionValue(key, value) {
    if (this._storeOptionsAsProperties) {
      this[key] = value;
    } else {
      this._optionValues[key] = value;
    }
    return this;
  };

  /**
   * Store option value and where the value came from.
    *
    * @param {string} key
    * @param {Object} value
    * @param {string} source - expected values are default/config/env/cli
    * @return {Command} `this` command for chaining
    */

  setOptionValueWithSource(key, value, source) {
    this.setOptionValue(key, value);
    this._optionValueSources[key] = source;
    return this;
  }

  /**
    * Get source of option value.
    * Expected values are default | config | env | cli
    *
    * @param {string} key
    * @return {string}
    */

  getOptionValueSource(key) {
    return this._optionValueSources[key];
  };

  /**
   * Get user arguments implied or explicit arguments.
   * Side-effects: set _scriptPath if args included application, and use that to set implicit command name.
   *
   * @api private
   */

  _prepareUserArgs(argv, parseOptions) {
    if (argv !== undefined && !Array.isArray(argv)) {
      throw new Error('first parameter to parse must be array or undefined');
    }
    parseOptions = parseOptions || {};

    // Default to using process.argv
    if (argv === undefined) {
      argv = process.argv;
      // @ts-ignore: unknown property
      if (process.versions && process.versions.electron) {
        parseOptions.from = 'electron';
      }
    }
    this.rawArgs = argv.slice();

    // make it a little easier for callers by supporting various argv conventions
    let userArgs;
    switch (parseOptions.from) {
      case undefined:
      case 'node':
        this._scriptPath = argv[1];
        userArgs = argv.slice(2);
        break;
      case 'electron':
        // @ts-ignore: unknown property
        if (process.defaultApp) {
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
        } else {
          userArgs = argv.slice(1);
        }
        break;
      case 'user':
        userArgs = argv.slice(0);
        break;
      default:
        throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
    }
    if (!this._scriptPath && require.main) {
      this._scriptPath = require.main.filename;
    }

    // Guess name, used in usage in help.
    this._name = this._name || (this._scriptPath && path.basename(this._scriptPath, path.extname(this._scriptPath)));

    return userArgs;
  }

  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * The default expectation is that the arguments are from node and have the application as argv[0]
   * and the script being run in argv[1], with user parameters after that.
   *
   * @example
   * program.parse(process.argv);
   * program.parse(); // implicitly use process.argv and auto-detect node vs electron conventions
   * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv] - optional, defaults to process.argv
   * @param {Object} [parseOptions] - optionally specify style of options with from: node/user/electron
   * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
   * @return {Command} `this` command for chaining
   */

  parse(argv, parseOptions) {
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    this._parseCommand([], userArgs);

    return this;
  };

  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Use parseAsync instead of parse if any of your action handlers are async. Returns a Promise.
   *
   * The default expectation is that the arguments are from node and have the application as argv[0]
   * and the script being run in argv[1], with user parameters after that.
   *
   * @example
   * await program.parseAsync(process.argv);
   * await program.parseAsync(); // implicitly use process.argv and auto-detect node vs electron conventions
   * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv]
   * @param {Object} [parseOptions]
   * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
   * @return {Promise}
   */

  async parseAsync(argv, parseOptions) {
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    await this._parseCommand([], userArgs);

    return this;
  };

  /**
   * Execute a sub-command executable.
   *
   * @api private
   */

  _executeSubCommand(subcommand, args) {
    args = args.slice();
    let launchWithNode = false; // Use node for source targets so do not need to get permissions correct, and on Windows.
    const sourceExt = ['.js', '.ts', '.tsx', '.mjs', '.cjs'];

    // Not checking for help first. Unlikely to have mandatory and executable, and can't robustly test for help flags in external command.
    this._checkForMissingMandatoryOptions();

    // Want the entry script as the reference for command name and directory for searching for other files.
    let scriptPath = this._scriptPath;
    // Fallback in case not set, due to how Command created or called.
    if (!scriptPath && require.main) {
      scriptPath = require.main.filename;
    }

    let baseDir;
    try {
      const resolvedLink = fs.realpathSync(scriptPath);
      baseDir = path.dirname(resolvedLink);
    } catch (e) {
      baseDir = '.'; // dummy, probably not going to find executable!
    }

    // name of the subcommand, like `pm-install`
    let bin = path.basename(scriptPath, path.extname(scriptPath)) + '-' + subcommand._name;
    if (subcommand._executableFile) {
      bin = subcommand._executableFile;
    }

    const localBin = path.join(baseDir, bin);
    if (fs.existsSync(localBin)) {
      // prefer local `./<bin>` to bin in the $PATH
      bin = localBin;
    } else {
      // Look for source files.
      sourceExt.forEach((ext) => {
        if (fs.existsSync(`${localBin}${ext}`)) {
          bin = `${localBin}${ext}`;
        }
      });
    }
    launchWithNode = sourceExt.includes(path.extname(bin));

    let proc;
    if (process.platform !== 'win32') {
      if (launchWithNode) {
        args.unshift(bin);
        // add executable arguments to spawn
        args = incrementNodeInspectorPort(process.execArgv).concat(args);

        proc = childProcess.spawn(process.argv[0], args, { stdio: 'inherit' });
      } else {
        proc = childProcess.spawn(bin, args, { stdio: 'inherit' });
      }
    } else {
      args.unshift(bin);
      // add executable arguments to spawn
      args = incrementNodeInspectorPort(process.execArgv).concat(args);
      proc = childProcess.spawn(process.execPath, args, { stdio: 'inherit' });
    }

    const signals = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];
    signals.forEach((signal) => {
      // @ts-ignore
      process.on(signal, () => {
        if (proc.killed === false && proc.exitCode === null) {
          proc.kill(signal);
        }
      });
    });

    // By default terminate process when spawned process terminates.
    // Suppressing the exit if exitCallback defined is a bit messy and of limited use, but does allow process to stay running!
    const exitCallback = this._exitCallback;
    if (!exitCallback) {
      proc.on('close', process.exit.bind(process));
    } else {
      proc.on('close', () => {
        exitCallback(new CommanderError(process.exitCode || 0, 'commander.executeSubCommandAsync', '(close)'));
      });
    }
    proc.on('error', (err) => {
      // @ts-ignore
      if (err.code === 'ENOENT') {
        const executableMissing = `'${bin}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name`;
        throw new Error(executableMissing);
      // @ts-ignore
      } else if (err.code === 'EACCES') {
        throw new Error(`'${bin}' not executable`);
      }
      if (!exitCallback) {
        process.exit(1);
      } else {
        const wrappedError = new CommanderError(1, 'commander.executeSubCommandAsync', '(error)');
        wrappedError.nestedError = err;
        exitCallback(wrappedError);
      }
    });

    // Store the reference to the child process
    this.runningCommand = proc;
  };

  /**
   * @api private
   */

  _dispatchSubcommand(commandName, operands, unknown) {
    const subCommand = this._findCommand(commandName);
    if (!subCommand) this.help({ error: true });

    if (subCommand._executableHandler) {
      this._executeSubCommand(subCommand, operands.concat(unknown));
    } else {
      return subCommand._parseCommand(operands, unknown);
    }
  };

  /**
   * Check this.args against expected this._args.
   *
   * @api private
   */

  _checkNumberOfArguments() {
    // too few
    this._args.forEach((arg, i) => {
      if (arg.required && this.args[i] == null) {
        this.missingArgument(arg.name());
      }
    });
    // too many
    if (this._args.length > 0 && this._args[this._args.length - 1].variadic) {
      return;
    }
    if (this.args.length > this._args.length) {
      this._excessArguments(this.args);
    }
  };

  /**
   * Process this.args using this._args and save as this.processedArgs!
   *
   * @api private
   */

  _processArguments() {
    const myParseArg = (argument, value, previous) => {
      // Extra processing for nice error message on parsing failure.
      let parsedValue = value;
      if (value !== null && argument.parseArg) {
        try {
          parsedValue = argument.parseArg(value, previous);
        } catch (err) {
          if (err.code === 'commander.invalidArgument') {
            const message = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'. ${err.message}`;
            this._displayError(err.exitCode, err.code, message);
          }
          throw err;
        }
      }
      return parsedValue;
    };

    this._checkNumberOfArguments();

    const processedArgs = [];
    this._args.forEach((declaredArg, index) => {
      let value = declaredArg.defaultValue;
      if (declaredArg.variadic) {
        // Collect together remaining arguments for passing together as an array.
        if (index < this.args.length) {
          value = this.args.slice(index);
          if (declaredArg.parseArg) {
            value = value.reduce((processed, v) => {
              return myParseArg(declaredArg, v, processed);
            }, declaredArg.defaultValue);
          }
        } else if (value === undefined) {
          value = [];
        }
      } else if (index < this.args.length) {
        value = this.args[index];
        if (declaredArg.parseArg) {
          value = myParseArg(declaredArg, value, declaredArg.defaultValue);
        }
      }
      processedArgs[index] = value;
    });
    this.processedArgs = processedArgs;
  }

  /**
   * Once we have a promise we chain, but call synchronously until then.
   *
   * @param {Promise|undefined} promise
   * @param {Function} fn
   * @return {Promise|undefined}
   * @api private
   */

  _chainOrCall(promise, fn) {
    // thenable
    if (promise && promise.then && typeof promise.then === 'function') {
      // already have a promise, chain callback
      return promise.then(() => fn());
    }
    // callback might return a promise
    return fn();
  }

  /**
   *
   * @param {Promise|undefined} promise
   * @param {string} event
   * @return {Promise|undefined}
   * @api private
   */

  _chainOrCallHooks(promise, event) {
    let result = promise;
    const hooks = [];
    getCommandAndParents(this)
      .reverse()
      .filter(cmd => cmd._lifeCycleHooks[event] !== undefined)
      .forEach(hookedCommand => {
        hookedCommand._lifeCycleHooks[event].forEach((callback) => {
          hooks.push({ hookedCommand, callback });
        });
      });
    if (event === 'postAction') {
      hooks.reverse();
    }

    hooks.forEach((hookDetail) => {
      result = this._chainOrCall(result, () => {
        return hookDetail.callback(hookDetail.hookedCommand, this);
      });
    });
    return result;
  }

  /**
   * Process arguments in context of this command.
   * Returns action result, in case it is a promise.
   *
   * @api private
   */

  _parseCommand(operands, unknown) {
    const parsed = this.parseOptions(unknown);
    this._parseOptionsEnv(); // after cli, so parseArg not called on both cli and env
    operands = operands.concat(parsed.operands);
    unknown = parsed.unknown;
    this.args = operands.concat(unknown);

    if (operands && this._findCommand(operands[0])) {
      return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
    }
    if (this._hasImplicitHelpCommand() && operands[0] === this._helpCommandName) {
      if (operands.length === 1) {
        this.help();
      }
      return this._dispatchSubcommand(operands[1], [], [this._helpLongFlag]);
    }
    if (this._defaultCommandName) {
      outputHelpIfRequested(this, unknown); // Run the help for default command from parent rather than passing to default command
      return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
    }
    if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
      // probably missing subcommand and no handler, user needs help (and exit)
      this.help({ error: true });
    }

    outputHelpIfRequested(this, parsed.unknown);
    this._checkForMissingMandatoryOptions();

    // We do not always call this check to avoid masking a "better" error, like unknown command.
    const checkForUnknownOptions = () => {
      if (parsed.unknown.length > 0) {
        this.unknownOption(parsed.unknown[0]);
      }
    };

    const commandEvent = `command:${this.name()}`;
    if (this._actionHandler) {
      checkForUnknownOptions();
      this._processArguments();

      let actionResult;
      actionResult = this._chainOrCallHooks(actionResult, 'preAction');
      actionResult = this._chainOrCall(actionResult, () => this._actionHandler(this.processedArgs));
      if (this.parent) this.parent.emit(commandEvent, operands, unknown); // legacy
      actionResult = this._chainOrCallHooks(actionResult, 'postAction');
      return actionResult;
    }
    if (this.parent && this.parent.listenerCount(commandEvent)) {
      checkForUnknownOptions();
      this._processArguments();
      this.parent.emit(commandEvent, operands, unknown); // legacy
    } else if (operands.length) {
      if (this._findCommand('*')) { // legacy default command
        return this._dispatchSubcommand('*', operands, unknown);
      }
      if (this.listenerCount('command:*')) {
        // skip option check, emit event for possible misspelling suggestion
        this.emit('command:*', operands, unknown);
      } else if (this.commands.length) {
        this.unknownCommand();
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    } else if (this.commands.length) {
      checkForUnknownOptions();
      // This command has subcommands and nothing hooked up at this level, so display help (and exit).
      this.help({ error: true });
    } else {
      checkForUnknownOptions();
      this._processArguments();
      // fall through for caller to handle after calling .parse()
    }
  };

  /**
   * Find matching command.
   *
   * @api private
   */
  _findCommand(name) {
    if (!name) return undefined;
    return this.commands.find(cmd => cmd._name === name || cmd._aliases.includes(name));
  };

  /**
   * Return an option matching `arg` if any.
   *
   * @param {string} arg
   * @return {Option}
   * @api private
   */

  _findOption(arg) {
    return this.options.find(option => option.is(arg));
  };

  /**
   * Display an error message if a mandatory option does not have a value.
   * Lazy calling after checking for help flags from leaf subcommand.
   *
   * @api private
   */

  _checkForMissingMandatoryOptions() {
    // Walk up hierarchy so can call in subcommand after checking for displaying help.
    for (let cmd = this; cmd; cmd = cmd.parent) {
      cmd.options.forEach((anOption) => {
        if (anOption.mandatory && (cmd.getOptionValue(anOption.attributeName()) === undefined)) {
          cmd.missingMandatoryOptionValue(anOption);
        }
      });
    }
  };

  /**
   * Parse options from `argv` removing known options,
   * and return argv split into operands and unknown arguments.
   *
   * Examples:
   *
   *     argv => operands, unknown
   *     --known kkk op => [op], []
   *     op --known kkk => [op], []
   *     sub --unknown uuu op => [sub], [--unknown uuu op]
   *     sub -- --unknown uuu op => [sub --unknown uuu op], []
   *
   * @param {String[]} argv
   * @return {{operands: String[], unknown: String[]}}
   */

  parseOptions(argv) {
    const operands = []; // operands, not options or values
    const unknown = []; // first unknown option and remaining unknown args
    let dest = operands;
    const args = argv.slice();

    function maybeOption(arg) {
      return arg.length > 1 && arg[0] === '-';
    }

    // parse options
    let activeVariadicOption = null;
    while (args.length) {
      const arg = args.shift();

      // literal
      if (arg === '--') {
        if (dest === unknown) dest.push(arg);
        dest.push(...args);
        break;
      }

      if (activeVariadicOption && !maybeOption(arg)) {
        this.emit(`option:${activeVariadicOption.name()}`, arg);
        continue;
      }
      activeVariadicOption = null;

      if (maybeOption(arg)) {
        const option = this._findOption(arg);
        // recognised option, call listener to assign value with possible custom processing
        if (option) {
          if (option.required) {
            const value = args.shift();
            if (value === undefined) this.optionMissingArgument(option);
            this.emit(`option:${option.name()}`, value);
          } else if (option.optional) {
            let value = null;
            // historical behaviour is optional value is following arg unless an option
            if (args.length > 0 && !maybeOption(args[0])) {
              value = args.shift();
            }
            this.emit(`option:${option.name()}`, value);
          } else { // boolean flag
            this.emit(`option:${option.name()}`);
          }
          activeVariadicOption = option.variadic ? option : null;
          continue;
        }
      }

      // Look for combo options following single dash, eat first one if known.
      if (arg.length > 2 && arg[0] === '-' && arg[1] !== '-') {
        const option = this._findOption(`-${arg[1]}`);
        if (option) {
          if (option.required || (option.optional && this._combineFlagAndOptionalValue)) {
            // option with value following in same argument
            this.emit(`option:${option.name()}`, arg.slice(2));
          } else {
            // boolean option, emit and put back remainder of arg for further processing
            this.emit(`option:${option.name()}`);
            args.unshift(`-${arg.slice(2)}`);
          }
          continue;
        }
      }

      // Look for known long flag with value, like --foo=bar
      if (/^--[^=]+=/.test(arg)) {
        const index = arg.indexOf('=');
        const option = this._findOption(arg.slice(0, index));
        if (option && (option.required || option.optional)) {
          this.emit(`option:${option.name()}`, arg.slice(index + 1));
          continue;
        }
      }

      // Not a recognised option by this command.
      // Might be a command-argument, or subcommand option, or unknown option, or help command or option.

      // An unknown option means further arguments also classified as unknown so can be reprocessed by subcommands.
      if (maybeOption(arg)) {
        dest = unknown;
      }

      // If using positionalOptions, stop processing our options at subcommand.
      if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
        if (this._findCommand(arg)) {
          operands.push(arg);
          if (args.length > 0) unknown.push(...args);
          break;
        } else if (arg === this._helpCommandName && this._hasImplicitHelpCommand()) {
          operands.push(arg);
          if (args.length > 0) operands.push(...args);
          break;
        } else if (this._defaultCommandName) {
          unknown.push(arg);
          if (args.length > 0) unknown.push(...args);
          break;
        }
      }

      // If using passThroughOptions, stop processing options at first command-argument.
      if (this._passThroughOptions) {
        dest.push(arg);
        if (args.length > 0) dest.push(...args);
        break;
      }

      // add arg
      dest.push(arg);
    }

    return { operands, unknown };
  };

  /**
   * Return an object containing options as key-value pairs
   *
   * @return {Object}
   */
  opts() {
    if (this._storeOptionsAsProperties) {
      // Preserve original behaviour so backwards compatible when still using properties
      const result = {};
      const len = this.options.length;

      for (let i = 0; i < len; i++) {
        const key = this.options[i].attributeName();
        result[key] = key === this._versionOptionName ? this._version : this[key];
      }
      return result;
    }

    return this._optionValues;
  };

  /**
   * Internal bottleneck for handling of parsing errors.
   *
   * @api private
   */
  _displayError(exitCode, code, message) {
    this._outputConfiguration.outputError(`${message}\n`, this._outputConfiguration.writeErr);
    if (typeof this._showHelpAfterError === 'string') {
      this._outputConfiguration.writeErr(`${this._showHelpAfterError}\n`);
    } else if (this._showHelpAfterError) {
      this._outputConfiguration.writeErr('\n');
      this.outputHelp({ error: true });
    }
    this._exit(exitCode, code, message);
  }

  /**
   * Apply any option related environment variables, if option does
   * not have a value from cli or client code.
   *
   * @api private
   */
  _parseOptionsEnv() {
    this.options.forEach((option) => {
      if (option.envVar && option.envVar in process.env) {
        const optionKey = option.attributeName();
        // Priority check. Do not overwrite cli or options from unknown source (client-code).
        if (this.getOptionValue(optionKey) === undefined || ['default', 'config', 'env'].includes(this.getOptionValueSource(optionKey))) {
          if (option.required || option.optional) { // option can take a value
            // keep very simple, optional always takes value
            this.emit(`optionEnv:${option.name()}`, process.env[option.envVar]);
          } else { // boolean
            // keep very simple, only care that envVar defined and not the value
            this.emit(`optionEnv:${option.name()}`);
          }
        }
      }
    });
  }

  /**
   * Argument `name` is missing.
   *
   * @param {string} name
   * @api private
   */

  missingArgument(name) {
    const message = `error: missing required argument '${name}'`;
    this._displayError(1, 'commander.missingArgument', message);
  };

  /**
   * `Option` is missing an argument.
   *
   * @param {Option} option
   * @api private
   */

  optionMissingArgument(option) {
    const message = `error: option '${option.flags}' argument missing`;
    this._displayError(1, 'commander.optionMissingArgument', message);
  };

  /**
   * `Option` does not have a value, and is a mandatory option.
   *
   * @param {Option} option
   * @api private
   */

  missingMandatoryOptionValue(option) {
    const message = `error: required option '${option.flags}' not specified`;
    this._displayError(1, 'commander.missingMandatoryOptionValue', message);
  };

  /**
   * Unknown option `flag`.
   *
   * @param {string} flag
   * @api private
   */

  unknownOption(flag) {
    if (this._allowUnknownOption) return;
    let suggestion = '';

    if (flag.startsWith('--') && this._showSuggestionAfterError) {
      // Looping to pick up the global options too
      let candidateFlags = [];
      let command = this;
      do {
        const moreFlags = command.createHelp().visibleOptions(command)
          .filter(option => option.long)
          .map(option => option.long);
        candidateFlags = candidateFlags.concat(moreFlags);
        command = command.parent;
      } while (command && !command._enablePositionalOptions);
      suggestion = suggestSimilar(flag, candidateFlags);
    }

    const message = `error: unknown option '${flag}'${suggestion}`;
    this._displayError(1, 'commander.unknownOption', message);
  };

  /**
   * Excess arguments, more than expected.
   *
   * @param {string[]} receivedArgs
   * @api private
   */

  _excessArguments(receivedArgs) {
    if (this._allowExcessArguments) return;

    const expected = this._args.length;
    const s = (expected === 1) ? '' : 's';
    const forSubcommand = this.parent ? ` for '${this.name()}'` : '';
    const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
    this._displayError(1, 'commander.excessArguments', message);
  };

  /**
   * Unknown command.
   *
   * @api private
   */

  unknownCommand() {
    const unknownName = this.args[0];
    let suggestion = '';

    if (this._showSuggestionAfterError) {
      const candidateNames = [];
      this.createHelp().visibleCommands(this).forEach((command) => {
        candidateNames.push(command.name());
        // just visible alias
        if (command.alias()) candidateNames.push(command.alias());
      });
      suggestion = suggestSimilar(unknownName, candidateNames);
    }

    const message = `error: unknown command '${unknownName}'${suggestion}`;
    this._displayError(1, 'commander.unknownCommand', message);
  };

  /**
   * Set the program version to `str`.
   *
   * This method auto-registers the "-V, --version" flag
   * which will print the version number when passed.
   *
   * You can optionally supply the  flags and description to override the defaults.
   *
   * @param {string} str
   * @param {string} [flags]
   * @param {string} [description]
   * @return {this | string} `this` command for chaining, or version string if no arguments
   */

  version(str, flags, description) {
    if (str === undefined) return this._version;
    this._version = str;
    flags = flags || '-V, --version';
    description = description || 'output the version number';
    const versionOption = this.createOption(flags, description);
    this._versionOptionName = versionOption.attributeName();
    this.options.push(versionOption);
    this.on('option:' + versionOption.name(), () => {
      this._outputConfiguration.writeOut(`${str}\n`);
      this._exit(0, 'commander.version', str);
    });
    return this;
  };

  /**
   * Set the description to `str`.
   *
   * @param {string} [str]
   * @param {Object} [argsDescription]
   * @return {string|Command}
   */
  description(str, argsDescription) {
    if (str === undefined && argsDescription === undefined) return this._description;
    this._description = str;
    if (argsDescription) {
      this._argsDescription = argsDescription;
    }
    return this;
  };

  /**
   * Set an alias for the command.
   *
   * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
   *
   * @param {string} [alias]
   * @return {string|Command}
   */

  alias(alias) {
    if (alias === undefined) return this._aliases[0]; // just return first, for backwards compatibility

    /** @type {Command} */
    let command = this;
    if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
      // assume adding alias for last added executable subcommand, rather than this
      command = this.commands[this.commands.length - 1];
    }

    if (alias === command._name) throw new Error('Command alias can\'t be the same as its name');

    command._aliases.push(alias);
    return this;
  };

  /**
   * Set aliases for the command.
   *
   * Only the first alias is shown in the auto-generated help.
   *
   * @param {string[]} [aliases]
   * @return {string[]|Command}
   */

  aliases(aliases) {
    // Getter for the array of aliases is the main reason for having aliases() in addition to alias().
    if (aliases === undefined) return this._aliases;

    aliases.forEach((alias) => this.alias(alias));
    return this;
  };

  /**
   * Set / get the command usage `str`.
   *
   * @param {string} [str]
   * @return {String|Command}
   */

  usage(str) {
    if (str === undefined) {
      if (this._usage) return this._usage;

      const args = this._args.map((arg) => {
        return humanReadableArgName(arg);
      });
      return [].concat(
        (this.options.length || this._hasHelpOption ? '[options]' : []),
        (this.commands.length ? '[command]' : []),
        (this._args.length ? args : [])
      ).join(' ');
    }

    this._usage = str;
    return this;
  };

  /**
   * Get or set the name of the command
   *
   * @param {string} [str]
   * @return {string|Command}
   */

  name(str) {
    if (str === undefined) return this._name;
    this._name = str;
    return this;
  };

  /**
   * Return program help documentation.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
   * @return {string}
   */

  helpInformation(contextOptions) {
    const helper = this.createHelp();
    if (helper.helpWidth === undefined) {
      helper.helpWidth = (contextOptions && contextOptions.error) ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
    }
    return helper.formatHelp(this, helper);
  };

  /**
   * @api private
   */

  _getHelpContext(contextOptions) {
    contextOptions = contextOptions || {};
    const context = { error: !!contextOptions.error };
    let write;
    if (context.error) {
      write = (arg) => this._outputConfiguration.writeErr(arg);
    } else {
      write = (arg) => this._outputConfiguration.writeOut(arg);
    }
    context.write = contextOptions.write || write;
    context.command = this;
    return context;
  }

  /**
   * Output help information for this command.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */

  outputHelp(contextOptions) {
    let deprecatedCallback;
    if (typeof contextOptions === 'function') {
      deprecatedCallback = contextOptions;
      contextOptions = undefined;
    }
    const context = this._getHelpContext(contextOptions);

    getCommandAndParents(this).reverse().forEach(command => command.emit('beforeAllHelp', context));
    this.emit('beforeHelp', context);

    let helpInformation = this.helpInformation(context);
    if (deprecatedCallback) {
      helpInformation = deprecatedCallback(helpInformation);
      if (typeof helpInformation !== 'string' && !Buffer.isBuffer(helpInformation)) {
        throw new Error('outputHelp callback must return a string or a Buffer');
      }
    }
    context.write(helpInformation);

    this.emit(this._helpLongFlag); // deprecated
    this.emit('afterHelp', context);
    getCommandAndParents(this).forEach(command => command.emit('afterAllHelp', context));
  };

  /**
   * You can pass in flags and a description to override the help
   * flags and help description for your command. Pass in false to
   * disable the built-in help option.
   *
   * @param {string | boolean} [flags]
   * @param {string} [description]
   * @return {Command} `this` command for chaining
   */

  helpOption(flags, description) {
    if (typeof flags === 'boolean') {
      this._hasHelpOption = flags;
      return this;
    }
    this._helpFlags = flags || this._helpFlags;
    this._helpDescription = description || this._helpDescription;

    const helpFlags = splitOptionFlags(this._helpFlags);
    this._helpShortFlag = helpFlags.shortFlag;
    this._helpLongFlag = helpFlags.longFlag;

    return this;
  };

  /**
   * Output help information and exit.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */

  help(contextOptions) {
    this.outputHelp(contextOptions);
    let exitCode = process.exitCode || 0;
    if (exitCode === 0 && contextOptions && typeof contextOptions !== 'function' && contextOptions.error) {
      exitCode = 1;
    }
    // message: do not have all displayed text available so only passing placeholder.
    this._exit(exitCode, 'commander.help', '(outputHelp)');
  };

  /**
   * Add additional text to be displayed with the built-in help.
   *
   * Position is 'before' or 'after' to affect just this command,
   * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
   *
   * @param {string} position - before or after built-in help
   * @param {string | Function} text - string to add, or a function returning a string
   * @return {Command} `this` command for chaining
   */
  addHelpText(position, text) {
    const allowedValues = ['beforeAll', 'before', 'after', 'afterAll'];
    if (!allowedValues.includes(position)) {
      throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    const helpEvent = `${position}Help`;
    this.on(helpEvent, (context) => {
      let helpStr;
      if (typeof text === 'function') {
        helpStr = text({ error: context.error, command: context.command });
      } else {
        helpStr = text;
      }
      // Ignore falsy value when nothing to output.
      if (helpStr) {
        context.write(`${helpStr}\n`);
      }
    });
    return this;
  }
}
/**
 * Output help information if help flags specified
 *
 * @param {Command} cmd - command to output help for
 * @param {Array} args - array of options to search for help flags
 * @api private
 */

function outputHelpIfRequested(cmd, args) {
  const helpOption = cmd._hasHelpOption && args.find(arg => arg === cmd._helpLongFlag || arg === cmd._helpShortFlag);
  if (helpOption) {
    cmd.outputHelp();
    // (Do not have all displayed text available so only passing placeholder.)
    cmd._exit(0, 'commander.helpDisplayed', '(outputHelp)');
  }
}

/**
 * Scan arguments and increment port number for inspect calls (to avoid conflicts when spawning new command).
 *
 * @param {string[]} args - array of arguments from node.execArgv
 * @returns {string[]}
 * @api private
 */

function incrementNodeInspectorPort(args) {
  // Testing for these options:
  //  --inspect[=[host:]port]
  //  --inspect-brk[=[host:]port]
  //  --inspect-port=[host:]port
  return args.map((arg) => {
    if (!arg.startsWith('--inspect')) {
      return arg;
    }
    let debugOption;
    let debugHost = '127.0.0.1';
    let debugPort = '9229';
    let match;
    if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
      // e.g. --inspect
      debugOption = match[1];
    } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
      debugOption = match[1];
      if (/^\d+$/.test(match[3])) {
        // e.g. --inspect=1234
        debugPort = match[3];
      } else {
        // e.g. --inspect=localhost
        debugHost = match[3];
      }
    } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
      // e.g. --inspect=localhost:1234
      debugOption = match[1];
      debugHost = match[3];
      debugPort = match[4];
    }

    if (debugOption && debugPort !== '0') {
      return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
    }
    return arg;
  });
}

/**
 * @param {Command} startCommand
 * @returns {Command[]}
 * @api private
 */

function getCommandAndParents(startCommand) {
  const result = [];
  for (let command = startCommand; command; command = command.parent) {
    result.push(command);
  }
  return result;
}

command.Command = Command;

(function (module, exports) {
const { Argument } = argument;
const { Command } = command;
const { CommanderError, InvalidArgumentError } = error;
const { Help } = help;
const { Option } = option;

// @ts-check

/**
 * Expose the root command.
 */

exports = module.exports = new Command();
exports.program = exports; // More explicit access to global command.
// Implicit export of createArgument, createCommand, and createOption.

/**
 * Expose classes
 */

exports.Argument = Argument;
exports.Command = Command;
exports.CommanderError = CommanderError;
exports.Help = Help;
exports.InvalidArgumentError = InvalidArgumentError;
exports.InvalidOptionArgumentError = InvalidArgumentError; // Deprecated
exports.Option = Option;
}(commander, commander.exports));

var src = {};

var createStream$1 = {};

var alignTableData$1 = {};

var alignString$1 = {};

var stringWidth$1 = {exports: {}};

var ansiRegex$1 = ({onlyFirst = false} = {}) => {
	const pattern = [
		'[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
		'(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
	].join('|');

	return new RegExp(pattern, onlyFirst ? undefined : 'g');
};

const ansiRegex = ansiRegex$1;

var stripAnsi$1 = string => typeof string === 'string' ? string.replace(ansiRegex(), '') : string;

var isFullwidthCodePoint$3 = {exports: {}};

/* eslint-disable yoda */

const isFullwidthCodePoint$2 = codePoint => {
	if (Number.isNaN(codePoint)) {
		return false;
	}

	// Code points are derived from:
	// http://www.unix.org/Public/UNIDATA/EastAsianWidth.txt
	if (
		codePoint >= 0x1100 && (
			codePoint <= 0x115F || // Hangul Jamo
			codePoint === 0x2329 || // LEFT-POINTING ANGLE BRACKET
			codePoint === 0x232A || // RIGHT-POINTING ANGLE BRACKET
			// CJK Radicals Supplement .. Enclosed CJK Letters and Months
			(0x2E80 <= codePoint && codePoint <= 0x3247 && codePoint !== 0x303F) ||
			// Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
			(0x3250 <= codePoint && codePoint <= 0x4DBF) ||
			// CJK Unified Ideographs .. Yi Radicals
			(0x4E00 <= codePoint && codePoint <= 0xA4C6) ||
			// Hangul Jamo Extended-A
			(0xA960 <= codePoint && codePoint <= 0xA97C) ||
			// Hangul Syllables
			(0xAC00 <= codePoint && codePoint <= 0xD7A3) ||
			// CJK Compatibility Ideographs
			(0xF900 <= codePoint && codePoint <= 0xFAFF) ||
			// Vertical Forms
			(0xFE10 <= codePoint && codePoint <= 0xFE19) ||
			// CJK Compatibility Forms .. Small Form Variants
			(0xFE30 <= codePoint && codePoint <= 0xFE6B) ||
			// Halfwidth and Fullwidth Forms
			(0xFF01 <= codePoint && codePoint <= 0xFF60) ||
			(0xFFE0 <= codePoint && codePoint <= 0xFFE6) ||
			// Kana Supplement
			(0x1B000 <= codePoint && codePoint <= 0x1B001) ||
			// Enclosed Ideographic Supplement
			(0x1F200 <= codePoint && codePoint <= 0x1F251) ||
			// CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
			(0x20000 <= codePoint && codePoint <= 0x3FFFD)
		)
	) {
		return true;
	}

	return false;
};

isFullwidthCodePoint$3.exports = isFullwidthCodePoint$2;
isFullwidthCodePoint$3.exports.default = isFullwidthCodePoint$2;

var emojiRegex$1 = function () {
  // https://mths.be/emoji
  return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F|\uD83D\uDC68(?:\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68\uD83C\uDFFB|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|[\u2695\u2696\u2708]\uFE0F|\uD83D[\uDC66\uDC67]|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708])\uFE0F|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C[\uDFFB-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)\uD83C\uDFFB|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB\uDFFC])|\uD83D\uDC69(?:\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB-\uDFFD])|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|(?:(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)\uFE0F|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\u200D[\u2640\u2642])|\uD83C\uDFF4\u200D\u2620)\uFE0F|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF4\uD83C\uDDF2|\uD83C\uDDF6\uD83C\uDDE6|[#\*0-9]\uFE0F\u20E3|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270A-\u270D]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC70\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDCAA\uDD74\uDD7A\uDD90\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD36\uDDB5\uDDB6\uDDBB\uDDD2-\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5\uDEEB\uDEEC\uDEF4-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
};

const stripAnsi = stripAnsi$1;
const isFullwidthCodePoint$1 = isFullwidthCodePoint$3.exports;
const emojiRegex = emojiRegex$1;

const stringWidth = string => {
	if (typeof string !== 'string' || string.length === 0) {
		return 0;
	}

	string = stripAnsi(string);

	if (string.length === 0) {
		return 0;
	}

	string = string.replace(emojiRegex(), '  ');

	let width = 0;

	for (let i = 0; i < string.length; i++) {
		const code = string.codePointAt(i);

		// Ignore control characters
		if (code <= 0x1F || (code >= 0x7F && code <= 0x9F)) {
			continue;
		}

		// Ignore combining characters
		if (code >= 0x300 && code <= 0x36F) {
			continue;
		}

		// Surrogates
		if (code > 0xFFFF) {
			i++;
		}

		width += isFullwidthCodePoint$1(code) ? 2 : 1;
	}

	return width;
};

stringWidth$1.exports = stringWidth;
// TODO: remove this in the next major version
stringWidth$1.exports.default = stringWidth;

var utils = {};

const regex = '[\uD800-\uDBFF][\uDC00-\uDFFF]';

const astralRegex$1 = options => options && options.exact ? new RegExp(`^${regex}$`) : new RegExp(regex, 'g');

var astralRegex_1 = astralRegex$1;

var ansiStyles$2 = {exports: {}};

var colorName = {
	"aliceblue": [240, 248, 255],
	"antiquewhite": [250, 235, 215],
	"aqua": [0, 255, 255],
	"aquamarine": [127, 255, 212],
	"azure": [240, 255, 255],
	"beige": [245, 245, 220],
	"bisque": [255, 228, 196],
	"black": [0, 0, 0],
	"blanchedalmond": [255, 235, 205],
	"blue": [0, 0, 255],
	"blueviolet": [138, 43, 226],
	"brown": [165, 42, 42],
	"burlywood": [222, 184, 135],
	"cadetblue": [95, 158, 160],
	"chartreuse": [127, 255, 0],
	"chocolate": [210, 105, 30],
	"coral": [255, 127, 80],
	"cornflowerblue": [100, 149, 237],
	"cornsilk": [255, 248, 220],
	"crimson": [220, 20, 60],
	"cyan": [0, 255, 255],
	"darkblue": [0, 0, 139],
	"darkcyan": [0, 139, 139],
	"darkgoldenrod": [184, 134, 11],
	"darkgray": [169, 169, 169],
	"darkgreen": [0, 100, 0],
	"darkgrey": [169, 169, 169],
	"darkkhaki": [189, 183, 107],
	"darkmagenta": [139, 0, 139],
	"darkolivegreen": [85, 107, 47],
	"darkorange": [255, 140, 0],
	"darkorchid": [153, 50, 204],
	"darkred": [139, 0, 0],
	"darksalmon": [233, 150, 122],
	"darkseagreen": [143, 188, 143],
	"darkslateblue": [72, 61, 139],
	"darkslategray": [47, 79, 79],
	"darkslategrey": [47, 79, 79],
	"darkturquoise": [0, 206, 209],
	"darkviolet": [148, 0, 211],
	"deeppink": [255, 20, 147],
	"deepskyblue": [0, 191, 255],
	"dimgray": [105, 105, 105],
	"dimgrey": [105, 105, 105],
	"dodgerblue": [30, 144, 255],
	"firebrick": [178, 34, 34],
	"floralwhite": [255, 250, 240],
	"forestgreen": [34, 139, 34],
	"fuchsia": [255, 0, 255],
	"gainsboro": [220, 220, 220],
	"ghostwhite": [248, 248, 255],
	"gold": [255, 215, 0],
	"goldenrod": [218, 165, 32],
	"gray": [128, 128, 128],
	"green": [0, 128, 0],
	"greenyellow": [173, 255, 47],
	"grey": [128, 128, 128],
	"honeydew": [240, 255, 240],
	"hotpink": [255, 105, 180],
	"indianred": [205, 92, 92],
	"indigo": [75, 0, 130],
	"ivory": [255, 255, 240],
	"khaki": [240, 230, 140],
	"lavender": [230, 230, 250],
	"lavenderblush": [255, 240, 245],
	"lawngreen": [124, 252, 0],
	"lemonchiffon": [255, 250, 205],
	"lightblue": [173, 216, 230],
	"lightcoral": [240, 128, 128],
	"lightcyan": [224, 255, 255],
	"lightgoldenrodyellow": [250, 250, 210],
	"lightgray": [211, 211, 211],
	"lightgreen": [144, 238, 144],
	"lightgrey": [211, 211, 211],
	"lightpink": [255, 182, 193],
	"lightsalmon": [255, 160, 122],
	"lightseagreen": [32, 178, 170],
	"lightskyblue": [135, 206, 250],
	"lightslategray": [119, 136, 153],
	"lightslategrey": [119, 136, 153],
	"lightsteelblue": [176, 196, 222],
	"lightyellow": [255, 255, 224],
	"lime": [0, 255, 0],
	"limegreen": [50, 205, 50],
	"linen": [250, 240, 230],
	"magenta": [255, 0, 255],
	"maroon": [128, 0, 0],
	"mediumaquamarine": [102, 205, 170],
	"mediumblue": [0, 0, 205],
	"mediumorchid": [186, 85, 211],
	"mediumpurple": [147, 112, 219],
	"mediumseagreen": [60, 179, 113],
	"mediumslateblue": [123, 104, 238],
	"mediumspringgreen": [0, 250, 154],
	"mediumturquoise": [72, 209, 204],
	"mediumvioletred": [199, 21, 133],
	"midnightblue": [25, 25, 112],
	"mintcream": [245, 255, 250],
	"mistyrose": [255, 228, 225],
	"moccasin": [255, 228, 181],
	"navajowhite": [255, 222, 173],
	"navy": [0, 0, 128],
	"oldlace": [253, 245, 230],
	"olive": [128, 128, 0],
	"olivedrab": [107, 142, 35],
	"orange": [255, 165, 0],
	"orangered": [255, 69, 0],
	"orchid": [218, 112, 214],
	"palegoldenrod": [238, 232, 170],
	"palegreen": [152, 251, 152],
	"paleturquoise": [175, 238, 238],
	"palevioletred": [219, 112, 147],
	"papayawhip": [255, 239, 213],
	"peachpuff": [255, 218, 185],
	"peru": [205, 133, 63],
	"pink": [255, 192, 203],
	"plum": [221, 160, 221],
	"powderblue": [176, 224, 230],
	"purple": [128, 0, 128],
	"rebeccapurple": [102, 51, 153],
	"red": [255, 0, 0],
	"rosybrown": [188, 143, 143],
	"royalblue": [65, 105, 225],
	"saddlebrown": [139, 69, 19],
	"salmon": [250, 128, 114],
	"sandybrown": [244, 164, 96],
	"seagreen": [46, 139, 87],
	"seashell": [255, 245, 238],
	"sienna": [160, 82, 45],
	"silver": [192, 192, 192],
	"skyblue": [135, 206, 235],
	"slateblue": [106, 90, 205],
	"slategray": [112, 128, 144],
	"slategrey": [112, 128, 144],
	"snow": [255, 250, 250],
	"springgreen": [0, 255, 127],
	"steelblue": [70, 130, 180],
	"tan": [210, 180, 140],
	"teal": [0, 128, 128],
	"thistle": [216, 191, 216],
	"tomato": [255, 99, 71],
	"turquoise": [64, 224, 208],
	"violet": [238, 130, 238],
	"wheat": [245, 222, 179],
	"white": [255, 255, 255],
	"whitesmoke": [245, 245, 245],
	"yellow": [255, 255, 0],
	"yellowgreen": [154, 205, 50]
};

/* MIT license */

/* eslint-disable no-mixed-operators */
const cssKeywords = colorName;

// NOTE: conversions should only return primitive values (i.e. arrays, or
//       values that give correct `typeof` results).
//       do not use box values types (i.e. Number(), String(), etc.)

const reverseKeywords = {};
for (const key of Object.keys(cssKeywords)) {
	reverseKeywords[cssKeywords[key]] = key;
}

const convert$1 = {
	rgb: {channels: 3, labels: 'rgb'},
	hsl: {channels: 3, labels: 'hsl'},
	hsv: {channels: 3, labels: 'hsv'},
	hwb: {channels: 3, labels: 'hwb'},
	cmyk: {channels: 4, labels: 'cmyk'},
	xyz: {channels: 3, labels: 'xyz'},
	lab: {channels: 3, labels: 'lab'},
	lch: {channels: 3, labels: 'lch'},
	hex: {channels: 1, labels: ['hex']},
	keyword: {channels: 1, labels: ['keyword']},
	ansi16: {channels: 1, labels: ['ansi16']},
	ansi256: {channels: 1, labels: ['ansi256']},
	hcg: {channels: 3, labels: ['h', 'c', 'g']},
	apple: {channels: 3, labels: ['r16', 'g16', 'b16']},
	gray: {channels: 1, labels: ['gray']}
};

var conversions$2 = convert$1;

// Hide .channels and .labels properties
for (const model of Object.keys(convert$1)) {
	if (!('channels' in convert$1[model])) {
		throw new Error('missing channels property: ' + model);
	}

	if (!('labels' in convert$1[model])) {
		throw new Error('missing channel labels property: ' + model);
	}

	if (convert$1[model].labels.length !== convert$1[model].channels) {
		throw new Error('channel and label counts mismatch: ' + model);
	}

	const {channels, labels} = convert$1[model];
	delete convert$1[model].channels;
	delete convert$1[model].labels;
	Object.defineProperty(convert$1[model], 'channels', {value: channels});
	Object.defineProperty(convert$1[model], 'labels', {value: labels});
}

convert$1.rgb.hsl = function (rgb) {
	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;
	const min = Math.min(r, g, b);
	const max = Math.max(r, g, b);
	const delta = max - min;
	let h;
	let s;

	if (max === min) {
		h = 0;
	} else if (r === max) {
		h = (g - b) / delta;
	} else if (g === max) {
		h = 2 + (b - r) / delta;
	} else if (b === max) {
		h = 4 + (r - g) / delta;
	}

	h = Math.min(h * 60, 360);

	if (h < 0) {
		h += 360;
	}

	const l = (min + max) / 2;

	if (max === min) {
		s = 0;
	} else if (l <= 0.5) {
		s = delta / (max + min);
	} else {
		s = delta / (2 - max - min);
	}

	return [h, s * 100, l * 100];
};

convert$1.rgb.hsv = function (rgb) {
	let rdif;
	let gdif;
	let bdif;
	let h;
	let s;

	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;
	const v = Math.max(r, g, b);
	const diff = v - Math.min(r, g, b);
	const diffc = function (c) {
		return (v - c) / 6 / diff + 1 / 2;
	};

	if (diff === 0) {
		h = 0;
		s = 0;
	} else {
		s = diff / v;
		rdif = diffc(r);
		gdif = diffc(g);
		bdif = diffc(b);

		if (r === v) {
			h = bdif - gdif;
		} else if (g === v) {
			h = (1 / 3) + rdif - bdif;
		} else if (b === v) {
			h = (2 / 3) + gdif - rdif;
		}

		if (h < 0) {
			h += 1;
		} else if (h > 1) {
			h -= 1;
		}
	}

	return [
		h * 360,
		s * 100,
		v * 100
	];
};

convert$1.rgb.hwb = function (rgb) {
	const r = rgb[0];
	const g = rgb[1];
	let b = rgb[2];
	const h = convert$1.rgb.hsl(rgb)[0];
	const w = 1 / 255 * Math.min(r, Math.min(g, b));

	b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));

	return [h, w * 100, b * 100];
};

convert$1.rgb.cmyk = function (rgb) {
	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;

	const k = Math.min(1 - r, 1 - g, 1 - b);
	const c = (1 - r - k) / (1 - k) || 0;
	const m = (1 - g - k) / (1 - k) || 0;
	const y = (1 - b - k) / (1 - k) || 0;

	return [c * 100, m * 100, y * 100, k * 100];
};

function comparativeDistance(x, y) {
	/*
		See https://en.m.wikipedia.org/wiki/Euclidean_distance#Squared_Euclidean_distance
	*/
	return (
		((x[0] - y[0]) ** 2) +
		((x[1] - y[1]) ** 2) +
		((x[2] - y[2]) ** 2)
	);
}

convert$1.rgb.keyword = function (rgb) {
	const reversed = reverseKeywords[rgb];
	if (reversed) {
		return reversed;
	}

	let currentClosestDistance = Infinity;
	let currentClosestKeyword;

	for (const keyword of Object.keys(cssKeywords)) {
		const value = cssKeywords[keyword];

		// Compute comparative distance
		const distance = comparativeDistance(rgb, value);

		// Check if its less, if so set as closest
		if (distance < currentClosestDistance) {
			currentClosestDistance = distance;
			currentClosestKeyword = keyword;
		}
	}

	return currentClosestKeyword;
};

convert$1.keyword.rgb = function (keyword) {
	return cssKeywords[keyword];
};

convert$1.rgb.xyz = function (rgb) {
	let r = rgb[0] / 255;
	let g = rgb[1] / 255;
	let b = rgb[2] / 255;

	// Assume sRGB
	r = r > 0.04045 ? (((r + 0.055) / 1.055) ** 2.4) : (r / 12.92);
	g = g > 0.04045 ? (((g + 0.055) / 1.055) ** 2.4) : (g / 12.92);
	b = b > 0.04045 ? (((b + 0.055) / 1.055) ** 2.4) : (b / 12.92);

	const x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
	const y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
	const z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

	return [x * 100, y * 100, z * 100];
};

convert$1.rgb.lab = function (rgb) {
	const xyz = convert$1.rgb.xyz(rgb);
	let x = xyz[0];
	let y = xyz[1];
	let z = xyz[2];

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > 0.008856 ? (x ** (1 / 3)) : (7.787 * x) + (16 / 116);
	y = y > 0.008856 ? (y ** (1 / 3)) : (7.787 * y) + (16 / 116);
	z = z > 0.008856 ? (z ** (1 / 3)) : (7.787 * z) + (16 / 116);

	const l = (116 * y) - 16;
	const a = 500 * (x - y);
	const b = 200 * (y - z);

	return [l, a, b];
};

convert$1.hsl.rgb = function (hsl) {
	const h = hsl[0] / 360;
	const s = hsl[1] / 100;
	const l = hsl[2] / 100;
	let t2;
	let t3;
	let val;

	if (s === 0) {
		val = l * 255;
		return [val, val, val];
	}

	if (l < 0.5) {
		t2 = l * (1 + s);
	} else {
		t2 = l + s - l * s;
	}

	const t1 = 2 * l - t2;

	const rgb = [0, 0, 0];
	for (let i = 0; i < 3; i++) {
		t3 = h + 1 / 3 * -(i - 1);
		if (t3 < 0) {
			t3++;
		}

		if (t3 > 1) {
			t3--;
		}

		if (6 * t3 < 1) {
			val = t1 + (t2 - t1) * 6 * t3;
		} else if (2 * t3 < 1) {
			val = t2;
		} else if (3 * t3 < 2) {
			val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
		} else {
			val = t1;
		}

		rgb[i] = val * 255;
	}

	return rgb;
};

convert$1.hsl.hsv = function (hsl) {
	const h = hsl[0];
	let s = hsl[1] / 100;
	let l = hsl[2] / 100;
	let smin = s;
	const lmin = Math.max(l, 0.01);

	l *= 2;
	s *= (l <= 1) ? l : 2 - l;
	smin *= lmin <= 1 ? lmin : 2 - lmin;
	const v = (l + s) / 2;
	const sv = l === 0 ? (2 * smin) / (lmin + smin) : (2 * s) / (l + s);

	return [h, sv * 100, v * 100];
};

convert$1.hsv.rgb = function (hsv) {
	const h = hsv[0] / 60;
	const s = hsv[1] / 100;
	let v = hsv[2] / 100;
	const hi = Math.floor(h) % 6;

	const f = h - Math.floor(h);
	const p = 255 * v * (1 - s);
	const q = 255 * v * (1 - (s * f));
	const t = 255 * v * (1 - (s * (1 - f)));
	v *= 255;

	switch (hi) {
		case 0:
			return [v, t, p];
		case 1:
			return [q, v, p];
		case 2:
			return [p, v, t];
		case 3:
			return [p, q, v];
		case 4:
			return [t, p, v];
		case 5:
			return [v, p, q];
	}
};

convert$1.hsv.hsl = function (hsv) {
	const h = hsv[0];
	const s = hsv[1] / 100;
	const v = hsv[2] / 100;
	const vmin = Math.max(v, 0.01);
	let sl;
	let l;

	l = (2 - s) * v;
	const lmin = (2 - s) * vmin;
	sl = s * vmin;
	sl /= (lmin <= 1) ? lmin : 2 - lmin;
	sl = sl || 0;
	l /= 2;

	return [h, sl * 100, l * 100];
};

// http://dev.w3.org/csswg/css-color/#hwb-to-rgb
convert$1.hwb.rgb = function (hwb) {
	const h = hwb[0] / 360;
	let wh = hwb[1] / 100;
	let bl = hwb[2] / 100;
	const ratio = wh + bl;
	let f;

	// Wh + bl cant be > 1
	if (ratio > 1) {
		wh /= ratio;
		bl /= ratio;
	}

	const i = Math.floor(6 * h);
	const v = 1 - bl;
	f = 6 * h - i;

	if ((i & 0x01) !== 0) {
		f = 1 - f;
	}

	const n = wh + f * (v - wh); // Linear interpolation

	let r;
	let g;
	let b;
	/* eslint-disable max-statements-per-line,no-multi-spaces */
	switch (i) {
		default:
		case 6:
		case 0: r = v;  g = n;  b = wh; break;
		case 1: r = n;  g = v;  b = wh; break;
		case 2: r = wh; g = v;  b = n; break;
		case 3: r = wh; g = n;  b = v; break;
		case 4: r = n;  g = wh; b = v; break;
		case 5: r = v;  g = wh; b = n; break;
	}
	/* eslint-enable max-statements-per-line,no-multi-spaces */

	return [r * 255, g * 255, b * 255];
};

convert$1.cmyk.rgb = function (cmyk) {
	const c = cmyk[0] / 100;
	const m = cmyk[1] / 100;
	const y = cmyk[2] / 100;
	const k = cmyk[3] / 100;

	const r = 1 - Math.min(1, c * (1 - k) + k);
	const g = 1 - Math.min(1, m * (1 - k) + k);
	const b = 1 - Math.min(1, y * (1 - k) + k);

	return [r * 255, g * 255, b * 255];
};

convert$1.xyz.rgb = function (xyz) {
	const x = xyz[0] / 100;
	const y = xyz[1] / 100;
	const z = xyz[2] / 100;
	let r;
	let g;
	let b;

	r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
	g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
	b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

	// Assume sRGB
	r = r > 0.0031308
		? ((1.055 * (r ** (1.0 / 2.4))) - 0.055)
		: r * 12.92;

	g = g > 0.0031308
		? ((1.055 * (g ** (1.0 / 2.4))) - 0.055)
		: g * 12.92;

	b = b > 0.0031308
		? ((1.055 * (b ** (1.0 / 2.4))) - 0.055)
		: b * 12.92;

	r = Math.min(Math.max(0, r), 1);
	g = Math.min(Math.max(0, g), 1);
	b = Math.min(Math.max(0, b), 1);

	return [r * 255, g * 255, b * 255];
};

convert$1.xyz.lab = function (xyz) {
	let x = xyz[0];
	let y = xyz[1];
	let z = xyz[2];

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > 0.008856 ? (x ** (1 / 3)) : (7.787 * x) + (16 / 116);
	y = y > 0.008856 ? (y ** (1 / 3)) : (7.787 * y) + (16 / 116);
	z = z > 0.008856 ? (z ** (1 / 3)) : (7.787 * z) + (16 / 116);

	const l = (116 * y) - 16;
	const a = 500 * (x - y);
	const b = 200 * (y - z);

	return [l, a, b];
};

convert$1.lab.xyz = function (lab) {
	const l = lab[0];
	const a = lab[1];
	const b = lab[2];
	let x;
	let y;
	let z;

	y = (l + 16) / 116;
	x = a / 500 + y;
	z = y - b / 200;

	const y2 = y ** 3;
	const x2 = x ** 3;
	const z2 = z ** 3;
	y = y2 > 0.008856 ? y2 : (y - 16 / 116) / 7.787;
	x = x2 > 0.008856 ? x2 : (x - 16 / 116) / 7.787;
	z = z2 > 0.008856 ? z2 : (z - 16 / 116) / 7.787;

	x *= 95.047;
	y *= 100;
	z *= 108.883;

	return [x, y, z];
};

convert$1.lab.lch = function (lab) {
	const l = lab[0];
	const a = lab[1];
	const b = lab[2];
	let h;

	const hr = Math.atan2(b, a);
	h = hr * 360 / 2 / Math.PI;

	if (h < 0) {
		h += 360;
	}

	const c = Math.sqrt(a * a + b * b);

	return [l, c, h];
};

convert$1.lch.lab = function (lch) {
	const l = lch[0];
	const c = lch[1];
	const h = lch[2];

	const hr = h / 360 * 2 * Math.PI;
	const a = c * Math.cos(hr);
	const b = c * Math.sin(hr);

	return [l, a, b];
};

convert$1.rgb.ansi16 = function (args, saturation = null) {
	const [r, g, b] = args;
	let value = saturation === null ? convert$1.rgb.hsv(args)[2] : saturation; // Hsv -> ansi16 optimization

	value = Math.round(value / 50);

	if (value === 0) {
		return 30;
	}

	let ansi = 30
		+ ((Math.round(b / 255) << 2)
		| (Math.round(g / 255) << 1)
		| Math.round(r / 255));

	if (value === 2) {
		ansi += 60;
	}

	return ansi;
};

convert$1.hsv.ansi16 = function (args) {
	// Optimization here; we already know the value and don't need to get
	// it converted for us.
	return convert$1.rgb.ansi16(convert$1.hsv.rgb(args), args[2]);
};

convert$1.rgb.ansi256 = function (args) {
	const r = args[0];
	const g = args[1];
	const b = args[2];

	// We use the extended greyscale palette here, with the exception of
	// black and white. normal palette only has 4 greyscale shades.
	if (r === g && g === b) {
		if (r < 8) {
			return 16;
		}

		if (r > 248) {
			return 231;
		}

		return Math.round(((r - 8) / 247) * 24) + 232;
	}

	const ansi = 16
		+ (36 * Math.round(r / 255 * 5))
		+ (6 * Math.round(g / 255 * 5))
		+ Math.round(b / 255 * 5);

	return ansi;
};

convert$1.ansi16.rgb = function (args) {
	let color = args % 10;

	// Handle greyscale
	if (color === 0 || color === 7) {
		if (args > 50) {
			color += 3.5;
		}

		color = color / 10.5 * 255;

		return [color, color, color];
	}

	const mult = (~~(args > 50) + 1) * 0.5;
	const r = ((color & 1) * mult) * 255;
	const g = (((color >> 1) & 1) * mult) * 255;
	const b = (((color >> 2) & 1) * mult) * 255;

	return [r, g, b];
};

convert$1.ansi256.rgb = function (args) {
	// Handle greyscale
	if (args >= 232) {
		const c = (args - 232) * 10 + 8;
		return [c, c, c];
	}

	args -= 16;

	let rem;
	const r = Math.floor(args / 36) / 5 * 255;
	const g = Math.floor((rem = args % 36) / 6) / 5 * 255;
	const b = (rem % 6) / 5 * 255;

	return [r, g, b];
};

convert$1.rgb.hex = function (args) {
	const integer = ((Math.round(args[0]) & 0xFF) << 16)
		+ ((Math.round(args[1]) & 0xFF) << 8)
		+ (Math.round(args[2]) & 0xFF);

	const string = integer.toString(16).toUpperCase();
	return '000000'.substring(string.length) + string;
};

convert$1.hex.rgb = function (args) {
	const match = args.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);
	if (!match) {
		return [0, 0, 0];
	}

	let colorString = match[0];

	if (match[0].length === 3) {
		colorString = colorString.split('').map(char => {
			return char + char;
		}).join('');
	}

	const integer = parseInt(colorString, 16);
	const r = (integer >> 16) & 0xFF;
	const g = (integer >> 8) & 0xFF;
	const b = integer & 0xFF;

	return [r, g, b];
};

convert$1.rgb.hcg = function (rgb) {
	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;
	const max = Math.max(Math.max(r, g), b);
	const min = Math.min(Math.min(r, g), b);
	const chroma = (max - min);
	let grayscale;
	let hue;

	if (chroma < 1) {
		grayscale = min / (1 - chroma);
	} else {
		grayscale = 0;
	}

	if (chroma <= 0) {
		hue = 0;
	} else
	if (max === r) {
		hue = ((g - b) / chroma) % 6;
	} else
	if (max === g) {
		hue = 2 + (b - r) / chroma;
	} else {
		hue = 4 + (r - g) / chroma;
	}

	hue /= 6;
	hue %= 1;

	return [hue * 360, chroma * 100, grayscale * 100];
};

convert$1.hsl.hcg = function (hsl) {
	const s = hsl[1] / 100;
	const l = hsl[2] / 100;

	const c = l < 0.5 ? (2.0 * s * l) : (2.0 * s * (1.0 - l));

	let f = 0;
	if (c < 1.0) {
		f = (l - 0.5 * c) / (1.0 - c);
	}

	return [hsl[0], c * 100, f * 100];
};

convert$1.hsv.hcg = function (hsv) {
	const s = hsv[1] / 100;
	const v = hsv[2] / 100;

	const c = s * v;
	let f = 0;

	if (c < 1.0) {
		f = (v - c) / (1 - c);
	}

	return [hsv[0], c * 100, f * 100];
};

convert$1.hcg.rgb = function (hcg) {
	const h = hcg[0] / 360;
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;

	if (c === 0.0) {
		return [g * 255, g * 255, g * 255];
	}

	const pure = [0, 0, 0];
	const hi = (h % 1) * 6;
	const v = hi % 1;
	const w = 1 - v;
	let mg = 0;

	/* eslint-disable max-statements-per-line */
	switch (Math.floor(hi)) {
		case 0:
			pure[0] = 1; pure[1] = v; pure[2] = 0; break;
		case 1:
			pure[0] = w; pure[1] = 1; pure[2] = 0; break;
		case 2:
			pure[0] = 0; pure[1] = 1; pure[2] = v; break;
		case 3:
			pure[0] = 0; pure[1] = w; pure[2] = 1; break;
		case 4:
			pure[0] = v; pure[1] = 0; pure[2] = 1; break;
		default:
			pure[0] = 1; pure[1] = 0; pure[2] = w;
	}
	/* eslint-enable max-statements-per-line */

	mg = (1.0 - c) * g;

	return [
		(c * pure[0] + mg) * 255,
		(c * pure[1] + mg) * 255,
		(c * pure[2] + mg) * 255
	];
};

convert$1.hcg.hsv = function (hcg) {
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;

	const v = c + g * (1.0 - c);
	let f = 0;

	if (v > 0.0) {
		f = c / v;
	}

	return [hcg[0], f * 100, v * 100];
};

convert$1.hcg.hsl = function (hcg) {
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;

	const l = g * (1.0 - c) + 0.5 * c;
	let s = 0;

	if (l > 0.0 && l < 0.5) {
		s = c / (2 * l);
	} else
	if (l >= 0.5 && l < 1.0) {
		s = c / (2 * (1 - l));
	}

	return [hcg[0], s * 100, l * 100];
};

convert$1.hcg.hwb = function (hcg) {
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;
	const v = c + g * (1.0 - c);
	return [hcg[0], (v - c) * 100, (1 - v) * 100];
};

convert$1.hwb.hcg = function (hwb) {
	const w = hwb[1] / 100;
	const b = hwb[2] / 100;
	const v = 1 - b;
	const c = v - w;
	let g = 0;

	if (c < 1) {
		g = (v - c) / (1 - c);
	}

	return [hwb[0], c * 100, g * 100];
};

convert$1.apple.rgb = function (apple) {
	return [(apple[0] / 65535) * 255, (apple[1] / 65535) * 255, (apple[2] / 65535) * 255];
};

convert$1.rgb.apple = function (rgb) {
	return [(rgb[0] / 255) * 65535, (rgb[1] / 255) * 65535, (rgb[2] / 255) * 65535];
};

convert$1.gray.rgb = function (args) {
	return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
};

convert$1.gray.hsl = function (args) {
	return [0, 0, args[0]];
};

convert$1.gray.hsv = convert$1.gray.hsl;

convert$1.gray.hwb = function (gray) {
	return [0, 100, gray[0]];
};

convert$1.gray.cmyk = function (gray) {
	return [0, 0, 0, gray[0]];
};

convert$1.gray.lab = function (gray) {
	return [gray[0], 0, 0];
};

convert$1.gray.hex = function (gray) {
	const val = Math.round(gray[0] / 100 * 255) & 0xFF;
	const integer = (val << 16) + (val << 8) + val;

	const string = integer.toString(16).toUpperCase();
	return '000000'.substring(string.length) + string;
};

convert$1.rgb.gray = function (rgb) {
	const val = (rgb[0] + rgb[1] + rgb[2]) / 3;
	return [val / 255 * 100];
};

const conversions$1 = conversions$2;

/*
	This function routes a model to all other models.

	all functions that are routed have a property `.conversion` attached
	to the returned synthetic function. This property is an array
	of strings, each with the steps in between the 'from' and 'to'
	color models (inclusive).

	conversions that are not possible simply are not included.
*/

function buildGraph() {
	const graph = {};
	// https://jsperf.com/object-keys-vs-for-in-with-closure/3
	const models = Object.keys(conversions$1);

	for (let len = models.length, i = 0; i < len; i++) {
		graph[models[i]] = {
			// http://jsperf.com/1-vs-infinity
			// micro-opt, but this is simple.
			distance: -1,
			parent: null
		};
	}

	return graph;
}

// https://en.wikipedia.org/wiki/Breadth-first_search
function deriveBFS(fromModel) {
	const graph = buildGraph();
	const queue = [fromModel]; // Unshift -> queue -> pop

	graph[fromModel].distance = 0;

	while (queue.length) {
		const current = queue.pop();
		const adjacents = Object.keys(conversions$1[current]);

		for (let len = adjacents.length, i = 0; i < len; i++) {
			const adjacent = adjacents[i];
			const node = graph[adjacent];

			if (node.distance === -1) {
				node.distance = graph[current].distance + 1;
				node.parent = current;
				queue.unshift(adjacent);
			}
		}
	}

	return graph;
}

function link(from, to) {
	return function (args) {
		return to(from(args));
	};
}

function wrapConversion(toModel, graph) {
	const path = [graph[toModel].parent, toModel];
	let fn = conversions$1[graph[toModel].parent][toModel];

	let cur = graph[toModel].parent;
	while (graph[cur].parent) {
		path.unshift(graph[cur].parent);
		fn = link(conversions$1[graph[cur].parent][cur], fn);
		cur = graph[cur].parent;
	}

	fn.conversion = path;
	return fn;
}

var route$1 = function (fromModel) {
	const graph = deriveBFS(fromModel);
	const conversion = {};

	const models = Object.keys(graph);
	for (let len = models.length, i = 0; i < len; i++) {
		const toModel = models[i];
		const node = graph[toModel];

		if (node.parent === null) {
			// No possible conversion, or this node is the source model.
			continue;
		}

		conversion[toModel] = wrapConversion(toModel, graph);
	}

	return conversion;
};

const conversions = conversions$2;
const route = route$1;

const convert = {};

const models = Object.keys(conversions);

function wrapRaw(fn) {
	const wrappedFn = function (...args) {
		const arg0 = args[0];
		if (arg0 === undefined || arg0 === null) {
			return arg0;
		}

		if (arg0.length > 1) {
			args = arg0;
		}

		return fn(args);
	};

	// Preserve .conversion property if there is one
	if ('conversion' in fn) {
		wrappedFn.conversion = fn.conversion;
	}

	return wrappedFn;
}

function wrapRounded(fn) {
	const wrappedFn = function (...args) {
		const arg0 = args[0];

		if (arg0 === undefined || arg0 === null) {
			return arg0;
		}

		if (arg0.length > 1) {
			args = arg0;
		}

		const result = fn(args);

		// We're assuming the result is an array here.
		// see notice in conversions.js; don't use box types
		// in conversion functions.
		if (typeof result === 'object') {
			for (let len = result.length, i = 0; i < len; i++) {
				result[i] = Math.round(result[i]);
			}
		}

		return result;
	};

	// Preserve .conversion property if there is one
	if ('conversion' in fn) {
		wrappedFn.conversion = fn.conversion;
	}

	return wrappedFn;
}

models.forEach(fromModel => {
	convert[fromModel] = {};

	Object.defineProperty(convert[fromModel], 'channels', {value: conversions[fromModel].channels});
	Object.defineProperty(convert[fromModel], 'labels', {value: conversions[fromModel].labels});

	const routes = route(fromModel);
	const routeModels = Object.keys(routes);

	routeModels.forEach(toModel => {
		const fn = routes[toModel];

		convert[fromModel][toModel] = wrapRounded(fn);
		convert[fromModel][toModel].raw = wrapRaw(fn);
	});
});

var colorConvert = convert;

(function (module) {

const wrapAnsi16 = (fn, offset) => (...args) => {
	const code = fn(...args);
	return `\u001B[${code + offset}m`;
};

const wrapAnsi256 = (fn, offset) => (...args) => {
	const code = fn(...args);
	return `\u001B[${38 + offset};5;${code}m`;
};

const wrapAnsi16m = (fn, offset) => (...args) => {
	const rgb = fn(...args);
	return `\u001B[${38 + offset};2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
};

const ansi2ansi = n => n;
const rgb2rgb = (r, g, b) => [r, g, b];

const setLazyProperty = (object, property, get) => {
	Object.defineProperty(object, property, {
		get: () => {
			const value = get();

			Object.defineProperty(object, property, {
				value,
				enumerable: true,
				configurable: true
			});

			return value;
		},
		enumerable: true,
		configurable: true
	});
};

/** @type {typeof import('color-convert')} */
let colorConvert$1;
const makeDynamicStyles = (wrap, targetSpace, identity, isBackground) => {
	if (colorConvert$1 === undefined) {
		colorConvert$1 = colorConvert;
	}

	const offset = isBackground ? 10 : 0;
	const styles = {};

	for (const [sourceSpace, suite] of Object.entries(colorConvert$1)) {
		const name = sourceSpace === 'ansi16' ? 'ansi' : sourceSpace;
		if (sourceSpace === targetSpace) {
			styles[name] = wrap(identity, offset);
		} else if (typeof suite === 'object') {
			styles[name] = wrap(suite[targetSpace], offset);
		}
	}

	return styles;
};

function assembleStyles() {
	const codes = new Map();
	const styles = {
		modifier: {
			reset: [0, 0],
			// 21 isn't widely supported and 22 does the same thing
			bold: [1, 22],
			dim: [2, 22],
			italic: [3, 23],
			underline: [4, 24],
			inverse: [7, 27],
			hidden: [8, 28],
			strikethrough: [9, 29]
		},
		color: {
			black: [30, 39],
			red: [31, 39],
			green: [32, 39],
			yellow: [33, 39],
			blue: [34, 39],
			magenta: [35, 39],
			cyan: [36, 39],
			white: [37, 39],

			// Bright color
			blackBright: [90, 39],
			redBright: [91, 39],
			greenBright: [92, 39],
			yellowBright: [93, 39],
			blueBright: [94, 39],
			magentaBright: [95, 39],
			cyanBright: [96, 39],
			whiteBright: [97, 39]
		},
		bgColor: {
			bgBlack: [40, 49],
			bgRed: [41, 49],
			bgGreen: [42, 49],
			bgYellow: [43, 49],
			bgBlue: [44, 49],
			bgMagenta: [45, 49],
			bgCyan: [46, 49],
			bgWhite: [47, 49],

			// Bright color
			bgBlackBright: [100, 49],
			bgRedBright: [101, 49],
			bgGreenBright: [102, 49],
			bgYellowBright: [103, 49],
			bgBlueBright: [104, 49],
			bgMagentaBright: [105, 49],
			bgCyanBright: [106, 49],
			bgWhiteBright: [107, 49]
		}
	};

	// Alias bright black as gray (and grey)
	styles.color.gray = styles.color.blackBright;
	styles.bgColor.bgGray = styles.bgColor.bgBlackBright;
	styles.color.grey = styles.color.blackBright;
	styles.bgColor.bgGrey = styles.bgColor.bgBlackBright;

	for (const [groupName, group] of Object.entries(styles)) {
		for (const [styleName, style] of Object.entries(group)) {
			styles[styleName] = {
				open: `\u001B[${style[0]}m`,
				close: `\u001B[${style[1]}m`
			};

			group[styleName] = styles[styleName];

			codes.set(style[0], style[1]);
		}

		Object.defineProperty(styles, groupName, {
			value: group,
			enumerable: false
		});
	}

	Object.defineProperty(styles, 'codes', {
		value: codes,
		enumerable: false
	});

	styles.color.close = '\u001B[39m';
	styles.bgColor.close = '\u001B[49m';

	setLazyProperty(styles.color, 'ansi', () => makeDynamicStyles(wrapAnsi16, 'ansi16', ansi2ansi, false));
	setLazyProperty(styles.color, 'ansi256', () => makeDynamicStyles(wrapAnsi256, 'ansi256', ansi2ansi, false));
	setLazyProperty(styles.color, 'ansi16m', () => makeDynamicStyles(wrapAnsi16m, 'rgb', rgb2rgb, false));
	setLazyProperty(styles.bgColor, 'ansi', () => makeDynamicStyles(wrapAnsi16, 'ansi16', ansi2ansi, true));
	setLazyProperty(styles.bgColor, 'ansi256', () => makeDynamicStyles(wrapAnsi256, 'ansi256', ansi2ansi, true));
	setLazyProperty(styles.bgColor, 'ansi16m', () => makeDynamicStyles(wrapAnsi16m, 'rgb', rgb2rgb, true));

	return styles;
}

// Make the export immutable
Object.defineProperty(module, 'exports', {
	enumerable: true,
	get: assembleStyles
});
}(ansiStyles$2));

const isFullwidthCodePoint = isFullwidthCodePoint$3.exports;
const astralRegex = astralRegex_1;
const ansiStyles$1 = ansiStyles$2.exports;

const ESCAPES$1 = [
	'\u001B',
	'\u009B'
];

const wrapAnsi = code => `${ESCAPES$1[0]}[${code}m`;

const checkAnsi = (ansiCodes, isEscapes, endAnsiCode) => {
	let output = [];
	ansiCodes = [...ansiCodes];

	for (let ansiCode of ansiCodes) {
		const ansiCodeOrigin = ansiCode;
		if (ansiCode.includes(';')) {
			ansiCode = ansiCode.split(';')[0][0] + '0';
		}

		const item = ansiStyles$1.codes.get(Number.parseInt(ansiCode, 10));
		if (item) {
			const indexEscape = ansiCodes.indexOf(item.toString());
			if (indexEscape === -1) {
				output.push(wrapAnsi(isEscapes ? item : ansiCodeOrigin));
			} else {
				ansiCodes.splice(indexEscape, 1);
			}
		} else if (isEscapes) {
			output.push(wrapAnsi(0));
			break;
		} else {
			output.push(wrapAnsi(ansiCodeOrigin));
		}
	}

	if (isEscapes) {
		output = output.filter((element, index) => output.indexOf(element) === index);

		if (endAnsiCode !== undefined) {
			const fistEscapeCode = wrapAnsi(ansiStyles$1.codes.get(Number.parseInt(endAnsiCode, 10)));
			output = output.reduce((current, next) => next === fistEscapeCode ? [next, ...current] : [...current, next], []);
		}
	}

	return output.join('');
};

var sliceAnsi = (string, begin, end) => {
	const characters = [...string];
	const ansiCodes = [];

	let stringEnd = typeof end === 'number' ? end : characters.length;
	let isInsideEscape = false;
	let ansiCode;
	let visible = 0;
	let output = '';

	for (const [index, character] of characters.entries()) {
		let leftEscape = false;

		if (ESCAPES$1.includes(character)) {
			const code = /\d[^m]*/.exec(string.slice(index, index + 18));
			ansiCode = code && code.length > 0 ? code[0] : undefined;

			if (visible < stringEnd) {
				isInsideEscape = true;

				if (ansiCode !== undefined) {
					ansiCodes.push(ansiCode);
				}
			}
		} else if (isInsideEscape && character === 'm') {
			isInsideEscape = false;
			leftEscape = true;
		}

		if (!isInsideEscape && !leftEscape) {
			visible++;
		}

		if (!astralRegex({exact: true}).test(character) && isFullwidthCodePoint(character.codePointAt())) {
			visible++;

			if (typeof end !== 'number') {
				stringEnd++;
			}
		}

		if (visible > begin && visible <= stringEnd) {
			output += character;
		} else if (visible === begin && !isInsideEscape && ansiCode !== undefined) {
			output = checkAnsi(ansiCodes);
		} else if (visible >= stringEnd) {
			output += checkAnsi(ansiCodes, true, ansiCode);
			break;
		}
	}

	return output;
};

var getBorderCharacters$1 = {};

/* eslint-disable sort-keys-fix/sort-keys-fix */
Object.defineProperty(getBorderCharacters$1, "__esModule", { value: true });
getBorderCharacters$1.getBorderCharacters = void 0;
const getBorderCharacters = (name) => {
    if (name === 'honeywell') {
        return {
            topBody: '═',
            topJoin: '╤',
            topLeft: '╔',
            topRight: '╗',
            bottomBody: '═',
            bottomJoin: '╧',
            bottomLeft: '╚',
            bottomRight: '╝',
            bodyLeft: '║',
            bodyRight: '║',
            bodyJoin: '│',
            headerJoin: '┬',
            joinBody: '─',
            joinLeft: '╟',
            joinRight: '╢',
            joinJoin: '┼',
            joinMiddleDown: '┬',
            joinMiddleUp: '┴',
            joinMiddleLeft: '┤',
            joinMiddleRight: '├',
        };
    }
    if (name === 'norc') {
        return {
            topBody: '─',
            topJoin: '┬',
            topLeft: '┌',
            topRight: '┐',
            bottomBody: '─',
            bottomJoin: '┴',
            bottomLeft: '└',
            bottomRight: '┘',
            bodyLeft: '│',
            bodyRight: '│',
            bodyJoin: '│',
            headerJoin: '┬',
            joinBody: '─',
            joinLeft: '├',
            joinRight: '┤',
            joinJoin: '┼',
            joinMiddleDown: '┬',
            joinMiddleUp: '┴',
            joinMiddleLeft: '┤',
            joinMiddleRight: '├',
        };
    }
    if (name === 'ramac') {
        return {
            topBody: '-',
            topJoin: '+',
            topLeft: '+',
            topRight: '+',
            bottomBody: '-',
            bottomJoin: '+',
            bottomLeft: '+',
            bottomRight: '+',
            bodyLeft: '|',
            bodyRight: '|',
            bodyJoin: '|',
            headerJoin: '+',
            joinBody: '-',
            joinLeft: '|',
            joinRight: '|',
            joinJoin: '|',
            joinMiddleDown: '+',
            joinMiddleUp: '+',
            joinMiddleLeft: '+',
            joinMiddleRight: '+',
        };
    }
    if (name === 'void') {
        return {
            topBody: '',
            topJoin: '',
            topLeft: '',
            topRight: '',
            bottomBody: '',
            bottomJoin: '',
            bottomLeft: '',
            bottomRight: '',
            bodyLeft: '',
            bodyRight: '',
            bodyJoin: '',
            headerJoin: '',
            joinBody: '',
            joinLeft: '',
            joinRight: '',
            joinJoin: '',
            joinMiddleDown: '',
            joinMiddleUp: '',
            joinMiddleLeft: '',
            joinMiddleRight: '',
        };
    }
    throw new Error('Unknown border template "' + name + '".');
};
getBorderCharacters$1.getBorderCharacters = getBorderCharacters;

(function (exports) {
var __importDefault = (commonjsGlobal$1 && commonjsGlobal$1.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCellInRange = exports.areCellEqual = exports.calculateRangeCoordinate = exports.findOriginalRowIndex = exports.flatten = exports.extractTruncates = exports.sumArray = exports.sequence = exports.distributeUnevenly = exports.countSpaceSequence = exports.groupBySizes = exports.makeBorderConfig = exports.splitAnsi = exports.normalizeString = void 0;
const slice_ansi_1 = __importDefault(sliceAnsi);
const string_width_1 = __importDefault(stringWidth$1.exports);
const strip_ansi_1 = __importDefault(stripAnsi$1);
const getBorderCharacters_1 = getBorderCharacters$1;
/**
 * Converts Windows-style newline to Unix-style
 *
 * @internal
 */
const normalizeString = (input) => {
    return input.replace(/\r\n/g, '\n');
};
exports.normalizeString = normalizeString;
/**
 * Splits ansi string by newlines
 *
 * @internal
 */
const splitAnsi = (input) => {
    const lengths = (0, strip_ansi_1.default)(input).split('\n').map(string_width_1.default);
    const result = [];
    let startIndex = 0;
    lengths.forEach((length) => {
        result.push(length === 0 ? '' : (0, slice_ansi_1.default)(input, startIndex, startIndex + length));
        // Plus 1 for the newline character itself
        startIndex += length + 1;
    });
    return result;
};
exports.splitAnsi = splitAnsi;
/**
 * Merges user provided border characters with the default border ("honeywell") characters.
 *
 * @internal
 */
const makeBorderConfig = (border) => {
    return {
        ...(0, getBorderCharacters_1.getBorderCharacters)('honeywell'),
        ...border,
    };
};
exports.makeBorderConfig = makeBorderConfig;
/**
 * Groups the array into sub-arrays by sizes.
 *
 * @internal
 * @example
 * groupBySizes(['a', 'b', 'c', 'd', 'e'], [2, 1, 2]) = [ ['a', 'b'], ['c'], ['d', 'e'] ]
 */
const groupBySizes = (array, sizes) => {
    let startIndex = 0;
    return sizes.map((size) => {
        const group = array.slice(startIndex, startIndex + size);
        startIndex += size;
        return group;
    });
};
exports.groupBySizes = groupBySizes;
/**
 * Counts the number of continuous spaces in a string
 *
 * @internal
 * @example
 * countGroupSpaces('a  bc  de f') = 3
 */
const countSpaceSequence = (input) => {
    var _a, _b;
    return (_b = (_a = input.match(/\s+/g)) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
};
exports.countSpaceSequence = countSpaceSequence;
/**
 * Creates the non-increasing number array given sum and length
 * whose the difference between maximum and minimum is not greater than 1
 *
 * @internal
 * @example
 * distributeUnevenly(6, 3) = [2, 2, 2]
 * distributeUnevenly(8, 3) = [3, 3, 2]
 */
const distributeUnevenly = (sum, length) => {
    const result = Array.from({ length }).fill(Math.floor(sum / length));
    return result.map((element, index) => {
        return element + (index < sum % length ? 1 : 0);
    });
};
exports.distributeUnevenly = distributeUnevenly;
const sequence = (start, end) => {
    return Array.from({ length: end - start + 1 }, (_, index) => {
        return index + start;
    });
};
exports.sequence = sequence;
const sumArray = (array) => {
    return array.reduce((accumulator, element) => {
        return accumulator + element;
    }, 0);
};
exports.sumArray = sumArray;
const extractTruncates = (config) => {
    return config.columns.map(({ truncate }) => {
        return truncate;
    });
};
exports.extractTruncates = extractTruncates;
const flatten = (array) => {
    return [].concat(...array);
};
exports.flatten = flatten;
const findOriginalRowIndex = (mappedRowHeights, mappedRowIndex) => {
    const rowIndexMapping = (0, exports.flatten)(mappedRowHeights.map((height, index) => {
        return Array.from({ length: height }, () => {
            return index;
        });
    }));
    return rowIndexMapping[mappedRowIndex];
};
exports.findOriginalRowIndex = findOriginalRowIndex;
const calculateRangeCoordinate = (spanningCellConfig) => {
    const { row, col, colSpan = 1, rowSpan = 1 } = spanningCellConfig;
    return { bottomRight: { col: col + colSpan - 1,
            row: row + rowSpan - 1 },
        topLeft: { col,
            row } };
};
exports.calculateRangeCoordinate = calculateRangeCoordinate;
const areCellEqual = (cell1, cell2) => {
    return cell1.row === cell2.row && cell1.col === cell2.col;
};
exports.areCellEqual = areCellEqual;
const isCellInRange = (cell, { topLeft, bottomRight }) => {
    return (topLeft.row <= cell.row &&
        cell.row <= bottomRight.row &&
        topLeft.col <= cell.col &&
        cell.col <= bottomRight.col);
};
exports.isCellInRange = isCellInRange;

}(utils));

var __importDefault$3 = (commonjsGlobal$1 && commonjsGlobal$1.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(alignString$1, "__esModule", { value: true });
alignString$1.alignString = void 0;
const string_width_1$1 = __importDefault$3(stringWidth$1.exports);
const utils_1$e = utils;
const alignLeft = (subject, width) => {
    return subject + ' '.repeat(width);
};
const alignRight = (subject, width) => {
    return ' '.repeat(width) + subject;
};
const alignCenter = (subject, width) => {
    return ' '.repeat(Math.floor(width / 2)) + subject + ' '.repeat(Math.ceil(width / 2));
};
const alignJustify = (subject, width) => {
    const spaceSequenceCount = (0, utils_1$e.countSpaceSequence)(subject);
    if (spaceSequenceCount === 0) {
        return alignLeft(subject, width);
    }
    const addingSpaces = (0, utils_1$e.distributeUnevenly)(width, spaceSequenceCount);
    if (Math.max(...addingSpaces) > 3) {
        return alignLeft(subject, width);
    }
    let spaceSequenceIndex = 0;
    return subject.replace(/\s+/g, (groupSpace) => {
        return groupSpace + ' '.repeat(addingSpaces[spaceSequenceIndex++]);
    });
};
/**
 * Pads a string to the left and/or right to position the subject
 * text in a desired alignment within a container.
 */
const alignString = (subject, containerWidth, alignment) => {
    const subjectWidth = (0, string_width_1$1.default)(subject);
    if (subjectWidth === containerWidth) {
        return subject;
    }
    if (subjectWidth > containerWidth) {
        throw new Error('Subject parameter value width cannot be greater than the container width.');
    }
    if (subjectWidth === 0) {
        return ' '.repeat(containerWidth);
    }
    const availableWidth = containerWidth - subjectWidth;
    if (alignment === 'left') {
        return alignLeft(subject, availableWidth);
    }
    if (alignment === 'right') {
        return alignRight(subject, availableWidth);
    }
    if (alignment === 'justify') {
        return alignJustify(subject, availableWidth);
    }
    return alignCenter(subject, availableWidth);
};
alignString$1.alignString = alignString;

Object.defineProperty(alignTableData$1, "__esModule", { value: true });
alignTableData$1.alignTableData = void 0;
const alignString_1$1 = alignString$1;
const alignTableData = (rows, config) => {
    return rows.map((row, rowIndex) => {
        return row.map((cell, cellIndex) => {
            var _a;
            const { width, alignment } = config.columns[cellIndex];
            const containingRange = (_a = config.spanningCellManager) === null || _a === void 0 ? void 0 : _a.getContainingRange({ col: cellIndex,
                row: rowIndex }, { mapped: true });
            if (containingRange) {
                return cell;
            }
            return (0, alignString_1$1.alignString)(cell, width, alignment);
        });
    });
};
alignTableData$1.alignTableData = alignTableData;

var calculateRowHeights$1 = {};

var calculateCellHeight$1 = {};

var wrapCell$1 = {};

var wrapString$1 = {};

var __importDefault$2 = (commonjsGlobal$1 && commonjsGlobal$1.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(wrapString$1, "__esModule", { value: true });
wrapString$1.wrapString = void 0;
const slice_ansi_1$1 = __importDefault$2(sliceAnsi);
const string_width_1 = __importDefault$2(stringWidth$1.exports);
/**
 * Creates an array of strings split into groups the length of size.
 * This function works with strings that contain ASCII characters.
 *
 * wrapText is different from would-be "chunk" implementation
 * in that whitespace characters that occur on a chunk size limit are trimmed.
 *
 */
const wrapString = (subject, size) => {
    let subjectSlice = subject;
    const chunks = [];
    do {
        chunks.push((0, slice_ansi_1$1.default)(subjectSlice, 0, size));
        subjectSlice = (0, slice_ansi_1$1.default)(subjectSlice, size).trim();
    } while ((0, string_width_1.default)(subjectSlice));
    return chunks;
};
wrapString$1.wrapString = wrapString;

var wrapWord$1 = {};

var __importDefault$1 = (commonjsGlobal$1 && commonjsGlobal$1.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(wrapWord$1, "__esModule", { value: true });
wrapWord$1.wrapWord = void 0;
const slice_ansi_1 = __importDefault$1(sliceAnsi);
const strip_ansi_1 = __importDefault$1(stripAnsi$1);
const calculateStringLengths = (input, size) => {
    let subject = (0, strip_ansi_1.default)(input);
    const chunks = [];
    // https://regex101.com/r/gY5kZ1/1
    const re = new RegExp('(^.{1,' + String(Math.max(size, 1)) + '}(\\s+|$))|(^.{1,' + String(Math.max(size - 1, 1)) + '}(\\\\|/|_|\\.|,|;|-))');
    do {
        let chunk;
        const match = re.exec(subject);
        if (match) {
            chunk = match[0];
            subject = subject.slice(chunk.length);
            const trimmedLength = chunk.trim().length;
            const offset = chunk.length - trimmedLength;
            chunks.push([trimmedLength, offset]);
        }
        else {
            chunk = subject.slice(0, size);
            subject = subject.slice(size);
            chunks.push([chunk.length, 0]);
        }
    } while (subject.length);
    return chunks;
};
const wrapWord = (input, size) => {
    const result = [];
    let startIndex = 0;
    calculateStringLengths(input, size).forEach(([length, offset]) => {
        result.push((0, slice_ansi_1.default)(input, startIndex, startIndex + length));
        startIndex += length + offset;
    });
    return result;
};
wrapWord$1.wrapWord = wrapWord;

Object.defineProperty(wrapCell$1, "__esModule", { value: true });
wrapCell$1.wrapCell = void 0;
const utils_1$d = utils;
const wrapString_1 = wrapString$1;
const wrapWord_1 = wrapWord$1;
/**
 * Wrap a single cell value into a list of lines
 *
 * Always wraps on newlines, for the remainder uses either word or string wrapping
 * depending on user configuration.
 *
 */
const wrapCell = (cellValue, cellWidth, useWrapWord) => {
    // First split on literal newlines
    const cellLines = (0, utils_1$d.splitAnsi)(cellValue);
    // Then iterate over the list and word-wrap every remaining line if necessary.
    for (let lineNr = 0; lineNr < cellLines.length;) {
        let lineChunks;
        if (useWrapWord) {
            lineChunks = (0, wrapWord_1.wrapWord)(cellLines[lineNr], cellWidth);
        }
        else {
            lineChunks = (0, wrapString_1.wrapString)(cellLines[lineNr], cellWidth);
        }
        // Replace our original array element with whatever the wrapping returned
        cellLines.splice(lineNr, 1, ...lineChunks);
        lineNr += lineChunks.length;
    }
    return cellLines;
};
wrapCell$1.wrapCell = wrapCell;

Object.defineProperty(calculateCellHeight$1, "__esModule", { value: true });
calculateCellHeight$1.calculateCellHeight = void 0;
const wrapCell_1$1 = wrapCell$1;
/**
 * Calculates height of cell content in regard to its width and word wrapping.
 */
const calculateCellHeight = (value, columnWidth, useWrapWord = false) => {
    return (0, wrapCell_1$1.wrapCell)(value, columnWidth, useWrapWord).length;
};
calculateCellHeight$1.calculateCellHeight = calculateCellHeight;

Object.defineProperty(calculateRowHeights$1, "__esModule", { value: true });
calculateRowHeights$1.calculateRowHeights = void 0;
const calculateCellHeight_1 = calculateCellHeight$1;
const utils_1$c = utils;
/**
 * Produces an array of values that describe the largest value length (height) in every row.
 */
const calculateRowHeights = (rows, config) => {
    const rowHeights = [];
    for (const [rowIndex, row] of rows.entries()) {
        let rowHeight = 1;
        row.forEach((cell, cellIndex) => {
            var _a;
            const containingRange = (_a = config.spanningCellManager) === null || _a === void 0 ? void 0 : _a.getContainingRange({ col: cellIndex,
                row: rowIndex });
            if (!containingRange) {
                const cellHeight = (0, calculateCellHeight_1.calculateCellHeight)(cell, config.columns[cellIndex].width, config.columns[cellIndex].wrapWord);
                rowHeight = Math.max(rowHeight, cellHeight);
                return;
            }
            const { topLeft, bottomRight, height } = containingRange;
            // bottom-most cell of a range needs to contain all remain lines of spanning cells
            if (rowIndex === bottomRight.row) {
                const totalOccupiedSpanningCellHeight = (0, utils_1$c.sumArray)(rowHeights.slice(topLeft.row));
                const totalHorizontalBorderHeight = bottomRight.row - topLeft.row;
                const totalHiddenHorizontalBorderHeight = (0, utils_1$c.sequence)(topLeft.row + 1, bottomRight.row).filter((horizontalBorderIndex) => {
                    var _a;
                    /* istanbul ignore next */
                    return !((_a = config.drawHorizontalLine) === null || _a === void 0 ? void 0 : _a.call(config, horizontalBorderIndex, rows.length));
                }).length;
                const cellHeight = height - totalOccupiedSpanningCellHeight - totalHorizontalBorderHeight + totalHiddenHorizontalBorderHeight;
                rowHeight = Math.max(rowHeight, cellHeight);
            }
            // otherwise, just depend on other sibling cell heights in the row
        });
        rowHeights.push(rowHeight);
    }
    return rowHeights;
};
calculateRowHeights$1.calculateRowHeights = calculateRowHeights;

var drawBorder = {};

var drawContent$1 = {};

Object.defineProperty(drawContent$1, "__esModule", { value: true });
drawContent$1.drawContent = void 0;
const drawContent = (parameters) => {
    const { contents, separatorGetter, drawSeparator, spanningCellManager, rowIndex, elementType } = parameters;
    const contentSize = contents.length;
    const result = [];
    if (drawSeparator(0, contentSize)) {
        result.push(separatorGetter(0, contentSize));
    }
    contents.forEach((content, contentIndex) => {
        if (!elementType || elementType === 'border' || elementType === 'row') {
            result.push(content);
        }
        if (elementType === 'cell' && rowIndex === undefined) {
            result.push(content);
        }
        if (elementType === 'cell' && rowIndex !== undefined) {
            /* istanbul ignore next */
            const containingRange = spanningCellManager === null || spanningCellManager === void 0 ? void 0 : spanningCellManager.getContainingRange({ col: contentIndex,
                row: rowIndex });
            // when drawing content row, just add a cell when it is a normal cell
            // or belongs to first column of spanning cell
            if (!containingRange || contentIndex === containingRange.topLeft.col) {
                result.push(content);
            }
        }
        // Only append the middle separator if the content is not the last
        if (contentIndex + 1 < contentSize && drawSeparator(contentIndex + 1, contentSize)) {
            const separator = separatorGetter(contentIndex + 1, contentSize);
            if (elementType === 'cell' && rowIndex !== undefined) {
                const currentCell = { col: contentIndex + 1,
                    row: rowIndex };
                /* istanbul ignore next */
                const containingRange = spanningCellManager === null || spanningCellManager === void 0 ? void 0 : spanningCellManager.getContainingRange(currentCell);
                if (!containingRange || containingRange.topLeft.col === currentCell.col) {
                    result.push(separator);
                }
            }
            else {
                result.push(separator);
            }
        }
    });
    if (drawSeparator(contentSize, contentSize)) {
        result.push(separatorGetter(contentSize, contentSize));
    }
    return result.join('');
};
drawContent$1.drawContent = drawContent;

(function (exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTableBorderGetter = exports.drawBorderBottom = exports.drawBorderJoin = exports.drawBorderTop = exports.drawBorder = exports.createSeparatorGetter = exports.drawBorderSegments = void 0;
const drawContent_1 = drawContent$1;
const drawBorderSegments = (columnWidths, parameters) => {
    const { separator, horizontalBorderIndex, spanningCellManager } = parameters;
    return columnWidths.map((columnWidth, columnIndex) => {
        const normalSegment = separator.body.repeat(columnWidth);
        if (horizontalBorderIndex === undefined) {
            return normalSegment;
        }
        /* istanbul ignore next */
        const range = spanningCellManager === null || spanningCellManager === void 0 ? void 0 : spanningCellManager.getContainingRange({ col: columnIndex,
            row: horizontalBorderIndex });
        if (!range) {
            return normalSegment;
        }
        const { topLeft } = range;
        // draw border segments as usual for top border of spanning cell
        if (horizontalBorderIndex === topLeft.row) {
            return normalSegment;
        }
        // if for first column/row of spanning cell, just skip
        if (columnIndex !== topLeft.col) {
            return '';
        }
        return range.extractBorderContent(horizontalBorderIndex);
    });
};
exports.drawBorderSegments = drawBorderSegments;
const createSeparatorGetter = (dependencies) => {
    const { separator, spanningCellManager, horizontalBorderIndex, rowCount } = dependencies;
    // eslint-disable-next-line complexity
    return (verticalBorderIndex, columnCount) => {
        const inSameRange = spanningCellManager === null || spanningCellManager === void 0 ? void 0 : spanningCellManager.inSameRange;
        if (horizontalBorderIndex !== undefined && inSameRange) {
            const topCell = { col: verticalBorderIndex,
                row: horizontalBorderIndex - 1 };
            const leftCell = { col: verticalBorderIndex - 1,
                row: horizontalBorderIndex };
            const oppositeCell = { col: verticalBorderIndex - 1,
                row: horizontalBorderIndex - 1 };
            const currentCell = { col: verticalBorderIndex,
                row: horizontalBorderIndex };
            const pairs = [
                [oppositeCell, topCell],
                [topCell, currentCell],
                [currentCell, leftCell],
                [leftCell, oppositeCell],
            ];
            // left side of horizontal border
            if (verticalBorderIndex === 0) {
                if (inSameRange(currentCell, topCell) && separator.bodyJoinOuter) {
                    return separator.bodyJoinOuter;
                }
                return separator.left;
            }
            // right side of horizontal border
            if (verticalBorderIndex === columnCount) {
                if (inSameRange(oppositeCell, leftCell) && separator.bodyJoinOuter) {
                    return separator.bodyJoinOuter;
                }
                return separator.right;
            }
            // top horizontal border
            if (horizontalBorderIndex === 0) {
                if (inSameRange(currentCell, leftCell)) {
                    return separator.body;
                }
                return separator.join;
            }
            // bottom horizontal border
            if (horizontalBorderIndex === rowCount) {
                if (inSameRange(topCell, oppositeCell)) {
                    return separator.body;
                }
                return separator.join;
            }
            const sameRangeCount = pairs.map((pair) => {
                return inSameRange(...pair);
            }).filter(Boolean).length;
            // four cells are belongs to different spanning cells
            if (sameRangeCount === 0) {
                return separator.join;
            }
            // belong to one spanning cell
            if (sameRangeCount === 4) {
                return '';
            }
            // belongs to two spanning cell
            if (sameRangeCount === 2) {
                if (inSameRange(...pairs[1]) && inSameRange(...pairs[3]) && separator.bodyJoinInner) {
                    return separator.bodyJoinInner;
                }
                return separator.body;
            }
            /* istanbul ignore next */
            if (sameRangeCount === 1) {
                if (!separator.joinRight || !separator.joinLeft || !separator.joinUp || !separator.joinDown) {
                    throw new Error(`Can not get border separator for position [${horizontalBorderIndex}, ${verticalBorderIndex}]`);
                }
                if (inSameRange(...pairs[0])) {
                    return separator.joinDown;
                }
                if (inSameRange(...pairs[1])) {
                    return separator.joinLeft;
                }
                if (inSameRange(...pairs[2])) {
                    return separator.joinUp;
                }
                return separator.joinRight;
            }
            /* istanbul ignore next */
            throw new Error('Invalid case');
        }
        if (verticalBorderIndex === 0) {
            return separator.left;
        }
        if (verticalBorderIndex === columnCount) {
            return separator.right;
        }
        return separator.join;
    };
};
exports.createSeparatorGetter = createSeparatorGetter;
const drawBorder = (columnWidths, parameters) => {
    const borderSegments = (0, exports.drawBorderSegments)(columnWidths, parameters);
    const { drawVerticalLine, horizontalBorderIndex, spanningCellManager } = parameters;
    return (0, drawContent_1.drawContent)({
        contents: borderSegments,
        drawSeparator: drawVerticalLine,
        elementType: 'border',
        rowIndex: horizontalBorderIndex,
        separatorGetter: (0, exports.createSeparatorGetter)(parameters),
        spanningCellManager,
    }) + '\n';
};
exports.drawBorder = drawBorder;
const drawBorderTop = (columnWidths, parameters) => {
    const { border } = parameters;
    const result = (0, exports.drawBorder)(columnWidths, {
        ...parameters,
        separator: {
            body: border.topBody,
            join: border.topJoin,
            left: border.topLeft,
            right: border.topRight,
        },
    });
    if (result === '\n') {
        return '';
    }
    return result;
};
exports.drawBorderTop = drawBorderTop;
const drawBorderJoin = (columnWidths, parameters) => {
    const { border } = parameters;
    return (0, exports.drawBorder)(columnWidths, {
        ...parameters,
        separator: {
            body: border.joinBody,
            bodyJoinInner: border.bodyJoin,
            bodyJoinOuter: border.bodyLeft,
            join: border.joinJoin,
            joinDown: border.joinMiddleDown,
            joinLeft: border.joinMiddleLeft,
            joinRight: border.joinMiddleRight,
            joinUp: border.joinMiddleUp,
            left: border.joinLeft,
            right: border.joinRight,
        },
    });
};
exports.drawBorderJoin = drawBorderJoin;
const drawBorderBottom = (columnWidths, parameters) => {
    const { border } = parameters;
    return (0, exports.drawBorder)(columnWidths, {
        ...parameters,
        separator: {
            body: border.bottomBody,
            join: border.bottomJoin,
            left: border.bottomLeft,
            right: border.bottomRight,
        },
    });
};
exports.drawBorderBottom = drawBorderBottom;
const createTableBorderGetter = (columnWidths, parameters) => {
    return (index, size) => {
        const drawBorderParameters = { ...parameters,
            horizontalBorderIndex: index };
        if (index === 0) {
            return (0, exports.drawBorderTop)(columnWidths, drawBorderParameters);
        }
        else if (index === size) {
            return (0, exports.drawBorderBottom)(columnWidths, drawBorderParameters);
        }
        return (0, exports.drawBorderJoin)(columnWidths, drawBorderParameters);
    };
};
exports.createTableBorderGetter = createTableBorderGetter;

}(drawBorder));

var drawRow$1 = {};

Object.defineProperty(drawRow$1, "__esModule", { value: true });
drawRow$1.drawRow = void 0;
const drawContent_1$1 = drawContent$1;
const drawRow = (row, config) => {
    const { border, drawVerticalLine, rowIndex, spanningCellManager } = config;
    return (0, drawContent_1$1.drawContent)({
        contents: row,
        drawSeparator: drawVerticalLine,
        elementType: 'cell',
        rowIndex,
        separatorGetter: (index, columnCount) => {
            if (index === 0) {
                return border.bodyLeft;
            }
            if (index === columnCount) {
                return border.bodyRight;
            }
            return border.bodyJoin;
        },
        spanningCellManager,
    }) + '\n';
};
drawRow$1.drawRow = drawRow;

var makeStreamConfig$1 = {};

var validateConfig$1 = {};

var validators = {};

var equal$1 = {};

// do not edit .js files directly - edit src/index.jst



var fastDeepEqual = function equal(a, b) {
  if (a === b) return true;

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false;

    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0;)
        if (!equal(a[i], b[i])) return false;
      return true;
    }



    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0;)
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    for (i = length; i-- !== 0;) {
      var key = keys[i];

      if (!equal(a[key], b[key])) return false;
    }

    return true;
  }

  // true if both NaN, false otherwise
  return a!==a && b!==b;
};

Object.defineProperty(equal$1, "__esModule", { value: true });
// https://github.com/ajv-validator/ajv/issues/889
const equal = fastDeepEqual;
equal.code = 'require("ajv/dist/runtime/equal").default';
equal$1.default = equal;

(function (exports) {
exports["config.json"] = validate43;
const schema13 = {
    "$id": "config.json",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "border": {
            "$ref": "shared.json#/definitions/borders"
        },
        "header": {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string"
                },
                "alignment": {
                    "$ref": "shared.json#/definitions/alignment"
                },
                "wrapWord": {
                    "type": "boolean"
                },
                "truncate": {
                    "type": "integer"
                },
                "paddingLeft": {
                    "type": "integer"
                },
                "paddingRight": {
                    "type": "integer"
                }
            },
            "required": ["content"],
            "additionalProperties": false
        },
        "columns": {
            "$ref": "shared.json#/definitions/columns"
        },
        "columnDefault": {
            "$ref": "shared.json#/definitions/column"
        },
        "drawVerticalLine": {
            "typeof": "function"
        },
        "drawHorizontalLine": {
            "typeof": "function"
        },
        "singleLine": {
            "typeof": "boolean"
        },
        "spanningCells": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "col": {
                        "type": "integer",
                        "minimum": 0
                    },
                    "row": {
                        "type": "integer",
                        "minimum": 0
                    },
                    "colSpan": {
                        "type": "integer",
                        "minimum": 1
                    },
                    "rowSpan": {
                        "type": "integer",
                        "minimum": 1
                    },
                    "alignment": {
                        "$ref": "shared.json#/definitions/alignment"
                    },
                    "verticalAlignment": {
                        "$ref": "shared.json#/definitions/verticalAlignment"
                    },
                    "wrapWord": {
                        "type": "boolean"
                    },
                    "truncate": {
                        "type": "integer"
                    },
                    "paddingLeft": {
                        "type": "integer"
                    },
                    "paddingRight": {
                        "type": "integer"
                    }
                },
                "required": ["row", "col"],
                "additionalProperties": false
            }
        }
    },
    "additionalProperties": false
};
const schema15 = {
    "type": "object",
    "properties": {
        "topBody": {
            "$ref": "#/definitions/border"
        },
        "topJoin": {
            "$ref": "#/definitions/border"
        },
        "topLeft": {
            "$ref": "#/definitions/border"
        },
        "topRight": {
            "$ref": "#/definitions/border"
        },
        "bottomBody": {
            "$ref": "#/definitions/border"
        },
        "bottomJoin": {
            "$ref": "#/definitions/border"
        },
        "bottomLeft": {
            "$ref": "#/definitions/border"
        },
        "bottomRight": {
            "$ref": "#/definitions/border"
        },
        "bodyLeft": {
            "$ref": "#/definitions/border"
        },
        "bodyRight": {
            "$ref": "#/definitions/border"
        },
        "bodyJoin": {
            "$ref": "#/definitions/border"
        },
        "headerJoin": {
            "$ref": "#/definitions/border"
        },
        "joinBody": {
            "$ref": "#/definitions/border"
        },
        "joinLeft": {
            "$ref": "#/definitions/border"
        },
        "joinRight": {
            "$ref": "#/definitions/border"
        },
        "joinJoin": {
            "$ref": "#/definitions/border"
        },
        "joinMiddleUp": {
            "$ref": "#/definitions/border"
        },
        "joinMiddleDown": {
            "$ref": "#/definitions/border"
        },
        "joinMiddleLeft": {
            "$ref": "#/definitions/border"
        },
        "joinMiddleRight": {
            "$ref": "#/definitions/border"
        }
    },
    "additionalProperties": false
};
const func8 = Object.prototype.hasOwnProperty;
function validate46(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    if (typeof data !== "string") {
        const err0 = {
            instancePath,
            schemaPath: "#/type",
            keyword: "type",
            params: {
                type: "string"
            },
            message: "must be string"
        };
        if (vErrors === null) {
            vErrors = [err0];
        }
        else {
            vErrors.push(err0);
        }
        errors++;
    }
    validate46.errors = vErrors;
    return errors === 0;
}
function validate45(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    if (data && typeof data == "object" && !Array.isArray(data)) {
        for (const key0 in data) {
            if (!(func8.call(schema15.properties, key0))) {
                const err0 = {
                    instancePath,
                    schemaPath: "#/additionalProperties",
                    keyword: "additionalProperties",
                    params: {
                        additionalProperty: key0
                    },
                    message: "must NOT have additional properties"
                };
                if (vErrors === null) {
                    vErrors = [err0];
                }
                else {
                    vErrors.push(err0);
                }
                errors++;
            }
        }
        if (data.topBody !== undefined) {
            if (!(validate46(data.topBody, {
                instancePath: instancePath + "/topBody",
                parentData: data,
                parentDataProperty: "topBody",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.topJoin !== undefined) {
            if (!(validate46(data.topJoin, {
                instancePath: instancePath + "/topJoin",
                parentData: data,
                parentDataProperty: "topJoin",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.topLeft !== undefined) {
            if (!(validate46(data.topLeft, {
                instancePath: instancePath + "/topLeft",
                parentData: data,
                parentDataProperty: "topLeft",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.topRight !== undefined) {
            if (!(validate46(data.topRight, {
                instancePath: instancePath + "/topRight",
                parentData: data,
                parentDataProperty: "topRight",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bottomBody !== undefined) {
            if (!(validate46(data.bottomBody, {
                instancePath: instancePath + "/bottomBody",
                parentData: data,
                parentDataProperty: "bottomBody",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bottomJoin !== undefined) {
            if (!(validate46(data.bottomJoin, {
                instancePath: instancePath + "/bottomJoin",
                parentData: data,
                parentDataProperty: "bottomJoin",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bottomLeft !== undefined) {
            if (!(validate46(data.bottomLeft, {
                instancePath: instancePath + "/bottomLeft",
                parentData: data,
                parentDataProperty: "bottomLeft",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bottomRight !== undefined) {
            if (!(validate46(data.bottomRight, {
                instancePath: instancePath + "/bottomRight",
                parentData: data,
                parentDataProperty: "bottomRight",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bodyLeft !== undefined) {
            if (!(validate46(data.bodyLeft, {
                instancePath: instancePath + "/bodyLeft",
                parentData: data,
                parentDataProperty: "bodyLeft",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bodyRight !== undefined) {
            if (!(validate46(data.bodyRight, {
                instancePath: instancePath + "/bodyRight",
                parentData: data,
                parentDataProperty: "bodyRight",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bodyJoin !== undefined) {
            if (!(validate46(data.bodyJoin, {
                instancePath: instancePath + "/bodyJoin",
                parentData: data,
                parentDataProperty: "bodyJoin",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.headerJoin !== undefined) {
            if (!(validate46(data.headerJoin, {
                instancePath: instancePath + "/headerJoin",
                parentData: data,
                parentDataProperty: "headerJoin",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinBody !== undefined) {
            if (!(validate46(data.joinBody, {
                instancePath: instancePath + "/joinBody",
                parentData: data,
                parentDataProperty: "joinBody",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinLeft !== undefined) {
            if (!(validate46(data.joinLeft, {
                instancePath: instancePath + "/joinLeft",
                parentData: data,
                parentDataProperty: "joinLeft",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinRight !== undefined) {
            if (!(validate46(data.joinRight, {
                instancePath: instancePath + "/joinRight",
                parentData: data,
                parentDataProperty: "joinRight",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinJoin !== undefined) {
            if (!(validate46(data.joinJoin, {
                instancePath: instancePath + "/joinJoin",
                parentData: data,
                parentDataProperty: "joinJoin",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinMiddleUp !== undefined) {
            if (!(validate46(data.joinMiddleUp, {
                instancePath: instancePath + "/joinMiddleUp",
                parentData: data,
                parentDataProperty: "joinMiddleUp",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinMiddleDown !== undefined) {
            if (!(validate46(data.joinMiddleDown, {
                instancePath: instancePath + "/joinMiddleDown",
                parentData: data,
                parentDataProperty: "joinMiddleDown",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinMiddleLeft !== undefined) {
            if (!(validate46(data.joinMiddleLeft, {
                instancePath: instancePath + "/joinMiddleLeft",
                parentData: data,
                parentDataProperty: "joinMiddleLeft",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinMiddleRight !== undefined) {
            if (!(validate46(data.joinMiddleRight, {
                instancePath: instancePath + "/joinMiddleRight",
                parentData: data,
                parentDataProperty: "joinMiddleRight",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
    }
    else {
        const err1 = {
            instancePath,
            schemaPath: "#/type",
            keyword: "type",
            params: {
                type: "object"
            },
            message: "must be object"
        };
        if (vErrors === null) {
            vErrors = [err1];
        }
        else {
            vErrors.push(err1);
        }
        errors++;
    }
    validate45.errors = vErrors;
    return errors === 0;
}
const schema17 = {
    "type": "string",
    "enum": ["left", "right", "center", "justify"]
};
equal$1.default;
function validate68(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    if (typeof data !== "string") {
        const err0 = {
            instancePath,
            schemaPath: "#/type",
            keyword: "type",
            params: {
                type: "string"
            },
            message: "must be string"
        };
        if (vErrors === null) {
            vErrors = [err0];
        }
        else {
            vErrors.push(err0);
        }
        errors++;
    }
    if (!((((data === "left") || (data === "right")) || (data === "center")) || (data === "justify"))) {
        const err1 = {
            instancePath,
            schemaPath: "#/enum",
            keyword: "enum",
            params: {
                allowedValues: schema17.enum
            },
            message: "must be equal to one of the allowed values"
        };
        if (vErrors === null) {
            vErrors = [err1];
        }
        else {
            vErrors.push(err1);
        }
        errors++;
    }
    validate68.errors = vErrors;
    return errors === 0;
}
const pattern0 = new RegExp("^[0-9]+$", "u");
function validate72(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    if (typeof data !== "string") {
        const err0 = {
            instancePath,
            schemaPath: "#/type",
            keyword: "type",
            params: {
                type: "string"
            },
            message: "must be string"
        };
        if (vErrors === null) {
            vErrors = [err0];
        }
        else {
            vErrors.push(err0);
        }
        errors++;
    }
    if (!((((data === "left") || (data === "right")) || (data === "center")) || (data === "justify"))) {
        const err1 = {
            instancePath,
            schemaPath: "#/enum",
            keyword: "enum",
            params: {
                allowedValues: schema17.enum
            },
            message: "must be equal to one of the allowed values"
        };
        if (vErrors === null) {
            vErrors = [err1];
        }
        else {
            vErrors.push(err1);
        }
        errors++;
    }
    validate72.errors = vErrors;
    return errors === 0;
}
const schema21 = {
    "type": "string",
    "enum": ["top", "middle", "bottom"]
};
function validate74(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    if (typeof data !== "string") {
        const err0 = {
            instancePath,
            schemaPath: "#/type",
            keyword: "type",
            params: {
                type: "string"
            },
            message: "must be string"
        };
        if (vErrors === null) {
            vErrors = [err0];
        }
        else {
            vErrors.push(err0);
        }
        errors++;
    }
    if (!(((data === "top") || (data === "middle")) || (data === "bottom"))) {
        const err1 = {
            instancePath,
            schemaPath: "#/enum",
            keyword: "enum",
            params: {
                allowedValues: schema21.enum
            },
            message: "must be equal to one of the allowed values"
        };
        if (vErrors === null) {
            vErrors = [err1];
        }
        else {
            vErrors.push(err1);
        }
        errors++;
    }
    validate74.errors = vErrors;
    return errors === 0;
}
function validate71(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    if (data && typeof data == "object" && !Array.isArray(data)) {
        for (const key0 in data) {
            if (!(((((((key0 === "alignment") || (key0 === "verticalAlignment")) || (key0 === "width")) || (key0 === "wrapWord")) || (key0 === "truncate")) || (key0 === "paddingLeft")) || (key0 === "paddingRight"))) {
                const err0 = {
                    instancePath,
                    schemaPath: "#/additionalProperties",
                    keyword: "additionalProperties",
                    params: {
                        additionalProperty: key0
                    },
                    message: "must NOT have additional properties"
                };
                if (vErrors === null) {
                    vErrors = [err0];
                }
                else {
                    vErrors.push(err0);
                }
                errors++;
            }
        }
        if (data.alignment !== undefined) {
            if (!(validate72(data.alignment, {
                instancePath: instancePath + "/alignment",
                parentData: data,
                parentDataProperty: "alignment",
                rootData
            }))) {
                vErrors = vErrors === null ? validate72.errors : vErrors.concat(validate72.errors);
                errors = vErrors.length;
            }
        }
        if (data.verticalAlignment !== undefined) {
            if (!(validate74(data.verticalAlignment, {
                instancePath: instancePath + "/verticalAlignment",
                parentData: data,
                parentDataProperty: "verticalAlignment",
                rootData
            }))) {
                vErrors = vErrors === null ? validate74.errors : vErrors.concat(validate74.errors);
                errors = vErrors.length;
            }
        }
        if (data.width !== undefined) {
            let data2 = data.width;
            if (!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))) {
                const err1 = {
                    instancePath: instancePath + "/width",
                    schemaPath: "#/properties/width/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err1];
                }
                else {
                    vErrors.push(err1);
                }
                errors++;
            }
            if ((typeof data2 == "number") && (isFinite(data2))) {
                if (data2 < 1 || isNaN(data2)) {
                    const err2 = {
                        instancePath: instancePath + "/width",
                        schemaPath: "#/properties/width/minimum",
                        keyword: "minimum",
                        params: {
                            comparison: ">=",
                            limit: 1
                        },
                        message: "must be >= 1"
                    };
                    if (vErrors === null) {
                        vErrors = [err2];
                    }
                    else {
                        vErrors.push(err2);
                    }
                    errors++;
                }
            }
        }
        if (data.wrapWord !== undefined) {
            if (typeof data.wrapWord !== "boolean") {
                const err3 = {
                    instancePath: instancePath + "/wrapWord",
                    schemaPath: "#/properties/wrapWord/type",
                    keyword: "type",
                    params: {
                        type: "boolean"
                    },
                    message: "must be boolean"
                };
                if (vErrors === null) {
                    vErrors = [err3];
                }
                else {
                    vErrors.push(err3);
                }
                errors++;
            }
        }
        if (data.truncate !== undefined) {
            let data4 = data.truncate;
            if (!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))) {
                const err4 = {
                    instancePath: instancePath + "/truncate",
                    schemaPath: "#/properties/truncate/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err4];
                }
                else {
                    vErrors.push(err4);
                }
                errors++;
            }
        }
        if (data.paddingLeft !== undefined) {
            let data5 = data.paddingLeft;
            if (!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))) {
                const err5 = {
                    instancePath: instancePath + "/paddingLeft",
                    schemaPath: "#/properties/paddingLeft/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err5];
                }
                else {
                    vErrors.push(err5);
                }
                errors++;
            }
        }
        if (data.paddingRight !== undefined) {
            let data6 = data.paddingRight;
            if (!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))) {
                const err6 = {
                    instancePath: instancePath + "/paddingRight",
                    schemaPath: "#/properties/paddingRight/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err6];
                }
                else {
                    vErrors.push(err6);
                }
                errors++;
            }
        }
    }
    else {
        const err7 = {
            instancePath,
            schemaPath: "#/type",
            keyword: "type",
            params: {
                type: "object"
            },
            message: "must be object"
        };
        if (vErrors === null) {
            vErrors = [err7];
        }
        else {
            vErrors.push(err7);
        }
        errors++;
    }
    validate71.errors = vErrors;
    return errors === 0;
}
function validate70(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    const _errs0 = errors;
    let valid0 = false;
    let passing0 = null;
    const _errs1 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
        for (const key0 in data) {
            if (!(pattern0.test(key0))) {
                const err0 = {
                    instancePath,
                    schemaPath: "#/oneOf/0/additionalProperties",
                    keyword: "additionalProperties",
                    params: {
                        additionalProperty: key0
                    },
                    message: "must NOT have additional properties"
                };
                if (vErrors === null) {
                    vErrors = [err0];
                }
                else {
                    vErrors.push(err0);
                }
                errors++;
            }
        }
        for (const key1 in data) {
            if (pattern0.test(key1)) {
                if (!(validate71(data[key1], {
                    instancePath: instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"),
                    parentData: data,
                    parentDataProperty: key1,
                    rootData
                }))) {
                    vErrors = vErrors === null ? validate71.errors : vErrors.concat(validate71.errors);
                    errors = vErrors.length;
                }
            }
        }
    }
    else {
        const err1 = {
            instancePath,
            schemaPath: "#/oneOf/0/type",
            keyword: "type",
            params: {
                type: "object"
            },
            message: "must be object"
        };
        if (vErrors === null) {
            vErrors = [err1];
        }
        else {
            vErrors.push(err1);
        }
        errors++;
    }
    var _valid0 = _errs1 === errors;
    if (_valid0) {
        valid0 = true;
        passing0 = 0;
    }
    const _errs5 = errors;
    if (Array.isArray(data)) {
        const len0 = data.length;
        for (let i0 = 0; i0 < len0; i0++) {
            if (!(validate71(data[i0], {
                instancePath: instancePath + "/" + i0,
                parentData: data,
                parentDataProperty: i0,
                rootData
            }))) {
                vErrors = vErrors === null ? validate71.errors : vErrors.concat(validate71.errors);
                errors = vErrors.length;
            }
        }
    }
    else {
        const err2 = {
            instancePath,
            schemaPath: "#/oneOf/1/type",
            keyword: "type",
            params: {
                type: "array"
            },
            message: "must be array"
        };
        if (vErrors === null) {
            vErrors = [err2];
        }
        else {
            vErrors.push(err2);
        }
        errors++;
    }
    var _valid0 = _errs5 === errors;
    if (_valid0 && valid0) {
        valid0 = false;
        passing0 = [passing0, 1];
    }
    else {
        if (_valid0) {
            valid0 = true;
            passing0 = 1;
        }
    }
    if (!valid0) {
        const err3 = {
            instancePath,
            schemaPath: "#/oneOf",
            keyword: "oneOf",
            params: {
                passingSchemas: passing0
            },
            message: "must match exactly one schema in oneOf"
        };
        if (vErrors === null) {
            vErrors = [err3];
        }
        else {
            vErrors.push(err3);
        }
        errors++;
    }
    else {
        errors = _errs0;
        if (vErrors !== null) {
            if (_errs0) {
                vErrors.length = _errs0;
            }
            else {
                vErrors = null;
            }
        }
    }
    validate70.errors = vErrors;
    return errors === 0;
}
function validate79(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    if (data && typeof data == "object" && !Array.isArray(data)) {
        for (const key0 in data) {
            if (!(((((((key0 === "alignment") || (key0 === "verticalAlignment")) || (key0 === "width")) || (key0 === "wrapWord")) || (key0 === "truncate")) || (key0 === "paddingLeft")) || (key0 === "paddingRight"))) {
                const err0 = {
                    instancePath,
                    schemaPath: "#/additionalProperties",
                    keyword: "additionalProperties",
                    params: {
                        additionalProperty: key0
                    },
                    message: "must NOT have additional properties"
                };
                if (vErrors === null) {
                    vErrors = [err0];
                }
                else {
                    vErrors.push(err0);
                }
                errors++;
            }
        }
        if (data.alignment !== undefined) {
            if (!(validate72(data.alignment, {
                instancePath: instancePath + "/alignment",
                parentData: data,
                parentDataProperty: "alignment",
                rootData
            }))) {
                vErrors = vErrors === null ? validate72.errors : vErrors.concat(validate72.errors);
                errors = vErrors.length;
            }
        }
        if (data.verticalAlignment !== undefined) {
            if (!(validate74(data.verticalAlignment, {
                instancePath: instancePath + "/verticalAlignment",
                parentData: data,
                parentDataProperty: "verticalAlignment",
                rootData
            }))) {
                vErrors = vErrors === null ? validate74.errors : vErrors.concat(validate74.errors);
                errors = vErrors.length;
            }
        }
        if (data.width !== undefined) {
            let data2 = data.width;
            if (!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))) {
                const err1 = {
                    instancePath: instancePath + "/width",
                    schemaPath: "#/properties/width/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err1];
                }
                else {
                    vErrors.push(err1);
                }
                errors++;
            }
            if ((typeof data2 == "number") && (isFinite(data2))) {
                if (data2 < 1 || isNaN(data2)) {
                    const err2 = {
                        instancePath: instancePath + "/width",
                        schemaPath: "#/properties/width/minimum",
                        keyword: "minimum",
                        params: {
                            comparison: ">=",
                            limit: 1
                        },
                        message: "must be >= 1"
                    };
                    if (vErrors === null) {
                        vErrors = [err2];
                    }
                    else {
                        vErrors.push(err2);
                    }
                    errors++;
                }
            }
        }
        if (data.wrapWord !== undefined) {
            if (typeof data.wrapWord !== "boolean") {
                const err3 = {
                    instancePath: instancePath + "/wrapWord",
                    schemaPath: "#/properties/wrapWord/type",
                    keyword: "type",
                    params: {
                        type: "boolean"
                    },
                    message: "must be boolean"
                };
                if (vErrors === null) {
                    vErrors = [err3];
                }
                else {
                    vErrors.push(err3);
                }
                errors++;
            }
        }
        if (data.truncate !== undefined) {
            let data4 = data.truncate;
            if (!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))) {
                const err4 = {
                    instancePath: instancePath + "/truncate",
                    schemaPath: "#/properties/truncate/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err4];
                }
                else {
                    vErrors.push(err4);
                }
                errors++;
            }
        }
        if (data.paddingLeft !== undefined) {
            let data5 = data.paddingLeft;
            if (!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))) {
                const err5 = {
                    instancePath: instancePath + "/paddingLeft",
                    schemaPath: "#/properties/paddingLeft/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err5];
                }
                else {
                    vErrors.push(err5);
                }
                errors++;
            }
        }
        if (data.paddingRight !== undefined) {
            let data6 = data.paddingRight;
            if (!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))) {
                const err6 = {
                    instancePath: instancePath + "/paddingRight",
                    schemaPath: "#/properties/paddingRight/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err6];
                }
                else {
                    vErrors.push(err6);
                }
                errors++;
            }
        }
    }
    else {
        const err7 = {
            instancePath,
            schemaPath: "#/type",
            keyword: "type",
            params: {
                type: "object"
            },
            message: "must be object"
        };
        if (vErrors === null) {
            vErrors = [err7];
        }
        else {
            vErrors.push(err7);
        }
        errors++;
    }
    validate79.errors = vErrors;
    return errors === 0;
}
function validate84(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    if (typeof data !== "string") {
        const err0 = {
            instancePath,
            schemaPath: "#/type",
            keyword: "type",
            params: {
                type: "string"
            },
            message: "must be string"
        };
        if (vErrors === null) {
            vErrors = [err0];
        }
        else {
            vErrors.push(err0);
        }
        errors++;
    }
    if (!(((data === "top") || (data === "middle")) || (data === "bottom"))) {
        const err1 = {
            instancePath,
            schemaPath: "#/enum",
            keyword: "enum",
            params: {
                allowedValues: schema21.enum
            },
            message: "must be equal to one of the allowed values"
        };
        if (vErrors === null) {
            vErrors = [err1];
        }
        else {
            vErrors.push(err1);
        }
        errors++;
    }
    validate84.errors = vErrors;
    return errors === 0;
}
function validate43(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    if (data && typeof data == "object" && !Array.isArray(data)) {
        for (const key0 in data) {
            if (!((((((((key0 === "border") || (key0 === "header")) || (key0 === "columns")) || (key0 === "columnDefault")) || (key0 === "drawVerticalLine")) || (key0 === "drawHorizontalLine")) || (key0 === "singleLine")) || (key0 === "spanningCells"))) {
                const err0 = {
                    instancePath,
                    schemaPath: "#/additionalProperties",
                    keyword: "additionalProperties",
                    params: {
                        additionalProperty: key0
                    },
                    message: "must NOT have additional properties"
                };
                if (vErrors === null) {
                    vErrors = [err0];
                }
                else {
                    vErrors.push(err0);
                }
                errors++;
            }
        }
        if (data.border !== undefined) {
            if (!(validate45(data.border, {
                instancePath: instancePath + "/border",
                parentData: data,
                parentDataProperty: "border",
                rootData
            }))) {
                vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
                errors = vErrors.length;
            }
        }
        if (data.header !== undefined) {
            let data1 = data.header;
            if (data1 && typeof data1 == "object" && !Array.isArray(data1)) {
                if (data1.content === undefined) {
                    const err1 = {
                        instancePath: instancePath + "/header",
                        schemaPath: "#/properties/header/required",
                        keyword: "required",
                        params: {
                            missingProperty: "content"
                        },
                        message: "must have required property '" + "content" + "'"
                    };
                    if (vErrors === null) {
                        vErrors = [err1];
                    }
                    else {
                        vErrors.push(err1);
                    }
                    errors++;
                }
                for (const key1 in data1) {
                    if (!((((((key1 === "content") || (key1 === "alignment")) || (key1 === "wrapWord")) || (key1 === "truncate")) || (key1 === "paddingLeft")) || (key1 === "paddingRight"))) {
                        const err2 = {
                            instancePath: instancePath + "/header",
                            schemaPath: "#/properties/header/additionalProperties",
                            keyword: "additionalProperties",
                            params: {
                                additionalProperty: key1
                            },
                            message: "must NOT have additional properties"
                        };
                        if (vErrors === null) {
                            vErrors = [err2];
                        }
                        else {
                            vErrors.push(err2);
                        }
                        errors++;
                    }
                }
                if (data1.content !== undefined) {
                    if (typeof data1.content !== "string") {
                        const err3 = {
                            instancePath: instancePath + "/header/content",
                            schemaPath: "#/properties/header/properties/content/type",
                            keyword: "type",
                            params: {
                                type: "string"
                            },
                            message: "must be string"
                        };
                        if (vErrors === null) {
                            vErrors = [err3];
                        }
                        else {
                            vErrors.push(err3);
                        }
                        errors++;
                    }
                }
                if (data1.alignment !== undefined) {
                    if (!(validate68(data1.alignment, {
                        instancePath: instancePath + "/header/alignment",
                        parentData: data1,
                        parentDataProperty: "alignment",
                        rootData
                    }))) {
                        vErrors = vErrors === null ? validate68.errors : vErrors.concat(validate68.errors);
                        errors = vErrors.length;
                    }
                }
                if (data1.wrapWord !== undefined) {
                    if (typeof data1.wrapWord !== "boolean") {
                        const err4 = {
                            instancePath: instancePath + "/header/wrapWord",
                            schemaPath: "#/properties/header/properties/wrapWord/type",
                            keyword: "type",
                            params: {
                                type: "boolean"
                            },
                            message: "must be boolean"
                        };
                        if (vErrors === null) {
                            vErrors = [err4];
                        }
                        else {
                            vErrors.push(err4);
                        }
                        errors++;
                    }
                }
                if (data1.truncate !== undefined) {
                    let data5 = data1.truncate;
                    if (!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))) {
                        const err5 = {
                            instancePath: instancePath + "/header/truncate",
                            schemaPath: "#/properties/header/properties/truncate/type",
                            keyword: "type",
                            params: {
                                type: "integer"
                            },
                            message: "must be integer"
                        };
                        if (vErrors === null) {
                            vErrors = [err5];
                        }
                        else {
                            vErrors.push(err5);
                        }
                        errors++;
                    }
                }
                if (data1.paddingLeft !== undefined) {
                    let data6 = data1.paddingLeft;
                    if (!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))) {
                        const err6 = {
                            instancePath: instancePath + "/header/paddingLeft",
                            schemaPath: "#/properties/header/properties/paddingLeft/type",
                            keyword: "type",
                            params: {
                                type: "integer"
                            },
                            message: "must be integer"
                        };
                        if (vErrors === null) {
                            vErrors = [err6];
                        }
                        else {
                            vErrors.push(err6);
                        }
                        errors++;
                    }
                }
                if (data1.paddingRight !== undefined) {
                    let data7 = data1.paddingRight;
                    if (!(((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7))) && (isFinite(data7)))) {
                        const err7 = {
                            instancePath: instancePath + "/header/paddingRight",
                            schemaPath: "#/properties/header/properties/paddingRight/type",
                            keyword: "type",
                            params: {
                                type: "integer"
                            },
                            message: "must be integer"
                        };
                        if (vErrors === null) {
                            vErrors = [err7];
                        }
                        else {
                            vErrors.push(err7);
                        }
                        errors++;
                    }
                }
            }
            else {
                const err8 = {
                    instancePath: instancePath + "/header",
                    schemaPath: "#/properties/header/type",
                    keyword: "type",
                    params: {
                        type: "object"
                    },
                    message: "must be object"
                };
                if (vErrors === null) {
                    vErrors = [err8];
                }
                else {
                    vErrors.push(err8);
                }
                errors++;
            }
        }
        if (data.columns !== undefined) {
            if (!(validate70(data.columns, {
                instancePath: instancePath + "/columns",
                parentData: data,
                parentDataProperty: "columns",
                rootData
            }))) {
                vErrors = vErrors === null ? validate70.errors : vErrors.concat(validate70.errors);
                errors = vErrors.length;
            }
        }
        if (data.columnDefault !== undefined) {
            if (!(validate79(data.columnDefault, {
                instancePath: instancePath + "/columnDefault",
                parentData: data,
                parentDataProperty: "columnDefault",
                rootData
            }))) {
                vErrors = vErrors === null ? validate79.errors : vErrors.concat(validate79.errors);
                errors = vErrors.length;
            }
        }
        if (data.drawVerticalLine !== undefined) {
            if (typeof data.drawVerticalLine != "function") {
                const err9 = {
                    instancePath: instancePath + "/drawVerticalLine",
                    schemaPath: "#/properties/drawVerticalLine/typeof",
                    keyword: "typeof",
                    params: {},
                    message: "must pass \"typeof\" keyword validation"
                };
                if (vErrors === null) {
                    vErrors = [err9];
                }
                else {
                    vErrors.push(err9);
                }
                errors++;
            }
        }
        if (data.drawHorizontalLine !== undefined) {
            if (typeof data.drawHorizontalLine != "function") {
                const err10 = {
                    instancePath: instancePath + "/drawHorizontalLine",
                    schemaPath: "#/properties/drawHorizontalLine/typeof",
                    keyword: "typeof",
                    params: {},
                    message: "must pass \"typeof\" keyword validation"
                };
                if (vErrors === null) {
                    vErrors = [err10];
                }
                else {
                    vErrors.push(err10);
                }
                errors++;
            }
        }
        if (data.singleLine !== undefined) {
            if (typeof data.singleLine != "boolean") {
                const err11 = {
                    instancePath: instancePath + "/singleLine",
                    schemaPath: "#/properties/singleLine/typeof",
                    keyword: "typeof",
                    params: {},
                    message: "must pass \"typeof\" keyword validation"
                };
                if (vErrors === null) {
                    vErrors = [err11];
                }
                else {
                    vErrors.push(err11);
                }
                errors++;
            }
        }
        if (data.spanningCells !== undefined) {
            let data13 = data.spanningCells;
            if (Array.isArray(data13)) {
                const len0 = data13.length;
                for (let i0 = 0; i0 < len0; i0++) {
                    let data14 = data13[i0];
                    if (data14 && typeof data14 == "object" && !Array.isArray(data14)) {
                        if (data14.row === undefined) {
                            const err12 = {
                                instancePath: instancePath + "/spanningCells/" + i0,
                                schemaPath: "#/properties/spanningCells/items/required",
                                keyword: "required",
                                params: {
                                    missingProperty: "row"
                                },
                                message: "must have required property '" + "row" + "'"
                            };
                            if (vErrors === null) {
                                vErrors = [err12];
                            }
                            else {
                                vErrors.push(err12);
                            }
                            errors++;
                        }
                        if (data14.col === undefined) {
                            const err13 = {
                                instancePath: instancePath + "/spanningCells/" + i0,
                                schemaPath: "#/properties/spanningCells/items/required",
                                keyword: "required",
                                params: {
                                    missingProperty: "col"
                                },
                                message: "must have required property '" + "col" + "'"
                            };
                            if (vErrors === null) {
                                vErrors = [err13];
                            }
                            else {
                                vErrors.push(err13);
                            }
                            errors++;
                        }
                        for (const key2 in data14) {
                            if (!(func8.call(schema13.properties.spanningCells.items.properties, key2))) {
                                const err14 = {
                                    instancePath: instancePath + "/spanningCells/" + i0,
                                    schemaPath: "#/properties/spanningCells/items/additionalProperties",
                                    keyword: "additionalProperties",
                                    params: {
                                        additionalProperty: key2
                                    },
                                    message: "must NOT have additional properties"
                                };
                                if (vErrors === null) {
                                    vErrors = [err14];
                                }
                                else {
                                    vErrors.push(err14);
                                }
                                errors++;
                            }
                        }
                        if (data14.col !== undefined) {
                            let data15 = data14.col;
                            if (!(((typeof data15 == "number") && (!(data15 % 1) && !isNaN(data15))) && (isFinite(data15)))) {
                                const err15 = {
                                    instancePath: instancePath + "/spanningCells/" + i0 + "/col",
                                    schemaPath: "#/properties/spanningCells/items/properties/col/type",
                                    keyword: "type",
                                    params: {
                                        type: "integer"
                                    },
                                    message: "must be integer"
                                };
                                if (vErrors === null) {
                                    vErrors = [err15];
                                }
                                else {
                                    vErrors.push(err15);
                                }
                                errors++;
                            }
                            if ((typeof data15 == "number") && (isFinite(data15))) {
                                if (data15 < 0 || isNaN(data15)) {
                                    const err16 = {
                                        instancePath: instancePath + "/spanningCells/" + i0 + "/col",
                                        schemaPath: "#/properties/spanningCells/items/properties/col/minimum",
                                        keyword: "minimum",
                                        params: {
                                            comparison: ">=",
                                            limit: 0
                                        },
                                        message: "must be >= 0"
                                    };
                                    if (vErrors === null) {
                                        vErrors = [err16];
                                    }
                                    else {
                                        vErrors.push(err16);
                                    }
                                    errors++;
                                }
                            }
                        }
                        if (data14.row !== undefined) {
                            let data16 = data14.row;
                            if (!(((typeof data16 == "number") && (!(data16 % 1) && !isNaN(data16))) && (isFinite(data16)))) {
                                const err17 = {
                                    instancePath: instancePath + "/spanningCells/" + i0 + "/row",
                                    schemaPath: "#/properties/spanningCells/items/properties/row/type",
                                    keyword: "type",
                                    params: {
                                        type: "integer"
                                    },
                                    message: "must be integer"
                                };
                                if (vErrors === null) {
                                    vErrors = [err17];
                                }
                                else {
                                    vErrors.push(err17);
                                }
                                errors++;
                            }
                            if ((typeof data16 == "number") && (isFinite(data16))) {
                                if (data16 < 0 || isNaN(data16)) {
                                    const err18 = {
                                        instancePath: instancePath + "/spanningCells/" + i0 + "/row",
                                        schemaPath: "#/properties/spanningCells/items/properties/row/minimum",
                                        keyword: "minimum",
                                        params: {
                                            comparison: ">=",
                                            limit: 0
                                        },
                                        message: "must be >= 0"
                                    };
                                    if (vErrors === null) {
                                        vErrors = [err18];
                                    }
                                    else {
                                        vErrors.push(err18);
                                    }
                                    errors++;
                                }
                            }
                        }
                        if (data14.colSpan !== undefined) {
                            let data17 = data14.colSpan;
                            if (!(((typeof data17 == "number") && (!(data17 % 1) && !isNaN(data17))) && (isFinite(data17)))) {
                                const err19 = {
                                    instancePath: instancePath + "/spanningCells/" + i0 + "/colSpan",
                                    schemaPath: "#/properties/spanningCells/items/properties/colSpan/type",
                                    keyword: "type",
                                    params: {
                                        type: "integer"
                                    },
                                    message: "must be integer"
                                };
                                if (vErrors === null) {
                                    vErrors = [err19];
                                }
                                else {
                                    vErrors.push(err19);
                                }
                                errors++;
                            }
                            if ((typeof data17 == "number") && (isFinite(data17))) {
                                if (data17 < 1 || isNaN(data17)) {
                                    const err20 = {
                                        instancePath: instancePath + "/spanningCells/" + i0 + "/colSpan",
                                        schemaPath: "#/properties/spanningCells/items/properties/colSpan/minimum",
                                        keyword: "minimum",
                                        params: {
                                            comparison: ">=",
                                            limit: 1
                                        },
                                        message: "must be >= 1"
                                    };
                                    if (vErrors === null) {
                                        vErrors = [err20];
                                    }
                                    else {
                                        vErrors.push(err20);
                                    }
                                    errors++;
                                }
                            }
                        }
                        if (data14.rowSpan !== undefined) {
                            let data18 = data14.rowSpan;
                            if (!(((typeof data18 == "number") && (!(data18 % 1) && !isNaN(data18))) && (isFinite(data18)))) {
                                const err21 = {
                                    instancePath: instancePath + "/spanningCells/" + i0 + "/rowSpan",
                                    schemaPath: "#/properties/spanningCells/items/properties/rowSpan/type",
                                    keyword: "type",
                                    params: {
                                        type: "integer"
                                    },
                                    message: "must be integer"
                                };
                                if (vErrors === null) {
                                    vErrors = [err21];
                                }
                                else {
                                    vErrors.push(err21);
                                }
                                errors++;
                            }
                            if ((typeof data18 == "number") && (isFinite(data18))) {
                                if (data18 < 1 || isNaN(data18)) {
                                    const err22 = {
                                        instancePath: instancePath + "/spanningCells/" + i0 + "/rowSpan",
                                        schemaPath: "#/properties/spanningCells/items/properties/rowSpan/minimum",
                                        keyword: "minimum",
                                        params: {
                                            comparison: ">=",
                                            limit: 1
                                        },
                                        message: "must be >= 1"
                                    };
                                    if (vErrors === null) {
                                        vErrors = [err22];
                                    }
                                    else {
                                        vErrors.push(err22);
                                    }
                                    errors++;
                                }
                            }
                        }
                        if (data14.alignment !== undefined) {
                            if (!(validate68(data14.alignment, {
                                instancePath: instancePath + "/spanningCells/" + i0 + "/alignment",
                                parentData: data14,
                                parentDataProperty: "alignment",
                                rootData
                            }))) {
                                vErrors = vErrors === null ? validate68.errors : vErrors.concat(validate68.errors);
                                errors = vErrors.length;
                            }
                        }
                        if (data14.verticalAlignment !== undefined) {
                            if (!(validate84(data14.verticalAlignment, {
                                instancePath: instancePath + "/spanningCells/" + i0 + "/verticalAlignment",
                                parentData: data14,
                                parentDataProperty: "verticalAlignment",
                                rootData
                            }))) {
                                vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
                                errors = vErrors.length;
                            }
                        }
                        if (data14.wrapWord !== undefined) {
                            if (typeof data14.wrapWord !== "boolean") {
                                const err23 = {
                                    instancePath: instancePath + "/spanningCells/" + i0 + "/wrapWord",
                                    schemaPath: "#/properties/spanningCells/items/properties/wrapWord/type",
                                    keyword: "type",
                                    params: {
                                        type: "boolean"
                                    },
                                    message: "must be boolean"
                                };
                                if (vErrors === null) {
                                    vErrors = [err23];
                                }
                                else {
                                    vErrors.push(err23);
                                }
                                errors++;
                            }
                        }
                        if (data14.truncate !== undefined) {
                            let data22 = data14.truncate;
                            if (!(((typeof data22 == "number") && (!(data22 % 1) && !isNaN(data22))) && (isFinite(data22)))) {
                                const err24 = {
                                    instancePath: instancePath + "/spanningCells/" + i0 + "/truncate",
                                    schemaPath: "#/properties/spanningCells/items/properties/truncate/type",
                                    keyword: "type",
                                    params: {
                                        type: "integer"
                                    },
                                    message: "must be integer"
                                };
                                if (vErrors === null) {
                                    vErrors = [err24];
                                }
                                else {
                                    vErrors.push(err24);
                                }
                                errors++;
                            }
                        }
                        if (data14.paddingLeft !== undefined) {
                            let data23 = data14.paddingLeft;
                            if (!(((typeof data23 == "number") && (!(data23 % 1) && !isNaN(data23))) && (isFinite(data23)))) {
                                const err25 = {
                                    instancePath: instancePath + "/spanningCells/" + i0 + "/paddingLeft",
                                    schemaPath: "#/properties/spanningCells/items/properties/paddingLeft/type",
                                    keyword: "type",
                                    params: {
                                        type: "integer"
                                    },
                                    message: "must be integer"
                                };
                                if (vErrors === null) {
                                    vErrors = [err25];
                                }
                                else {
                                    vErrors.push(err25);
                                }
                                errors++;
                            }
                        }
                        if (data14.paddingRight !== undefined) {
                            let data24 = data14.paddingRight;
                            if (!(((typeof data24 == "number") && (!(data24 % 1) && !isNaN(data24))) && (isFinite(data24)))) {
                                const err26 = {
                                    instancePath: instancePath + "/spanningCells/" + i0 + "/paddingRight",
                                    schemaPath: "#/properties/spanningCells/items/properties/paddingRight/type",
                                    keyword: "type",
                                    params: {
                                        type: "integer"
                                    },
                                    message: "must be integer"
                                };
                                if (vErrors === null) {
                                    vErrors = [err26];
                                }
                                else {
                                    vErrors.push(err26);
                                }
                                errors++;
                            }
                        }
                    }
                    else {
                        const err27 = {
                            instancePath: instancePath + "/spanningCells/" + i0,
                            schemaPath: "#/properties/spanningCells/items/type",
                            keyword: "type",
                            params: {
                                type: "object"
                            },
                            message: "must be object"
                        };
                        if (vErrors === null) {
                            vErrors = [err27];
                        }
                        else {
                            vErrors.push(err27);
                        }
                        errors++;
                    }
                }
            }
            else {
                const err28 = {
                    instancePath: instancePath + "/spanningCells",
                    schemaPath: "#/properties/spanningCells/type",
                    keyword: "type",
                    params: {
                        type: "array"
                    },
                    message: "must be array"
                };
                if (vErrors === null) {
                    vErrors = [err28];
                }
                else {
                    vErrors.push(err28);
                }
                errors++;
            }
        }
    }
    else {
        const err29 = {
            instancePath,
            schemaPath: "#/type",
            keyword: "type",
            params: {
                type: "object"
            },
            message: "must be object"
        };
        if (vErrors === null) {
            vErrors = [err29];
        }
        else {
            vErrors.push(err29);
        }
        errors++;
    }
    validate43.errors = vErrors;
    return errors === 0;
}
exports["streamConfig.json"] = validate86;
function validate87(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    if (data && typeof data == "object" && !Array.isArray(data)) {
        for (const key0 in data) {
            if (!(func8.call(schema15.properties, key0))) {
                const err0 = {
                    instancePath,
                    schemaPath: "#/additionalProperties",
                    keyword: "additionalProperties",
                    params: {
                        additionalProperty: key0
                    },
                    message: "must NOT have additional properties"
                };
                if (vErrors === null) {
                    vErrors = [err0];
                }
                else {
                    vErrors.push(err0);
                }
                errors++;
            }
        }
        if (data.topBody !== undefined) {
            if (!(validate46(data.topBody, {
                instancePath: instancePath + "/topBody",
                parentData: data,
                parentDataProperty: "topBody",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.topJoin !== undefined) {
            if (!(validate46(data.topJoin, {
                instancePath: instancePath + "/topJoin",
                parentData: data,
                parentDataProperty: "topJoin",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.topLeft !== undefined) {
            if (!(validate46(data.topLeft, {
                instancePath: instancePath + "/topLeft",
                parentData: data,
                parentDataProperty: "topLeft",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.topRight !== undefined) {
            if (!(validate46(data.topRight, {
                instancePath: instancePath + "/topRight",
                parentData: data,
                parentDataProperty: "topRight",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bottomBody !== undefined) {
            if (!(validate46(data.bottomBody, {
                instancePath: instancePath + "/bottomBody",
                parentData: data,
                parentDataProperty: "bottomBody",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bottomJoin !== undefined) {
            if (!(validate46(data.bottomJoin, {
                instancePath: instancePath + "/bottomJoin",
                parentData: data,
                parentDataProperty: "bottomJoin",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bottomLeft !== undefined) {
            if (!(validate46(data.bottomLeft, {
                instancePath: instancePath + "/bottomLeft",
                parentData: data,
                parentDataProperty: "bottomLeft",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bottomRight !== undefined) {
            if (!(validate46(data.bottomRight, {
                instancePath: instancePath + "/bottomRight",
                parentData: data,
                parentDataProperty: "bottomRight",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bodyLeft !== undefined) {
            if (!(validate46(data.bodyLeft, {
                instancePath: instancePath + "/bodyLeft",
                parentData: data,
                parentDataProperty: "bodyLeft",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bodyRight !== undefined) {
            if (!(validate46(data.bodyRight, {
                instancePath: instancePath + "/bodyRight",
                parentData: data,
                parentDataProperty: "bodyRight",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.bodyJoin !== undefined) {
            if (!(validate46(data.bodyJoin, {
                instancePath: instancePath + "/bodyJoin",
                parentData: data,
                parentDataProperty: "bodyJoin",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.headerJoin !== undefined) {
            if (!(validate46(data.headerJoin, {
                instancePath: instancePath + "/headerJoin",
                parentData: data,
                parentDataProperty: "headerJoin",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinBody !== undefined) {
            if (!(validate46(data.joinBody, {
                instancePath: instancePath + "/joinBody",
                parentData: data,
                parentDataProperty: "joinBody",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinLeft !== undefined) {
            if (!(validate46(data.joinLeft, {
                instancePath: instancePath + "/joinLeft",
                parentData: data,
                parentDataProperty: "joinLeft",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinRight !== undefined) {
            if (!(validate46(data.joinRight, {
                instancePath: instancePath + "/joinRight",
                parentData: data,
                parentDataProperty: "joinRight",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinJoin !== undefined) {
            if (!(validate46(data.joinJoin, {
                instancePath: instancePath + "/joinJoin",
                parentData: data,
                parentDataProperty: "joinJoin",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinMiddleUp !== undefined) {
            if (!(validate46(data.joinMiddleUp, {
                instancePath: instancePath + "/joinMiddleUp",
                parentData: data,
                parentDataProperty: "joinMiddleUp",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinMiddleDown !== undefined) {
            if (!(validate46(data.joinMiddleDown, {
                instancePath: instancePath + "/joinMiddleDown",
                parentData: data,
                parentDataProperty: "joinMiddleDown",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinMiddleLeft !== undefined) {
            if (!(validate46(data.joinMiddleLeft, {
                instancePath: instancePath + "/joinMiddleLeft",
                parentData: data,
                parentDataProperty: "joinMiddleLeft",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
        if (data.joinMiddleRight !== undefined) {
            if (!(validate46(data.joinMiddleRight, {
                instancePath: instancePath + "/joinMiddleRight",
                parentData: data,
                parentDataProperty: "joinMiddleRight",
                rootData
            }))) {
                vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
                errors = vErrors.length;
            }
        }
    }
    else {
        const err1 = {
            instancePath,
            schemaPath: "#/type",
            keyword: "type",
            params: {
                type: "object"
            },
            message: "must be object"
        };
        if (vErrors === null) {
            vErrors = [err1];
        }
        else {
            vErrors.push(err1);
        }
        errors++;
    }
    validate87.errors = vErrors;
    return errors === 0;
}
function validate109(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    const _errs0 = errors;
    let valid0 = false;
    let passing0 = null;
    const _errs1 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
        for (const key0 in data) {
            if (!(pattern0.test(key0))) {
                const err0 = {
                    instancePath,
                    schemaPath: "#/oneOf/0/additionalProperties",
                    keyword: "additionalProperties",
                    params: {
                        additionalProperty: key0
                    },
                    message: "must NOT have additional properties"
                };
                if (vErrors === null) {
                    vErrors = [err0];
                }
                else {
                    vErrors.push(err0);
                }
                errors++;
            }
        }
        for (const key1 in data) {
            if (pattern0.test(key1)) {
                if (!(validate71(data[key1], {
                    instancePath: instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"),
                    parentData: data,
                    parentDataProperty: key1,
                    rootData
                }))) {
                    vErrors = vErrors === null ? validate71.errors : vErrors.concat(validate71.errors);
                    errors = vErrors.length;
                }
            }
        }
    }
    else {
        const err1 = {
            instancePath,
            schemaPath: "#/oneOf/0/type",
            keyword: "type",
            params: {
                type: "object"
            },
            message: "must be object"
        };
        if (vErrors === null) {
            vErrors = [err1];
        }
        else {
            vErrors.push(err1);
        }
        errors++;
    }
    var _valid0 = _errs1 === errors;
    if (_valid0) {
        valid0 = true;
        passing0 = 0;
    }
    const _errs5 = errors;
    if (Array.isArray(data)) {
        const len0 = data.length;
        for (let i0 = 0; i0 < len0; i0++) {
            if (!(validate71(data[i0], {
                instancePath: instancePath + "/" + i0,
                parentData: data,
                parentDataProperty: i0,
                rootData
            }))) {
                vErrors = vErrors === null ? validate71.errors : vErrors.concat(validate71.errors);
                errors = vErrors.length;
            }
        }
    }
    else {
        const err2 = {
            instancePath,
            schemaPath: "#/oneOf/1/type",
            keyword: "type",
            params: {
                type: "array"
            },
            message: "must be array"
        };
        if (vErrors === null) {
            vErrors = [err2];
        }
        else {
            vErrors.push(err2);
        }
        errors++;
    }
    var _valid0 = _errs5 === errors;
    if (_valid0 && valid0) {
        valid0 = false;
        passing0 = [passing0, 1];
    }
    else {
        if (_valid0) {
            valid0 = true;
            passing0 = 1;
        }
    }
    if (!valid0) {
        const err3 = {
            instancePath,
            schemaPath: "#/oneOf",
            keyword: "oneOf",
            params: {
                passingSchemas: passing0
            },
            message: "must match exactly one schema in oneOf"
        };
        if (vErrors === null) {
            vErrors = [err3];
        }
        else {
            vErrors.push(err3);
        }
        errors++;
    }
    else {
        errors = _errs0;
        if (vErrors !== null) {
            if (_errs0) {
                vErrors.length = _errs0;
            }
            else {
                vErrors = null;
            }
        }
    }
    validate109.errors = vErrors;
    return errors === 0;
}
function validate113(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    if (data && typeof data == "object" && !Array.isArray(data)) {
        for (const key0 in data) {
            if (!(((((((key0 === "alignment") || (key0 === "verticalAlignment")) || (key0 === "width")) || (key0 === "wrapWord")) || (key0 === "truncate")) || (key0 === "paddingLeft")) || (key0 === "paddingRight"))) {
                const err0 = {
                    instancePath,
                    schemaPath: "#/additionalProperties",
                    keyword: "additionalProperties",
                    params: {
                        additionalProperty: key0
                    },
                    message: "must NOT have additional properties"
                };
                if (vErrors === null) {
                    vErrors = [err0];
                }
                else {
                    vErrors.push(err0);
                }
                errors++;
            }
        }
        if (data.alignment !== undefined) {
            if (!(validate72(data.alignment, {
                instancePath: instancePath + "/alignment",
                parentData: data,
                parentDataProperty: "alignment",
                rootData
            }))) {
                vErrors = vErrors === null ? validate72.errors : vErrors.concat(validate72.errors);
                errors = vErrors.length;
            }
        }
        if (data.verticalAlignment !== undefined) {
            if (!(validate74(data.verticalAlignment, {
                instancePath: instancePath + "/verticalAlignment",
                parentData: data,
                parentDataProperty: "verticalAlignment",
                rootData
            }))) {
                vErrors = vErrors === null ? validate74.errors : vErrors.concat(validate74.errors);
                errors = vErrors.length;
            }
        }
        if (data.width !== undefined) {
            let data2 = data.width;
            if (!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))) {
                const err1 = {
                    instancePath: instancePath + "/width",
                    schemaPath: "#/properties/width/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err1];
                }
                else {
                    vErrors.push(err1);
                }
                errors++;
            }
            if ((typeof data2 == "number") && (isFinite(data2))) {
                if (data2 < 1 || isNaN(data2)) {
                    const err2 = {
                        instancePath: instancePath + "/width",
                        schemaPath: "#/properties/width/minimum",
                        keyword: "minimum",
                        params: {
                            comparison: ">=",
                            limit: 1
                        },
                        message: "must be >= 1"
                    };
                    if (vErrors === null) {
                        vErrors = [err2];
                    }
                    else {
                        vErrors.push(err2);
                    }
                    errors++;
                }
            }
        }
        if (data.wrapWord !== undefined) {
            if (typeof data.wrapWord !== "boolean") {
                const err3 = {
                    instancePath: instancePath + "/wrapWord",
                    schemaPath: "#/properties/wrapWord/type",
                    keyword: "type",
                    params: {
                        type: "boolean"
                    },
                    message: "must be boolean"
                };
                if (vErrors === null) {
                    vErrors = [err3];
                }
                else {
                    vErrors.push(err3);
                }
                errors++;
            }
        }
        if (data.truncate !== undefined) {
            let data4 = data.truncate;
            if (!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))) {
                const err4 = {
                    instancePath: instancePath + "/truncate",
                    schemaPath: "#/properties/truncate/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err4];
                }
                else {
                    vErrors.push(err4);
                }
                errors++;
            }
        }
        if (data.paddingLeft !== undefined) {
            let data5 = data.paddingLeft;
            if (!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))) {
                const err5 = {
                    instancePath: instancePath + "/paddingLeft",
                    schemaPath: "#/properties/paddingLeft/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err5];
                }
                else {
                    vErrors.push(err5);
                }
                errors++;
            }
        }
        if (data.paddingRight !== undefined) {
            let data6 = data.paddingRight;
            if (!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))) {
                const err6 = {
                    instancePath: instancePath + "/paddingRight",
                    schemaPath: "#/properties/paddingRight/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err6];
                }
                else {
                    vErrors.push(err6);
                }
                errors++;
            }
        }
    }
    else {
        const err7 = {
            instancePath,
            schemaPath: "#/type",
            keyword: "type",
            params: {
                type: "object"
            },
            message: "must be object"
        };
        if (vErrors === null) {
            vErrors = [err7];
        }
        else {
            vErrors.push(err7);
        }
        errors++;
    }
    validate113.errors = vErrors;
    return errors === 0;
}
function validate86(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    let vErrors = null;
    let errors = 0;
    if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.columnDefault === undefined) {
            const err0 = {
                instancePath,
                schemaPath: "#/required",
                keyword: "required",
                params: {
                    missingProperty: "columnDefault"
                },
                message: "must have required property '" + "columnDefault" + "'"
            };
            if (vErrors === null) {
                vErrors = [err0];
            }
            else {
                vErrors.push(err0);
            }
            errors++;
        }
        if (data.columnCount === undefined) {
            const err1 = {
                instancePath,
                schemaPath: "#/required",
                keyword: "required",
                params: {
                    missingProperty: "columnCount"
                },
                message: "must have required property '" + "columnCount" + "'"
            };
            if (vErrors === null) {
                vErrors = [err1];
            }
            else {
                vErrors.push(err1);
            }
            errors++;
        }
        for (const key0 in data) {
            if (!(((((key0 === "border") || (key0 === "columns")) || (key0 === "columnDefault")) || (key0 === "columnCount")) || (key0 === "drawVerticalLine"))) {
                const err2 = {
                    instancePath,
                    schemaPath: "#/additionalProperties",
                    keyword: "additionalProperties",
                    params: {
                        additionalProperty: key0
                    },
                    message: "must NOT have additional properties"
                };
                if (vErrors === null) {
                    vErrors = [err2];
                }
                else {
                    vErrors.push(err2);
                }
                errors++;
            }
        }
        if (data.border !== undefined) {
            if (!(validate87(data.border, {
                instancePath: instancePath + "/border",
                parentData: data,
                parentDataProperty: "border",
                rootData
            }))) {
                vErrors = vErrors === null ? validate87.errors : vErrors.concat(validate87.errors);
                errors = vErrors.length;
            }
        }
        if (data.columns !== undefined) {
            if (!(validate109(data.columns, {
                instancePath: instancePath + "/columns",
                parentData: data,
                parentDataProperty: "columns",
                rootData
            }))) {
                vErrors = vErrors === null ? validate109.errors : vErrors.concat(validate109.errors);
                errors = vErrors.length;
            }
        }
        if (data.columnDefault !== undefined) {
            if (!(validate113(data.columnDefault, {
                instancePath: instancePath + "/columnDefault",
                parentData: data,
                parentDataProperty: "columnDefault",
                rootData
            }))) {
                vErrors = vErrors === null ? validate113.errors : vErrors.concat(validate113.errors);
                errors = vErrors.length;
            }
        }
        if (data.columnCount !== undefined) {
            let data3 = data.columnCount;
            if (!(((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3))) && (isFinite(data3)))) {
                const err3 = {
                    instancePath: instancePath + "/columnCount",
                    schemaPath: "#/properties/columnCount/type",
                    keyword: "type",
                    params: {
                        type: "integer"
                    },
                    message: "must be integer"
                };
                if (vErrors === null) {
                    vErrors = [err3];
                }
                else {
                    vErrors.push(err3);
                }
                errors++;
            }
            if ((typeof data3 == "number") && (isFinite(data3))) {
                if (data3 < 1 || isNaN(data3)) {
                    const err4 = {
                        instancePath: instancePath + "/columnCount",
                        schemaPath: "#/properties/columnCount/minimum",
                        keyword: "minimum",
                        params: {
                            comparison: ">=",
                            limit: 1
                        },
                        message: "must be >= 1"
                    };
                    if (vErrors === null) {
                        vErrors = [err4];
                    }
                    else {
                        vErrors.push(err4);
                    }
                    errors++;
                }
            }
        }
        if (data.drawVerticalLine !== undefined) {
            if (typeof data.drawVerticalLine != "function") {
                const err5 = {
                    instancePath: instancePath + "/drawVerticalLine",
                    schemaPath: "#/properties/drawVerticalLine/typeof",
                    keyword: "typeof",
                    params: {},
                    message: "must pass \"typeof\" keyword validation"
                };
                if (vErrors === null) {
                    vErrors = [err5];
                }
                else {
                    vErrors.push(err5);
                }
                errors++;
            }
        }
    }
    else {
        const err6 = {
            instancePath,
            schemaPath: "#/type",
            keyword: "type",
            params: {
                type: "object"
            },
            message: "must be object"
        };
        if (vErrors === null) {
            vErrors = [err6];
        }
        else {
            vErrors.push(err6);
        }
        errors++;
    }
    validate86.errors = vErrors;
    return errors === 0;
}

}(validators));

var __importDefault = (commonjsGlobal$1 && commonjsGlobal$1.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(validateConfig$1, "__esModule", { value: true });
validateConfig$1.validateConfig = void 0;
const validators_1 = __importDefault(validators);
const validateConfig = (schemaId, config) => {
    const validate = validators_1.default[schemaId];
    if (!validate(config) && validate.errors) {
        // eslint-disable-next-line promise/prefer-await-to-callbacks
        const errors = validate.errors.map((error) => {
            return {
                message: error.message,
                params: error.params,
                schemaPath: error.schemaPath,
            };
        });
        /* eslint-disable no-console */
        console.log('config', config);
        console.log('errors', errors);
        /* eslint-enable no-console */
        throw new Error('Invalid config.');
    }
};
validateConfig$1.validateConfig = validateConfig;

Object.defineProperty(makeStreamConfig$1, "__esModule", { value: true });
makeStreamConfig$1.makeStreamConfig = void 0;
const utils_1$b = utils;
const validateConfig_1$1 = validateConfig$1;
/**
 * Creates a configuration for every column using default
 * values for the missing configuration properties.
 */
const makeColumnsConfig$1 = (columnCount, columns = {}, columnDefault) => {
    return Array.from({ length: columnCount }).map((_, index) => {
        return {
            alignment: 'left',
            paddingLeft: 1,
            paddingRight: 1,
            truncate: Number.POSITIVE_INFINITY,
            verticalAlignment: 'top',
            wrapWord: false,
            ...columnDefault,
            ...columns[index],
        };
    });
};
/**
 * Makes a new configuration object out of the userConfig object
 * using default values for the missing configuration properties.
 */
const makeStreamConfig = (config) => {
    (0, validateConfig_1$1.validateConfig)('streamConfig.json', config);
    if (config.columnDefault.width === undefined) {
        throw new Error('Must provide config.columnDefault.width when creating a stream.');
    }
    return {
        drawVerticalLine: () => {
            return true;
        },
        ...config,
        border: (0, utils_1$b.makeBorderConfig)(config.border),
        columns: makeColumnsConfig$1(config.columnCount, config.columns, config.columnDefault),
    };
};
makeStreamConfig$1.makeStreamConfig = makeStreamConfig;

var mapDataUsingRowHeights = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapDataUsingRowHeights = exports.padCellVertically = void 0;
const utils_1 = utils;
const wrapCell_1 = wrapCell$1;
const createEmptyStrings = (length) => {
    return new Array(length).fill('');
};
const padCellVertically = (lines, rowHeight, verticalAlignment) => {
    const availableLines = rowHeight - lines.length;
    if (verticalAlignment === 'top') {
        return [...lines, ...createEmptyStrings(availableLines)];
    }
    if (verticalAlignment === 'bottom') {
        return [...createEmptyStrings(availableLines), ...lines];
    }
    return [
        ...createEmptyStrings(Math.floor(availableLines / 2)),
        ...lines,
        ...createEmptyStrings(Math.ceil(availableLines / 2)),
    ];
};
exports.padCellVertically = padCellVertically;
const mapDataUsingRowHeights = (unmappedRows, rowHeights, config) => {
    const nColumns = unmappedRows[0].length;
    const mappedRows = unmappedRows.map((unmappedRow, unmappedRowIndex) => {
        const outputRowHeight = rowHeights[unmappedRowIndex];
        const outputRow = Array.from({ length: outputRowHeight }, () => {
            return new Array(nColumns).fill('');
        });
        unmappedRow.forEach((cell, cellIndex) => {
            var _a;
            const containingRange = (_a = config.spanningCellManager) === null || _a === void 0 ? void 0 : _a.getContainingRange({ col: cellIndex,
                row: unmappedRowIndex });
            if (containingRange) {
                containingRange.extractCellContent(unmappedRowIndex).forEach((cellLine, cellLineIndex) => {
                    outputRow[cellLineIndex][cellIndex] = cellLine;
                });
                return;
            }
            const cellLines = (0, wrapCell_1.wrapCell)(cell, config.columns[cellIndex].width, config.columns[cellIndex].wrapWord);
            const paddedCellLines = (0, exports.padCellVertically)(cellLines, outputRowHeight, config.columns[cellIndex].verticalAlignment);
            paddedCellLines.forEach((cellLine, cellLineIndex) => {
                outputRow[cellLineIndex][cellIndex] = cellLine;
            });
        });
        return outputRow;
    });
    return (0, utils_1.flatten)(mappedRows);
};
exports.mapDataUsingRowHeights = mapDataUsingRowHeights;

}(mapDataUsingRowHeights));

var padTableData = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.padTableData = exports.padString = void 0;
const padString = (input, paddingLeft, paddingRight) => {
    return ' '.repeat(paddingLeft) + input + ' '.repeat(paddingRight);
};
exports.padString = padString;
const padTableData = (rows, config) => {
    return rows.map((cells, rowIndex) => {
        return cells.map((cell, cellIndex) => {
            var _a;
            const containingRange = (_a = config.spanningCellManager) === null || _a === void 0 ? void 0 : _a.getContainingRange({ col: cellIndex,
                row: rowIndex }, { mapped: true });
            if (containingRange) {
                return cell;
            }
            const { paddingLeft, paddingRight } = config.columns[cellIndex];
            return (0, exports.padString)(cell, paddingLeft, paddingRight);
        });
    });
};
exports.padTableData = padTableData;

}(padTableData));

var stringifyTableData$1 = {};

Object.defineProperty(stringifyTableData$1, "__esModule", { value: true });
stringifyTableData$1.stringifyTableData = void 0;
const utils_1$a = utils;
const stringifyTableData = (rows) => {
    return rows.map((cells) => {
        return cells.map((cell) => {
            return (0, utils_1$a.normalizeString)(String(cell));
        });
    });
};
stringifyTableData$1.stringifyTableData = stringifyTableData;

var truncateTableData = {};

var lodash_truncate = {exports: {}};

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

(function (module, exports) {
/** Used as default options for `_.truncate`. */
var DEFAULT_TRUNC_LENGTH = 30,
    DEFAULT_TRUNC_OMISSION = '...';

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0,
    MAX_INTEGER = 1.7976931348623157e+308,
    NAN = 0 / 0;

/** `Object#toString` result references. */
var regexpTag = '[object RegExp]',
    symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to match `RegExp` flags from their coerced string values. */
var reFlags = /\w*$/;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Used to compose unicode character classes. */
var rsAstralRange = '\\ud800-\\udfff',
    rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23',
    rsComboSymbolsRange = '\\u20d0-\\u20f0',
    rsVarRange = '\\ufe0e\\ufe0f';

/** Used to compose unicode capture groups. */
var rsAstral = '[' + rsAstralRange + ']',
    rsCombo = '[' + rsComboMarksRange + rsComboSymbolsRange + ']',
    rsFitz = '\\ud83c[\\udffb-\\udfff]',
    rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
    rsNonAstral = '[^' + rsAstralRange + ']',
    rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
    rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
    rsZWJ = '\\u200d';

/** Used to compose unicode regexes. */
var reOptMod = rsModifier + '?',
    rsOptVar = '[' + rsVarRange + ']?',
    rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
    rsSeq = rsOptVar + reOptMod + rsOptJoin,
    rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

/** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

/** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
var reHasUnicode = RegExp('[' + rsZWJ + rsAstralRange  + rsComboMarksRange + rsComboSymbolsRange + rsVarRange + ']');

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof commonjsGlobal$1 == 'object' && commonjsGlobal$1 && commonjsGlobal$1.Object === Object && commonjsGlobal$1;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Detect free variable `exports`. */
var freeExports = exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    return freeProcess && freeProcess.binding('util');
  } catch (e) {}
}());

/* Node.js helper references. */
var nodeIsRegExp = nodeUtil && nodeUtil.isRegExp;

/**
 * Gets the size of an ASCII `string`.
 *
 * @private
 * @param {string} string The string inspect.
 * @returns {number} Returns the string size.
 */
var asciiSize = baseProperty('length');

/**
 * Converts an ASCII `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function asciiToArray(string) {
  return string.split('');
}

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/**
 * Checks if `string` contains Unicode symbols.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {boolean} Returns `true` if a symbol is found, else `false`.
 */
function hasUnicode(string) {
  return reHasUnicode.test(string);
}

/**
 * Gets the number of symbols in `string`.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {number} Returns the string size.
 */
function stringSize(string) {
  return hasUnicode(string)
    ? unicodeSize(string)
    : asciiSize(string);
}

/**
 * Converts `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function stringToArray(string) {
  return hasUnicode(string)
    ? unicodeToArray(string)
    : asciiToArray(string);
}

/**
 * Gets the size of a Unicode `string`.
 *
 * @private
 * @param {string} string The string inspect.
 * @returns {number} Returns the string size.
 */
function unicodeSize(string) {
  var result = reUnicode.lastIndex = 0;
  while (reUnicode.test(string)) {
    result++;
  }
  return result;
}

/**
 * Converts a Unicode `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function unicodeToArray(string) {
  return string.match(reUnicode) || [];
}

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var Symbol = root.Symbol;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.isRegExp` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a regexp, else `false`.
 */
function baseIsRegExp(value) {
  return isObject(value) && objectToString.call(value) == regexpTag;
}

/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Casts `array` to a slice if it's needed.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {number} start The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the cast slice.
 */
function castSlice(array, start, end) {
  var length = array.length;
  end = end === undefined ? length : end;
  return (!start && end >= length) ? array : baseSlice(array, start, end);
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `RegExp` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a regexp, else `false`.
 * @example
 *
 * _.isRegExp(/abc/);
 * // => true
 *
 * _.isRegExp('/abc/');
 * // => false
 */
var isRegExp = nodeIsRegExp ? baseUnary(nodeIsRegExp) : baseIsRegExp;

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a finite number.
 *
 * @static
 * @memberOf _
 * @since 4.12.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted number.
 * @example
 *
 * _.toFinite(3.2);
 * // => 3.2
 *
 * _.toFinite(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toFinite(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toFinite('3.2');
 * // => 3.2
 */
function toFinite(value) {
  if (!value) {
    return value === 0 ? value : 0;
  }
  value = toNumber(value);
  if (value === INFINITY || value === -INFINITY) {
    var sign = (value < 0 ? -1 : 1);
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}

/**
 * Converts `value` to an integer.
 *
 * **Note:** This method is loosely based on
 * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted integer.
 * @example
 *
 * _.toInteger(3.2);
 * // => 3
 *
 * _.toInteger(Number.MIN_VALUE);
 * // => 0
 *
 * _.toInteger(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toInteger('3.2');
 * // => 3
 */
function toInteger(value) {
  var result = toFinite(value),
      remainder = result % 1;

  return result === result ? (remainder ? result - remainder : result) : 0;
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/**
 * Truncates `string` if it's longer than the given maximum string length.
 * The last characters of the truncated string are replaced with the omission
 * string which defaults to "...".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category String
 * @param {string} [string=''] The string to truncate.
 * @param {Object} [options={}] The options object.
 * @param {number} [options.length=30] The maximum string length.
 * @param {string} [options.omission='...'] The string to indicate text is omitted.
 * @param {RegExp|string} [options.separator] The separator pattern to truncate to.
 * @returns {string} Returns the truncated string.
 * @example
 *
 * _.truncate('hi-diddly-ho there, neighborino');
 * // => 'hi-diddly-ho there, neighbo...'
 *
 * _.truncate('hi-diddly-ho there, neighborino', {
 *   'length': 24,
 *   'separator': ' '
 * });
 * // => 'hi-diddly-ho there,...'
 *
 * _.truncate('hi-diddly-ho there, neighborino', {
 *   'length': 24,
 *   'separator': /,? +/
 * });
 * // => 'hi-diddly-ho there...'
 *
 * _.truncate('hi-diddly-ho there, neighborino', {
 *   'omission': ' [...]'
 * });
 * // => 'hi-diddly-ho there, neig [...]'
 */
function truncate(string, options) {
  var length = DEFAULT_TRUNC_LENGTH,
      omission = DEFAULT_TRUNC_OMISSION;

  if (isObject(options)) {
    var separator = 'separator' in options ? options.separator : separator;
    length = 'length' in options ? toInteger(options.length) : length;
    omission = 'omission' in options ? baseToString(options.omission) : omission;
  }
  string = toString(string);

  var strLength = string.length;
  if (hasUnicode(string)) {
    var strSymbols = stringToArray(string);
    strLength = strSymbols.length;
  }
  if (length >= strLength) {
    return string;
  }
  var end = length - stringSize(omission);
  if (end < 1) {
    return omission;
  }
  var result = strSymbols
    ? castSlice(strSymbols, 0, end).join('')
    : string.slice(0, end);

  if (separator === undefined) {
    return result + omission;
  }
  if (strSymbols) {
    end += (result.length - end);
  }
  if (isRegExp(separator)) {
    if (string.slice(end).search(separator)) {
      var match,
          substring = result;

      if (!separator.global) {
        separator = RegExp(separator.source, toString(reFlags.exec(separator)) + 'g');
      }
      separator.lastIndex = 0;
      while ((match = separator.exec(substring))) {
        var newEnd = match.index;
      }
      result = result.slice(0, newEnd === undefined ? end : newEnd);
    }
  } else if (string.indexOf(baseToString(separator), end) != end) {
    var index = result.lastIndexOf(separator);
    if (index > -1) {
      result = result.slice(0, index);
    }
  }
  return result + omission;
}

module.exports = truncate;
}(lodash_truncate, lodash_truncate.exports));

(function (exports) {
var __importDefault = (commonjsGlobal$1 && commonjsGlobal$1.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncateTableData = exports.truncateString = void 0;
const lodash_truncate_1 = __importDefault(lodash_truncate.exports);
const truncateString = (input, length) => {
    return (0, lodash_truncate_1.default)(input, { length,
        omission: '…' });
};
exports.truncateString = truncateString;
/**
 * @todo Make it work with ASCII content.
 */
const truncateTableData = (rows, truncates) => {
    return rows.map((cells) => {
        return cells.map((cell, cellIndex) => {
            return (0, exports.truncateString)(cell, truncates[cellIndex]);
        });
    });
};
exports.truncateTableData = truncateTableData;

}(truncateTableData));

Object.defineProperty(createStream$1, "__esModule", { value: true });
createStream$1.createStream = void 0;
const alignTableData_1$1 = alignTableData$1;
const calculateRowHeights_1$1 = calculateRowHeights$1;
const drawBorder_1$1 = drawBorder;
const drawRow_1$1 = drawRow$1;
const makeStreamConfig_1 = makeStreamConfig$1;
const mapDataUsingRowHeights_1$2 = mapDataUsingRowHeights;
const padTableData_1$2 = padTableData;
const stringifyTableData_1$1 = stringifyTableData$1;
const truncateTableData_1$2 = truncateTableData;
const utils_1$9 = utils;
const prepareData = (data, config) => {
    let rows = (0, stringifyTableData_1$1.stringifyTableData)(data);
    rows = (0, truncateTableData_1$2.truncateTableData)(rows, (0, utils_1$9.extractTruncates)(config));
    const rowHeights = (0, calculateRowHeights_1$1.calculateRowHeights)(rows, config);
    rows = (0, mapDataUsingRowHeights_1$2.mapDataUsingRowHeights)(rows, rowHeights, config);
    rows = (0, alignTableData_1$1.alignTableData)(rows, config);
    rows = (0, padTableData_1$2.padTableData)(rows, config);
    return rows;
};
const create = (row, columnWidths, config) => {
    const rows = prepareData([row], config);
    const body = rows.map((literalRow) => {
        return (0, drawRow_1$1.drawRow)(literalRow, config);
    }).join('');
    let output;
    output = '';
    output += (0, drawBorder_1$1.drawBorderTop)(columnWidths, config);
    output += body;
    output += (0, drawBorder_1$1.drawBorderBottom)(columnWidths, config);
    output = output.trimEnd();
    process.stdout.write(output);
};
const append = (row, columnWidths, config) => {
    const rows = prepareData([row], config);
    const body = rows.map((literalRow) => {
        return (0, drawRow_1$1.drawRow)(literalRow, config);
    }).join('');
    let output = '';
    const bottom = (0, drawBorder_1$1.drawBorderBottom)(columnWidths, config);
    if (bottom !== '\n') {
        output = '\r\u001B[K';
    }
    output += (0, drawBorder_1$1.drawBorderJoin)(columnWidths, config);
    output += body;
    output += bottom;
    output = output.trimEnd();
    process.stdout.write(output);
};
const createStream = (userConfig) => {
    const config = (0, makeStreamConfig_1.makeStreamConfig)(userConfig);
    const columnWidths = Object.values(config.columns).map((column) => {
        return column.width + column.paddingLeft + column.paddingRight;
    });
    let empty = true;
    return {
        write: (row) => {
            if (row.length !== config.columnCount) {
                throw new Error('Row cell count does not match the config.columnCount.');
            }
            if (empty) {
                empty = false;
                create(row, columnWidths, config);
            }
            else {
                append(row, columnWidths, config);
            }
        },
    };
};
createStream$1.createStream = createStream;

var table$1 = {};

var calculateOutputColumnWidths$1 = {};

Object.defineProperty(calculateOutputColumnWidths$1, "__esModule", { value: true });
calculateOutputColumnWidths$1.calculateOutputColumnWidths = void 0;
const calculateOutputColumnWidths = (config) => {
    return config.columns.map((col) => {
        return col.paddingLeft + col.width + col.paddingRight;
    });
};
calculateOutputColumnWidths$1.calculateOutputColumnWidths = calculateOutputColumnWidths;

var drawTable$1 = {};

Object.defineProperty(drawTable$1, "__esModule", { value: true });
drawTable$1.drawTable = void 0;
const drawBorder_1 = drawBorder;
const drawContent_1 = drawContent$1;
const drawRow_1 = drawRow$1;
const utils_1$8 = utils;
const drawTable = (rows, outputColumnWidths, rowHeights, config) => {
    const { drawHorizontalLine, singleLine, } = config;
    const contents = (0, utils_1$8.groupBySizes)(rows, rowHeights).map((group, groupIndex) => {
        return group.map((row) => {
            return (0, drawRow_1.drawRow)(row, { ...config,
                rowIndex: groupIndex });
        }).join('');
    });
    return (0, drawContent_1.drawContent)({ contents,
        drawSeparator: (index, size) => {
            // Top/bottom border
            if (index === 0 || index === size) {
                return drawHorizontalLine(index, size);
            }
            return !singleLine && drawHorizontalLine(index, size);
        },
        elementType: 'row',
        rowIndex: -1,
        separatorGetter: (0, drawBorder_1.createTableBorderGetter)(outputColumnWidths, { ...config,
            rowCount: contents.length }),
        spanningCellManager: config.spanningCellManager });
};
drawTable$1.drawTable = drawTable;

var injectHeaderConfig$1 = {};

Object.defineProperty(injectHeaderConfig$1, "__esModule", { value: true });
injectHeaderConfig$1.injectHeaderConfig = void 0;
const injectHeaderConfig = (rows, config) => {
    var _a;
    let spanningCellConfig = (_a = config.spanningCells) !== null && _a !== void 0 ? _a : [];
    const headerConfig = config.header;
    const adjustedRows = [...rows];
    if (headerConfig) {
        spanningCellConfig = spanningCellConfig.map(({ row, ...rest }) => {
            return { ...rest,
                row: row + 1 };
        });
        const { content, ...headerStyles } = headerConfig;
        spanningCellConfig.unshift({ alignment: 'center',
            col: 0,
            colSpan: rows[0].length,
            paddingLeft: 1,
            paddingRight: 1,
            row: 0,
            wrapWord: false,
            ...headerStyles });
        adjustedRows.unshift([content, ...Array.from({ length: rows[0].length - 1 }).fill('')]);
    }
    return [adjustedRows,
        spanningCellConfig];
};
injectHeaderConfig$1.injectHeaderConfig = injectHeaderConfig;

var makeTableConfig$1 = {};

var calculateMaximumColumnWidths = {};

(function (exports) {
var __importDefault = (commonjsGlobal$1 && commonjsGlobal$1.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMaximumColumnWidths = exports.calculateMaximumCellWidth = void 0;
const string_width_1 = __importDefault(stringWidth$1.exports);
const utils_1 = utils;
const calculateMaximumCellWidth = (cell) => {
    return Math.max(...cell.split('\n').map(string_width_1.default));
};
exports.calculateMaximumCellWidth = calculateMaximumCellWidth;
/**
 * Produces an array of values that describe the largest value length (width) in every column.
 */
const calculateMaximumColumnWidths = (rows, spanningCellConfigs = []) => {
    const columnWidths = new Array(rows[0].length).fill(0);
    const rangeCoordinates = spanningCellConfigs.map(utils_1.calculateRangeCoordinate);
    const isSpanningCell = (rowIndex, columnIndex) => {
        return rangeCoordinates.some((rangeCoordinate) => {
            return (0, utils_1.isCellInRange)({ col: columnIndex,
                row: rowIndex }, rangeCoordinate);
        });
    };
    rows.forEach((row, rowIndex) => {
        row.forEach((cell, cellIndex) => {
            if (isSpanningCell(rowIndex, cellIndex)) {
                return;
            }
            columnWidths[cellIndex] = Math.max(columnWidths[cellIndex], (0, exports.calculateMaximumCellWidth)(cell));
        });
    });
    return columnWidths;
};
exports.calculateMaximumColumnWidths = calculateMaximumColumnWidths;

}(calculateMaximumColumnWidths));

var spanningCellManager = {};

var alignSpanningCell = {};

Object.defineProperty(alignSpanningCell, "__esModule", { value: true });
alignSpanningCell.alignVerticalRangeContent = alignSpanningCell.wrapRangeContent = void 0;
const alignString_1 = alignString$1;
const mapDataUsingRowHeights_1$1 = mapDataUsingRowHeights;
const padTableData_1$1 = padTableData;
const truncateTableData_1$1 = truncateTableData;
const utils_1$7 = utils;
const wrapCell_1 = wrapCell$1;
/**
 * Fill content into all cells in range in order to calculate total height
 */
const wrapRangeContent = (rangeConfig, rangeWidth, context) => {
    const { topLeft, paddingRight, paddingLeft, truncate, wrapWord, alignment } = rangeConfig;
    const originalContent = context.rows[topLeft.row][topLeft.col];
    const contentWidth = rangeWidth - paddingLeft - paddingRight;
    return (0, wrapCell_1.wrapCell)((0, truncateTableData_1$1.truncateString)(originalContent, truncate), contentWidth, wrapWord).map((line) => {
        const alignedLine = (0, alignString_1.alignString)(line, contentWidth, alignment);
        return (0, padTableData_1$1.padString)(alignedLine, paddingLeft, paddingRight);
    });
};
alignSpanningCell.wrapRangeContent = wrapRangeContent;
const alignVerticalRangeContent = (range, content, context) => {
    const { rows, drawHorizontalLine, rowHeights } = context;
    const { topLeft, bottomRight, verticalAlignment } = range;
    // They are empty before calculateRowHeights function run
    if (rowHeights.length === 0) {
        return [];
    }
    const totalCellHeight = (0, utils_1$7.sumArray)(rowHeights.slice(topLeft.row, bottomRight.row + 1));
    const totalBorderHeight = bottomRight.row - topLeft.row;
    const hiddenHorizontalBorderCount = (0, utils_1$7.sequence)(topLeft.row + 1, bottomRight.row).filter((horizontalBorderIndex) => {
        return !drawHorizontalLine(horizontalBorderIndex, rows.length);
    }).length;
    const availableRangeHeight = totalCellHeight + totalBorderHeight - hiddenHorizontalBorderCount;
    return (0, mapDataUsingRowHeights_1$1.padCellVertically)(content, availableRangeHeight, verticalAlignment).map((line) => {
        if (line.length === 0) {
            return ' '.repeat(content[0].length);
        }
        return line;
    });
};
alignSpanningCell.alignVerticalRangeContent = alignVerticalRangeContent;

var calculateSpanningCellWidth$1 = {};

Object.defineProperty(calculateSpanningCellWidth$1, "__esModule", { value: true });
calculateSpanningCellWidth$1.calculateSpanningCellWidth = void 0;
const utils_1$6 = utils;
const calculateSpanningCellWidth = (rangeConfig, dependencies) => {
    const { columnsConfig, drawVerticalLine } = dependencies;
    const { topLeft, bottomRight } = rangeConfig;
    const totalWidth = (0, utils_1$6.sumArray)(columnsConfig.slice(topLeft.col, bottomRight.col + 1).map(({ width }) => {
        return width;
    }));
    const totalPadding = topLeft.col === bottomRight.col ?
        columnsConfig[topLeft.col].paddingRight +
            columnsConfig[bottomRight.col].paddingLeft :
        (0, utils_1$6.sumArray)(columnsConfig
            .slice(topLeft.col, bottomRight.col + 1)
            .map(({ paddingLeft, paddingRight }) => {
            return paddingLeft + paddingRight;
        }));
    const totalBorderWidths = bottomRight.col - topLeft.col;
    const totalHiddenVerticalBorders = (0, utils_1$6.sequence)(topLeft.col + 1, bottomRight.col).filter((verticalBorderIndex) => {
        return !drawVerticalLine(verticalBorderIndex, columnsConfig.length);
    }).length;
    return totalWidth + totalPadding + totalBorderWidths - totalHiddenVerticalBorders;
};
calculateSpanningCellWidth$1.calculateSpanningCellWidth = calculateSpanningCellWidth;

var makeRangeConfig$1 = {};

Object.defineProperty(makeRangeConfig$1, "__esModule", { value: true });
makeRangeConfig$1.makeRangeConfig = void 0;
const utils_1$5 = utils;
const makeRangeConfig = (spanningCellConfig, columnsConfig) => {
    var _a;
    const { topLeft, bottomRight } = (0, utils_1$5.calculateRangeCoordinate)(spanningCellConfig);
    const cellConfig = {
        ...columnsConfig[topLeft.col],
        ...spanningCellConfig,
        paddingRight: (_a = spanningCellConfig.paddingRight) !== null && _a !== void 0 ? _a : columnsConfig[bottomRight.col].paddingRight,
    };
    return { ...cellConfig,
        bottomRight,
        topLeft };
};
makeRangeConfig$1.makeRangeConfig = makeRangeConfig;

Object.defineProperty(spanningCellManager, "__esModule", { value: true });
spanningCellManager.createSpanningCellManager = void 0;
const alignSpanningCell_1 = alignSpanningCell;
const calculateSpanningCellWidth_1 = calculateSpanningCellWidth$1;
const makeRangeConfig_1 = makeRangeConfig$1;
const utils_1$4 = utils;
const findRangeConfig = (cell, rangeConfigs) => {
    return rangeConfigs.find((rangeCoordinate) => {
        return (0, utils_1$4.isCellInRange)(cell, rangeCoordinate);
    });
};
const getContainingRange = (rangeConfig, context) => {
    const width = (0, calculateSpanningCellWidth_1.calculateSpanningCellWidth)(rangeConfig, context);
    const wrappedContent = (0, alignSpanningCell_1.wrapRangeContent)(rangeConfig, width, context);
    const alignedContent = (0, alignSpanningCell_1.alignVerticalRangeContent)(rangeConfig, wrappedContent, context);
    const getCellContent = (rowIndex) => {
        const { topLeft } = rangeConfig;
        const { drawHorizontalLine, rowHeights } = context;
        const totalWithinHorizontalBorderHeight = rowIndex - topLeft.row;
        const totalHiddenHorizontalBorderHeight = (0, utils_1$4.sequence)(topLeft.row + 1, rowIndex).filter((index) => {
            /* istanbul ignore next */
            return !(drawHorizontalLine === null || drawHorizontalLine === void 0 ? void 0 : drawHorizontalLine(index, rowHeights.length));
        }).length;
        const offset = (0, utils_1$4.sumArray)(rowHeights.slice(topLeft.row, rowIndex)) + totalWithinHorizontalBorderHeight - totalHiddenHorizontalBorderHeight;
        return alignedContent.slice(offset, offset + rowHeights[rowIndex]);
    };
    const getBorderContent = (borderIndex) => {
        const { topLeft } = rangeConfig;
        const offset = (0, utils_1$4.sumArray)(context.rowHeights.slice(topLeft.row, borderIndex)) + (borderIndex - topLeft.row - 1);
        return alignedContent[offset];
    };
    return {
        ...rangeConfig,
        extractBorderContent: getBorderContent,
        extractCellContent: getCellContent,
        height: wrappedContent.length,
        width,
    };
};
const inSameRange = (cell1, cell2, ranges) => {
    const range1 = findRangeConfig(cell1, ranges);
    const range2 = findRangeConfig(cell2, ranges);
    if (range1 && range2) {
        return (0, utils_1$4.areCellEqual)(range1.topLeft, range2.topLeft);
    }
    return false;
};
const hashRange = (range) => {
    const { row, col } = range.topLeft;
    return `${row}/${col}`;
};
const createSpanningCellManager = (parameters) => {
    const { spanningCellConfigs, columnsConfig } = parameters;
    const ranges = spanningCellConfigs.map((config) => {
        return (0, makeRangeConfig_1.makeRangeConfig)(config, columnsConfig);
    });
    const rangeCache = {};
    let rowHeights = [];
    return { getContainingRange: (cell, options) => {
            var _a;
            const originalRow = (options === null || options === void 0 ? void 0 : options.mapped) ? (0, utils_1$4.findOriginalRowIndex)(rowHeights, cell.row) : cell.row;
            const range = findRangeConfig({ ...cell,
                row: originalRow }, ranges);
            if (!range) {
                return undefined;
            }
            if (rowHeights.length === 0) {
                return getContainingRange(range, { ...parameters,
                    rowHeights });
            }
            const hash = hashRange(range);
            (_a = rangeCache[hash]) !== null && _a !== void 0 ? _a : (rangeCache[hash] = getContainingRange(range, { ...parameters,
                rowHeights }));
            return rangeCache[hash];
        },
        inSameRange: (cell1, cell2) => {
            return inSameRange(cell1, cell2, ranges);
        },
        rowHeights,
        setRowHeights: (_rowHeights) => {
            rowHeights = _rowHeights;
        } };
};
spanningCellManager.createSpanningCellManager = createSpanningCellManager;

var validateSpanningCellConfig$1 = {};

Object.defineProperty(validateSpanningCellConfig$1, "__esModule", { value: true });
validateSpanningCellConfig$1.validateSpanningCellConfig = void 0;
const utils_1$3 = utils;
const inRange = (start, end, value) => {
    return start <= value && value <= end;
};
const validateSpanningCellConfig = (rows, configs) => {
    const [nRow, nCol] = [rows.length, rows[0].length];
    configs.forEach((config, configIndex) => {
        const { colSpan, rowSpan } = config;
        if (colSpan === undefined && rowSpan === undefined) {
            throw new Error(`Expect at least colSpan or rowSpan is provided in config.spanningCells[${configIndex}]`);
        }
        if (colSpan !== undefined && colSpan < 1) {
            throw new Error(`Expect colSpan is not equal zero, instead got: ${colSpan} in config.spanningCells[${configIndex}]`);
        }
        if (rowSpan !== undefined && rowSpan < 1) {
            throw new Error(`Expect rowSpan is not equal zero, instead got: ${rowSpan} in config.spanningCells[${configIndex}]`);
        }
    });
    const rangeCoordinates = configs.map(utils_1$3.calculateRangeCoordinate);
    rangeCoordinates.forEach(({ topLeft, bottomRight }, rangeIndex) => {
        if (!inRange(0, nCol - 1, topLeft.col) ||
            !inRange(0, nRow - 1, topLeft.row) ||
            !inRange(0, nCol - 1, bottomRight.col) ||
            !inRange(0, nRow - 1, bottomRight.row)) {
            throw new Error(`Some cells in config.spanningCells[${rangeIndex}] are out of the table`);
        }
    });
    const configOccupy = Array.from({ length: nRow }, () => {
        return Array.from({ length: nCol });
    });
    rangeCoordinates.forEach(({ topLeft, bottomRight }, rangeIndex) => {
        (0, utils_1$3.sequence)(topLeft.row, bottomRight.row).forEach((row) => {
            (0, utils_1$3.sequence)(topLeft.col, bottomRight.col).forEach((col) => {
                if (configOccupy[row][col] !== undefined) {
                    throw new Error(`Spanning cells in config.spanningCells[${configOccupy[row][col]}] and config.spanningCells[${rangeIndex}] are overlap each other`);
                }
                configOccupy[row][col] = rangeIndex;
            });
        });
    });
};
validateSpanningCellConfig$1.validateSpanningCellConfig = validateSpanningCellConfig;

Object.defineProperty(makeTableConfig$1, "__esModule", { value: true });
makeTableConfig$1.makeTableConfig = void 0;
const calculateMaximumColumnWidths_1 = calculateMaximumColumnWidths;
const spanningCellManager_1 = spanningCellManager;
const utils_1$2 = utils;
const validateConfig_1 = validateConfig$1;
const validateSpanningCellConfig_1 = validateSpanningCellConfig$1;
/**
 * Creates a configuration for every column using default
 * values for the missing configuration properties.
 */
const makeColumnsConfig = (rows, columns, columnDefault, spanningCellConfigs) => {
    const columnWidths = (0, calculateMaximumColumnWidths_1.calculateMaximumColumnWidths)(rows, spanningCellConfigs);
    return rows[0].map((_, columnIndex) => {
        return {
            alignment: 'left',
            paddingLeft: 1,
            paddingRight: 1,
            truncate: Number.POSITIVE_INFINITY,
            verticalAlignment: 'top',
            width: columnWidths[columnIndex],
            wrapWord: false,
            ...columnDefault,
            ...columns === null || columns === void 0 ? void 0 : columns[columnIndex],
        };
    });
};
/**
 * Makes a new configuration object out of the userConfig object
 * using default values for the missing configuration properties.
 */
const makeTableConfig = (rows, config = {}, injectedSpanningCellConfig) => {
    var _a, _b, _c, _d, _e;
    (0, validateConfig_1.validateConfig)('config.json', config);
    (0, validateSpanningCellConfig_1.validateSpanningCellConfig)(rows, (_a = config.spanningCells) !== null && _a !== void 0 ? _a : []);
    const spanningCellConfigs = (_b = injectedSpanningCellConfig !== null && injectedSpanningCellConfig !== void 0 ? injectedSpanningCellConfig : config.spanningCells) !== null && _b !== void 0 ? _b : [];
    const columnsConfig = makeColumnsConfig(rows, config.columns, config.columnDefault, spanningCellConfigs);
    const drawVerticalLine = (_c = config.drawVerticalLine) !== null && _c !== void 0 ? _c : (() => {
        return true;
    });
    const drawHorizontalLine = (_d = config.drawHorizontalLine) !== null && _d !== void 0 ? _d : (() => {
        return true;
    });
    return {
        ...config,
        border: (0, utils_1$2.makeBorderConfig)(config.border),
        columns: columnsConfig,
        drawHorizontalLine,
        drawVerticalLine,
        singleLine: (_e = config.singleLine) !== null && _e !== void 0 ? _e : false,
        spanningCellManager: (0, spanningCellManager_1.createSpanningCellManager)({
            columnsConfig,
            drawHorizontalLine,
            drawVerticalLine,
            rows,
            spanningCellConfigs,
        }),
    };
};
makeTableConfig$1.makeTableConfig = makeTableConfig;

var validateTableData$1 = {};

Object.defineProperty(validateTableData$1, "__esModule", { value: true });
validateTableData$1.validateTableData = void 0;
const utils_1$1 = utils;
const validateTableData = (rows) => {
    if (!Array.isArray(rows)) {
        throw new TypeError('Table data must be an array.');
    }
    if (rows.length === 0) {
        throw new Error('Table must define at least one row.');
    }
    if (rows[0].length === 0) {
        throw new Error('Table must define at least one column.');
    }
    const columnNumber = rows[0].length;
    for (const row of rows) {
        if (!Array.isArray(row)) {
            throw new TypeError('Table row data must be an array.');
        }
        if (row.length !== columnNumber) {
            throw new Error('Table must have a consistent number of cells.');
        }
        for (const cell of row) {
            // eslint-disable-next-line no-control-regex
            if (/[\u0001-\u0006\u0008\u0009\u000B-\u001A]/.test((0, utils_1$1.normalizeString)(String(cell)))) {
                throw new Error('Table data must not contain control characters.');
            }
        }
    }
};
validateTableData$1.validateTableData = validateTableData;

Object.defineProperty(table$1, "__esModule", { value: true });
table$1.table = void 0;
const alignTableData_1 = alignTableData$1;
const calculateOutputColumnWidths_1 = calculateOutputColumnWidths$1;
const calculateRowHeights_1 = calculateRowHeights$1;
const drawTable_1 = drawTable$1;
const injectHeaderConfig_1 = injectHeaderConfig$1;
const makeTableConfig_1 = makeTableConfig$1;
const mapDataUsingRowHeights_1 = mapDataUsingRowHeights;
const padTableData_1 = padTableData;
const stringifyTableData_1 = stringifyTableData$1;
const truncateTableData_1 = truncateTableData;
const utils_1 = utils;
const validateTableData_1 = validateTableData$1;
const table = (data, userConfig = {}) => {
    (0, validateTableData_1.validateTableData)(data);
    let rows = (0, stringifyTableData_1.stringifyTableData)(data);
    const [injectedRows, injectedSpanningCellConfig] = (0, injectHeaderConfig_1.injectHeaderConfig)(rows, userConfig);
    const config = (0, makeTableConfig_1.makeTableConfig)(injectedRows, userConfig, injectedSpanningCellConfig);
    rows = (0, truncateTableData_1.truncateTableData)(injectedRows, (0, utils_1.extractTruncates)(config));
    const rowHeights = (0, calculateRowHeights_1.calculateRowHeights)(rows, config);
    config.spanningCellManager.setRowHeights(rowHeights);
    rows = (0, mapDataUsingRowHeights_1.mapDataUsingRowHeights)(rows, rowHeights, config);
    rows = (0, alignTableData_1.alignTableData)(rows, config);
    rows = (0, padTableData_1.padTableData)(rows, config);
    const outputColumnWidths = (0, calculateOutputColumnWidths_1.calculateOutputColumnWidths)(config);
    return (0, drawTable_1.drawTable)(rows, outputColumnWidths, rowHeights, config);
};
table$1.table = table;

var api = {};

Object.defineProperty(api, "__esModule", { value: true });

(function (exports) {
var __createBinding = (commonjsGlobal$1 && commonjsGlobal$1.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (commonjsGlobal$1 && commonjsGlobal$1.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBorderCharacters = exports.createStream = exports.table = void 0;
const createStream_1 = createStream$1;
Object.defineProperty(exports, "createStream", { enumerable: true, get: function () { return createStream_1.createStream; } });
const getBorderCharacters_1 = getBorderCharacters$1;
Object.defineProperty(exports, "getBorderCharacters", { enumerable: true, get: function () { return getBorderCharacters_1.getBorderCharacters; } });
const table_1 = table$1;
Object.defineProperty(exports, "table", { enumerable: true, get: function () { return table_1.table; } });
__exportStar(api, exports);

}(src));

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var win;

if (typeof window !== "undefined") {
    win = window;
} else if (typeof commonjsGlobal !== "undefined") {
    win = commonjsGlobal;
} else if (typeof self !== "undefined"){
    win = self;
} else {
    win = {};
}

var window_1 = win;

var window$1 = window_1;
var nodeCrypto = require$$1$1;

function getRandomValues(buf) {
  if (window$1.crypto && window$1.crypto.getRandomValues) {
    return window$1.crypto.getRandomValues(buf);
  }
  if (typeof window$1.msCrypto === 'object' && typeof window$1.msCrypto.getRandomValues === 'function') {
    return window$1.msCrypto.getRandomValues(buf);
  }
  if (nodeCrypto.randomBytes) {
    if (!(buf instanceof Uint8Array)) {
      throw new TypeError('expected Uint8Array');
    }
    if (buf.length > 65536) {
      var e = new Error();
      e.code = 22;
      e.message = 'Failed to execute \'getRandomValues\' on \'Crypto\': The ' +
        'ArrayBufferView\'s byte length (' + buf.length + ') exceeds the ' +
        'number of bytes of entropy available via this API (65536).';
      e.name = 'QuotaExceededError';
      throw e;
    }
    var bytes = nodeCrypto.randomBytes(buf.length);
    buf.set(bytes);
    return buf;
  }
  else {
    throw new Error('No secure random number generator available.');
  }
}

var getRandomValues_1 = getRandomValues;

var MINIMUM_KEY_LENGTH$1 = 64;
/**
 * Generate random number
 * @param min - lowest value
 * @param max - highest value
 * @returns - random number
 *
 * @see https://github.com/EFForg/OpenWireless/blob/0e0bd06277f7178f840c36a9b799c7659870fa57/app/js/diceware.js#L59
 */
function getRandom(min, max) {
    var randomValue = 0;
    var range = max - min;
    var bitsNeeded = Math.ceil(Math.log2(range));
    if (bitsNeeded > 53) {
        throw new RangeError('Cannot generate numbers larger than 53 bits.');
    }
    var bytesNeeded = Math.ceil(bitsNeeded / 8);
    var mask = Math.pow(2, bitsNeeded) - 1;
    var byteArray = new Uint8Array(bytesNeeded);
    getRandomValues_1(byteArray);
    var p = (bytesNeeded - 1) * 8;
    for (var i = 0; i < bytesNeeded; i++) {
        randomValue += byteArray[i] * Math.pow(2, p);
        p -= 8;
    }
    randomValue = randomValue & mask;
    return randomValue >= range ? getRandom(min, max) : min + randomValue;
}
/**
 * Get random character
 * @returns - random character
 *
 * @see https://roots.io/salts.html
 */
function getRandomChar() {
    var minCharacter = 33;
    var maxCharacter = 126;
    var character = String.fromCharCode(getRandom(minCharacter, maxCharacter));
    if (['\'', '"', '\\'].some(function (badCharacter) {
        return character === badCharacter;
    })) {
        return getRandomChar();
    }
    return character;
}
/**
 * Generate a salt
 * @param length - length of the salt, defaults to 64
 * @returns - string
 *
 * @see https://roots.io/salts.html
 */
function generateSalt(saltLength) {
    if (saltLength === void 0) { saltLength = MINIMUM_KEY_LENGTH$1; }
    return Array.apply(void 0, Array(saltLength)).map(getRandomChar)
        .join('');
}

var WORDPRESS_KEYS = [
    'AUTH_KEY',
    'SECURE_AUTH_KEY',
    'LOGGED_IN_KEY',
    'NONCE_KEY',
    'AUTH_SALT',
    'SECURE_AUTH_SALT',
    'LOGGED_IN_SALT',
    'NONCE_SALT',
];
var MINIMUM_KEY_LENGTH = 64;
/**
 * Returns object of default WordPress salts or any string/array of strings
 * @param length - length of the salt, defaults to 64
 * @returns - object of salts
 */
var wpSalts = function (keys, saltLength) {
    if (keys === void 0) { keys = ''; }
    if (saltLength === void 0) { saltLength = 64; }
    var output = {};
    if (typeof keys === 'string') {
        keys = (keys.length > 0) ? [keys] : WORDPRESS_KEYS;
    }
    else if (typeof keys === 'object') {
        keys = (keys !== null && keys.length > 0) ? keys : WORDPRESS_KEYS;
    }
    else {
        keys = WORDPRESS_KEYS;
    }
    saltLength = (saltLength < MINIMUM_KEY_LENGTH) ? MINIMUM_KEY_LENGTH : saltLength;
    keys.map(function (key) { return output[key] = generateSalt(saltLength); });
    return output;
};

var dist = {};

var parseCst$1 = {};

var PlainValueEc8e588e = {};

const Char = {
  ANCHOR: '&',
  COMMENT: '#',
  TAG: '!',
  DIRECTIVES_END: '-',
  DOCUMENT_END: '.'
};
const Type = {
  ALIAS: 'ALIAS',
  BLANK_LINE: 'BLANK_LINE',
  BLOCK_FOLDED: 'BLOCK_FOLDED',
  BLOCK_LITERAL: 'BLOCK_LITERAL',
  COMMENT: 'COMMENT',
  DIRECTIVE: 'DIRECTIVE',
  DOCUMENT: 'DOCUMENT',
  FLOW_MAP: 'FLOW_MAP',
  FLOW_SEQ: 'FLOW_SEQ',
  MAP: 'MAP',
  MAP_KEY: 'MAP_KEY',
  MAP_VALUE: 'MAP_VALUE',
  PLAIN: 'PLAIN',
  QUOTE_DOUBLE: 'QUOTE_DOUBLE',
  QUOTE_SINGLE: 'QUOTE_SINGLE',
  SEQ: 'SEQ',
  SEQ_ITEM: 'SEQ_ITEM'
};
const defaultTagPrefix = 'tag:yaml.org,2002:';
const defaultTags = {
  MAP: 'tag:yaml.org,2002:map',
  SEQ: 'tag:yaml.org,2002:seq',
  STR: 'tag:yaml.org,2002:str'
};

function findLineStarts(src) {
  const ls = [0];
  let offset = src.indexOf('\n');

  while (offset !== -1) {
    offset += 1;
    ls.push(offset);
    offset = src.indexOf('\n', offset);
  }

  return ls;
}

function getSrcInfo(cst) {
  let lineStarts, src;

  if (typeof cst === 'string') {
    lineStarts = findLineStarts(cst);
    src = cst;
  } else {
    if (Array.isArray(cst)) cst = cst[0];

    if (cst && cst.context) {
      if (!cst.lineStarts) cst.lineStarts = findLineStarts(cst.context.src);
      lineStarts = cst.lineStarts;
      src = cst.context.src;
    }
  }

  return {
    lineStarts,
    src
  };
}
/**
 * @typedef {Object} LinePos - One-indexed position in the source
 * @property {number} line
 * @property {number} col
 */

/**
 * Determine the line/col position matching a character offset.
 *
 * Accepts a source string or a CST document as the second parameter. With
 * the latter, starting indices for lines are cached in the document as
 * `lineStarts: number[]`.
 *
 * Returns a one-indexed `{ line, col }` location if found, or
 * `undefined` otherwise.
 *
 * @param {number} offset
 * @param {string|Document|Document[]} cst
 * @returns {?LinePos}
 */


function getLinePos(offset, cst) {
  if (typeof offset !== 'number' || offset < 0) return null;
  const {
    lineStarts,
    src
  } = getSrcInfo(cst);
  if (!lineStarts || !src || offset > src.length) return null;

  for (let i = 0; i < lineStarts.length; ++i) {
    const start = lineStarts[i];

    if (offset < start) {
      return {
        line: i,
        col: offset - lineStarts[i - 1] + 1
      };
    }

    if (offset === start) return {
      line: i + 1,
      col: 1
    };
  }

  const line = lineStarts.length;
  return {
    line,
    col: offset - lineStarts[line - 1] + 1
  };
}
/**
 * Get a specified line from the source.
 *
 * Accepts a source string or a CST document as the second parameter. With
 * the latter, starting indices for lines are cached in the document as
 * `lineStarts: number[]`.
 *
 * Returns the line as a string if found, or `null` otherwise.
 *
 * @param {number} line One-indexed line number
 * @param {string|Document|Document[]} cst
 * @returns {?string}
 */

function getLine(line, cst) {
  const {
    lineStarts,
    src
  } = getSrcInfo(cst);
  if (!lineStarts || !(line >= 1) || line > lineStarts.length) return null;
  const start = lineStarts[line - 1];
  let end = lineStarts[line]; // undefined for last line; that's ok for slice()

  while (end && end > start && src[end - 1] === '\n') --end;

  return src.slice(start, end);
}
/**
 * Pretty-print the starting line from the source indicated by the range `pos`
 *
 * Trims output to `maxWidth` chars while keeping the starting column visible,
 * using `…` at either end to indicate dropped characters.
 *
 * Returns a two-line string (or `null`) with `\n` as separator; the second line
 * will hold appropriately indented `^` marks indicating the column range.
 *
 * @param {Object} pos
 * @param {LinePos} pos.start
 * @param {LinePos} [pos.end]
 * @param {string|Document|Document[]*} cst
 * @param {number} [maxWidth=80]
 * @returns {?string}
 */

function getPrettyContext({
  start,
  end
}, cst, maxWidth = 80) {
  let src = getLine(start.line, cst);
  if (!src) return null;
  let {
    col
  } = start;

  if (src.length > maxWidth) {
    if (col <= maxWidth - 10) {
      src = src.substr(0, maxWidth - 1) + '…';
    } else {
      const halfWidth = Math.round(maxWidth / 2);
      if (src.length > col + halfWidth) src = src.substr(0, col + halfWidth - 1) + '…';
      col -= src.length - maxWidth;
      src = '…' + src.substr(1 - maxWidth);
    }
  }

  let errLen = 1;
  let errEnd = '';

  if (end) {
    if (end.line === start.line && col + (end.col - start.col) <= maxWidth + 1) {
      errLen = end.col - start.col;
    } else {
      errLen = Math.min(src.length + 1, maxWidth) - col;
      errEnd = '…';
    }
  }

  const offset = col > 1 ? ' '.repeat(col - 1) : '';
  const err = '^'.repeat(errLen);
  return `${src}\n${offset}${err}${errEnd}`;
}

class Range {
  static copy(orig) {
    return new Range(orig.start, orig.end);
  }

  constructor(start, end) {
    this.start = start;
    this.end = end || start;
  }

  isEmpty() {
    return typeof this.start !== 'number' || !this.end || this.end <= this.start;
  }
  /**
   * Set `origStart` and `origEnd` to point to the original source range for
   * this node, which may differ due to dropped CR characters.
   *
   * @param {number[]} cr - Positions of dropped CR characters
   * @param {number} offset - Starting index of `cr` from the last call
   * @returns {number} - The next offset, matching the one found for `origStart`
   */


  setOrigRange(cr, offset) {
    const {
      start,
      end
    } = this;

    if (cr.length === 0 || end <= cr[0]) {
      this.origStart = start;
      this.origEnd = end;
      return offset;
    }

    let i = offset;

    while (i < cr.length) {
      if (cr[i] > start) break;else ++i;
    }

    this.origStart = start + i;
    const nextOffset = i;

    while (i < cr.length) {
      // if end was at \n, it should now be at \r
      if (cr[i] >= end) break;else ++i;
    }

    this.origEnd = end + i;
    return nextOffset;
  }

}

/** Root class of all nodes */

class Node$1 {
  static addStringTerminator(src, offset, str) {
    if (str[str.length - 1] === '\n') return str;
    const next = Node$1.endOfWhiteSpace(src, offset);
    return next >= src.length || src[next] === '\n' ? str + '\n' : str;
  } // ^(---|...)


  static atDocumentBoundary(src, offset, sep) {
    const ch0 = src[offset];
    if (!ch0) return true;
    const prev = src[offset - 1];
    if (prev && prev !== '\n') return false;

    if (sep) {
      if (ch0 !== sep) return false;
    } else {
      if (ch0 !== Char.DIRECTIVES_END && ch0 !== Char.DOCUMENT_END) return false;
    }

    const ch1 = src[offset + 1];
    const ch2 = src[offset + 2];
    if (ch1 !== ch0 || ch2 !== ch0) return false;
    const ch3 = src[offset + 3];
    return !ch3 || ch3 === '\n' || ch3 === '\t' || ch3 === ' ';
  }

  static endOfIdentifier(src, offset) {
    let ch = src[offset];
    const isVerbatim = ch === '<';
    const notOk = isVerbatim ? ['\n', '\t', ' ', '>'] : ['\n', '\t', ' ', '[', ']', '{', '}', ','];

    while (ch && notOk.indexOf(ch) === -1) ch = src[offset += 1];

    if (isVerbatim && ch === '>') offset += 1;
    return offset;
  }

  static endOfIndent(src, offset) {
    let ch = src[offset];

    while (ch === ' ') ch = src[offset += 1];

    return offset;
  }

  static endOfLine(src, offset) {
    let ch = src[offset];

    while (ch && ch !== '\n') ch = src[offset += 1];

    return offset;
  }

  static endOfWhiteSpace(src, offset) {
    let ch = src[offset];

    while (ch === '\t' || ch === ' ') ch = src[offset += 1];

    return offset;
  }

  static startOfLine(src, offset) {
    let ch = src[offset - 1];
    if (ch === '\n') return offset;

    while (ch && ch !== '\n') ch = src[offset -= 1];

    return offset + 1;
  }
  /**
   * End of indentation, or null if the line's indent level is not more
   * than `indent`
   *
   * @param {string} src
   * @param {number} indent
   * @param {number} lineStart
   * @returns {?number}
   */


  static endOfBlockIndent(src, indent, lineStart) {
    const inEnd = Node$1.endOfIndent(src, lineStart);

    if (inEnd > lineStart + indent) {
      return inEnd;
    } else {
      const wsEnd = Node$1.endOfWhiteSpace(src, inEnd);
      const ch = src[wsEnd];
      if (!ch || ch === '\n') return wsEnd;
    }

    return null;
  }

  static atBlank(src, offset, endAsBlank) {
    const ch = src[offset];
    return ch === '\n' || ch === '\t' || ch === ' ' || endAsBlank && !ch;
  }

  static nextNodeIsIndented(ch, indentDiff, indicatorAsIndent) {
    if (!ch || indentDiff < 0) return false;
    if (indentDiff > 0) return true;
    return indicatorAsIndent && ch === '-';
  } // should be at line or string end, or at next non-whitespace char


  static normalizeOffset(src, offset) {
    const ch = src[offset];
    return !ch ? offset : ch !== '\n' && src[offset - 1] === '\n' ? offset - 1 : Node$1.endOfWhiteSpace(src, offset);
  } // fold single newline into space, multiple newlines to N - 1 newlines
  // presumes src[offset] === '\n'


  static foldNewline(src, offset, indent) {
    let inCount = 0;
    let error = false;
    let fold = '';
    let ch = src[offset + 1];

    while (ch === ' ' || ch === '\t' || ch === '\n') {
      switch (ch) {
        case '\n':
          inCount = 0;
          offset += 1;
          fold += '\n';
          break;

        case '\t':
          if (inCount <= indent) error = true;
          offset = Node$1.endOfWhiteSpace(src, offset + 2) - 1;
          break;

        case ' ':
          inCount += 1;
          offset += 1;
          break;
      }

      ch = src[offset + 1];
    }

    if (!fold) fold = ' ';
    if (ch && inCount <= indent) error = true;
    return {
      fold,
      offset,
      error
    };
  }

  constructor(type, props, context) {
    Object.defineProperty(this, 'context', {
      value: context || null,
      writable: true
    });
    this.error = null;
    this.range = null;
    this.valueRange = null;
    this.props = props || [];
    this.type = type;
    this.value = null;
  }

  getPropValue(idx, key, skipKey) {
    if (!this.context) return null;
    const {
      src
    } = this.context;
    const prop = this.props[idx];
    return prop && src[prop.start] === key ? src.slice(prop.start + (skipKey ? 1 : 0), prop.end) : null;
  }

  get anchor() {
    for (let i = 0; i < this.props.length; ++i) {
      const anchor = this.getPropValue(i, Char.ANCHOR, true);
      if (anchor != null) return anchor;
    }

    return null;
  }

  get comment() {
    const comments = [];

    for (let i = 0; i < this.props.length; ++i) {
      const comment = this.getPropValue(i, Char.COMMENT, true);
      if (comment != null) comments.push(comment);
    }

    return comments.length > 0 ? comments.join('\n') : null;
  }

  commentHasRequiredWhitespace(start) {
    const {
      src
    } = this.context;
    if (this.header && start === this.header.end) return false;
    if (!this.valueRange) return false;
    const {
      end
    } = this.valueRange;
    return start !== end || Node$1.atBlank(src, end - 1);
  }

  get hasComment() {
    if (this.context) {
      const {
        src
      } = this.context;

      for (let i = 0; i < this.props.length; ++i) {
        if (src[this.props[i].start] === Char.COMMENT) return true;
      }
    }

    return false;
  }

  get hasProps() {
    if (this.context) {
      const {
        src
      } = this.context;

      for (let i = 0; i < this.props.length; ++i) {
        if (src[this.props[i].start] !== Char.COMMENT) return true;
      }
    }

    return false;
  }

  get includesTrailingLines() {
    return false;
  }

  get jsonLike() {
    const jsonLikeTypes = [Type.FLOW_MAP, Type.FLOW_SEQ, Type.QUOTE_DOUBLE, Type.QUOTE_SINGLE];
    return jsonLikeTypes.indexOf(this.type) !== -1;
  }

  get rangeAsLinePos() {
    if (!this.range || !this.context) return undefined;
    const start = getLinePos(this.range.start, this.context.root);
    if (!start) return undefined;
    const end = getLinePos(this.range.end, this.context.root);
    return {
      start,
      end
    };
  }

  get rawValue() {
    if (!this.valueRange || !this.context) return null;
    const {
      start,
      end
    } = this.valueRange;
    return this.context.src.slice(start, end);
  }

  get tag() {
    for (let i = 0; i < this.props.length; ++i) {
      const tag = this.getPropValue(i, Char.TAG, false);

      if (tag != null) {
        if (tag[1] === '<') {
          return {
            verbatim: tag.slice(2, -1)
          };
        } else {
          // eslint-disable-next-line no-unused-vars
          const [_, handle, suffix] = tag.match(/^(.*!)([^!]*)$/);
          return {
            handle,
            suffix
          };
        }
      }
    }

    return null;
  }

  get valueRangeContainsNewline() {
    if (!this.valueRange || !this.context) return false;
    const {
      start,
      end
    } = this.valueRange;
    const {
      src
    } = this.context;

    for (let i = start; i < end; ++i) {
      if (src[i] === '\n') return true;
    }

    return false;
  }

  parseComment(start) {
    const {
      src
    } = this.context;

    if (src[start] === Char.COMMENT) {
      const end = Node$1.endOfLine(src, start + 1);
      const commentRange = new Range(start, end);
      this.props.push(commentRange);
      return end;
    }

    return start;
  }
  /**
   * Populates the `origStart` and `origEnd` values of all ranges for this
   * node. Extended by child classes to handle descendant nodes.
   *
   * @param {number[]} cr - Positions of dropped CR characters
   * @param {number} offset - Starting index of `cr` from the last call
   * @returns {number} - The next offset, matching the one found for `origStart`
   */


  setOrigRanges(cr, offset) {
    if (this.range) offset = this.range.setOrigRange(cr, offset);
    if (this.valueRange) this.valueRange.setOrigRange(cr, offset);
    this.props.forEach(prop => prop.setOrigRange(cr, offset));
    return offset;
  }

  toString() {
    const {
      context: {
        src
      },
      range,
      value
    } = this;
    if (value != null) return value;
    const str = src.slice(range.start, range.end);
    return Node$1.addStringTerminator(src, range.end, str);
  }

}

class YAMLError extends Error {
  constructor(name, source, message) {
    if (!message || !(source instanceof Node$1)) throw new Error(`Invalid arguments for new ${name}`);
    super();
    this.name = name;
    this.message = message;
    this.source = source;
  }

  makePretty() {
    if (!this.source) return;
    this.nodeType = this.source.type;
    const cst = this.source.context && this.source.context.root;

    if (typeof this.offset === 'number') {
      this.range = new Range(this.offset, this.offset + 1);
      const start = cst && getLinePos(this.offset, cst);

      if (start) {
        const end = {
          line: start.line,
          col: start.col + 1
        };
        this.linePos = {
          start,
          end
        };
      }

      delete this.offset;
    } else {
      this.range = this.source.range;
      this.linePos = this.source.rangeAsLinePos;
    }

    if (this.linePos) {
      const {
        line,
        col
      } = this.linePos.start;
      this.message += ` at line ${line}, column ${col}`;
      const ctx = cst && getPrettyContext(this.linePos, cst);
      if (ctx) this.message += `:\n\n${ctx}\n`;
    }

    delete this.source;
  }

}
class YAMLReferenceError extends YAMLError {
  constructor(source, message) {
    super('YAMLReferenceError', source, message);
  }

}
class YAMLSemanticError extends YAMLError {
  constructor(source, message) {
    super('YAMLSemanticError', source, message);
  }

}
class YAMLSyntaxError extends YAMLError {
  constructor(source, message) {
    super('YAMLSyntaxError', source, message);
  }

}
class YAMLWarning extends YAMLError {
  constructor(source, message) {
    super('YAMLWarning', source, message);
  }

}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

class PlainValue$6 extends Node$1 {
  static endOfLine(src, start, inFlow) {
    let ch = src[start];
    let offset = start;

    while (ch && ch !== '\n') {
      if (inFlow && (ch === '[' || ch === ']' || ch === '{' || ch === '}' || ch === ',')) break;
      const next = src[offset + 1];
      if (ch === ':' && (!next || next === '\n' || next === '\t' || next === ' ' || inFlow && next === ',')) break;
      if ((ch === ' ' || ch === '\t') && next === '#') break;
      offset += 1;
      ch = next;
    }

    return offset;
  }

  get strValue() {
    if (!this.valueRange || !this.context) return null;
    let {
      start,
      end
    } = this.valueRange;
    const {
      src
    } = this.context;
    let ch = src[end - 1];

    while (start < end && (ch === '\n' || ch === '\t' || ch === ' ')) ch = src[--end - 1];

    let str = '';

    for (let i = start; i < end; ++i) {
      const ch = src[i];

      if (ch === '\n') {
        const {
          fold,
          offset
        } = Node$1.foldNewline(src, i, -1);
        str += fold;
        i = offset;
      } else if (ch === ' ' || ch === '\t') {
        // trim trailing whitespace
        const wsStart = i;
        let next = src[i + 1];

        while (i < end && (next === ' ' || next === '\t')) {
          i += 1;
          next = src[i + 1];
        }

        if (next !== '\n') str += i > wsStart ? src.slice(wsStart, i + 1) : ch;
      } else {
        str += ch;
      }
    }

    const ch0 = src[start];

    switch (ch0) {
      case '\t':
        {
          const msg = 'Plain value cannot start with a tab character';
          const errors = [new YAMLSemanticError(this, msg)];
          return {
            errors,
            str
          };
        }

      case '@':
      case '`':
        {
          const msg = `Plain value cannot start with reserved character ${ch0}`;
          const errors = [new YAMLSemanticError(this, msg)];
          return {
            errors,
            str
          };
        }

      default:
        return str;
    }
  }

  parseBlockValue(start) {
    const {
      indent,
      inFlow,
      src
    } = this.context;
    let offset = start;
    let valueEnd = start;

    for (let ch = src[offset]; ch === '\n'; ch = src[offset]) {
      if (Node$1.atDocumentBoundary(src, offset + 1)) break;
      const end = Node$1.endOfBlockIndent(src, indent, offset + 1);
      if (end === null || src[end] === '#') break;

      if (src[end] === '\n') {
        offset = end;
      } else {
        valueEnd = PlainValue$6.endOfLine(src, end, inFlow);
        offset = valueEnd;
      }
    }

    if (this.valueRange.isEmpty()) this.valueRange.start = start;
    this.valueRange.end = valueEnd;
    return valueEnd;
  }
  /**
   * Parses a plain value from the source
   *
   * Accepted forms are:
   * ```
   * #comment
   *
   * first line
   *
   * first line #comment
   *
   * first line
   * block
   * lines
   *
   * #comment
   * block
   * lines
   * ```
   * where block lines are empty or have an indent level greater than `indent`.
   *
   * @param {ParseContext} context
   * @param {number} start - Index of first character
   * @returns {number} - Index of the character after this scalar, may be `\n`
   */


  parse(context, start) {
    this.context = context;
    const {
      inFlow,
      src
    } = context;
    let offset = start;
    const ch = src[offset];

    if (ch && ch !== '#' && ch !== '\n') {
      offset = PlainValue$6.endOfLine(src, start, inFlow);
    }

    this.valueRange = new Range(start, offset);
    offset = Node$1.endOfWhiteSpace(src, offset);
    offset = this.parseComment(offset);

    if (!this.hasComment || this.valueRange.isEmpty()) {
      offset = this.parseBlockValue(offset);
    }

    return offset;
  }

}

PlainValueEc8e588e.Char = Char;
PlainValueEc8e588e.Node = Node$1;
PlainValueEc8e588e.PlainValue = PlainValue$6;
PlainValueEc8e588e.Range = Range;
PlainValueEc8e588e.Type = Type;
PlainValueEc8e588e.YAMLError = YAMLError;
PlainValueEc8e588e.YAMLReferenceError = YAMLReferenceError;
PlainValueEc8e588e.YAMLSemanticError = YAMLSemanticError;
PlainValueEc8e588e.YAMLSyntaxError = YAMLSyntaxError;
PlainValueEc8e588e.YAMLWarning = YAMLWarning;
PlainValueEc8e588e._defineProperty = _defineProperty;
PlainValueEc8e588e.defaultTagPrefix = defaultTagPrefix;
PlainValueEc8e588e.defaultTags = defaultTags;

var PlainValue$5 = PlainValueEc8e588e;

class BlankLine extends PlainValue$5.Node {
  constructor() {
    super(PlainValue$5.Type.BLANK_LINE);
  }
  /* istanbul ignore next */


  get includesTrailingLines() {
    // This is never called from anywhere, but if it were,
    // this is the value it should return.
    return true;
  }
  /**
   * Parses a blank line from the source
   *
   * @param {ParseContext} context
   * @param {number} start - Index of first \n character
   * @returns {number} - Index of the character after this
   */


  parse(context, start) {
    this.context = context;
    this.range = new PlainValue$5.Range(start, start + 1);
    return start + 1;
  }

}

class CollectionItem extends PlainValue$5.Node {
  constructor(type, props) {
    super(type, props);
    this.node = null;
  }

  get includesTrailingLines() {
    return !!this.node && this.node.includesTrailingLines;
  }
  /**
   * @param {ParseContext} context
   * @param {number} start - Index of first character
   * @returns {number} - Index of the character after this
   */


  parse(context, start) {
    this.context = context;
    const {
      parseNode,
      src
    } = context;
    let {
      atLineStart,
      lineStart
    } = context;
    if (!atLineStart && this.type === PlainValue$5.Type.SEQ_ITEM) this.error = new PlainValue$5.YAMLSemanticError(this, 'Sequence items must not have preceding content on the same line');
    const indent = atLineStart ? start - lineStart : context.indent;
    let offset = PlainValue$5.Node.endOfWhiteSpace(src, start + 1);
    let ch = src[offset];
    const inlineComment = ch === '#';
    const comments = [];
    let blankLine = null;

    while (ch === '\n' || ch === '#') {
      if (ch === '#') {
        const end = PlainValue$5.Node.endOfLine(src, offset + 1);
        comments.push(new PlainValue$5.Range(offset, end));
        offset = end;
      } else {
        atLineStart = true;
        lineStart = offset + 1;
        const wsEnd = PlainValue$5.Node.endOfWhiteSpace(src, lineStart);

        if (src[wsEnd] === '\n' && comments.length === 0) {
          blankLine = new BlankLine();
          lineStart = blankLine.parse({
            src
          }, lineStart);
        }

        offset = PlainValue$5.Node.endOfIndent(src, lineStart);
      }

      ch = src[offset];
    }

    if (PlainValue$5.Node.nextNodeIsIndented(ch, offset - (lineStart + indent), this.type !== PlainValue$5.Type.SEQ_ITEM)) {
      this.node = parseNode({
        atLineStart,
        inCollection: false,
        indent,
        lineStart,
        parent: this
      }, offset);
    } else if (ch && lineStart > start + 1) {
      offset = lineStart - 1;
    }

    if (this.node) {
      if (blankLine) {
        // Only blank lines preceding non-empty nodes are captured. Note that
        // this means that collection item range start indices do not always
        // increase monotonically. -- eemeli/yaml#126
        const items = context.parent.items || context.parent.contents;
        if (items) items.push(blankLine);
      }

      if (comments.length) Array.prototype.push.apply(this.props, comments);
      offset = this.node.range.end;
    } else {
      if (inlineComment) {
        const c = comments[0];
        this.props.push(c);
        offset = c.end;
      } else {
        offset = PlainValue$5.Node.endOfLine(src, start + 1);
      }
    }

    const end = this.node ? this.node.valueRange.end : offset;
    this.valueRange = new PlainValue$5.Range(start, end);
    return offset;
  }

  setOrigRanges(cr, offset) {
    offset = super.setOrigRanges(cr, offset);
    return this.node ? this.node.setOrigRanges(cr, offset) : offset;
  }

  toString() {
    const {
      context: {
        src
      },
      node,
      range,
      value
    } = this;
    if (value != null) return value;
    const str = node ? src.slice(range.start, node.range.start) + String(node) : src.slice(range.start, range.end);
    return PlainValue$5.Node.addStringTerminator(src, range.end, str);
  }

}

class Comment extends PlainValue$5.Node {
  constructor() {
    super(PlainValue$5.Type.COMMENT);
  }
  /**
   * Parses a comment line from the source
   *
   * @param {ParseContext} context
   * @param {number} start - Index of first character
   * @returns {number} - Index of the character after this scalar
   */


  parse(context, start) {
    this.context = context;
    const offset = this.parseComment(start);
    this.range = new PlainValue$5.Range(start, offset);
    return offset;
  }

}

function grabCollectionEndComments(node) {
  let cnode = node;

  while (cnode instanceof CollectionItem) cnode = cnode.node;

  if (!(cnode instanceof Collection$1)) return null;
  const len = cnode.items.length;
  let ci = -1;

  for (let i = len - 1; i >= 0; --i) {
    const n = cnode.items[i];

    if (n.type === PlainValue$5.Type.COMMENT) {
      // Keep sufficiently indented comments with preceding node
      const {
        indent,
        lineStart
      } = n.context;
      if (indent > 0 && n.range.start >= lineStart + indent) break;
      ci = i;
    } else if (n.type === PlainValue$5.Type.BLANK_LINE) ci = i;else break;
  }

  if (ci === -1) return null;
  const ca = cnode.items.splice(ci, len - ci);
  const prevEnd = ca[0].range.start;

  while (true) {
    cnode.range.end = prevEnd;
    if (cnode.valueRange && cnode.valueRange.end > prevEnd) cnode.valueRange.end = prevEnd;
    if (cnode === node) break;
    cnode = cnode.context.parent;
  }

  return ca;
}
class Collection$1 extends PlainValue$5.Node {
  static nextContentHasIndent(src, offset, indent) {
    const lineStart = PlainValue$5.Node.endOfLine(src, offset) + 1;
    offset = PlainValue$5.Node.endOfWhiteSpace(src, lineStart);
    const ch = src[offset];
    if (!ch) return false;
    if (offset >= lineStart + indent) return true;
    if (ch !== '#' && ch !== '\n') return false;
    return Collection$1.nextContentHasIndent(src, offset, indent);
  }

  constructor(firstItem) {
    super(firstItem.type === PlainValue$5.Type.SEQ_ITEM ? PlainValue$5.Type.SEQ : PlainValue$5.Type.MAP);

    for (let i = firstItem.props.length - 1; i >= 0; --i) {
      if (firstItem.props[i].start < firstItem.context.lineStart) {
        // props on previous line are assumed by the collection
        this.props = firstItem.props.slice(0, i + 1);
        firstItem.props = firstItem.props.slice(i + 1);
        const itemRange = firstItem.props[0] || firstItem.valueRange;
        firstItem.range.start = itemRange.start;
        break;
      }
    }

    this.items = [firstItem];
    const ec = grabCollectionEndComments(firstItem);
    if (ec) Array.prototype.push.apply(this.items, ec);
  }

  get includesTrailingLines() {
    return this.items.length > 0;
  }
  /**
   * @param {ParseContext} context
   * @param {number} start - Index of first character
   * @returns {number} - Index of the character after this
   */


  parse(context, start) {
    this.context = context;
    const {
      parseNode,
      src
    } = context; // It's easier to recalculate lineStart here rather than tracking down the
    // last context from which to read it -- eemeli/yaml#2

    let lineStart = PlainValue$5.Node.startOfLine(src, start);
    const firstItem = this.items[0]; // First-item context needs to be correct for later comment handling
    // -- eemeli/yaml#17

    firstItem.context.parent = this;
    this.valueRange = PlainValue$5.Range.copy(firstItem.valueRange);
    const indent = firstItem.range.start - firstItem.context.lineStart;
    let offset = start;
    offset = PlainValue$5.Node.normalizeOffset(src, offset);
    let ch = src[offset];
    let atLineStart = PlainValue$5.Node.endOfWhiteSpace(src, lineStart) === offset;
    let prevIncludesTrailingLines = false;

    while (ch) {
      while (ch === '\n' || ch === '#') {
        if (atLineStart && ch === '\n' && !prevIncludesTrailingLines) {
          const blankLine = new BlankLine();
          offset = blankLine.parse({
            src
          }, offset);
          this.valueRange.end = offset;

          if (offset >= src.length) {
            ch = null;
            break;
          }

          this.items.push(blankLine);
          offset -= 1; // blankLine.parse() consumes terminal newline
        } else if (ch === '#') {
          if (offset < lineStart + indent && !Collection$1.nextContentHasIndent(src, offset, indent)) {
            return offset;
          }

          const comment = new Comment();
          offset = comment.parse({
            indent,
            lineStart,
            src
          }, offset);
          this.items.push(comment);
          this.valueRange.end = offset;

          if (offset >= src.length) {
            ch = null;
            break;
          }
        }

        lineStart = offset + 1;
        offset = PlainValue$5.Node.endOfIndent(src, lineStart);

        if (PlainValue$5.Node.atBlank(src, offset)) {
          const wsEnd = PlainValue$5.Node.endOfWhiteSpace(src, offset);
          const next = src[wsEnd];

          if (!next || next === '\n' || next === '#') {
            offset = wsEnd;
          }
        }

        ch = src[offset];
        atLineStart = true;
      }

      if (!ch) {
        break;
      }

      if (offset !== lineStart + indent && (atLineStart || ch !== ':')) {
        if (offset < lineStart + indent) {
          if (lineStart > start) offset = lineStart;
          break;
        } else if (!this.error) {
          const msg = 'All collection items must start at the same column';
          this.error = new PlainValue$5.YAMLSyntaxError(this, msg);
        }
      }

      if (firstItem.type === PlainValue$5.Type.SEQ_ITEM) {
        if (ch !== '-') {
          if (lineStart > start) offset = lineStart;
          break;
        }
      } else if (ch === '-' && !this.error) {
        // map key may start with -, as long as it's followed by a non-whitespace char
        const next = src[offset + 1];

        if (!next || next === '\n' || next === '\t' || next === ' ') {
          const msg = 'A collection cannot be both a mapping and a sequence';
          this.error = new PlainValue$5.YAMLSyntaxError(this, msg);
        }
      }

      const node = parseNode({
        atLineStart,
        inCollection: true,
        indent,
        lineStart,
        parent: this
      }, offset);
      if (!node) return offset; // at next document start

      this.items.push(node);
      this.valueRange.end = node.valueRange.end;
      offset = PlainValue$5.Node.normalizeOffset(src, node.range.end);
      ch = src[offset];
      atLineStart = false;
      prevIncludesTrailingLines = node.includesTrailingLines; // Need to reset lineStart and atLineStart here if preceding node's range
      // has advanced to check the current line's indentation level
      // -- eemeli/yaml#10 & eemeli/yaml#38

      if (ch) {
        let ls = offset - 1;
        let prev = src[ls];

        while (prev === ' ' || prev === '\t') prev = src[--ls];

        if (prev === '\n') {
          lineStart = ls + 1;
          atLineStart = true;
        }
      }

      const ec = grabCollectionEndComments(node);
      if (ec) Array.prototype.push.apply(this.items, ec);
    }

    return offset;
  }

  setOrigRanges(cr, offset) {
    offset = super.setOrigRanges(cr, offset);
    this.items.forEach(node => {
      offset = node.setOrigRanges(cr, offset);
    });
    return offset;
  }

  toString() {
    const {
      context: {
        src
      },
      items,
      range,
      value
    } = this;
    if (value != null) return value;
    let str = src.slice(range.start, items[0].range.start) + String(items[0]);

    for (let i = 1; i < items.length; ++i) {
      const item = items[i];
      const {
        atLineStart,
        indent
      } = item.context;
      if (atLineStart) for (let i = 0; i < indent; ++i) str += ' ';
      str += String(item);
    }

    return PlainValue$5.Node.addStringTerminator(src, range.end, str);
  }

}

class Directive extends PlainValue$5.Node {
  constructor() {
    super(PlainValue$5.Type.DIRECTIVE);
    this.name = null;
  }

  get parameters() {
    const raw = this.rawValue;
    return raw ? raw.trim().split(/[ \t]+/) : [];
  }

  parseName(start) {
    const {
      src
    } = this.context;
    let offset = start;
    let ch = src[offset];

    while (ch && ch !== '\n' && ch !== '\t' && ch !== ' ') ch = src[offset += 1];

    this.name = src.slice(start, offset);
    return offset;
  }

  parseParameters(start) {
    const {
      src
    } = this.context;
    let offset = start;
    let ch = src[offset];

    while (ch && ch !== '\n' && ch !== '#') ch = src[offset += 1];

    this.valueRange = new PlainValue$5.Range(start, offset);
    return offset;
  }

  parse(context, start) {
    this.context = context;
    let offset = this.parseName(start + 1);
    offset = this.parseParameters(offset);
    offset = this.parseComment(offset);
    this.range = new PlainValue$5.Range(start, offset);
    return offset;
  }

}

class Document$3 extends PlainValue$5.Node {
  static startCommentOrEndBlankLine(src, start) {
    const offset = PlainValue$5.Node.endOfWhiteSpace(src, start);
    const ch = src[offset];
    return ch === '#' || ch === '\n' ? offset : start;
  }

  constructor() {
    super(PlainValue$5.Type.DOCUMENT);
    this.directives = null;
    this.contents = null;
    this.directivesEndMarker = null;
    this.documentEndMarker = null;
  }

  parseDirectives(start) {
    const {
      src
    } = this.context;
    this.directives = [];
    let atLineStart = true;
    let hasDirectives = false;
    let offset = start;

    while (!PlainValue$5.Node.atDocumentBoundary(src, offset, PlainValue$5.Char.DIRECTIVES_END)) {
      offset = Document$3.startCommentOrEndBlankLine(src, offset);

      switch (src[offset]) {
        case '\n':
          if (atLineStart) {
            const blankLine = new BlankLine();
            offset = blankLine.parse({
              src
            }, offset);

            if (offset < src.length) {
              this.directives.push(blankLine);
            }
          } else {
            offset += 1;
            atLineStart = true;
          }

          break;

        case '#':
          {
            const comment = new Comment();
            offset = comment.parse({
              src
            }, offset);
            this.directives.push(comment);
            atLineStart = false;
          }
          break;

        case '%':
          {
            const directive = new Directive();
            offset = directive.parse({
              parent: this,
              src
            }, offset);
            this.directives.push(directive);
            hasDirectives = true;
            atLineStart = false;
          }
          break;

        default:
          if (hasDirectives) {
            this.error = new PlainValue$5.YAMLSemanticError(this, 'Missing directives-end indicator line');
          } else if (this.directives.length > 0) {
            this.contents = this.directives;
            this.directives = [];
          }

          return offset;
      }
    }

    if (src[offset]) {
      this.directivesEndMarker = new PlainValue$5.Range(offset, offset + 3);
      return offset + 3;
    }

    if (hasDirectives) {
      this.error = new PlainValue$5.YAMLSemanticError(this, 'Missing directives-end indicator line');
    } else if (this.directives.length > 0) {
      this.contents = this.directives;
      this.directives = [];
    }

    return offset;
  }

  parseContents(start) {
    const {
      parseNode,
      src
    } = this.context;
    if (!this.contents) this.contents = [];
    let lineStart = start;

    while (src[lineStart - 1] === '-') lineStart -= 1;

    let offset = PlainValue$5.Node.endOfWhiteSpace(src, start);
    let atLineStart = lineStart === start;
    this.valueRange = new PlainValue$5.Range(offset);

    while (!PlainValue$5.Node.atDocumentBoundary(src, offset, PlainValue$5.Char.DOCUMENT_END)) {
      switch (src[offset]) {
        case '\n':
          if (atLineStart) {
            const blankLine = new BlankLine();
            offset = blankLine.parse({
              src
            }, offset);

            if (offset < src.length) {
              this.contents.push(blankLine);
            }
          } else {
            offset += 1;
            atLineStart = true;
          }

          lineStart = offset;
          break;

        case '#':
          {
            const comment = new Comment();
            offset = comment.parse({
              src
            }, offset);
            this.contents.push(comment);
            atLineStart = false;
          }
          break;

        default:
          {
            const iEnd = PlainValue$5.Node.endOfIndent(src, offset);
            const context = {
              atLineStart,
              indent: -1,
              inFlow: false,
              inCollection: false,
              lineStart,
              parent: this
            };
            const node = parseNode(context, iEnd);
            if (!node) return this.valueRange.end = iEnd; // at next document start

            this.contents.push(node);
            offset = node.range.end;
            atLineStart = false;
            const ec = grabCollectionEndComments(node);
            if (ec) Array.prototype.push.apply(this.contents, ec);
          }
      }

      offset = Document$3.startCommentOrEndBlankLine(src, offset);
    }

    this.valueRange.end = offset;

    if (src[offset]) {
      this.documentEndMarker = new PlainValue$5.Range(offset, offset + 3);
      offset += 3;

      if (src[offset]) {
        offset = PlainValue$5.Node.endOfWhiteSpace(src, offset);

        if (src[offset] === '#') {
          const comment = new Comment();
          offset = comment.parse({
            src
          }, offset);
          this.contents.push(comment);
        }

        switch (src[offset]) {
          case '\n':
            offset += 1;
            break;

          case undefined:
            break;

          default:
            this.error = new PlainValue$5.YAMLSyntaxError(this, 'Document end marker line cannot have a non-comment suffix');
        }
      }
    }

    return offset;
  }
  /**
   * @param {ParseContext} context
   * @param {number} start - Index of first character
   * @returns {number} - Index of the character after this
   */


  parse(context, start) {
    context.root = this;
    this.context = context;
    const {
      src
    } = context;
    let offset = src.charCodeAt(start) === 0xfeff ? start + 1 : start; // skip BOM

    offset = this.parseDirectives(offset);
    offset = this.parseContents(offset);
    return offset;
  }

  setOrigRanges(cr, offset) {
    offset = super.setOrigRanges(cr, offset);
    this.directives.forEach(node => {
      offset = node.setOrigRanges(cr, offset);
    });
    if (this.directivesEndMarker) offset = this.directivesEndMarker.setOrigRange(cr, offset);
    this.contents.forEach(node => {
      offset = node.setOrigRanges(cr, offset);
    });
    if (this.documentEndMarker) offset = this.documentEndMarker.setOrigRange(cr, offset);
    return offset;
  }

  toString() {
    const {
      contents,
      directives,
      value
    } = this;
    if (value != null) return value;
    let str = directives.join('');

    if (contents.length > 0) {
      if (directives.length > 0 || contents[0].type === PlainValue$5.Type.COMMENT) str += '---\n';
      str += contents.join('');
    }

    if (str[str.length - 1] !== '\n') str += '\n';
    return str;
  }

}

class Alias$1 extends PlainValue$5.Node {
  /**
   * Parses an *alias from the source
   *
   * @param {ParseContext} context
   * @param {number} start - Index of first character
   * @returns {number} - Index of the character after this scalar
   */
  parse(context, start) {
    this.context = context;
    const {
      src
    } = context;
    let offset = PlainValue$5.Node.endOfIdentifier(src, start + 1);
    this.valueRange = new PlainValue$5.Range(start + 1, offset);
    offset = PlainValue$5.Node.endOfWhiteSpace(src, offset);
    offset = this.parseComment(offset);
    return offset;
  }

}

const Chomp = {
  CLIP: 'CLIP',
  KEEP: 'KEEP',
  STRIP: 'STRIP'
};
class BlockValue extends PlainValue$5.Node {
  constructor(type, props) {
    super(type, props);
    this.blockIndent = null;
    this.chomping = Chomp.CLIP;
    this.header = null;
  }

  get includesTrailingLines() {
    return this.chomping === Chomp.KEEP;
  }

  get strValue() {
    if (!this.valueRange || !this.context) return null;
    let {
      start,
      end
    } = this.valueRange;
    const {
      indent,
      src
    } = this.context;
    if (this.valueRange.isEmpty()) return '';
    let lastNewLine = null;
    let ch = src[end - 1];

    while (ch === '\n' || ch === '\t' || ch === ' ') {
      end -= 1;

      if (end <= start) {
        if (this.chomping === Chomp.KEEP) break;else return ''; // probably never happens
      }

      if (ch === '\n') lastNewLine = end;
      ch = src[end - 1];
    }

    let keepStart = end + 1;

    if (lastNewLine) {
      if (this.chomping === Chomp.KEEP) {
        keepStart = lastNewLine;
        end = this.valueRange.end;
      } else {
        end = lastNewLine;
      }
    }

    const bi = indent + this.blockIndent;
    const folded = this.type === PlainValue$5.Type.BLOCK_FOLDED;
    let atStart = true;
    let str = '';
    let sep = '';
    let prevMoreIndented = false;

    for (let i = start; i < end; ++i) {
      for (let j = 0; j < bi; ++j) {
        if (src[i] !== ' ') break;
        i += 1;
      }

      const ch = src[i];

      if (ch === '\n') {
        if (sep === '\n') str += '\n';else sep = '\n';
      } else {
        const lineEnd = PlainValue$5.Node.endOfLine(src, i);
        const line = src.slice(i, lineEnd);
        i = lineEnd;

        if (folded && (ch === ' ' || ch === '\t') && i < keepStart) {
          if (sep === ' ') sep = '\n';else if (!prevMoreIndented && !atStart && sep === '\n') sep = '\n\n';
          str += sep + line; //+ ((lineEnd < end && src[lineEnd]) || '')

          sep = lineEnd < end && src[lineEnd] || '';
          prevMoreIndented = true;
        } else {
          str += sep + line;
          sep = folded && i < keepStart ? ' ' : '\n';
          prevMoreIndented = false;
        }

        if (atStart && line !== '') atStart = false;
      }
    }

    return this.chomping === Chomp.STRIP ? str : str + '\n';
  }

  parseBlockHeader(start) {
    const {
      src
    } = this.context;
    let offset = start + 1;
    let bi = '';

    while (true) {
      const ch = src[offset];

      switch (ch) {
        case '-':
          this.chomping = Chomp.STRIP;
          break;

        case '+':
          this.chomping = Chomp.KEEP;
          break;

        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          bi += ch;
          break;

        default:
          this.blockIndent = Number(bi) || null;
          this.header = new PlainValue$5.Range(start, offset);
          return offset;
      }

      offset += 1;
    }
  }

  parseBlockValue(start) {
    const {
      indent,
      src
    } = this.context;
    const explicit = !!this.blockIndent;
    let offset = start;
    let valueEnd = start;
    let minBlockIndent = 1;

    for (let ch = src[offset]; ch === '\n'; ch = src[offset]) {
      offset += 1;
      if (PlainValue$5.Node.atDocumentBoundary(src, offset)) break;
      const end = PlainValue$5.Node.endOfBlockIndent(src, indent, offset); // should not include tab?

      if (end === null) break;
      const ch = src[end];
      const lineIndent = end - (offset + indent);

      if (!this.blockIndent) {
        // no explicit block indent, none yet detected
        if (src[end] !== '\n') {
          // first line with non-whitespace content
          if (lineIndent < minBlockIndent) {
            const msg = 'Block scalars with more-indented leading empty lines must use an explicit indentation indicator';
            this.error = new PlainValue$5.YAMLSemanticError(this, msg);
          }

          this.blockIndent = lineIndent;
        } else if (lineIndent > minBlockIndent) {
          // empty line with more whitespace
          minBlockIndent = lineIndent;
        }
      } else if (ch && ch !== '\n' && lineIndent < this.blockIndent) {
        if (src[end] === '#') break;

        if (!this.error) {
          const src = explicit ? 'explicit indentation indicator' : 'first line';
          const msg = `Block scalars must not be less indented than their ${src}`;
          this.error = new PlainValue$5.YAMLSemanticError(this, msg);
        }
      }

      if (src[end] === '\n') {
        offset = end;
      } else {
        offset = valueEnd = PlainValue$5.Node.endOfLine(src, end);
      }
    }

    if (this.chomping !== Chomp.KEEP) {
      offset = src[valueEnd] ? valueEnd + 1 : valueEnd;
    }

    this.valueRange = new PlainValue$5.Range(start + 1, offset);
    return offset;
  }
  /**
   * Parses a block value from the source
   *
   * Accepted forms are:
   * ```
   * BS
   * block
   * lines
   *
   * BS #comment
   * block
   * lines
   * ```
   * where the block style BS matches the regexp `[|>][-+1-9]*` and block lines
   * are empty or have an indent level greater than `indent`.
   *
   * @param {ParseContext} context
   * @param {number} start - Index of first character
   * @returns {number} - Index of the character after this block
   */


  parse(context, start) {
    this.context = context;
    const {
      src
    } = context;
    let offset = this.parseBlockHeader(start);
    offset = PlainValue$5.Node.endOfWhiteSpace(src, offset);
    offset = this.parseComment(offset);
    offset = this.parseBlockValue(offset);
    return offset;
  }

  setOrigRanges(cr, offset) {
    offset = super.setOrigRanges(cr, offset);
    return this.header ? this.header.setOrigRange(cr, offset) : offset;
  }

}

class FlowCollection extends PlainValue$5.Node {
  constructor(type, props) {
    super(type, props);
    this.items = null;
  }

  prevNodeIsJsonLike(idx = this.items.length) {
    const node = this.items[idx - 1];
    return !!node && (node.jsonLike || node.type === PlainValue$5.Type.COMMENT && this.prevNodeIsJsonLike(idx - 1));
  }
  /**
   * @param {ParseContext} context
   * @param {number} start - Index of first character
   * @returns {number} - Index of the character after this
   */


  parse(context, start) {
    this.context = context;
    const {
      parseNode,
      src
    } = context;
    let {
      indent,
      lineStart
    } = context;
    let char = src[start]; // { or [

    this.items = [{
      char,
      offset: start
    }];
    let offset = PlainValue$5.Node.endOfWhiteSpace(src, start + 1);
    char = src[offset];

    while (char && char !== ']' && char !== '}') {
      switch (char) {
        case '\n':
          {
            lineStart = offset + 1;
            const wsEnd = PlainValue$5.Node.endOfWhiteSpace(src, lineStart);

            if (src[wsEnd] === '\n') {
              const blankLine = new BlankLine();
              lineStart = blankLine.parse({
                src
              }, lineStart);
              this.items.push(blankLine);
            }

            offset = PlainValue$5.Node.endOfIndent(src, lineStart);

            if (offset <= lineStart + indent) {
              char = src[offset];

              if (offset < lineStart + indent || char !== ']' && char !== '}') {
                const msg = 'Insufficient indentation in flow collection';
                this.error = new PlainValue$5.YAMLSemanticError(this, msg);
              }
            }
          }
          break;

        case ',':
          {
            this.items.push({
              char,
              offset
            });
            offset += 1;
          }
          break;

        case '#':
          {
            const comment = new Comment();
            offset = comment.parse({
              src
            }, offset);
            this.items.push(comment);
          }
          break;

        case '?':
        case ':':
          {
            const next = src[offset + 1];

            if (next === '\n' || next === '\t' || next === ' ' || next === ',' || // in-flow : after JSON-like key does not need to be followed by whitespace
            char === ':' && this.prevNodeIsJsonLike()) {
              this.items.push({
                char,
                offset
              });
              offset += 1;
              break;
            }
          }
        // fallthrough

        default:
          {
            const node = parseNode({
              atLineStart: false,
              inCollection: false,
              inFlow: true,
              indent: -1,
              lineStart,
              parent: this
            }, offset);

            if (!node) {
              // at next document start
              this.valueRange = new PlainValue$5.Range(start, offset);
              return offset;
            }

            this.items.push(node);
            offset = PlainValue$5.Node.normalizeOffset(src, node.range.end);
          }
      }

      offset = PlainValue$5.Node.endOfWhiteSpace(src, offset);
      char = src[offset];
    }

    this.valueRange = new PlainValue$5.Range(start, offset + 1);

    if (char) {
      this.items.push({
        char,
        offset
      });
      offset = PlainValue$5.Node.endOfWhiteSpace(src, offset + 1);
      offset = this.parseComment(offset);
    }

    return offset;
  }

  setOrigRanges(cr, offset) {
    offset = super.setOrigRanges(cr, offset);
    this.items.forEach(node => {
      if (node instanceof PlainValue$5.Node) {
        offset = node.setOrigRanges(cr, offset);
      } else if (cr.length === 0) {
        node.origOffset = node.offset;
      } else {
        let i = offset;

        while (i < cr.length) {
          if (cr[i] > node.offset) break;else ++i;
        }

        node.origOffset = node.offset + i;
        offset = i;
      }
    });
    return offset;
  }

  toString() {
    const {
      context: {
        src
      },
      items,
      range,
      value
    } = this;
    if (value != null) return value;
    const nodes = items.filter(item => item instanceof PlainValue$5.Node);
    let str = '';
    let prevEnd = range.start;
    nodes.forEach(node => {
      const prefix = src.slice(prevEnd, node.range.start);
      prevEnd = node.range.end;
      str += prefix + String(node);

      if (str[str.length - 1] === '\n' && src[prevEnd - 1] !== '\n' && src[prevEnd] === '\n') {
        // Comment range does not include the terminal newline, but its
        // stringified value does. Without this fix, newlines at comment ends
        // get duplicated.
        prevEnd += 1;
      }
    });
    str += src.slice(prevEnd, range.end);
    return PlainValue$5.Node.addStringTerminator(src, range.end, str);
  }

}

class QuoteDouble extends PlainValue$5.Node {
  static endOfQuote(src, offset) {
    let ch = src[offset];

    while (ch && ch !== '"') {
      offset += ch === '\\' ? 2 : 1;
      ch = src[offset];
    }

    return offset + 1;
  }
  /**
   * @returns {string | { str: string, errors: YAMLSyntaxError[] }}
   */


  get strValue() {
    if (!this.valueRange || !this.context) return null;
    const errors = [];
    const {
      start,
      end
    } = this.valueRange;
    const {
      indent,
      src
    } = this.context;
    if (src[end - 1] !== '"') errors.push(new PlainValue$5.YAMLSyntaxError(this, 'Missing closing "quote')); // Using String#replace is too painful with escaped newlines preceded by
    // escaped backslashes; also, this should be faster.

    let str = '';

    for (let i = start + 1; i < end - 1; ++i) {
      const ch = src[i];

      if (ch === '\n') {
        if (PlainValue$5.Node.atDocumentBoundary(src, i + 1)) errors.push(new PlainValue$5.YAMLSemanticError(this, 'Document boundary indicators are not allowed within string values'));
        const {
          fold,
          offset,
          error
        } = PlainValue$5.Node.foldNewline(src, i, indent);
        str += fold;
        i = offset;
        if (error) errors.push(new PlainValue$5.YAMLSemanticError(this, 'Multi-line double-quoted string needs to be sufficiently indented'));
      } else if (ch === '\\') {
        i += 1;

        switch (src[i]) {
          case '0':
            str += '\0';
            break;
          // null character

          case 'a':
            str += '\x07';
            break;
          // bell character

          case 'b':
            str += '\b';
            break;
          // backspace

          case 'e':
            str += '\x1b';
            break;
          // escape character

          case 'f':
            str += '\f';
            break;
          // form feed

          case 'n':
            str += '\n';
            break;
          // line feed

          case 'r':
            str += '\r';
            break;
          // carriage return

          case 't':
            str += '\t';
            break;
          // horizontal tab

          case 'v':
            str += '\v';
            break;
          // vertical tab

          case 'N':
            str += '\u0085';
            break;
          // Unicode next line

          case '_':
            str += '\u00a0';
            break;
          // Unicode non-breaking space

          case 'L':
            str += '\u2028';
            break;
          // Unicode line separator

          case 'P':
            str += '\u2029';
            break;
          // Unicode paragraph separator

          case ' ':
            str += ' ';
            break;

          case '"':
            str += '"';
            break;

          case '/':
            str += '/';
            break;

          case '\\':
            str += '\\';
            break;

          case '\t':
            str += '\t';
            break;

          case 'x':
            str += this.parseCharCode(i + 1, 2, errors);
            i += 2;
            break;

          case 'u':
            str += this.parseCharCode(i + 1, 4, errors);
            i += 4;
            break;

          case 'U':
            str += this.parseCharCode(i + 1, 8, errors);
            i += 8;
            break;

          case '\n':
            // skip escaped newlines, but still trim the following line
            while (src[i + 1] === ' ' || src[i + 1] === '\t') i += 1;

            break;

          default:
            errors.push(new PlainValue$5.YAMLSyntaxError(this, `Invalid escape sequence ${src.substr(i - 1, 2)}`));
            str += '\\' + src[i];
        }
      } else if (ch === ' ' || ch === '\t') {
        // trim trailing whitespace
        const wsStart = i;
        let next = src[i + 1];

        while (next === ' ' || next === '\t') {
          i += 1;
          next = src[i + 1];
        }

        if (next !== '\n') str += i > wsStart ? src.slice(wsStart, i + 1) : ch;
      } else {
        str += ch;
      }
    }

    return errors.length > 0 ? {
      errors,
      str
    } : str;
  }

  parseCharCode(offset, length, errors) {
    const {
      src
    } = this.context;
    const cc = src.substr(offset, length);
    const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
    const code = ok ? parseInt(cc, 16) : NaN;

    if (isNaN(code)) {
      errors.push(new PlainValue$5.YAMLSyntaxError(this, `Invalid escape sequence ${src.substr(offset - 2, length + 2)}`));
      return src.substr(offset - 2, length + 2);
    }

    return String.fromCodePoint(code);
  }
  /**
   * Parses a "double quoted" value from the source
   *
   * @param {ParseContext} context
   * @param {number} start - Index of first character
   * @returns {number} - Index of the character after this scalar
   */


  parse(context, start) {
    this.context = context;
    const {
      src
    } = context;
    let offset = QuoteDouble.endOfQuote(src, start + 1);
    this.valueRange = new PlainValue$5.Range(start, offset);
    offset = PlainValue$5.Node.endOfWhiteSpace(src, offset);
    offset = this.parseComment(offset);
    return offset;
  }

}

class QuoteSingle extends PlainValue$5.Node {
  static endOfQuote(src, offset) {
    let ch = src[offset];

    while (ch) {
      if (ch === "'") {
        if (src[offset + 1] !== "'") break;
        ch = src[offset += 2];
      } else {
        ch = src[offset += 1];
      }
    }

    return offset + 1;
  }
  /**
   * @returns {string | { str: string, errors: YAMLSyntaxError[] }}
   */


  get strValue() {
    if (!this.valueRange || !this.context) return null;
    const errors = [];
    const {
      start,
      end
    } = this.valueRange;
    const {
      indent,
      src
    } = this.context;
    if (src[end - 1] !== "'") errors.push(new PlainValue$5.YAMLSyntaxError(this, "Missing closing 'quote"));
    let str = '';

    for (let i = start + 1; i < end - 1; ++i) {
      const ch = src[i];

      if (ch === '\n') {
        if (PlainValue$5.Node.atDocumentBoundary(src, i + 1)) errors.push(new PlainValue$5.YAMLSemanticError(this, 'Document boundary indicators are not allowed within string values'));
        const {
          fold,
          offset,
          error
        } = PlainValue$5.Node.foldNewline(src, i, indent);
        str += fold;
        i = offset;
        if (error) errors.push(new PlainValue$5.YAMLSemanticError(this, 'Multi-line single-quoted string needs to be sufficiently indented'));
      } else if (ch === "'") {
        str += ch;
        i += 1;
        if (src[i] !== "'") errors.push(new PlainValue$5.YAMLSyntaxError(this, 'Unescaped single quote? This should not happen.'));
      } else if (ch === ' ' || ch === '\t') {
        // trim trailing whitespace
        const wsStart = i;
        let next = src[i + 1];

        while (next === ' ' || next === '\t') {
          i += 1;
          next = src[i + 1];
        }

        if (next !== '\n') str += i > wsStart ? src.slice(wsStart, i + 1) : ch;
      } else {
        str += ch;
      }
    }

    return errors.length > 0 ? {
      errors,
      str
    } : str;
  }
  /**
   * Parses a 'single quoted' value from the source
   *
   * @param {ParseContext} context
   * @param {number} start - Index of first character
   * @returns {number} - Index of the character after this scalar
   */


  parse(context, start) {
    this.context = context;
    const {
      src
    } = context;
    let offset = QuoteSingle.endOfQuote(src, start + 1);
    this.valueRange = new PlainValue$5.Range(start, offset);
    offset = PlainValue$5.Node.endOfWhiteSpace(src, offset);
    offset = this.parseComment(offset);
    return offset;
  }

}

function createNewNode(type, props) {
  switch (type) {
    case PlainValue$5.Type.ALIAS:
      return new Alias$1(type, props);

    case PlainValue$5.Type.BLOCK_FOLDED:
    case PlainValue$5.Type.BLOCK_LITERAL:
      return new BlockValue(type, props);

    case PlainValue$5.Type.FLOW_MAP:
    case PlainValue$5.Type.FLOW_SEQ:
      return new FlowCollection(type, props);

    case PlainValue$5.Type.MAP_KEY:
    case PlainValue$5.Type.MAP_VALUE:
    case PlainValue$5.Type.SEQ_ITEM:
      return new CollectionItem(type, props);

    case PlainValue$5.Type.COMMENT:
    case PlainValue$5.Type.PLAIN:
      return new PlainValue$5.PlainValue(type, props);

    case PlainValue$5.Type.QUOTE_DOUBLE:
      return new QuoteDouble(type, props);

    case PlainValue$5.Type.QUOTE_SINGLE:
      return new QuoteSingle(type, props);

    /* istanbul ignore next */

    default:
      return null;
    // should never happen
  }
}
/**
 * @param {boolean} atLineStart - Node starts at beginning of line
 * @param {boolean} inFlow - true if currently in a flow context
 * @param {boolean} inCollection - true if currently in a collection context
 * @param {number} indent - Current level of indentation
 * @param {number} lineStart - Start of the current line
 * @param {Node} parent - The parent of the node
 * @param {string} src - Source of the YAML document
 */


class ParseContext {
  static parseType(src, offset, inFlow) {
    switch (src[offset]) {
      case '*':
        return PlainValue$5.Type.ALIAS;

      case '>':
        return PlainValue$5.Type.BLOCK_FOLDED;

      case '|':
        return PlainValue$5.Type.BLOCK_LITERAL;

      case '{':
        return PlainValue$5.Type.FLOW_MAP;

      case '[':
        return PlainValue$5.Type.FLOW_SEQ;

      case '?':
        return !inFlow && PlainValue$5.Node.atBlank(src, offset + 1, true) ? PlainValue$5.Type.MAP_KEY : PlainValue$5.Type.PLAIN;

      case ':':
        return !inFlow && PlainValue$5.Node.atBlank(src, offset + 1, true) ? PlainValue$5.Type.MAP_VALUE : PlainValue$5.Type.PLAIN;

      case '-':
        return !inFlow && PlainValue$5.Node.atBlank(src, offset + 1, true) ? PlainValue$5.Type.SEQ_ITEM : PlainValue$5.Type.PLAIN;

      case '"':
        return PlainValue$5.Type.QUOTE_DOUBLE;

      case "'":
        return PlainValue$5.Type.QUOTE_SINGLE;

      default:
        return PlainValue$5.Type.PLAIN;
    }
  }

  constructor(orig = {}, {
    atLineStart,
    inCollection,
    inFlow,
    indent,
    lineStart,
    parent
  } = {}) {
    PlainValue$5._defineProperty(this, "parseNode", (overlay, start) => {
      if (PlainValue$5.Node.atDocumentBoundary(this.src, start)) return null;
      const context = new ParseContext(this, overlay);
      const {
        props,
        type,
        valueStart
      } = context.parseProps(start);
      const node = createNewNode(type, props);
      let offset = node.parse(context, valueStart);
      node.range = new PlainValue$5.Range(start, offset);
      /* istanbul ignore if */

      if (offset <= start) {
        // This should never happen, but if it does, let's make sure to at least
        // step one character forward to avoid a busy loop.
        node.error = new Error(`Node#parse consumed no characters`);
        node.error.parseEnd = offset;
        node.error.source = node;
        node.range.end = start + 1;
      }

      if (context.nodeStartsCollection(node)) {
        if (!node.error && !context.atLineStart && context.parent.type === PlainValue$5.Type.DOCUMENT) {
          node.error = new PlainValue$5.YAMLSyntaxError(node, 'Block collection must not have preceding content here (e.g. directives-end indicator)');
        }

        const collection = new Collection$1(node);
        offset = collection.parse(new ParseContext(context), offset);
        collection.range = new PlainValue$5.Range(start, offset);
        return collection;
      }

      return node;
    });

    this.atLineStart = atLineStart != null ? atLineStart : orig.atLineStart || false;
    this.inCollection = inCollection != null ? inCollection : orig.inCollection || false;
    this.inFlow = inFlow != null ? inFlow : orig.inFlow || false;
    this.indent = indent != null ? indent : orig.indent;
    this.lineStart = lineStart != null ? lineStart : orig.lineStart;
    this.parent = parent != null ? parent : orig.parent || {};
    this.root = orig.root;
    this.src = orig.src;
  }

  nodeStartsCollection(node) {
    const {
      inCollection,
      inFlow,
      src
    } = this;
    if (inCollection || inFlow) return false;
    if (node instanceof CollectionItem) return true; // check for implicit key

    let offset = node.range.end;
    if (src[offset] === '\n' || src[offset - 1] === '\n') return false;
    offset = PlainValue$5.Node.endOfWhiteSpace(src, offset);
    return src[offset] === ':';
  } // Anchor and tag are before type, which determines the node implementation
  // class; hence this intermediate step.


  parseProps(offset) {
    const {
      inFlow,
      parent,
      src
    } = this;
    const props = [];
    let lineHasProps = false;
    offset = this.atLineStart ? PlainValue$5.Node.endOfIndent(src, offset) : PlainValue$5.Node.endOfWhiteSpace(src, offset);
    let ch = src[offset];

    while (ch === PlainValue$5.Char.ANCHOR || ch === PlainValue$5.Char.COMMENT || ch === PlainValue$5.Char.TAG || ch === '\n') {
      if (ch === '\n') {
        let inEnd = offset;
        let lineStart;

        do {
          lineStart = inEnd + 1;
          inEnd = PlainValue$5.Node.endOfIndent(src, lineStart);
        } while (src[inEnd] === '\n');

        const indentDiff = inEnd - (lineStart + this.indent);
        const noIndicatorAsIndent = parent.type === PlainValue$5.Type.SEQ_ITEM && parent.context.atLineStart;
        if (src[inEnd] !== '#' && !PlainValue$5.Node.nextNodeIsIndented(src[inEnd], indentDiff, !noIndicatorAsIndent)) break;
        this.atLineStart = true;
        this.lineStart = lineStart;
        lineHasProps = false;
        offset = inEnd;
      } else if (ch === PlainValue$5.Char.COMMENT) {
        const end = PlainValue$5.Node.endOfLine(src, offset + 1);
        props.push(new PlainValue$5.Range(offset, end));
        offset = end;
      } else {
        let end = PlainValue$5.Node.endOfIdentifier(src, offset + 1);

        if (ch === PlainValue$5.Char.TAG && src[end] === ',' && /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+,\d\d\d\d(-\d\d){0,2}\/\S/.test(src.slice(offset + 1, end + 13))) {
          // Let's presume we're dealing with a YAML 1.0 domain tag here, rather
          // than an empty but 'foo.bar' private-tagged node in a flow collection
          // followed without whitespace by a plain string starting with a year
          // or date divided by something.
          end = PlainValue$5.Node.endOfIdentifier(src, end + 5);
        }

        props.push(new PlainValue$5.Range(offset, end));
        lineHasProps = true;
        offset = PlainValue$5.Node.endOfWhiteSpace(src, end);
      }

      ch = src[offset];
    } // '- &a : b' has an anchor on an empty node


    if (lineHasProps && ch === ':' && PlainValue$5.Node.atBlank(src, offset + 1, true)) offset -= 1;
    const type = ParseContext.parseType(src, offset, inFlow);
    return {
      props,
      type,
      valueStart: offset
    };
  }
  /**
   * Parses a node from the source
   * @param {ParseContext} overlay
   * @param {number} start - Index of first non-whitespace character for the node
   * @returns {?Node} - null if at a document boundary
   */


}

// Published as 'yaml/parse-cst'
function parse$1(src) {
  const cr = [];

  if (src.indexOf('\r') !== -1) {
    src = src.replace(/\r\n?/g, (match, offset) => {
      if (match.length > 1) cr.push(offset);
      return '\n';
    });
  }

  const documents = [];
  let offset = 0;

  do {
    const doc = new Document$3();
    const context = new ParseContext({
      src
    });
    offset = doc.parse(context, offset);
    documents.push(doc);
  } while (offset < src.length);

  documents.setOrigRanges = () => {
    if (cr.length === 0) return false;

    for (let i = 1; i < cr.length; ++i) cr[i] -= i;

    let crOffset = 0;

    for (let i = 0; i < documents.length; ++i) {
      crOffset = documents[i].setOrigRanges(cr, crOffset);
    }

    cr.splice(0, cr.length);
    return true;
  };

  documents.toString = () => documents.join('...\n');

  return documents;
}

parseCst$1.parse = parse$1;

var Document9b4560a1 = {};

var resolveSeqD03cb037 = {};

var PlainValue$4 = PlainValueEc8e588e;

function addCommentBefore(str, indent, comment) {
  if (!comment) return str;
  const cc = comment.replace(/[\s\S]^/gm, `$&${indent}#`);
  return `#${cc}\n${indent}${str}`;
}
function addComment(str, indent, comment) {
  return !comment ? str : comment.indexOf('\n') === -1 ? `${str} #${comment}` : `${str}\n` + comment.replace(/^/gm, `${indent || ''}#`);
}

class Node {}

function toJSON(value, arg, ctx) {
  if (Array.isArray(value)) return value.map((v, i) => toJSON(v, String(i), ctx));

  if (value && typeof value.toJSON === 'function') {
    const anchor = ctx && ctx.anchors && ctx.anchors.get(value);
    if (anchor) ctx.onCreate = res => {
      anchor.res = res;
      delete ctx.onCreate;
    };
    const res = value.toJSON(arg, ctx);
    if (anchor && ctx.onCreate) ctx.onCreate(res);
    return res;
  }

  if ((!ctx || !ctx.keep) && typeof value === 'bigint') return Number(value);
  return value;
}

class Scalar extends Node {
  constructor(value) {
    super();
    this.value = value;
  }

  toJSON(arg, ctx) {
    return ctx && ctx.keep ? this.value : toJSON(this.value, arg, ctx);
  }

  toString() {
    return String(this.value);
  }

}

function collectionFromPath(schema, path, value) {
  let v = value;

  for (let i = path.length - 1; i >= 0; --i) {
    const k = path[i];

    if (Number.isInteger(k) && k >= 0) {
      const a = [];
      a[k] = v;
      v = a;
    } else {
      const o = {};
      Object.defineProperty(o, k, {
        value: v,
        writable: true,
        enumerable: true,
        configurable: true
      });
      v = o;
    }
  }

  return schema.createNode(v, false);
} // null, undefined, or an empty non-string iterable (e.g. [])


const isEmptyPath = path => path == null || typeof path === 'object' && path[Symbol.iterator]().next().done;
class Collection extends Node {
  constructor(schema) {
    super();

    PlainValue$4._defineProperty(this, "items", []);

    this.schema = schema;
  }

  addIn(path, value) {
    if (isEmptyPath(path)) this.add(value);else {
      const [key, ...rest] = path;
      const node = this.get(key, true);
      if (node instanceof Collection) node.addIn(rest, value);else if (node === undefined && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
  }

  deleteIn([key, ...rest]) {
    if (rest.length === 0) return this.delete(key);
    const node = this.get(key, true);
    if (node instanceof Collection) return node.deleteIn(rest);else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
  }

  getIn([key, ...rest], keepScalar) {
    const node = this.get(key, true);
    if (rest.length === 0) return !keepScalar && node instanceof Scalar ? node.value : node;else return node instanceof Collection ? node.getIn(rest, keepScalar) : undefined;
  }

  hasAllNullValues() {
    return this.items.every(node => {
      if (!node || node.type !== 'PAIR') return false;
      const n = node.value;
      return n == null || n instanceof Scalar && n.value == null && !n.commentBefore && !n.comment && !n.tag;
    });
  }

  hasIn([key, ...rest]) {
    if (rest.length === 0) return this.has(key);
    const node = this.get(key, true);
    return node instanceof Collection ? node.hasIn(rest) : false;
  }

  setIn([key, ...rest], value) {
    if (rest.length === 0) {
      this.set(key, value);
    } else {
      const node = this.get(key, true);
      if (node instanceof Collection) node.setIn(rest, value);else if (node === undefined && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
  } // overridden in implementations

  /* istanbul ignore next */


  toJSON() {
    return null;
  }

  toString(ctx, {
    blockItem,
    flowChars,
    isMap,
    itemIndent
  }, onComment, onChompKeep) {
    const {
      indent,
      indentStep,
      stringify
    } = ctx;
    const inFlow = this.type === PlainValue$4.Type.FLOW_MAP || this.type === PlainValue$4.Type.FLOW_SEQ || ctx.inFlow;
    if (inFlow) itemIndent += indentStep;
    const allNullValues = isMap && this.hasAllNullValues();
    ctx = Object.assign({}, ctx, {
      allNullValues,
      indent: itemIndent,
      inFlow,
      type: null
    });
    let chompKeep = false;
    let hasItemWithNewLine = false;
    const nodes = this.items.reduce((nodes, item, i) => {
      let comment;

      if (item) {
        if (!chompKeep && item.spaceBefore) nodes.push({
          type: 'comment',
          str: ''
        });
        if (item.commentBefore) item.commentBefore.match(/^.*$/gm).forEach(line => {
          nodes.push({
            type: 'comment',
            str: `#${line}`
          });
        });
        if (item.comment) comment = item.comment;
        if (inFlow && (!chompKeep && item.spaceBefore || item.commentBefore || item.comment || item.key && (item.key.commentBefore || item.key.comment) || item.value && (item.value.commentBefore || item.value.comment))) hasItemWithNewLine = true;
      }

      chompKeep = false;
      let str = stringify(item, ctx, () => comment = null, () => chompKeep = true);
      if (inFlow && !hasItemWithNewLine && str.includes('\n')) hasItemWithNewLine = true;
      if (inFlow && i < this.items.length - 1) str += ',';
      str = addComment(str, itemIndent, comment);
      if (chompKeep && (comment || inFlow)) chompKeep = false;
      nodes.push({
        type: 'item',
        str
      });
      return nodes;
    }, []);
    let str;

    if (nodes.length === 0) {
      str = flowChars.start + flowChars.end;
    } else if (inFlow) {
      const {
        start,
        end
      } = flowChars;
      const strings = nodes.map(n => n.str);

      if (hasItemWithNewLine || strings.reduce((sum, str) => sum + str.length + 2, 2) > Collection.maxFlowStringSingleLineLength) {
        str = start;

        for (const s of strings) {
          str += s ? `\n${indentStep}${indent}${s}` : '\n';
        }

        str += `\n${indent}${end}`;
      } else {
        str = `${start} ${strings.join(' ')} ${end}`;
      }
    } else {
      const strings = nodes.map(blockItem);
      str = strings.shift();

      for (const s of strings) str += s ? `\n${indent}${s}` : '\n';
    }

    if (this.comment) {
      str += '\n' + this.comment.replace(/^/gm, `${indent}#`);
      if (onComment) onComment();
    } else if (chompKeep && onChompKeep) onChompKeep();

    return str;
  }

}

PlainValue$4._defineProperty(Collection, "maxFlowStringSingleLineLength", 60);

function asItemIndex(key) {
  let idx = key instanceof Scalar ? key.value : key;
  if (idx && typeof idx === 'string') idx = Number(idx);
  return Number.isInteger(idx) && idx >= 0 ? idx : null;
}

class YAMLSeq extends Collection {
  add(value) {
    this.items.push(value);
  }

  delete(key) {
    const idx = asItemIndex(key);
    if (typeof idx !== 'number') return false;
    const del = this.items.splice(idx, 1);
    return del.length > 0;
  }

  get(key, keepScalar) {
    const idx = asItemIndex(key);
    if (typeof idx !== 'number') return undefined;
    const it = this.items[idx];
    return !keepScalar && it instanceof Scalar ? it.value : it;
  }

  has(key) {
    const idx = asItemIndex(key);
    return typeof idx === 'number' && idx < this.items.length;
  }

  set(key, value) {
    const idx = asItemIndex(key);
    if (typeof idx !== 'number') throw new Error(`Expected a valid index, not ${key}.`);
    this.items[idx] = value;
  }

  toJSON(_, ctx) {
    const seq = [];
    if (ctx && ctx.onCreate) ctx.onCreate(seq);
    let i = 0;

    for (const item of this.items) seq.push(toJSON(item, String(i++), ctx));

    return seq;
  }

  toString(ctx, onComment, onChompKeep) {
    if (!ctx) return JSON.stringify(this);
    return super.toString(ctx, {
      blockItem: n => n.type === 'comment' ? n.str : `- ${n.str}`,
      flowChars: {
        start: '[',
        end: ']'
      },
      isMap: false,
      itemIndent: (ctx.indent || '') + '  '
    }, onComment, onChompKeep);
  }

}

const stringifyKey = (key, jsKey, ctx) => {
  if (jsKey === null) return '';
  if (typeof jsKey !== 'object') return String(jsKey);
  if (key instanceof Node && ctx && ctx.doc) return key.toString({
    anchors: Object.create(null),
    doc: ctx.doc,
    indent: '',
    indentStep: ctx.indentStep,
    inFlow: true,
    inStringifyKey: true,
    stringify: ctx.stringify
  });
  return JSON.stringify(jsKey);
};

class Pair extends Node {
  constructor(key, value = null) {
    super();
    this.key = key;
    this.value = value;
    this.type = Pair.Type.PAIR;
  }

  get commentBefore() {
    return this.key instanceof Node ? this.key.commentBefore : undefined;
  }

  set commentBefore(cb) {
    if (this.key == null) this.key = new Scalar(null);
    if (this.key instanceof Node) this.key.commentBefore = cb;else {
      const msg = 'Pair.commentBefore is an alias for Pair.key.commentBefore. To set it, the key must be a Node.';
      throw new Error(msg);
    }
  }

  addToJSMap(ctx, map) {
    const key = toJSON(this.key, '', ctx);

    if (map instanceof Map) {
      const value = toJSON(this.value, key, ctx);
      map.set(key, value);
    } else if (map instanceof Set) {
      map.add(key);
    } else {
      const stringKey = stringifyKey(this.key, key, ctx);
      const value = toJSON(this.value, stringKey, ctx);
      if (stringKey in map) Object.defineProperty(map, stringKey, {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      });else map[stringKey] = value;
    }

    return map;
  }

  toJSON(_, ctx) {
    const pair = ctx && ctx.mapAsMap ? new Map() : {};
    return this.addToJSMap(ctx, pair);
  }

  toString(ctx, onComment, onChompKeep) {
    if (!ctx || !ctx.doc) return JSON.stringify(this);
    const {
      indent: indentSize,
      indentSeq,
      simpleKeys
    } = ctx.doc.options;
    let {
      key,
      value
    } = this;
    let keyComment = key instanceof Node && key.comment;

    if (simpleKeys) {
      if (keyComment) {
        throw new Error('With simple keys, key nodes cannot have comments');
      }

      if (key instanceof Collection) {
        const msg = 'With simple keys, collection cannot be used as a key value';
        throw new Error(msg);
      }
    }

    let explicitKey = !simpleKeys && (!key || keyComment || (key instanceof Node ? key instanceof Collection || key.type === PlainValue$4.Type.BLOCK_FOLDED || key.type === PlainValue$4.Type.BLOCK_LITERAL : typeof key === 'object'));
    const {
      doc,
      indent,
      indentStep,
      stringify
    } = ctx;
    ctx = Object.assign({}, ctx, {
      implicitKey: !explicitKey,
      indent: indent + indentStep
    });
    let chompKeep = false;
    let str = stringify(key, ctx, () => keyComment = null, () => chompKeep = true);
    str = addComment(str, ctx.indent, keyComment);

    if (!explicitKey && str.length > 1024) {
      if (simpleKeys) throw new Error('With simple keys, single line scalar must not span more than 1024 characters');
      explicitKey = true;
    }

    if (ctx.allNullValues && !simpleKeys) {
      if (this.comment) {
        str = addComment(str, ctx.indent, this.comment);
        if (onComment) onComment();
      } else if (chompKeep && !keyComment && onChompKeep) onChompKeep();

      return ctx.inFlow && !explicitKey ? str : `? ${str}`;
    }

    str = explicitKey ? `? ${str}\n${indent}:` : `${str}:`;

    if (this.comment) {
      // expected (but not strictly required) to be a single-line comment
      str = addComment(str, ctx.indent, this.comment);
      if (onComment) onComment();
    }

    let vcb = '';
    let valueComment = null;

    if (value instanceof Node) {
      if (value.spaceBefore) vcb = '\n';

      if (value.commentBefore) {
        const cs = value.commentBefore.replace(/^/gm, `${ctx.indent}#`);
        vcb += `\n${cs}`;
      }

      valueComment = value.comment;
    } else if (value && typeof value === 'object') {
      value = doc.schema.createNode(value, true);
    }

    ctx.implicitKey = false;
    if (!explicitKey && !this.comment && value instanceof Scalar) ctx.indentAtStart = str.length + 1;
    chompKeep = false;

    if (!indentSeq && indentSize >= 2 && !ctx.inFlow && !explicitKey && value instanceof YAMLSeq && value.type !== PlainValue$4.Type.FLOW_SEQ && !value.tag && !doc.anchors.getName(value)) {
      // If indentSeq === false, consider '- ' as part of indentation where possible
      ctx.indent = ctx.indent.substr(2);
    }

    const valueStr = stringify(value, ctx, () => valueComment = null, () => chompKeep = true);
    let ws = ' ';

    if (vcb || this.comment) {
      ws = `${vcb}\n${ctx.indent}`;
    } else if (!explicitKey && value instanceof Collection) {
      const flow = valueStr[0] === '[' || valueStr[0] === '{';
      if (!flow || valueStr.includes('\n')) ws = `\n${ctx.indent}`;
    } else if (valueStr[0] === '\n') ws = '';

    if (chompKeep && !valueComment && onChompKeep) onChompKeep();
    return addComment(str + ws + valueStr, ctx.indent, valueComment);
  }

}

PlainValue$4._defineProperty(Pair, "Type", {
  PAIR: 'PAIR',
  MERGE_PAIR: 'MERGE_PAIR'
});

const getAliasCount = (node, anchors) => {
  if (node instanceof Alias) {
    const anchor = anchors.get(node.source);
    return anchor.count * anchor.aliasCount;
  } else if (node instanceof Collection) {
    let count = 0;

    for (const item of node.items) {
      const c = getAliasCount(item, anchors);
      if (c > count) count = c;
    }

    return count;
  } else if (node instanceof Pair) {
    const kc = getAliasCount(node.key, anchors);
    const vc = getAliasCount(node.value, anchors);
    return Math.max(kc, vc);
  }

  return 1;
};

class Alias extends Node {
  static stringify({
    range,
    source
  }, {
    anchors,
    doc,
    implicitKey,
    inStringifyKey
  }) {
    let anchor = Object.keys(anchors).find(a => anchors[a] === source);
    if (!anchor && inStringifyKey) anchor = doc.anchors.getName(source) || doc.anchors.newName();
    if (anchor) return `*${anchor}${implicitKey ? ' ' : ''}`;
    const msg = doc.anchors.getName(source) ? 'Alias node must be after source node' : 'Source node not found for alias node';
    throw new Error(`${msg} [${range}]`);
  }

  constructor(source) {
    super();
    this.source = source;
    this.type = PlainValue$4.Type.ALIAS;
  }

  set tag(t) {
    throw new Error('Alias nodes cannot have tags');
  }

  toJSON(arg, ctx) {
    if (!ctx) return toJSON(this.source, arg, ctx);
    const {
      anchors,
      maxAliasCount
    } = ctx;
    const anchor = anchors.get(this.source);
    /* istanbul ignore if */

    if (!anchor || anchor.res === undefined) {
      const msg = 'This should not happen: Alias anchor was not resolved?';
      if (this.cstNode) throw new PlainValue$4.YAMLReferenceError(this.cstNode, msg);else throw new ReferenceError(msg);
    }

    if (maxAliasCount >= 0) {
      anchor.count += 1;
      if (anchor.aliasCount === 0) anchor.aliasCount = getAliasCount(this.source, anchors);

      if (anchor.count * anchor.aliasCount > maxAliasCount) {
        const msg = 'Excessive alias count indicates a resource exhaustion attack';
        if (this.cstNode) throw new PlainValue$4.YAMLReferenceError(this.cstNode, msg);else throw new ReferenceError(msg);
      }
    }

    return anchor.res;
  } // Only called when stringifying an alias mapping key while constructing
  // Object output.


  toString(ctx) {
    return Alias.stringify(this, ctx);
  }

}

PlainValue$4._defineProperty(Alias, "default", true);

function findPair(items, key) {
  const k = key instanceof Scalar ? key.value : key;

  for (const it of items) {
    if (it instanceof Pair) {
      if (it.key === key || it.key === k) return it;
      if (it.key && it.key.value === k) return it;
    }
  }

  return undefined;
}
class YAMLMap extends Collection {
  add(pair, overwrite) {
    if (!pair) pair = new Pair(pair);else if (!(pair instanceof Pair)) pair = new Pair(pair.key || pair, pair.value);
    const prev = findPair(this.items, pair.key);
    const sortEntries = this.schema && this.schema.sortMapEntries;

    if (prev) {
      if (overwrite) prev.value = pair.value;else throw new Error(`Key ${pair.key} already set`);
    } else if (sortEntries) {
      const i = this.items.findIndex(item => sortEntries(pair, item) < 0);
      if (i === -1) this.items.push(pair);else this.items.splice(i, 0, pair);
    } else {
      this.items.push(pair);
    }
  }

  delete(key) {
    const it = findPair(this.items, key);
    if (!it) return false;
    const del = this.items.splice(this.items.indexOf(it), 1);
    return del.length > 0;
  }

  get(key, keepScalar) {
    const it = findPair(this.items, key);
    const node = it && it.value;
    return !keepScalar && node instanceof Scalar ? node.value : node;
  }

  has(key) {
    return !!findPair(this.items, key);
  }

  set(key, value) {
    this.add(new Pair(key, value), true);
  }
  /**
   * @param {*} arg ignored
   * @param {*} ctx Conversion context, originally set in Document#toJSON()
   * @param {Class} Type If set, forces the returned collection type
   * @returns {*} Instance of Type, Map, or Object
   */


  toJSON(_, ctx, Type) {
    const map = Type ? new Type() : ctx && ctx.mapAsMap ? new Map() : {};
    if (ctx && ctx.onCreate) ctx.onCreate(map);

    for (const item of this.items) item.addToJSMap(ctx, map);

    return map;
  }

  toString(ctx, onComment, onChompKeep) {
    if (!ctx) return JSON.stringify(this);

    for (const item of this.items) {
      if (!(item instanceof Pair)) throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
    }

    return super.toString(ctx, {
      blockItem: n => n.str,
      flowChars: {
        start: '{',
        end: '}'
      },
      isMap: true,
      itemIndent: ctx.indent || ''
    }, onComment, onChompKeep);
  }

}

const MERGE_KEY = '<<';
class Merge extends Pair {
  constructor(pair) {
    if (pair instanceof Pair) {
      let seq = pair.value;

      if (!(seq instanceof YAMLSeq)) {
        seq = new YAMLSeq();
        seq.items.push(pair.value);
        seq.range = pair.value.range;
      }

      super(pair.key, seq);
      this.range = pair.range;
    } else {
      super(new Scalar(MERGE_KEY), new YAMLSeq());
    }

    this.type = Pair.Type.MERGE_PAIR;
  } // If the value associated with a merge key is a single mapping node, each of
  // its key/value pairs is inserted into the current mapping, unless the key
  // already exists in it. If the value associated with the merge key is a
  // sequence, then this sequence is expected to contain mapping nodes and each
  // of these nodes is merged in turn according to its order in the sequence.
  // Keys in mapping nodes earlier in the sequence override keys specified in
  // later mapping nodes. -- http://yaml.org/type/merge.html


  addToJSMap(ctx, map) {
    for (const {
      source
    } of this.value.items) {
      if (!(source instanceof YAMLMap)) throw new Error('Merge sources must be maps');
      const srcMap = source.toJSON(null, ctx, Map);

      for (const [key, value] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key)) map.set(key, value);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
    }

    return map;
  }

  toString(ctx, onComment) {
    const seq = this.value;
    if (seq.items.length > 1) return super.toString(ctx, onComment);
    this.value = seq.items[0];
    const str = super.toString(ctx, onComment);
    this.value = seq;
    return str;
  }

}

const binaryOptions = {
  defaultType: PlainValue$4.Type.BLOCK_LITERAL,
  lineWidth: 76
};
const boolOptions = {
  trueStr: 'true',
  falseStr: 'false'
};
const intOptions = {
  asBigInt: false
};
const nullOptions = {
  nullStr: 'null'
};
const strOptions = {
  defaultType: PlainValue$4.Type.PLAIN,
  doubleQuoted: {
    jsonEncoding: false,
    minMultiLineLength: 40
  },
  fold: {
    lineWidth: 80,
    minContentWidth: 20
  }
};

function resolveScalar(str, tags, scalarFallback) {
  for (const {
    format,
    test,
    resolve
  } of tags) {
    if (test) {
      const match = str.match(test);

      if (match) {
        let res = resolve.apply(null, match);
        if (!(res instanceof Scalar)) res = new Scalar(res);
        if (format) res.format = format;
        return res;
      }
    }
  }

  if (scalarFallback) str = scalarFallback(str);
  return new Scalar(str);
}

const FOLD_FLOW = 'flow';
const FOLD_BLOCK = 'block';
const FOLD_QUOTED = 'quoted'; // presumes i+1 is at the start of a line
// returns index of last newline in more-indented block

const consumeMoreIndentedLines = (text, i) => {
  let ch = text[i + 1];

  while (ch === ' ' || ch === '\t') {
    do {
      ch = text[i += 1];
    } while (ch && ch !== '\n');

    ch = text[i + 1];
  }

  return i;
};
/**
 * Tries to keep input at up to `lineWidth` characters, splitting only on spaces
 * not followed by newlines or spaces unless `mode` is `'quoted'`. Lines are
 * terminated with `\n` and started with `indent`.
 *
 * @param {string} text
 * @param {string} indent
 * @param {string} [mode='flow'] `'block'` prevents more-indented lines
 *   from being folded; `'quoted'` allows for `\` escapes, including escaped
 *   newlines
 * @param {Object} options
 * @param {number} [options.indentAtStart] Accounts for leading contents on
 *   the first line, defaulting to `indent.length`
 * @param {number} [options.lineWidth=80]
 * @param {number} [options.minContentWidth=20] Allow highly indented lines to
 *   stretch the line width or indent content from the start
 * @param {function} options.onFold Called once if the text is folded
 * @param {function} options.onFold Called once if any line of text exceeds
 *   lineWidth characters
 */


function foldFlowLines(text, indent, mode, {
  indentAtStart,
  lineWidth = 80,
  minContentWidth = 20,
  onFold,
  onOverflow
}) {
  if (!lineWidth || lineWidth < 0) return text;
  const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
  if (text.length <= endStep) return text;
  const folds = [];
  const escapedFolds = {};
  let end = lineWidth - indent.length;

  if (typeof indentAtStart === 'number') {
    if (indentAtStart > lineWidth - Math.max(2, minContentWidth)) folds.push(0);else end = lineWidth - indentAtStart;
  }

  let split = undefined;
  let prev = undefined;
  let overflow = false;
  let i = -1;
  let escStart = -1;
  let escEnd = -1;

  if (mode === FOLD_BLOCK) {
    i = consumeMoreIndentedLines(text, i);
    if (i !== -1) end = i + endStep;
  }

  for (let ch; ch = text[i += 1];) {
    if (mode === FOLD_QUOTED && ch === '\\') {
      escStart = i;

      switch (text[i + 1]) {
        case 'x':
          i += 3;
          break;

        case 'u':
          i += 5;
          break;

        case 'U':
          i += 9;
          break;

        default:
          i += 1;
      }

      escEnd = i;
    }

    if (ch === '\n') {
      if (mode === FOLD_BLOCK) i = consumeMoreIndentedLines(text, i);
      end = i + endStep;
      split = undefined;
    } else {
      if (ch === ' ' && prev && prev !== ' ' && prev !== '\n' && prev !== '\t') {
        // space surrounded by non-space can be replaced with newline + indent
        const next = text[i + 1];
        if (next && next !== ' ' && next !== '\n' && next !== '\t') split = i;
      }

      if (i >= end) {
        if (split) {
          folds.push(split);
          end = split + endStep;
          split = undefined;
        } else if (mode === FOLD_QUOTED) {
          // white-space collected at end may stretch past lineWidth
          while (prev === ' ' || prev === '\t') {
            prev = ch;
            ch = text[i += 1];
            overflow = true;
          } // Account for newline escape, but don't break preceding escape


          const j = i > escEnd + 1 ? i - 2 : escStart - 1; // Bail out if lineWidth & minContentWidth are shorter than an escape string

          if (escapedFolds[j]) return text;
          folds.push(j);
          escapedFolds[j] = true;
          end = j + endStep;
          split = undefined;
        } else {
          overflow = true;
        }
      }
    }

    prev = ch;
  }

  if (overflow && onOverflow) onOverflow();
  if (folds.length === 0) return text;
  if (onFold) onFold();
  let res = text.slice(0, folds[0]);

  for (let i = 0; i < folds.length; ++i) {
    const fold = folds[i];
    const end = folds[i + 1] || text.length;
    if (fold === 0) res = `\n${indent}${text.slice(0, end)}`;else {
      if (mode === FOLD_QUOTED && escapedFolds[fold]) res += `${text[fold]}\\`;
      res += `\n${indent}${text.slice(fold + 1, end)}`;
    }
  }

  return res;
}

const getFoldOptions = ({
  indentAtStart
}) => indentAtStart ? Object.assign({
  indentAtStart
}, strOptions.fold) : strOptions.fold; // Also checks for lines starting with %, as parsing the output as YAML 1.1 will
// presume that's starting a new document.


const containsDocumentMarker = str => /^(%|---|\.\.\.)/m.test(str);

function lineLengthOverLimit(str, lineWidth, indentLength) {
  if (!lineWidth || lineWidth < 0) return false;
  const limit = lineWidth - indentLength;
  const strLen = str.length;
  if (strLen <= limit) return false;

  for (let i = 0, start = 0; i < strLen; ++i) {
    if (str[i] === '\n') {
      if (i - start > limit) return true;
      start = i + 1;
      if (strLen - start <= limit) return false;
    }
  }

  return true;
}

function doubleQuotedString(value, ctx) {
  const {
    implicitKey
  } = ctx;
  const {
    jsonEncoding,
    minMultiLineLength
  } = strOptions.doubleQuoted;
  const json = JSON.stringify(value);
  if (jsonEncoding) return json;
  const indent = ctx.indent || (containsDocumentMarker(value) ? '  ' : '');
  let str = '';
  let start = 0;

  for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
    if (ch === ' ' && json[i + 1] === '\\' && json[i + 2] === 'n') {
      // space before newline needs to be escaped to not be folded
      str += json.slice(start, i) + '\\ ';
      i += 1;
      start = i;
      ch = '\\';
    }

    if (ch === '\\') switch (json[i + 1]) {
      case 'u':
        {
          str += json.slice(start, i);
          const code = json.substr(i + 2, 4);

          switch (code) {
            case '0000':
              str += '\\0';
              break;

            case '0007':
              str += '\\a';
              break;

            case '000b':
              str += '\\v';
              break;

            case '001b':
              str += '\\e';
              break;

            case '0085':
              str += '\\N';
              break;

            case '00a0':
              str += '\\_';
              break;

            case '2028':
              str += '\\L';
              break;

            case '2029':
              str += '\\P';
              break;

            default:
              if (code.substr(0, 2) === '00') str += '\\x' + code.substr(2);else str += json.substr(i, 6);
          }

          i += 5;
          start = i + 1;
        }
        break;

      case 'n':
        if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
          i += 1;
        } else {
          // folding will eat first newline
          str += json.slice(start, i) + '\n\n';

          while (json[i + 2] === '\\' && json[i + 3] === 'n' && json[i + 4] !== '"') {
            str += '\n';
            i += 2;
          }

          str += indent; // space after newline needs to be escaped to not be folded

          if (json[i + 2] === ' ') str += '\\';
          i += 1;
          start = i + 1;
        }

        break;

      default:
        i += 1;
    }
  }

  str = start ? str + json.slice(start) : json;
  return implicitKey ? str : foldFlowLines(str, indent, FOLD_QUOTED, getFoldOptions(ctx));
}

function singleQuotedString(value, ctx) {
  if (ctx.implicitKey) {
    if (/\n/.test(value)) return doubleQuotedString(value, ctx);
  } else {
    // single quoted string can't have leading or trailing whitespace around newline
    if (/[ \t]\n|\n[ \t]/.test(value)) return doubleQuotedString(value, ctx);
  }

  const indent = ctx.indent || (containsDocumentMarker(value) ? '  ' : '');
  const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&\n${indent}`) + "'";
  return ctx.implicitKey ? res : foldFlowLines(res, indent, FOLD_FLOW, getFoldOptions(ctx));
}

function blockString({
  comment,
  type,
  value
}, ctx, onComment, onChompKeep) {
  // 1. Block can't end in whitespace unless the last line is non-empty.
  // 2. Strings consisting of only whitespace are best rendered explicitly.
  if (/\n[\t ]+$/.test(value) || /^\s*$/.test(value)) {
    return doubleQuotedString(value, ctx);
  }

  const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? '  ' : '');
  const indentSize = indent ? '2' : '1'; // root is at -1

  const literal = type === PlainValue$4.Type.BLOCK_FOLDED ? false : type === PlainValue$4.Type.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, strOptions.fold.lineWidth, indent.length);
  let header = literal ? '|' : '>';
  if (!value) return header + '\n';
  let wsStart = '';
  let wsEnd = '';
  value = value.replace(/[\n\t ]*$/, ws => {
    const n = ws.indexOf('\n');

    if (n === -1) {
      header += '-'; // strip
    } else if (value === ws || n !== ws.length - 1) {
      header += '+'; // keep

      if (onChompKeep) onChompKeep();
    }

    wsEnd = ws.replace(/\n$/, '');
    return '';
  }).replace(/^[\n ]*/, ws => {
    if (ws.indexOf(' ') !== -1) header += indentSize;
    const m = ws.match(/ +$/);

    if (m) {
      wsStart = ws.slice(0, -m[0].length);
      return m[0];
    } else {
      wsStart = ws;
      return '';
    }
  });
  if (wsEnd) wsEnd = wsEnd.replace(/\n+(?!\n|$)/g, `$&${indent}`);
  if (wsStart) wsStart = wsStart.replace(/\n+/g, `$&${indent}`);

  if (comment) {
    header += ' #' + comment.replace(/ ?[\r\n]+/g, ' ');
    if (onComment) onComment();
  }

  if (!value) return `${header}${indentSize}\n${indent}${wsEnd}`;

  if (literal) {
    value = value.replace(/\n+/g, `$&${indent}`);
    return `${header}\n${indent}${wsStart}${value}${wsEnd}`;
  }

  value = value.replace(/\n+/g, '\n$&').replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, '$1$2') // more-indented lines aren't folded
  //         ^ ind.line  ^ empty     ^ capture next empty lines only at end of indent
  .replace(/\n+/g, `$&${indent}`);
  const body = foldFlowLines(`${wsStart}${value}${wsEnd}`, indent, FOLD_BLOCK, strOptions.fold);
  return `${header}\n${indent}${body}`;
}

function plainString(item, ctx, onComment, onChompKeep) {
  const {
    comment,
    type,
    value
  } = item;
  const {
    actualString,
    implicitKey,
    indent,
    inFlow
  } = ctx;

  if (implicitKey && /[\n[\]{},]/.test(value) || inFlow && /[[\]{},]/.test(value)) {
    return doubleQuotedString(value, ctx);
  }

  if (!value || /^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
    // not allowed:
    // - empty string, '-' or '?'
    // - start with an indicator character (except [?:-]) or /[?-] /
    // - '\n ', ': ' or ' \n' anywhere
    // - '#' not preceded by a non-space char
    // - end with ' ' or ':'
    return implicitKey || inFlow || value.indexOf('\n') === -1 ? value.indexOf('"') !== -1 && value.indexOf("'") === -1 ? singleQuotedString(value, ctx) : doubleQuotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
  }

  if (!implicitKey && !inFlow && type !== PlainValue$4.Type.PLAIN && value.indexOf('\n') !== -1) {
    // Where allowed & type not set explicitly, prefer block style for multiline strings
    return blockString(item, ctx, onComment, onChompKeep);
  }

  if (indent === '' && containsDocumentMarker(value)) {
    ctx.forceBlockIndent = true;
    return blockString(item, ctx, onComment, onChompKeep);
  }

  const str = value.replace(/\n+/g, `$&\n${indent}`); // Verify that output will be parsed as a string, as e.g. plain numbers and
  // booleans get parsed with those types in v1.2 (e.g. '42', 'true' & '0.9e-3'),
  // and others in v1.1.

  if (actualString) {
    const {
      tags
    } = ctx.doc.schema;
    const resolved = resolveScalar(str, tags, tags.scalarFallback).value;
    if (typeof resolved !== 'string') return doubleQuotedString(value, ctx);
  }

  const body = implicitKey ? str : foldFlowLines(str, indent, FOLD_FLOW, getFoldOptions(ctx));

  if (comment && !inFlow && (body.indexOf('\n') !== -1 || comment.indexOf('\n') !== -1)) {
    if (onComment) onComment();
    return addCommentBefore(body, indent, comment);
  }

  return body;
}

function stringifyString(item, ctx, onComment, onChompKeep) {
  const {
    defaultType
  } = strOptions;
  const {
    implicitKey,
    inFlow
  } = ctx;
  let {
    type,
    value
  } = item;

  if (typeof value !== 'string') {
    value = String(value);
    item = Object.assign({}, item, {
      value
    });
  }

  const _stringify = _type => {
    switch (_type) {
      case PlainValue$4.Type.BLOCK_FOLDED:
      case PlainValue$4.Type.BLOCK_LITERAL:
        return blockString(item, ctx, onComment, onChompKeep);

      case PlainValue$4.Type.QUOTE_DOUBLE:
        return doubleQuotedString(value, ctx);

      case PlainValue$4.Type.QUOTE_SINGLE:
        return singleQuotedString(value, ctx);

      case PlainValue$4.Type.PLAIN:
        return plainString(item, ctx, onComment, onChompKeep);

      default:
        return null;
    }
  };

  if (type !== PlainValue$4.Type.QUOTE_DOUBLE && /[\x00-\x08\x0b-\x1f\x7f-\x9f]/.test(value)) {
    // force double quotes on control characters
    type = PlainValue$4.Type.QUOTE_DOUBLE;
  } else if ((implicitKey || inFlow) && (type === PlainValue$4.Type.BLOCK_FOLDED || type === PlainValue$4.Type.BLOCK_LITERAL)) {
    // should not happen; blocks are not valid inside flow containers
    type = PlainValue$4.Type.QUOTE_DOUBLE;
  }

  let res = _stringify(type);

  if (res === null) {
    res = _stringify(defaultType);
    if (res === null) throw new Error(`Unsupported default string type ${defaultType}`);
  }

  return res;
}

function stringifyNumber({
  format,
  minFractionDigits,
  tag,
  value
}) {
  if (typeof value === 'bigint') return String(value);
  if (!isFinite(value)) return isNaN(value) ? '.nan' : value < 0 ? '-.inf' : '.inf';
  let n = JSON.stringify(value);

  if (!format && minFractionDigits && (!tag || tag === 'tag:yaml.org,2002:float') && /^\d/.test(n)) {
    let i = n.indexOf('.');

    if (i < 0) {
      i = n.length;
      n += '.';
    }

    let d = minFractionDigits - (n.length - i - 1);

    while (d-- > 0) n += '0';
  }

  return n;
}

function checkFlowCollectionEnd(errors, cst) {
  let char, name;

  switch (cst.type) {
    case PlainValue$4.Type.FLOW_MAP:
      char = '}';
      name = 'flow map';
      break;

    case PlainValue$4.Type.FLOW_SEQ:
      char = ']';
      name = 'flow sequence';
      break;

    default:
      errors.push(new PlainValue$4.YAMLSemanticError(cst, 'Not a flow collection!?'));
      return;
  }

  let lastItem;

  for (let i = cst.items.length - 1; i >= 0; --i) {
    const item = cst.items[i];

    if (!item || item.type !== PlainValue$4.Type.COMMENT) {
      lastItem = item;
      break;
    }
  }

  if (lastItem && lastItem.char !== char) {
    const msg = `Expected ${name} to end with ${char}`;
    let err;

    if (typeof lastItem.offset === 'number') {
      err = new PlainValue$4.YAMLSemanticError(cst, msg);
      err.offset = lastItem.offset + 1;
    } else {
      err = new PlainValue$4.YAMLSemanticError(lastItem, msg);
      if (lastItem.range && lastItem.range.end) err.offset = lastItem.range.end - lastItem.range.start;
    }

    errors.push(err);
  }
}
function checkFlowCommentSpace(errors, comment) {
  const prev = comment.context.src[comment.range.start - 1];

  if (prev !== '\n' && prev !== '\t' && prev !== ' ') {
    const msg = 'Comments must be separated from other tokens by white space characters';
    errors.push(new PlainValue$4.YAMLSemanticError(comment, msg));
  }
}
function getLongKeyError(source, key) {
  const sk = String(key);
  const k = sk.substr(0, 8) + '...' + sk.substr(-8);
  return new PlainValue$4.YAMLSemanticError(source, `The "${k}" key is too long`);
}
function resolveComments(collection, comments) {
  for (const {
    afterKey,
    before,
    comment
  } of comments) {
    let item = collection.items[before];

    if (!item) {
      if (comment !== undefined) {
        if (collection.comment) collection.comment += '\n' + comment;else collection.comment = comment;
      }
    } else {
      if (afterKey && item.value) item = item.value;

      if (comment === undefined) {
        if (afterKey || !item.commentBefore) item.spaceBefore = true;
      } else {
        if (item.commentBefore) item.commentBefore += '\n' + comment;else item.commentBefore = comment;
      }
    }
  }
}

// on error, will return { str: string, errors: Error[] }
function resolveString(doc, node) {
  const res = node.strValue;
  if (!res) return '';
  if (typeof res === 'string') return res;
  res.errors.forEach(error => {
    if (!error.source) error.source = node;
    doc.errors.push(error);
  });
  return res.str;
}

function resolveTagHandle(doc, node) {
  const {
    handle,
    suffix
  } = node.tag;
  let prefix = doc.tagPrefixes.find(p => p.handle === handle);

  if (!prefix) {
    const dtp = doc.getDefaults().tagPrefixes;
    if (dtp) prefix = dtp.find(p => p.handle === handle);
    if (!prefix) throw new PlainValue$4.YAMLSemanticError(node, `The ${handle} tag handle is non-default and was not declared.`);
  }

  if (!suffix) throw new PlainValue$4.YAMLSemanticError(node, `The ${handle} tag has no suffix.`);

  if (handle === '!' && (doc.version || doc.options.version) === '1.0') {
    if (suffix[0] === '^') {
      doc.warnings.push(new PlainValue$4.YAMLWarning(node, 'YAML 1.0 ^ tag expansion is not supported'));
      return suffix;
    }

    if (/[:/]/.test(suffix)) {
      // word/foo -> tag:word.yaml.org,2002:foo
      const vocab = suffix.match(/^([a-z0-9-]+)\/(.*)/i);
      return vocab ? `tag:${vocab[1]}.yaml.org,2002:${vocab[2]}` : `tag:${suffix}`;
    }
  }

  return prefix.prefix + decodeURIComponent(suffix);
}

function resolveTagName(doc, node) {
  const {
    tag,
    type
  } = node;
  let nonSpecific = false;

  if (tag) {
    const {
      handle,
      suffix,
      verbatim
    } = tag;

    if (verbatim) {
      if (verbatim !== '!' && verbatim !== '!!') return verbatim;
      const msg = `Verbatim tags aren't resolved, so ${verbatim} is invalid.`;
      doc.errors.push(new PlainValue$4.YAMLSemanticError(node, msg));
    } else if (handle === '!' && !suffix) {
      nonSpecific = true;
    } else {
      try {
        return resolveTagHandle(doc, node);
      } catch (error) {
        doc.errors.push(error);
      }
    }
  }

  switch (type) {
    case PlainValue$4.Type.BLOCK_FOLDED:
    case PlainValue$4.Type.BLOCK_LITERAL:
    case PlainValue$4.Type.QUOTE_DOUBLE:
    case PlainValue$4.Type.QUOTE_SINGLE:
      return PlainValue$4.defaultTags.STR;

    case PlainValue$4.Type.FLOW_MAP:
    case PlainValue$4.Type.MAP:
      return PlainValue$4.defaultTags.MAP;

    case PlainValue$4.Type.FLOW_SEQ:
    case PlainValue$4.Type.SEQ:
      return PlainValue$4.defaultTags.SEQ;

    case PlainValue$4.Type.PLAIN:
      return nonSpecific ? PlainValue$4.defaultTags.STR : null;

    default:
      return null;
  }
}

function resolveByTagName(doc, node, tagName) {
  const {
    tags
  } = doc.schema;
  const matchWithTest = [];

  for (const tag of tags) {
    if (tag.tag === tagName) {
      if (tag.test) matchWithTest.push(tag);else {
        const res = tag.resolve(doc, node);
        return res instanceof Collection ? res : new Scalar(res);
      }
    }
  }

  const str = resolveString(doc, node);
  if (typeof str === 'string' && matchWithTest.length > 0) return resolveScalar(str, matchWithTest, tags.scalarFallback);
  return null;
}

function getFallbackTagName({
  type
}) {
  switch (type) {
    case PlainValue$4.Type.FLOW_MAP:
    case PlainValue$4.Type.MAP:
      return PlainValue$4.defaultTags.MAP;

    case PlainValue$4.Type.FLOW_SEQ:
    case PlainValue$4.Type.SEQ:
      return PlainValue$4.defaultTags.SEQ;

    default:
      return PlainValue$4.defaultTags.STR;
  }
}

function resolveTag(doc, node, tagName) {
  try {
    const res = resolveByTagName(doc, node, tagName);

    if (res) {
      if (tagName && node.tag) res.tag = tagName;
      return res;
    }
  } catch (error) {
    /* istanbul ignore if */
    if (!error.source) error.source = node;
    doc.errors.push(error);
    return null;
  }

  try {
    const fallback = getFallbackTagName(node);
    if (!fallback) throw new Error(`The tag ${tagName} is unavailable`);
    const msg = `The tag ${tagName} is unavailable, falling back to ${fallback}`;
    doc.warnings.push(new PlainValue$4.YAMLWarning(node, msg));
    const res = resolveByTagName(doc, node, fallback);
    res.tag = tagName;
    return res;
  } catch (error) {
    const refError = new PlainValue$4.YAMLReferenceError(node, error.message);
    refError.stack = error.stack;
    doc.errors.push(refError);
    return null;
  }
}

const isCollectionItem = node => {
  if (!node) return false;
  const {
    type
  } = node;
  return type === PlainValue$4.Type.MAP_KEY || type === PlainValue$4.Type.MAP_VALUE || type === PlainValue$4.Type.SEQ_ITEM;
};

function resolveNodeProps(errors, node) {
  const comments = {
    before: [],
    after: []
  };
  let hasAnchor = false;
  let hasTag = false;
  const props = isCollectionItem(node.context.parent) ? node.context.parent.props.concat(node.props) : node.props;

  for (const {
    start,
    end
  } of props) {
    switch (node.context.src[start]) {
      case PlainValue$4.Char.COMMENT:
        {
          if (!node.commentHasRequiredWhitespace(start)) {
            const msg = 'Comments must be separated from other tokens by white space characters';
            errors.push(new PlainValue$4.YAMLSemanticError(node, msg));
          }

          const {
            header,
            valueRange
          } = node;
          const cc = valueRange && (start > valueRange.start || header && start > header.start) ? comments.after : comments.before;
          cc.push(node.context.src.slice(start + 1, end));
          break;
        }
      // Actual anchor & tag resolution is handled by schema, here we just complain

      case PlainValue$4.Char.ANCHOR:
        if (hasAnchor) {
          const msg = 'A node can have at most one anchor';
          errors.push(new PlainValue$4.YAMLSemanticError(node, msg));
        }

        hasAnchor = true;
        break;

      case PlainValue$4.Char.TAG:
        if (hasTag) {
          const msg = 'A node can have at most one tag';
          errors.push(new PlainValue$4.YAMLSemanticError(node, msg));
        }

        hasTag = true;
        break;
    }
  }

  return {
    comments,
    hasAnchor,
    hasTag
  };
}

function resolveNodeValue(doc, node) {
  const {
    anchors,
    errors,
    schema
  } = doc;

  if (node.type === PlainValue$4.Type.ALIAS) {
    const name = node.rawValue;
    const src = anchors.getNode(name);

    if (!src) {
      const msg = `Aliased anchor not found: ${name}`;
      errors.push(new PlainValue$4.YAMLReferenceError(node, msg));
      return null;
    } // Lazy resolution for circular references


    const res = new Alias(src);

    anchors._cstAliases.push(res);

    return res;
  }

  const tagName = resolveTagName(doc, node);
  if (tagName) return resolveTag(doc, node, tagName);

  if (node.type !== PlainValue$4.Type.PLAIN) {
    const msg = `Failed to resolve ${node.type} node here`;
    errors.push(new PlainValue$4.YAMLSyntaxError(node, msg));
    return null;
  }

  try {
    const str = resolveString(doc, node);
    return resolveScalar(str, schema.tags, schema.tags.scalarFallback);
  } catch (error) {
    if (!error.source) error.source = node;
    errors.push(error);
    return null;
  }
} // sets node.resolved on success


function resolveNode(doc, node) {
  if (!node) return null;
  if (node.error) doc.errors.push(node.error);
  const {
    comments,
    hasAnchor,
    hasTag
  } = resolveNodeProps(doc.errors, node);

  if (hasAnchor) {
    const {
      anchors
    } = doc;
    const name = node.anchor;
    const prev = anchors.getNode(name); // At this point, aliases for any preceding node with the same anchor
    // name have already been resolved, so it may safely be renamed.

    if (prev) anchors.map[anchors.newName(name)] = prev; // During parsing, we need to store the CST node in anchors.map as
    // anchors need to be available during resolution to allow for
    // circular references.

    anchors.map[name] = node;
  }

  if (node.type === PlainValue$4.Type.ALIAS && (hasAnchor || hasTag)) {
    const msg = 'An alias node must not specify any properties';
    doc.errors.push(new PlainValue$4.YAMLSemanticError(node, msg));
  }

  const res = resolveNodeValue(doc, node);

  if (res) {
    res.range = [node.range.start, node.range.end];
    if (doc.options.keepCstNodes) res.cstNode = node;
    if (doc.options.keepNodeTypes) res.type = node.type;
    const cb = comments.before.join('\n');

    if (cb) {
      res.commentBefore = res.commentBefore ? `${res.commentBefore}\n${cb}` : cb;
    }

    const ca = comments.after.join('\n');
    if (ca) res.comment = res.comment ? `${res.comment}\n${ca}` : ca;
  }

  return node.resolved = res;
}

function resolveMap(doc, cst) {
  if (cst.type !== PlainValue$4.Type.MAP && cst.type !== PlainValue$4.Type.FLOW_MAP) {
    const msg = `A ${cst.type} node cannot be resolved as a mapping`;
    doc.errors.push(new PlainValue$4.YAMLSyntaxError(cst, msg));
    return null;
  }

  const {
    comments,
    items
  } = cst.type === PlainValue$4.Type.FLOW_MAP ? resolveFlowMapItems(doc, cst) : resolveBlockMapItems(doc, cst);
  const map = new YAMLMap();
  map.items = items;
  resolveComments(map, comments);
  let hasCollectionKey = false;

  for (let i = 0; i < items.length; ++i) {
    const {
      key: iKey
    } = items[i];
    if (iKey instanceof Collection) hasCollectionKey = true;

    if (doc.schema.merge && iKey && iKey.value === MERGE_KEY) {
      items[i] = new Merge(items[i]);
      const sources = items[i].value.items;
      let error = null;
      sources.some(node => {
        if (node instanceof Alias) {
          // During parsing, alias sources are CST nodes; to account for
          // circular references their resolved values can't be used here.
          const {
            type
          } = node.source;
          if (type === PlainValue$4.Type.MAP || type === PlainValue$4.Type.FLOW_MAP) return false;
          return error = 'Merge nodes aliases can only point to maps';
        }

        return error = 'Merge nodes can only have Alias nodes as values';
      });
      if (error) doc.errors.push(new PlainValue$4.YAMLSemanticError(cst, error));
    } else {
      for (let j = i + 1; j < items.length; ++j) {
        const {
          key: jKey
        } = items[j];

        if (iKey === jKey || iKey && jKey && Object.prototype.hasOwnProperty.call(iKey, 'value') && iKey.value === jKey.value) {
          const msg = `Map keys must be unique; "${iKey}" is repeated`;
          doc.errors.push(new PlainValue$4.YAMLSemanticError(cst, msg));
          break;
        }
      }
    }
  }

  if (hasCollectionKey && !doc.options.mapAsMap) {
    const warn = 'Keys with collection values will be stringified as YAML due to JS Object restrictions. Use mapAsMap: true to avoid this.';
    doc.warnings.push(new PlainValue$4.YAMLWarning(cst, warn));
  }

  cst.resolved = map;
  return map;
}

const valueHasPairComment = ({
  context: {
    lineStart,
    node,
    src
  },
  props
}) => {
  if (props.length === 0) return false;
  const {
    start
  } = props[0];
  if (node && start > node.valueRange.start) return false;
  if (src[start] !== PlainValue$4.Char.COMMENT) return false;

  for (let i = lineStart; i < start; ++i) if (src[i] === '\n') return false;

  return true;
};

function resolvePairComment(item, pair) {
  if (!valueHasPairComment(item)) return;
  const comment = item.getPropValue(0, PlainValue$4.Char.COMMENT, true);
  let found = false;
  const cb = pair.value.commentBefore;

  if (cb && cb.startsWith(comment)) {
    pair.value.commentBefore = cb.substr(comment.length + 1);
    found = true;
  } else {
    const cc = pair.value.comment;

    if (!item.node && cc && cc.startsWith(comment)) {
      pair.value.comment = cc.substr(comment.length + 1);
      found = true;
    }
  }

  if (found) pair.comment = comment;
}

function resolveBlockMapItems(doc, cst) {
  const comments = [];
  const items = [];
  let key = undefined;
  let keyStart = null;

  for (let i = 0; i < cst.items.length; ++i) {
    const item = cst.items[i];

    switch (item.type) {
      case PlainValue$4.Type.BLANK_LINE:
        comments.push({
          afterKey: !!key,
          before: items.length
        });
        break;

      case PlainValue$4.Type.COMMENT:
        comments.push({
          afterKey: !!key,
          before: items.length,
          comment: item.comment
        });
        break;

      case PlainValue$4.Type.MAP_KEY:
        if (key !== undefined) items.push(new Pair(key));
        if (item.error) doc.errors.push(item.error);
        key = resolveNode(doc, item.node);
        keyStart = null;
        break;

      case PlainValue$4.Type.MAP_VALUE:
        {
          if (key === undefined) key = null;
          if (item.error) doc.errors.push(item.error);

          if (!item.context.atLineStart && item.node && item.node.type === PlainValue$4.Type.MAP && !item.node.context.atLineStart) {
            const msg = 'Nested mappings are not allowed in compact mappings';
            doc.errors.push(new PlainValue$4.YAMLSemanticError(item.node, msg));
          }

          let valueNode = item.node;

          if (!valueNode && item.props.length > 0) {
            // Comments on an empty mapping value need to be preserved, so we
            // need to construct a minimal empty node here to use instead of the
            // missing `item.node`. -- eemeli/yaml#19
            valueNode = new PlainValue$4.PlainValue(PlainValue$4.Type.PLAIN, []);
            valueNode.context = {
              parent: item,
              src: item.context.src
            };
            const pos = item.range.start + 1;
            valueNode.range = {
              start: pos,
              end: pos
            };
            valueNode.valueRange = {
              start: pos,
              end: pos
            };

            if (typeof item.range.origStart === 'number') {
              const origPos = item.range.origStart + 1;
              valueNode.range.origStart = valueNode.range.origEnd = origPos;
              valueNode.valueRange.origStart = valueNode.valueRange.origEnd = origPos;
            }
          }

          const pair = new Pair(key, resolveNode(doc, valueNode));
          resolvePairComment(item, pair);
          items.push(pair);

          if (key && typeof keyStart === 'number') {
            if (item.range.start > keyStart + 1024) doc.errors.push(getLongKeyError(cst, key));
          }

          key = undefined;
          keyStart = null;
        }
        break;

      default:
        if (key !== undefined) items.push(new Pair(key));
        key = resolveNode(doc, item);
        keyStart = item.range.start;
        if (item.error) doc.errors.push(item.error);

        next: for (let j = i + 1;; ++j) {
          const nextItem = cst.items[j];

          switch (nextItem && nextItem.type) {
            case PlainValue$4.Type.BLANK_LINE:
            case PlainValue$4.Type.COMMENT:
              continue next;

            case PlainValue$4.Type.MAP_VALUE:
              break next;

            default:
              {
                const msg = 'Implicit map keys need to be followed by map values';
                doc.errors.push(new PlainValue$4.YAMLSemanticError(item, msg));
                break next;
              }
          }
        }

        if (item.valueRangeContainsNewline) {
          const msg = 'Implicit map keys need to be on a single line';
          doc.errors.push(new PlainValue$4.YAMLSemanticError(item, msg));
        }

    }
  }

  if (key !== undefined) items.push(new Pair(key));
  return {
    comments,
    items
  };
}

function resolveFlowMapItems(doc, cst) {
  const comments = [];
  const items = [];
  let key = undefined;
  let explicitKey = false;
  let next = '{';

  for (let i = 0; i < cst.items.length; ++i) {
    const item = cst.items[i];

    if (typeof item.char === 'string') {
      const {
        char,
        offset
      } = item;

      if (char === '?' && key === undefined && !explicitKey) {
        explicitKey = true;
        next = ':';
        continue;
      }

      if (char === ':') {
        if (key === undefined) key = null;

        if (next === ':') {
          next = ',';
          continue;
        }
      } else {
        if (explicitKey) {
          if (key === undefined && char !== ',') key = null;
          explicitKey = false;
        }

        if (key !== undefined) {
          items.push(new Pair(key));
          key = undefined;

          if (char === ',') {
            next = ':';
            continue;
          }
        }
      }

      if (char === '}') {
        if (i === cst.items.length - 1) continue;
      } else if (char === next) {
        next = ':';
        continue;
      }

      const msg = `Flow map contains an unexpected ${char}`;
      const err = new PlainValue$4.YAMLSyntaxError(cst, msg);
      err.offset = offset;
      doc.errors.push(err);
    } else if (item.type === PlainValue$4.Type.BLANK_LINE) {
      comments.push({
        afterKey: !!key,
        before: items.length
      });
    } else if (item.type === PlainValue$4.Type.COMMENT) {
      checkFlowCommentSpace(doc.errors, item);
      comments.push({
        afterKey: !!key,
        before: items.length,
        comment: item.comment
      });
    } else if (key === undefined) {
      if (next === ',') doc.errors.push(new PlainValue$4.YAMLSemanticError(item, 'Separator , missing in flow map'));
      key = resolveNode(doc, item);
    } else {
      if (next !== ',') doc.errors.push(new PlainValue$4.YAMLSemanticError(item, 'Indicator : missing in flow map entry'));
      items.push(new Pair(key, resolveNode(doc, item)));
      key = undefined;
      explicitKey = false;
    }
  }

  checkFlowCollectionEnd(doc.errors, cst);
  if (key !== undefined) items.push(new Pair(key));
  return {
    comments,
    items
  };
}

function resolveSeq$3(doc, cst) {
  if (cst.type !== PlainValue$4.Type.SEQ && cst.type !== PlainValue$4.Type.FLOW_SEQ) {
    const msg = `A ${cst.type} node cannot be resolved as a sequence`;
    doc.errors.push(new PlainValue$4.YAMLSyntaxError(cst, msg));
    return null;
  }

  const {
    comments,
    items
  } = cst.type === PlainValue$4.Type.FLOW_SEQ ? resolveFlowSeqItems(doc, cst) : resolveBlockSeqItems(doc, cst);
  const seq = new YAMLSeq();
  seq.items = items;
  resolveComments(seq, comments);

  if (!doc.options.mapAsMap && items.some(it => it instanceof Pair && it.key instanceof Collection)) {
    const warn = 'Keys with collection values will be stringified as YAML due to JS Object restrictions. Use mapAsMap: true to avoid this.';
    doc.warnings.push(new PlainValue$4.YAMLWarning(cst, warn));
  }

  cst.resolved = seq;
  return seq;
}

function resolveBlockSeqItems(doc, cst) {
  const comments = [];
  const items = [];

  for (let i = 0; i < cst.items.length; ++i) {
    const item = cst.items[i];

    switch (item.type) {
      case PlainValue$4.Type.BLANK_LINE:
        comments.push({
          before: items.length
        });
        break;

      case PlainValue$4.Type.COMMENT:
        comments.push({
          comment: item.comment,
          before: items.length
        });
        break;

      case PlainValue$4.Type.SEQ_ITEM:
        if (item.error) doc.errors.push(item.error);
        items.push(resolveNode(doc, item.node));

        if (item.hasProps) {
          const msg = 'Sequence items cannot have tags or anchors before the - indicator';
          doc.errors.push(new PlainValue$4.YAMLSemanticError(item, msg));
        }

        break;

      default:
        if (item.error) doc.errors.push(item.error);
        doc.errors.push(new PlainValue$4.YAMLSyntaxError(item, `Unexpected ${item.type} node in sequence`));
    }
  }

  return {
    comments,
    items
  };
}

function resolveFlowSeqItems(doc, cst) {
  const comments = [];
  const items = [];
  let explicitKey = false;
  let key = undefined;
  let keyStart = null;
  let next = '[';
  let prevItem = null;

  for (let i = 0; i < cst.items.length; ++i) {
    const item = cst.items[i];

    if (typeof item.char === 'string') {
      const {
        char,
        offset
      } = item;

      if (char !== ':' && (explicitKey || key !== undefined)) {
        if (explicitKey && key === undefined) key = next ? items.pop() : null;
        items.push(new Pair(key));
        explicitKey = false;
        key = undefined;
        keyStart = null;
      }

      if (char === next) {
        next = null;
      } else if (!next && char === '?') {
        explicitKey = true;
      } else if (next !== '[' && char === ':' && key === undefined) {
        if (next === ',') {
          key = items.pop();

          if (key instanceof Pair) {
            const msg = 'Chaining flow sequence pairs is invalid';
            const err = new PlainValue$4.YAMLSemanticError(cst, msg);
            err.offset = offset;
            doc.errors.push(err);
          }

          if (!explicitKey && typeof keyStart === 'number') {
            const keyEnd = item.range ? item.range.start : item.offset;
            if (keyEnd > keyStart + 1024) doc.errors.push(getLongKeyError(cst, key));
            const {
              src
            } = prevItem.context;

            for (let i = keyStart; i < keyEnd; ++i) if (src[i] === '\n') {
              const msg = 'Implicit keys of flow sequence pairs need to be on a single line';
              doc.errors.push(new PlainValue$4.YAMLSemanticError(prevItem, msg));
              break;
            }
          }
        } else {
          key = null;
        }

        keyStart = null;
        explicitKey = false;
        next = null;
      } else if (next === '[' || char !== ']' || i < cst.items.length - 1) {
        const msg = `Flow sequence contains an unexpected ${char}`;
        const err = new PlainValue$4.YAMLSyntaxError(cst, msg);
        err.offset = offset;
        doc.errors.push(err);
      }
    } else if (item.type === PlainValue$4.Type.BLANK_LINE) {
      comments.push({
        before: items.length
      });
    } else if (item.type === PlainValue$4.Type.COMMENT) {
      checkFlowCommentSpace(doc.errors, item);
      comments.push({
        comment: item.comment,
        before: items.length
      });
    } else {
      if (next) {
        const msg = `Expected a ${next} in flow sequence`;
        doc.errors.push(new PlainValue$4.YAMLSemanticError(item, msg));
      }

      const value = resolveNode(doc, item);

      if (key === undefined) {
        items.push(value);
        prevItem = item;
      } else {
        items.push(new Pair(key, value));
        key = undefined;
      }

      keyStart = item.range.start;
      next = ',';
    }
  }

  checkFlowCollectionEnd(doc.errors, cst);
  if (key !== undefined) items.push(new Pair(key));
  return {
    comments,
    items
  };
}

resolveSeqD03cb037.Alias = Alias;
resolveSeqD03cb037.Collection = Collection;
resolveSeqD03cb037.Merge = Merge;
resolveSeqD03cb037.Node = Node;
resolveSeqD03cb037.Pair = Pair;
resolveSeqD03cb037.Scalar = Scalar;
resolveSeqD03cb037.YAMLMap = YAMLMap;
resolveSeqD03cb037.YAMLSeq = YAMLSeq;
resolveSeqD03cb037.addComment = addComment;
resolveSeqD03cb037.binaryOptions = binaryOptions;
resolveSeqD03cb037.boolOptions = boolOptions;
resolveSeqD03cb037.findPair = findPair;
resolveSeqD03cb037.intOptions = intOptions;
resolveSeqD03cb037.isEmptyPath = isEmptyPath;
resolveSeqD03cb037.nullOptions = nullOptions;
resolveSeqD03cb037.resolveMap = resolveMap;
resolveSeqD03cb037.resolveNode = resolveNode;
resolveSeqD03cb037.resolveSeq = resolveSeq$3;
resolveSeqD03cb037.resolveString = resolveString;
resolveSeqD03cb037.strOptions = strOptions;
resolveSeqD03cb037.stringifyNumber = stringifyNumber;
resolveSeqD03cb037.stringifyString = stringifyString;
resolveSeqD03cb037.toJSON = toJSON;

var Schema88e323a7 = {};

var warnings1000a372 = {};

var PlainValue$3 = PlainValueEc8e588e;
var resolveSeq$2 = resolveSeqD03cb037;

/* global atob, btoa, Buffer */
const binary = {
  identify: value => value instanceof Uint8Array,
  // Buffer inherits from Uint8Array
  default: false,
  tag: 'tag:yaml.org,2002:binary',

  /**
   * Returns a Buffer in node and an Uint8Array in browsers
   *
   * To use the resulting buffer as an image, you'll want to do something like:
   *
   *   const blob = new Blob([buffer], { type: 'image/jpeg' })
   *   document.querySelector('#photo').src = URL.createObjectURL(blob)
   */
  resolve: (doc, node) => {
    const src = resolveSeq$2.resolveString(doc, node);

    if (typeof Buffer === 'function') {
      return Buffer.from(src, 'base64');
    } else if (typeof atob === 'function') {
      // On IE 11, atob() can't handle newlines
      const str = atob(src.replace(/[\n\r]/g, ''));
      const buffer = new Uint8Array(str.length);

      for (let i = 0; i < str.length; ++i) buffer[i] = str.charCodeAt(i);

      return buffer;
    } else {
      const msg = 'This environment does not support reading binary tags; either Buffer or atob is required';
      doc.errors.push(new PlainValue$3.YAMLReferenceError(node, msg));
      return null;
    }
  },
  options: resolveSeq$2.binaryOptions,
  stringify: ({
    comment,
    type,
    value
  }, ctx, onComment, onChompKeep) => {
    let src;

    if (typeof Buffer === 'function') {
      src = value instanceof Buffer ? value.toString('base64') : Buffer.from(value.buffer).toString('base64');
    } else if (typeof btoa === 'function') {
      let s = '';

      for (let i = 0; i < value.length; ++i) s += String.fromCharCode(value[i]);

      src = btoa(s);
    } else {
      throw new Error('This environment does not support writing binary tags; either Buffer or btoa is required');
    }

    if (!type) type = resolveSeq$2.binaryOptions.defaultType;

    if (type === PlainValue$3.Type.QUOTE_DOUBLE) {
      value = src;
    } else {
      const {
        lineWidth
      } = resolveSeq$2.binaryOptions;
      const n = Math.ceil(src.length / lineWidth);
      const lines = new Array(n);

      for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
        lines[i] = src.substr(o, lineWidth);
      }

      value = lines.join(type === PlainValue$3.Type.BLOCK_LITERAL ? '\n' : ' ');
    }

    return resolveSeq$2.stringifyString({
      comment,
      type,
      value
    }, ctx, onComment, onChompKeep);
  }
};

function parsePairs(doc, cst) {
  const seq = resolveSeq$2.resolveSeq(doc, cst);

  for (let i = 0; i < seq.items.length; ++i) {
    let item = seq.items[i];
    if (item instanceof resolveSeq$2.Pair) continue;else if (item instanceof resolveSeq$2.YAMLMap) {
      if (item.items.length > 1) {
        const msg = 'Each pair must have its own sequence indicator';
        throw new PlainValue$3.YAMLSemanticError(cst, msg);
      }

      const pair = item.items[0] || new resolveSeq$2.Pair();
      if (item.commentBefore) pair.commentBefore = pair.commentBefore ? `${item.commentBefore}\n${pair.commentBefore}` : item.commentBefore;
      if (item.comment) pair.comment = pair.comment ? `${item.comment}\n${pair.comment}` : item.comment;
      item = pair;
    }
    seq.items[i] = item instanceof resolveSeq$2.Pair ? item : new resolveSeq$2.Pair(item);
  }

  return seq;
}
function createPairs(schema, iterable, ctx) {
  const pairs = new resolveSeq$2.YAMLSeq(schema);
  pairs.tag = 'tag:yaml.org,2002:pairs';

  for (const it of iterable) {
    let key, value;

    if (Array.isArray(it)) {
      if (it.length === 2) {
        key = it[0];
        value = it[1];
      } else throw new TypeError(`Expected [key, value] tuple: ${it}`);
    } else if (it && it instanceof Object) {
      const keys = Object.keys(it);

      if (keys.length === 1) {
        key = keys[0];
        value = it[key];
      } else throw new TypeError(`Expected { key: value } tuple: ${it}`);
    } else {
      key = it;
    }

    const pair = schema.createPair(key, value, ctx);
    pairs.items.push(pair);
  }

  return pairs;
}
const pairs = {
  default: false,
  tag: 'tag:yaml.org,2002:pairs',
  resolve: parsePairs,
  createNode: createPairs
};

class YAMLOMap extends resolveSeq$2.YAMLSeq {
  constructor() {
    super();

    PlainValue$3._defineProperty(this, "add", resolveSeq$2.YAMLMap.prototype.add.bind(this));

    PlainValue$3._defineProperty(this, "delete", resolveSeq$2.YAMLMap.prototype.delete.bind(this));

    PlainValue$3._defineProperty(this, "get", resolveSeq$2.YAMLMap.prototype.get.bind(this));

    PlainValue$3._defineProperty(this, "has", resolveSeq$2.YAMLMap.prototype.has.bind(this));

    PlainValue$3._defineProperty(this, "set", resolveSeq$2.YAMLMap.prototype.set.bind(this));

    this.tag = YAMLOMap.tag;
  }

  toJSON(_, ctx) {
    const map = new Map();
    if (ctx && ctx.onCreate) ctx.onCreate(map);

    for (const pair of this.items) {
      let key, value;

      if (pair instanceof resolveSeq$2.Pair) {
        key = resolveSeq$2.toJSON(pair.key, '', ctx);
        value = resolveSeq$2.toJSON(pair.value, key, ctx);
      } else {
        key = resolveSeq$2.toJSON(pair, '', ctx);
      }

      if (map.has(key)) throw new Error('Ordered maps must not include duplicate keys');
      map.set(key, value);
    }

    return map;
  }

}

PlainValue$3._defineProperty(YAMLOMap, "tag", 'tag:yaml.org,2002:omap');

function parseOMap(doc, cst) {
  const pairs = parsePairs(doc, cst);
  const seenKeys = [];

  for (const {
    key
  } of pairs.items) {
    if (key instanceof resolveSeq$2.Scalar) {
      if (seenKeys.includes(key.value)) {
        const msg = 'Ordered maps must not include duplicate keys';
        throw new PlainValue$3.YAMLSemanticError(cst, msg);
      } else {
        seenKeys.push(key.value);
      }
    }
  }

  return Object.assign(new YAMLOMap(), pairs);
}

function createOMap(schema, iterable, ctx) {
  const pairs = createPairs(schema, iterable, ctx);
  const omap = new YAMLOMap();
  omap.items = pairs.items;
  return omap;
}

const omap = {
  identify: value => value instanceof Map,
  nodeClass: YAMLOMap,
  default: false,
  tag: 'tag:yaml.org,2002:omap',
  resolve: parseOMap,
  createNode: createOMap
};

class YAMLSet extends resolveSeq$2.YAMLMap {
  constructor() {
    super();
    this.tag = YAMLSet.tag;
  }

  add(key) {
    const pair = key instanceof resolveSeq$2.Pair ? key : new resolveSeq$2.Pair(key);
    const prev = resolveSeq$2.findPair(this.items, pair.key);
    if (!prev) this.items.push(pair);
  }

  get(key, keepPair) {
    const pair = resolveSeq$2.findPair(this.items, key);
    return !keepPair && pair instanceof resolveSeq$2.Pair ? pair.key instanceof resolveSeq$2.Scalar ? pair.key.value : pair.key : pair;
  }

  set(key, value) {
    if (typeof value !== 'boolean') throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
    const prev = resolveSeq$2.findPair(this.items, key);

    if (prev && !value) {
      this.items.splice(this.items.indexOf(prev), 1);
    } else if (!prev && value) {
      this.items.push(new resolveSeq$2.Pair(key));
    }
  }

  toJSON(_, ctx) {
    return super.toJSON(_, ctx, Set);
  }

  toString(ctx, onComment, onChompKeep) {
    if (!ctx) return JSON.stringify(this);
    if (this.hasAllNullValues()) return super.toString(ctx, onComment, onChompKeep);else throw new Error('Set items must all have null values');
  }

}

PlainValue$3._defineProperty(YAMLSet, "tag", 'tag:yaml.org,2002:set');

function parseSet(doc, cst) {
  const map = resolveSeq$2.resolveMap(doc, cst);
  if (!map.hasAllNullValues()) throw new PlainValue$3.YAMLSemanticError(cst, 'Set items must all have null values');
  return Object.assign(new YAMLSet(), map);
}

function createSet(schema, iterable, ctx) {
  const set = new YAMLSet();

  for (const value of iterable) set.items.push(schema.createPair(value, null, ctx));

  return set;
}

const set = {
  identify: value => value instanceof Set,
  nodeClass: YAMLSet,
  default: false,
  tag: 'tag:yaml.org,2002:set',
  resolve: parseSet,
  createNode: createSet
};

const parseSexagesimal = (sign, parts) => {
  const n = parts.split(':').reduce((n, p) => n * 60 + Number(p), 0);
  return sign === '-' ? -n : n;
}; // hhhh:mm:ss.sss


const stringifySexagesimal = ({
  value
}) => {
  if (isNaN(value) || !isFinite(value)) return resolveSeq$2.stringifyNumber(value);
  let sign = '';

  if (value < 0) {
    sign = '-';
    value = Math.abs(value);
  }

  const parts = [value % 60]; // seconds, including ms

  if (value < 60) {
    parts.unshift(0); // at least one : is required
  } else {
    value = Math.round((value - parts[0]) / 60);
    parts.unshift(value % 60); // minutes

    if (value >= 60) {
      value = Math.round((value - parts[0]) / 60);
      parts.unshift(value); // hours
    }
  }

  return sign + parts.map(n => n < 10 ? '0' + String(n) : String(n)).join(':').replace(/000000\d*$/, '') // % 60 may introduce error
  ;
};

const intTime = {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'TIME',
  test: /^([-+]?)([0-9][0-9_]*(?::[0-5]?[0-9])+)$/,
  resolve: (str, sign, parts) => parseSexagesimal(sign, parts.replace(/_/g, '')),
  stringify: stringifySexagesimal
};
const floatTime = {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  format: 'TIME',
  test: /^([-+]?)([0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*)$/,
  resolve: (str, sign, parts) => parseSexagesimal(sign, parts.replace(/_/g, '')),
  stringify: stringifySexagesimal
};
const timestamp = {
  identify: value => value instanceof Date,
  default: true,
  tag: 'tag:yaml.org,2002:timestamp',
  // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
  // may be omitted altogether, resulting in a date format. In such a case, the time part is
  // assumed to be 00:00:00Z (start of day, UTC).
  test: RegExp('^(?:' + '([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})' + // YYYY-Mm-Dd
  '(?:(?:t|T|[ \\t]+)' + // t | T | whitespace
  '([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)' + // Hh:Mm:Ss(.ss)?
  '(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?' + // Z | +5 | -03:30
  ')?' + ')$'),
  resolve: (str, year, month, day, hour, minute, second, millisec, tz) => {
    if (millisec) millisec = (millisec + '00').substr(1, 3);
    let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec || 0);

    if (tz && tz !== 'Z') {
      let d = parseSexagesimal(tz[0], tz.slice(1));
      if (Math.abs(d) < 30) d *= 60;
      date -= 60000 * d;
    }

    return new Date(date);
  },
  stringify: ({
    value
  }) => value.toISOString().replace(/((T00:00)?:00)?\.000Z$/, '')
};

/* global console, process, YAML_SILENCE_DEPRECATION_WARNINGS, YAML_SILENCE_WARNINGS */
function shouldWarn(deprecation) {
  const env = typeof process !== 'undefined' && process.env || {};

  if (deprecation) {
    if (typeof YAML_SILENCE_DEPRECATION_WARNINGS !== 'undefined') return !YAML_SILENCE_DEPRECATION_WARNINGS;
    return !env.YAML_SILENCE_DEPRECATION_WARNINGS;
  }

  if (typeof YAML_SILENCE_WARNINGS !== 'undefined') return !YAML_SILENCE_WARNINGS;
  return !env.YAML_SILENCE_WARNINGS;
}

function warn(warning, type) {
  if (shouldWarn(false)) {
    const emit = typeof process !== 'undefined' && process.emitWarning; // This will throw in Jest if `warning` is an Error instance due to
    // https://github.com/facebook/jest/issues/2549

    if (emit) emit(warning, type);else {
      // eslint-disable-next-line no-console
      console.warn(type ? `${type}: ${warning}` : warning);
    }
  }
}
function warnFileDeprecation(filename) {
  if (shouldWarn(true)) {
    const path = filename.replace(/.*yaml[/\\]/i, '').replace(/\.js$/, '').replace(/\\/g, '/');
    warn(`The endpoint 'yaml/${path}' will be removed in a future release.`, 'DeprecationWarning');
  }
}
const warned = {};
function warnOptionDeprecation(name, alternative) {
  if (!warned[name] && shouldWarn(true)) {
    warned[name] = true;
    let msg = `The option '${name}' will be removed in a future release`;
    msg += alternative ? `, use '${alternative}' instead.` : '.';
    warn(msg, 'DeprecationWarning');
  }
}

warnings1000a372.binary = binary;
warnings1000a372.floatTime = floatTime;
warnings1000a372.intTime = intTime;
warnings1000a372.omap = omap;
warnings1000a372.pairs = pairs;
warnings1000a372.set = set;
warnings1000a372.timestamp = timestamp;
warnings1000a372.warn = warn;
warnings1000a372.warnFileDeprecation = warnFileDeprecation;
warnings1000a372.warnOptionDeprecation = warnOptionDeprecation;

var PlainValue$2 = PlainValueEc8e588e;
var resolveSeq$1 = resolveSeqD03cb037;
var warnings$1 = warnings1000a372;

function createMap(schema, obj, ctx) {
  const map = new resolveSeq$1.YAMLMap(schema);

  if (obj instanceof Map) {
    for (const [key, value] of obj) map.items.push(schema.createPair(key, value, ctx));
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) map.items.push(schema.createPair(key, obj[key], ctx));
  }

  if (typeof schema.sortMapEntries === 'function') {
    map.items.sort(schema.sortMapEntries);
  }

  return map;
}

const map = {
  createNode: createMap,
  default: true,
  nodeClass: resolveSeq$1.YAMLMap,
  tag: 'tag:yaml.org,2002:map',
  resolve: resolveSeq$1.resolveMap
};

function createSeq(schema, obj, ctx) {
  const seq = new resolveSeq$1.YAMLSeq(schema);

  if (obj && obj[Symbol.iterator]) {
    for (const it of obj) {
      const v = schema.createNode(it, ctx.wrapScalars, null, ctx);
      seq.items.push(v);
    }
  }

  return seq;
}

const seq = {
  createNode: createSeq,
  default: true,
  nodeClass: resolveSeq$1.YAMLSeq,
  tag: 'tag:yaml.org,2002:seq',
  resolve: resolveSeq$1.resolveSeq
};

const string = {
  identify: value => typeof value === 'string',
  default: true,
  tag: 'tag:yaml.org,2002:str',
  resolve: resolveSeq$1.resolveString,

  stringify(item, ctx, onComment, onChompKeep) {
    ctx = Object.assign({
      actualString: true
    }, ctx);
    return resolveSeq$1.stringifyString(item, ctx, onComment, onChompKeep);
  },

  options: resolveSeq$1.strOptions
};

const failsafe = [map, seq, string];

/* global BigInt */

const intIdentify$2 = value => typeof value === 'bigint' || Number.isInteger(value);

const intResolve$1 = (src, part, radix) => resolveSeq$1.intOptions.asBigInt ? BigInt(src) : parseInt(part, radix);

function intStringify$1(node, radix, prefix) {
  const {
    value
  } = node;
  if (intIdentify$2(value) && value >= 0) return prefix + value.toString(radix);
  return resolveSeq$1.stringifyNumber(node);
}

const nullObj = {
  identify: value => value == null,
  createNode: (schema, value, ctx) => ctx.wrapScalars ? new resolveSeq$1.Scalar(null) : null,
  default: true,
  tag: 'tag:yaml.org,2002:null',
  test: /^(?:~|[Nn]ull|NULL)?$/,
  resolve: () => null,
  options: resolveSeq$1.nullOptions,
  stringify: () => resolveSeq$1.nullOptions.nullStr
};
const boolObj = {
  identify: value => typeof value === 'boolean',
  default: true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
  resolve: str => str[0] === 't' || str[0] === 'T',
  options: resolveSeq$1.boolOptions,
  stringify: ({
    value
  }) => value ? resolveSeq$1.boolOptions.trueStr : resolveSeq$1.boolOptions.falseStr
};
const octObj = {
  identify: value => intIdentify$2(value) && value >= 0,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'OCT',
  test: /^0o([0-7]+)$/,
  resolve: (str, oct) => intResolve$1(str, oct, 8),
  options: resolveSeq$1.intOptions,
  stringify: node => intStringify$1(node, 8, '0o')
};
const intObj = {
  identify: intIdentify$2,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  test: /^[-+]?[0-9]+$/,
  resolve: str => intResolve$1(str, str, 10),
  options: resolveSeq$1.intOptions,
  stringify: resolveSeq$1.stringifyNumber
};
const hexObj = {
  identify: value => intIdentify$2(value) && value >= 0,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'HEX',
  test: /^0x([0-9a-fA-F]+)$/,
  resolve: (str, hex) => intResolve$1(str, hex, 16),
  options: resolveSeq$1.intOptions,
  stringify: node => intStringify$1(node, 16, '0x')
};
const nanObj = {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^(?:[-+]?\.inf|(\.nan))$/i,
  resolve: (str, nan) => nan ? NaN : str[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  stringify: resolveSeq$1.stringifyNumber
};
const expObj = {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  format: 'EXP',
  test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
  resolve: str => parseFloat(str),
  stringify: ({
    value
  }) => Number(value).toExponential()
};
const floatObj = {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^[-+]?(?:\.([0-9]+)|[0-9]+\.([0-9]*))$/,

  resolve(str, frac1, frac2) {
    const frac = frac1 || frac2;
    const node = new resolveSeq$1.Scalar(parseFloat(str));
    if (frac && frac[frac.length - 1] === '0') node.minFractionDigits = frac.length;
    return node;
  },

  stringify: resolveSeq$1.stringifyNumber
};
const core = failsafe.concat([nullObj, boolObj, octObj, intObj, hexObj, nanObj, expObj, floatObj]);

/* global BigInt */

const intIdentify$1 = value => typeof value === 'bigint' || Number.isInteger(value);

const stringifyJSON = ({
  value
}) => JSON.stringify(value);

const json = [map, seq, {
  identify: value => typeof value === 'string',
  default: true,
  tag: 'tag:yaml.org,2002:str',
  resolve: resolveSeq$1.resolveString,
  stringify: stringifyJSON
}, {
  identify: value => value == null,
  createNode: (schema, value, ctx) => ctx.wrapScalars ? new resolveSeq$1.Scalar(null) : null,
  default: true,
  tag: 'tag:yaml.org,2002:null',
  test: /^null$/,
  resolve: () => null,
  stringify: stringifyJSON
}, {
  identify: value => typeof value === 'boolean',
  default: true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^true|false$/,
  resolve: str => str === 'true',
  stringify: stringifyJSON
}, {
  identify: intIdentify$1,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  test: /^-?(?:0|[1-9][0-9]*)$/,
  resolve: str => resolveSeq$1.intOptions.asBigInt ? BigInt(str) : parseInt(str, 10),
  stringify: ({
    value
  }) => intIdentify$1(value) ? value.toString() : JSON.stringify(value)
}, {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
  resolve: str => parseFloat(str),
  stringify: stringifyJSON
}];

json.scalarFallback = str => {
  throw new SyntaxError(`Unresolved plain scalar ${JSON.stringify(str)}`);
};

/* global BigInt */

const boolStringify = ({
  value
}) => value ? resolveSeq$1.boolOptions.trueStr : resolveSeq$1.boolOptions.falseStr;

const intIdentify = value => typeof value === 'bigint' || Number.isInteger(value);

function intResolve(sign, src, radix) {
  let str = src.replace(/_/g, '');

  if (resolveSeq$1.intOptions.asBigInt) {
    switch (radix) {
      case 2:
        str = `0b${str}`;
        break;

      case 8:
        str = `0o${str}`;
        break;

      case 16:
        str = `0x${str}`;
        break;
    }

    const n = BigInt(str);
    return sign === '-' ? BigInt(-1) * n : n;
  }

  const n = parseInt(str, radix);
  return sign === '-' ? -1 * n : n;
}

function intStringify(node, radix, prefix) {
  const {
    value
  } = node;

  if (intIdentify(value)) {
    const str = value.toString(radix);
    return value < 0 ? '-' + prefix + str.substr(1) : prefix + str;
  }

  return resolveSeq$1.stringifyNumber(node);
}

const yaml11 = failsafe.concat([{
  identify: value => value == null,
  createNode: (schema, value, ctx) => ctx.wrapScalars ? new resolveSeq$1.Scalar(null) : null,
  default: true,
  tag: 'tag:yaml.org,2002:null',
  test: /^(?:~|[Nn]ull|NULL)?$/,
  resolve: () => null,
  options: resolveSeq$1.nullOptions,
  stringify: () => resolveSeq$1.nullOptions.nullStr
}, {
  identify: value => typeof value === 'boolean',
  default: true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
  resolve: () => true,
  options: resolveSeq$1.boolOptions,
  stringify: boolStringify
}, {
  identify: value => typeof value === 'boolean',
  default: true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/i,
  resolve: () => false,
  options: resolveSeq$1.boolOptions,
  stringify: boolStringify
}, {
  identify: intIdentify,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'BIN',
  test: /^([-+]?)0b([0-1_]+)$/,
  resolve: (str, sign, bin) => intResolve(sign, bin, 2),
  stringify: node => intStringify(node, 2, '0b')
}, {
  identify: intIdentify,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'OCT',
  test: /^([-+]?)0([0-7_]+)$/,
  resolve: (str, sign, oct) => intResolve(sign, oct, 8),
  stringify: node => intStringify(node, 8, '0')
}, {
  identify: intIdentify,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  test: /^([-+]?)([0-9][0-9_]*)$/,
  resolve: (str, sign, abs) => intResolve(sign, abs, 10),
  stringify: resolveSeq$1.stringifyNumber
}, {
  identify: intIdentify,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'HEX',
  test: /^([-+]?)0x([0-9a-fA-F_]+)$/,
  resolve: (str, sign, hex) => intResolve(sign, hex, 16),
  stringify: node => intStringify(node, 16, '0x')
}, {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^(?:[-+]?\.inf|(\.nan))$/i,
  resolve: (str, nan) => nan ? NaN : str[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  stringify: resolveSeq$1.stringifyNumber
}, {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  format: 'EXP',
  test: /^[-+]?([0-9][0-9_]*)?(\.[0-9_]*)?[eE][-+]?[0-9]+$/,
  resolve: str => parseFloat(str.replace(/_/g, '')),
  stringify: ({
    value
  }) => Number(value).toExponential()
}, {
  identify: value => typeof value === 'number',
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^[-+]?(?:[0-9][0-9_]*)?\.([0-9_]*)$/,

  resolve(str, frac) {
    const node = new resolveSeq$1.Scalar(parseFloat(str.replace(/_/g, '')));

    if (frac) {
      const f = frac.replace(/_/g, '');
      if (f[f.length - 1] === '0') node.minFractionDigits = f.length;
    }

    return node;
  },

  stringify: resolveSeq$1.stringifyNumber
}], warnings$1.binary, warnings$1.omap, warnings$1.pairs, warnings$1.set, warnings$1.intTime, warnings$1.floatTime, warnings$1.timestamp);

const schemas = {
  core,
  failsafe,
  json,
  yaml11
};
const tags = {
  binary: warnings$1.binary,
  bool: boolObj,
  float: floatObj,
  floatExp: expObj,
  floatNaN: nanObj,
  floatTime: warnings$1.floatTime,
  int: intObj,
  intHex: hexObj,
  intOct: octObj,
  intTime: warnings$1.intTime,
  map,
  null: nullObj,
  omap: warnings$1.omap,
  pairs: warnings$1.pairs,
  seq,
  set: warnings$1.set,
  timestamp: warnings$1.timestamp
};

function findTagObject(value, tagName, tags) {
  if (tagName) {
    const match = tags.filter(t => t.tag === tagName);
    const tagObj = match.find(t => !t.format) || match[0];
    if (!tagObj) throw new Error(`Tag ${tagName} not found`);
    return tagObj;
  } // TODO: deprecate/remove class check


  return tags.find(t => (t.identify && t.identify(value) || t.class && value instanceof t.class) && !t.format);
}

function createNode$1(value, tagName, ctx) {
  if (value instanceof resolveSeq$1.Node) return value;
  const {
    defaultPrefix,
    onTagObj,
    prevObjects,
    schema,
    wrapScalars
  } = ctx;
  if (tagName && tagName.startsWith('!!')) tagName = defaultPrefix + tagName.slice(2);
  let tagObj = findTagObject(value, tagName, schema.tags);

  if (!tagObj) {
    if (typeof value.toJSON === 'function') value = value.toJSON();
    if (!value || typeof value !== 'object') return wrapScalars ? new resolveSeq$1.Scalar(value) : value;
    tagObj = value instanceof Map ? map : value[Symbol.iterator] ? seq : map;
  }

  if (onTagObj) {
    onTagObj(tagObj);
    delete ctx.onTagObj;
  } // Detect duplicate references to the same object & use Alias nodes for all
  // after first. The `obj` wrapper allows for circular references to resolve.


  const obj = {
    value: undefined,
    node: undefined
  };

  if (value && typeof value === 'object' && prevObjects) {
    const prev = prevObjects.get(value);

    if (prev) {
      const alias = new resolveSeq$1.Alias(prev); // leaves source dirty; must be cleaned by caller

      ctx.aliasNodes.push(alias); // defined along with prevObjects

      return alias;
    }

    obj.value = value;
    prevObjects.set(value, obj);
  }

  obj.node = tagObj.createNode ? tagObj.createNode(ctx.schema, value, ctx) : wrapScalars ? new resolveSeq$1.Scalar(value) : value;
  if (tagName && obj.node instanceof resolveSeq$1.Node) obj.node.tag = tagName;
  return obj.node;
}

function getSchemaTags(schemas, knownTags, customTags, schemaId) {
  let tags = schemas[schemaId.replace(/\W/g, '')]; // 'yaml-1.1' -> 'yaml11'

  if (!tags) {
    const keys = Object.keys(schemas).map(key => JSON.stringify(key)).join(', ');
    throw new Error(`Unknown schema "${schemaId}"; use one of ${keys}`);
  }

  if (Array.isArray(customTags)) {
    for (const tag of customTags) tags = tags.concat(tag);
  } else if (typeof customTags === 'function') {
    tags = customTags(tags.slice());
  }

  for (let i = 0; i < tags.length; ++i) {
    const tag = tags[i];

    if (typeof tag === 'string') {
      const tagObj = knownTags[tag];

      if (!tagObj) {
        const keys = Object.keys(knownTags).map(key => JSON.stringify(key)).join(', ');
        throw new Error(`Unknown custom tag "${tag}"; use one of ${keys}`);
      }

      tags[i] = tagObj;
    }
  }

  return tags;
}

const sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;

class Schema$2 {
  // TODO: remove in v2
  // TODO: remove in v2
  constructor({
    customTags,
    merge,
    schema,
    sortMapEntries,
    tags: deprecatedCustomTags
  }) {
    this.merge = !!merge;
    this.name = schema;
    this.sortMapEntries = sortMapEntries === true ? sortMapEntriesByKey : sortMapEntries || null;
    if (!customTags && deprecatedCustomTags) warnings$1.warnOptionDeprecation('tags', 'customTags');
    this.tags = getSchemaTags(schemas, tags, customTags || deprecatedCustomTags, schema);
  }

  createNode(value, wrapScalars, tagName, ctx) {
    const baseCtx = {
      defaultPrefix: Schema$2.defaultPrefix,
      schema: this,
      wrapScalars
    };
    const createCtx = ctx ? Object.assign(ctx, baseCtx) : baseCtx;
    return createNode$1(value, tagName, createCtx);
  }

  createPair(key, value, ctx) {
    if (!ctx) ctx = {
      wrapScalars: true
    };
    const k = this.createNode(key, ctx.wrapScalars, null, ctx);
    const v = this.createNode(value, ctx.wrapScalars, null, ctx);
    return new resolveSeq$1.Pair(k, v);
  }

}

PlainValue$2._defineProperty(Schema$2, "defaultPrefix", PlainValue$2.defaultTagPrefix);

PlainValue$2._defineProperty(Schema$2, "defaultTags", PlainValue$2.defaultTags);

Schema88e323a7.Schema = Schema$2;

var PlainValue$1 = PlainValueEc8e588e;
var resolveSeq = resolveSeqD03cb037;
var Schema$1 = Schema88e323a7;

const defaultOptions = {
  anchorPrefix: 'a',
  customTags: null,
  indent: 2,
  indentSeq: true,
  keepCstNodes: false,
  keepNodeTypes: true,
  keepBlobsInJSON: true,
  mapAsMap: false,
  maxAliasCount: 100,
  prettyErrors: false,
  // TODO Set true in v2
  simpleKeys: false,
  version: '1.2'
};
const scalarOptions = {
  get binary() {
    return resolveSeq.binaryOptions;
  },

  set binary(opt) {
    Object.assign(resolveSeq.binaryOptions, opt);
  },

  get bool() {
    return resolveSeq.boolOptions;
  },

  set bool(opt) {
    Object.assign(resolveSeq.boolOptions, opt);
  },

  get int() {
    return resolveSeq.intOptions;
  },

  set int(opt) {
    Object.assign(resolveSeq.intOptions, opt);
  },

  get null() {
    return resolveSeq.nullOptions;
  },

  set null(opt) {
    Object.assign(resolveSeq.nullOptions, opt);
  },

  get str() {
    return resolveSeq.strOptions;
  },

  set str(opt) {
    Object.assign(resolveSeq.strOptions, opt);
  }

};
const documentOptions = {
  '1.0': {
    schema: 'yaml-1.1',
    merge: true,
    tagPrefixes: [{
      handle: '!',
      prefix: PlainValue$1.defaultTagPrefix
    }, {
      handle: '!!',
      prefix: 'tag:private.yaml.org,2002:'
    }]
  },
  1.1: {
    schema: 'yaml-1.1',
    merge: true,
    tagPrefixes: [{
      handle: '!',
      prefix: '!'
    }, {
      handle: '!!',
      prefix: PlainValue$1.defaultTagPrefix
    }]
  },
  1.2: {
    schema: 'core',
    merge: false,
    tagPrefixes: [{
      handle: '!',
      prefix: '!'
    }, {
      handle: '!!',
      prefix: PlainValue$1.defaultTagPrefix
    }]
  }
};

function stringifyTag(doc, tag) {
  if ((doc.version || doc.options.version) === '1.0') {
    const priv = tag.match(/^tag:private\.yaml\.org,2002:([^:/]+)$/);
    if (priv) return '!' + priv[1];
    const vocab = tag.match(/^tag:([a-zA-Z0-9-]+)\.yaml\.org,2002:(.*)/);
    return vocab ? `!${vocab[1]}/${vocab[2]}` : `!${tag.replace(/^tag:/, '')}`;
  }

  let p = doc.tagPrefixes.find(p => tag.indexOf(p.prefix) === 0);

  if (!p) {
    const dtp = doc.getDefaults().tagPrefixes;
    p = dtp && dtp.find(p => tag.indexOf(p.prefix) === 0);
  }

  if (!p) return tag[0] === '!' ? tag : `!<${tag}>`;
  const suffix = tag.substr(p.prefix.length).replace(/[!,[\]{}]/g, ch => ({
    '!': '%21',
    ',': '%2C',
    '[': '%5B',
    ']': '%5D',
    '{': '%7B',
    '}': '%7D'
  })[ch]);
  return p.handle + suffix;
}

function getTagObject(tags, item) {
  if (item instanceof resolveSeq.Alias) return resolveSeq.Alias;

  if (item.tag) {
    const match = tags.filter(t => t.tag === item.tag);
    if (match.length > 0) return match.find(t => t.format === item.format) || match[0];
  }

  let tagObj, obj;

  if (item instanceof resolveSeq.Scalar) {
    obj = item.value; // TODO: deprecate/remove class check

    const match = tags.filter(t => t.identify && t.identify(obj) || t.class && obj instanceof t.class);
    tagObj = match.find(t => t.format === item.format) || match.find(t => !t.format);
  } else {
    obj = item;
    tagObj = tags.find(t => t.nodeClass && obj instanceof t.nodeClass);
  }

  if (!tagObj) {
    const name = obj && obj.constructor ? obj.constructor.name : typeof obj;
    throw new Error(`Tag not resolved for ${name} value`);
  }

  return tagObj;
} // needs to be called before value stringifier to allow for circular anchor refs


function stringifyProps(node, tagObj, {
  anchors,
  doc
}) {
  const props = [];
  const anchor = doc.anchors.getName(node);

  if (anchor) {
    anchors[anchor] = node;
    props.push(`&${anchor}`);
  }

  if (node.tag) {
    props.push(stringifyTag(doc, node.tag));
  } else if (!tagObj.default) {
    props.push(stringifyTag(doc, tagObj.tag));
  }

  return props.join(' ');
}

function stringify$1(item, ctx, onComment, onChompKeep) {
  const {
    anchors,
    schema
  } = ctx.doc;
  let tagObj;

  if (!(item instanceof resolveSeq.Node)) {
    const createCtx = {
      aliasNodes: [],
      onTagObj: o => tagObj = o,
      prevObjects: new Map()
    };
    item = schema.createNode(item, true, null, createCtx);

    for (const alias of createCtx.aliasNodes) {
      alias.source = alias.source.node;
      let name = anchors.getName(alias.source);

      if (!name) {
        name = anchors.newName();
        anchors.map[name] = alias.source;
      }
    }
  }

  if (item instanceof resolveSeq.Pair) return item.toString(ctx, onComment, onChompKeep);
  if (!tagObj) tagObj = getTagObject(schema.tags, item);
  const props = stringifyProps(item, tagObj, ctx);
  if (props.length > 0) ctx.indentAtStart = (ctx.indentAtStart || 0) + props.length + 1;
  const str = typeof tagObj.stringify === 'function' ? tagObj.stringify(item, ctx, onComment, onChompKeep) : item instanceof resolveSeq.Scalar ? resolveSeq.stringifyString(item, ctx, onComment, onChompKeep) : item.toString(ctx, onComment, onChompKeep);
  if (!props) return str;
  return item instanceof resolveSeq.Scalar || str[0] === '{' || str[0] === '[' ? `${props} ${str}` : `${props}\n${ctx.indent}${str}`;
}

class Anchors {
  static validAnchorNode(node) {
    return node instanceof resolveSeq.Scalar || node instanceof resolveSeq.YAMLSeq || node instanceof resolveSeq.YAMLMap;
  }

  constructor(prefix) {
    PlainValue$1._defineProperty(this, "map", Object.create(null));

    this.prefix = prefix;
  }

  createAlias(node, name) {
    this.setAnchor(node, name);
    return new resolveSeq.Alias(node);
  }

  createMergePair(...sources) {
    const merge = new resolveSeq.Merge();
    merge.value.items = sources.map(s => {
      if (s instanceof resolveSeq.Alias) {
        if (s.source instanceof resolveSeq.YAMLMap) return s;
      } else if (s instanceof resolveSeq.YAMLMap) {
        return this.createAlias(s);
      }

      throw new Error('Merge sources must be Map nodes or their Aliases');
    });
    return merge;
  }

  getName(node) {
    const {
      map
    } = this;
    return Object.keys(map).find(a => map[a] === node);
  }

  getNames() {
    return Object.keys(this.map);
  }

  getNode(name) {
    return this.map[name];
  }

  newName(prefix) {
    if (!prefix) prefix = this.prefix;
    const names = Object.keys(this.map);

    for (let i = 1; true; ++i) {
      const name = `${prefix}${i}`;
      if (!names.includes(name)) return name;
    }
  } // During parsing, map & aliases contain CST nodes


  resolveNodes() {
    const {
      map,
      _cstAliases
    } = this;
    Object.keys(map).forEach(a => {
      map[a] = map[a].resolved;
    });

    _cstAliases.forEach(a => {
      a.source = a.source.resolved;
    });

    delete this._cstAliases;
  }

  setAnchor(node, name) {
    if (node != null && !Anchors.validAnchorNode(node)) {
      throw new Error('Anchors may only be set for Scalar, Seq and Map nodes');
    }

    if (name && /[\x00-\x19\s,[\]{}]/.test(name)) {
      throw new Error('Anchor names must not contain whitespace or control characters');
    }

    const {
      map
    } = this;
    const prev = node && Object.keys(map).find(a => map[a] === node);

    if (prev) {
      if (!name) {
        return prev;
      } else if (prev !== name) {
        delete map[prev];
        map[name] = node;
      }
    } else {
      if (!name) {
        if (!node) return null;
        name = this.newName();
      }

      map[name] = node;
    }

    return name;
  }

}

const visit = (node, tags) => {
  if (node && typeof node === 'object') {
    const {
      tag
    } = node;

    if (node instanceof resolveSeq.Collection) {
      if (tag) tags[tag] = true;
      node.items.forEach(n => visit(n, tags));
    } else if (node instanceof resolveSeq.Pair) {
      visit(node.key, tags);
      visit(node.value, tags);
    } else if (node instanceof resolveSeq.Scalar) {
      if (tag) tags[tag] = true;
    }
  }

  return tags;
};

const listTagNames = node => Object.keys(visit(node, {}));

function parseContents(doc, contents) {
  const comments = {
    before: [],
    after: []
  };
  let body = undefined;
  let spaceBefore = false;

  for (const node of contents) {
    if (node.valueRange) {
      if (body !== undefined) {
        const msg = 'Document contains trailing content not separated by a ... or --- line';
        doc.errors.push(new PlainValue$1.YAMLSyntaxError(node, msg));
        break;
      }

      const res = resolveSeq.resolveNode(doc, node);

      if (spaceBefore) {
        res.spaceBefore = true;
        spaceBefore = false;
      }

      body = res;
    } else if (node.comment !== null) {
      const cc = body === undefined ? comments.before : comments.after;
      cc.push(node.comment);
    } else if (node.type === PlainValue$1.Type.BLANK_LINE) {
      spaceBefore = true;

      if (body === undefined && comments.before.length > 0 && !doc.commentBefore) {
        // space-separated comments at start are parsed as document comments
        doc.commentBefore = comments.before.join('\n');
        comments.before = [];
      }
    }
  }

  doc.contents = body || null;

  if (!body) {
    doc.comment = comments.before.concat(comments.after).join('\n') || null;
  } else {
    const cb = comments.before.join('\n');

    if (cb) {
      const cbNode = body instanceof resolveSeq.Collection && body.items[0] ? body.items[0] : body;
      cbNode.commentBefore = cbNode.commentBefore ? `${cb}\n${cbNode.commentBefore}` : cb;
    }

    doc.comment = comments.after.join('\n') || null;
  }
}

function resolveTagDirective({
  tagPrefixes
}, directive) {
  const [handle, prefix] = directive.parameters;

  if (!handle || !prefix) {
    const msg = 'Insufficient parameters given for %TAG directive';
    throw new PlainValue$1.YAMLSemanticError(directive, msg);
  }

  if (tagPrefixes.some(p => p.handle === handle)) {
    const msg = 'The %TAG directive must only be given at most once per handle in the same document.';
    throw new PlainValue$1.YAMLSemanticError(directive, msg);
  }

  return {
    handle,
    prefix
  };
}

function resolveYamlDirective(doc, directive) {
  let [version] = directive.parameters;
  if (directive.name === 'YAML:1.0') version = '1.0';

  if (!version) {
    const msg = 'Insufficient parameters given for %YAML directive';
    throw new PlainValue$1.YAMLSemanticError(directive, msg);
  }

  if (!documentOptions[version]) {
    const v0 = doc.version || doc.options.version;
    const msg = `Document will be parsed as YAML ${v0} rather than YAML ${version}`;
    doc.warnings.push(new PlainValue$1.YAMLWarning(directive, msg));
  }

  return version;
}

function parseDirectives(doc, directives, prevDoc) {
  const directiveComments = [];
  let hasDirectives = false;

  for (const directive of directives) {
    const {
      comment,
      name
    } = directive;

    switch (name) {
      case 'TAG':
        try {
          doc.tagPrefixes.push(resolveTagDirective(doc, directive));
        } catch (error) {
          doc.errors.push(error);
        }

        hasDirectives = true;
        break;

      case 'YAML':
      case 'YAML:1.0':
        if (doc.version) {
          const msg = 'The %YAML directive must only be given at most once per document.';
          doc.errors.push(new PlainValue$1.YAMLSemanticError(directive, msg));
        }

        try {
          doc.version = resolveYamlDirective(doc, directive);
        } catch (error) {
          doc.errors.push(error);
        }

        hasDirectives = true;
        break;

      default:
        if (name) {
          const msg = `YAML only supports %TAG and %YAML directives, and not %${name}`;
          doc.warnings.push(new PlainValue$1.YAMLWarning(directive, msg));
        }

    }

    if (comment) directiveComments.push(comment);
  }

  if (prevDoc && !hasDirectives && '1.1' === (doc.version || prevDoc.version || doc.options.version)) {
    const copyTagPrefix = ({
      handle,
      prefix
    }) => ({
      handle,
      prefix
    });

    doc.tagPrefixes = prevDoc.tagPrefixes.map(copyTagPrefix);
    doc.version = prevDoc.version;
  }

  doc.commentBefore = directiveComments.join('\n') || null;
}

function assertCollection(contents) {
  if (contents instanceof resolveSeq.Collection) return true;
  throw new Error('Expected a YAML collection as document contents');
}

class Document$2 {
  constructor(options) {
    this.anchors = new Anchors(options.anchorPrefix);
    this.commentBefore = null;
    this.comment = null;
    this.contents = null;
    this.directivesEndMarker = null;
    this.errors = [];
    this.options = options;
    this.schema = null;
    this.tagPrefixes = [];
    this.version = null;
    this.warnings = [];
  }

  add(value) {
    assertCollection(this.contents);
    return this.contents.add(value);
  }

  addIn(path, value) {
    assertCollection(this.contents);
    this.contents.addIn(path, value);
  }

  delete(key) {
    assertCollection(this.contents);
    return this.contents.delete(key);
  }

  deleteIn(path) {
    if (resolveSeq.isEmptyPath(path)) {
      if (this.contents == null) return false;
      this.contents = null;
      return true;
    }

    assertCollection(this.contents);
    return this.contents.deleteIn(path);
  }

  getDefaults() {
    return Document$2.defaults[this.version] || Document$2.defaults[this.options.version] || {};
  }

  get(key, keepScalar) {
    return this.contents instanceof resolveSeq.Collection ? this.contents.get(key, keepScalar) : undefined;
  }

  getIn(path, keepScalar) {
    if (resolveSeq.isEmptyPath(path)) return !keepScalar && this.contents instanceof resolveSeq.Scalar ? this.contents.value : this.contents;
    return this.contents instanceof resolveSeq.Collection ? this.contents.getIn(path, keepScalar) : undefined;
  }

  has(key) {
    return this.contents instanceof resolveSeq.Collection ? this.contents.has(key) : false;
  }

  hasIn(path) {
    if (resolveSeq.isEmptyPath(path)) return this.contents !== undefined;
    return this.contents instanceof resolveSeq.Collection ? this.contents.hasIn(path) : false;
  }

  set(key, value) {
    assertCollection(this.contents);
    this.contents.set(key, value);
  }

  setIn(path, value) {
    if (resolveSeq.isEmptyPath(path)) this.contents = value;else {
      assertCollection(this.contents);
      this.contents.setIn(path, value);
    }
  }

  setSchema(id, customTags) {
    if (!id && !customTags && this.schema) return;
    if (typeof id === 'number') id = id.toFixed(1);

    if (id === '1.0' || id === '1.1' || id === '1.2') {
      if (this.version) this.version = id;else this.options.version = id;
      delete this.options.schema;
    } else if (id && typeof id === 'string') {
      this.options.schema = id;
    }

    if (Array.isArray(customTags)) this.options.customTags = customTags;
    const opt = Object.assign({}, this.getDefaults(), this.options);
    this.schema = new Schema$1.Schema(opt);
  }

  parse(node, prevDoc) {
    if (this.options.keepCstNodes) this.cstNode = node;
    if (this.options.keepNodeTypes) this.type = 'DOCUMENT';
    const {
      directives = [],
      contents = [],
      directivesEndMarker,
      error,
      valueRange
    } = node;

    if (error) {
      if (!error.source) error.source = this;
      this.errors.push(error);
    }

    parseDirectives(this, directives, prevDoc);
    if (directivesEndMarker) this.directivesEndMarker = true;
    this.range = valueRange ? [valueRange.start, valueRange.end] : null;
    this.setSchema();
    this.anchors._cstAliases = [];
    parseContents(this, contents);
    this.anchors.resolveNodes();

    if (this.options.prettyErrors) {
      for (const error of this.errors) if (error instanceof PlainValue$1.YAMLError) error.makePretty();

      for (const warn of this.warnings) if (warn instanceof PlainValue$1.YAMLError) warn.makePretty();
    }

    return this;
  }

  listNonDefaultTags() {
    return listTagNames(this.contents).filter(t => t.indexOf(Schema$1.Schema.defaultPrefix) !== 0);
  }

  setTagPrefix(handle, prefix) {
    if (handle[0] !== '!' || handle[handle.length - 1] !== '!') throw new Error('Handle must start and end with !');

    if (prefix) {
      const prev = this.tagPrefixes.find(p => p.handle === handle);
      if (prev) prev.prefix = prefix;else this.tagPrefixes.push({
        handle,
        prefix
      });
    } else {
      this.tagPrefixes = this.tagPrefixes.filter(p => p.handle !== handle);
    }
  }

  toJSON(arg, onAnchor) {
    const {
      keepBlobsInJSON,
      mapAsMap,
      maxAliasCount
    } = this.options;
    const keep = keepBlobsInJSON && (typeof arg !== 'string' || !(this.contents instanceof resolveSeq.Scalar));
    const ctx = {
      doc: this,
      indentStep: '  ',
      keep,
      mapAsMap: keep && !!mapAsMap,
      maxAliasCount,
      stringify: stringify$1 // Requiring directly in Pair would create circular dependencies

    };
    const anchorNames = Object.keys(this.anchors.map);
    if (anchorNames.length > 0) ctx.anchors = new Map(anchorNames.map(name => [this.anchors.map[name], {
      alias: [],
      aliasCount: 0,
      count: 1
    }]));
    const res = resolveSeq.toJSON(this.contents, arg, ctx);
    if (typeof onAnchor === 'function' && ctx.anchors) for (const {
      count,
      res
    } of ctx.anchors.values()) onAnchor(res, count);
    return res;
  }

  toString() {
    if (this.errors.length > 0) throw new Error('Document with errors cannot be stringified');
    const indentSize = this.options.indent;

    if (!Number.isInteger(indentSize) || indentSize <= 0) {
      const s = JSON.stringify(indentSize);
      throw new Error(`"indent" option must be a positive integer, not ${s}`);
    }

    this.setSchema();
    const lines = [];
    let hasDirectives = false;

    if (this.version) {
      let vd = '%YAML 1.2';

      if (this.schema.name === 'yaml-1.1') {
        if (this.version === '1.0') vd = '%YAML:1.0';else if (this.version === '1.1') vd = '%YAML 1.1';
      }

      lines.push(vd);
      hasDirectives = true;
    }

    const tagNames = this.listNonDefaultTags();
    this.tagPrefixes.forEach(({
      handle,
      prefix
    }) => {
      if (tagNames.some(t => t.indexOf(prefix) === 0)) {
        lines.push(`%TAG ${handle} ${prefix}`);
        hasDirectives = true;
      }
    });
    if (hasDirectives || this.directivesEndMarker) lines.push('---');

    if (this.commentBefore) {
      if (hasDirectives || !this.directivesEndMarker) lines.unshift('');
      lines.unshift(this.commentBefore.replace(/^/gm, '#'));
    }

    const ctx = {
      anchors: Object.create(null),
      doc: this,
      indent: '',
      indentStep: ' '.repeat(indentSize),
      stringify: stringify$1 // Requiring directly in nodes would create circular dependencies

    };
    let chompKeep = false;
    let contentComment = null;

    if (this.contents) {
      if (this.contents instanceof resolveSeq.Node) {
        if (this.contents.spaceBefore && (hasDirectives || this.directivesEndMarker)) lines.push('');
        if (this.contents.commentBefore) lines.push(this.contents.commentBefore.replace(/^/gm, '#')); // top-level block scalars need to be indented if followed by a comment

        ctx.forceBlockIndent = !!this.comment;
        contentComment = this.contents.comment;
      }

      const onChompKeep = contentComment ? null : () => chompKeep = true;
      const body = stringify$1(this.contents, ctx, () => contentComment = null, onChompKeep);
      lines.push(resolveSeq.addComment(body, '', contentComment));
    } else if (this.contents !== undefined) {
      lines.push(stringify$1(this.contents, ctx));
    }

    if (this.comment) {
      if ((!chompKeep || contentComment) && lines[lines.length - 1] !== '') lines.push('');
      lines.push(this.comment.replace(/^/gm, '#'));
    }

    return lines.join('\n') + '\n';
  }

}

PlainValue$1._defineProperty(Document$2, "defaults", documentOptions);

Document9b4560a1.Document = Document$2;
Document9b4560a1.defaultOptions = defaultOptions;
Document9b4560a1.scalarOptions = scalarOptions;

var parseCst = parseCst$1;
var Document$1 = Document9b4560a1;
var Schema = Schema88e323a7;
var PlainValue = PlainValueEc8e588e;
var warnings = warnings1000a372;


function createNode(value, wrapScalars = true, tag) {
  if (tag === undefined && typeof wrapScalars === 'string') {
    tag = wrapScalars;
    wrapScalars = true;
  }

  const options = Object.assign({}, Document$1.Document.defaults[Document$1.defaultOptions.version], Document$1.defaultOptions);
  const schema = new Schema.Schema(options);
  return schema.createNode(value, wrapScalars, tag);
}

class Document extends Document$1.Document {
  constructor(options) {
    super(Object.assign({}, Document$1.defaultOptions, options));
  }

}

function parseAllDocuments(src, options) {
  const stream = [];
  let prev;

  for (const cstDoc of parseCst.parse(src)) {
    const doc = new Document(options);
    doc.parse(cstDoc, prev);
    stream.push(doc);
    prev = doc;
  }

  return stream;
}

function parseDocument(src, options) {
  const cst = parseCst.parse(src);
  const doc = new Document(options).parse(cst[0]);

  if (cst.length > 1) {
    const errMsg = 'Source contains multiple documents; please use YAML.parseAllDocuments()';
    doc.errors.unshift(new PlainValue.YAMLSemanticError(cst[1], errMsg));
  }

  return doc;
}

function parse(src, options) {
  const doc = parseDocument(src, options);
  doc.warnings.forEach(warning => warnings.warn(warning));
  if (doc.errors.length > 0) throw doc.errors[0];
  return doc.toJSON();
}

function stringify(value, options) {
  const doc = new Document(options);
  doc.contents = value;
  return String(doc);
}

const YAML = {
  createNode,
  defaultOptions: Document$1.defaultOptions,
  Document,
  parse,
  parseAllDocuments,
  parseCST: parseCst.parse,
  parseDocument,
  scalarOptions: Document$1.scalarOptions,
  stringify
};

dist.YAML = YAML;

var yaml = dist.YAML;

function getLongestString(input) {
    const map = input.map(x => x.length);
    const max = map.indexOf(Math.max(...map));
    return input[max];
}
/**
 * Returns salts object as DotEnv string
 * @param input
 * @returns
 */
function toDotEnv(input) {
    return Object.keys(input).map((key) => {
        return `${key}='${input[key]}'`;
    }).join('\n');
}
/**
 * Returns salts object as PHP code string
 * @param input
 * @returns
 */
function toPHP(input, prettyPrint = true) {
    const maxLength = getLongestString(Object.keys(input)).length;
    return Object.keys(input).map((key) => {
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
function toYAML(input) {
    return yaml.stringify(input);
}

var hasFlag$1 = (flag, argv = process.argv) => {
	const prefix = flag.startsWith('-') ? '' : (flag.length === 1 ? '-' : '--');
	const position = argv.indexOf(prefix + flag);
	const terminatorPosition = argv.indexOf('--');
	return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
};

const os = require$$0$1;
const tty = require$$1$2;
const hasFlag = hasFlag$1;

const {env} = process;

let forceColor;
if (hasFlag('no-color') ||
	hasFlag('no-colors') ||
	hasFlag('color=false') ||
	hasFlag('color=never')) {
	forceColor = 0;
} else if (hasFlag('color') ||
	hasFlag('colors') ||
	hasFlag('color=true') ||
	hasFlag('color=always')) {
	forceColor = 1;
}

if ('FORCE_COLOR' in env) {
	if (env.FORCE_COLOR === 'true') {
		forceColor = 1;
	} else if (env.FORCE_COLOR === 'false') {
		forceColor = 0;
	} else {
		forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
	}
}

function translateLevel(level) {
	if (level === 0) {
		return false;
	}

	return {
		level,
		hasBasic: true,
		has256: level >= 2,
		has16m: level >= 3
	};
}

function supportsColor(haveStream, streamIsTTY) {
	if (forceColor === 0) {
		return 0;
	}

	if (hasFlag('color=16m') ||
		hasFlag('color=full') ||
		hasFlag('color=truecolor')) {
		return 3;
	}

	if (hasFlag('color=256')) {
		return 2;
	}

	if (haveStream && !streamIsTTY && forceColor === undefined) {
		return 0;
	}

	const min = forceColor || 0;

	if (env.TERM === 'dumb') {
		return min;
	}

	if (process.platform === 'win32') {
		// Windows 10 build 10586 is the first Windows release that supports 256 colors.
		// Windows 10 build 14931 is the first release that supports 16m/TrueColor.
		const osRelease = os.release().split('.');
		if (
			Number(osRelease[0]) >= 10 &&
			Number(osRelease[2]) >= 10586
		) {
			return Number(osRelease[2]) >= 14931 ? 3 : 2;
		}

		return 1;
	}

	if ('CI' in env) {
		if (['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI', 'GITHUB_ACTIONS', 'BUILDKITE'].some(sign => sign in env) || env.CI_NAME === 'codeship') {
			return 1;
		}

		return min;
	}

	if ('TEAMCITY_VERSION' in env) {
		return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
	}

	if (env.COLORTERM === 'truecolor') {
		return 3;
	}

	if ('TERM_PROGRAM' in env) {
		const version = parseInt((env.TERM_PROGRAM_VERSION || '').split('.')[0], 10);

		switch (env.TERM_PROGRAM) {
			case 'iTerm.app':
				return version >= 3 ? 3 : 2;
			case 'Apple_Terminal':
				return 2;
			// No default
		}
	}

	if (/-256(color)?$/i.test(env.TERM)) {
		return 2;
	}

	if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
		return 1;
	}

	if ('COLORTERM' in env) {
		return 1;
	}

	return min;
}

function getSupportLevel(stream) {
	const level = supportsColor(stream, stream && stream.isTTY);
	return translateLevel(level);
}

var supportsColor_1 = {
	supportsColor: getSupportLevel,
	stdout: translateLevel(supportsColor(true, tty.isatty(1))),
	stderr: translateLevel(supportsColor(true, tty.isatty(2)))
};

const stringReplaceAll$1 = (string, substring, replacer) => {
	let index = string.indexOf(substring);
	if (index === -1) {
		return string;
	}

	const substringLength = substring.length;
	let endIndex = 0;
	let returnValue = '';
	do {
		returnValue += string.substr(endIndex, index - endIndex) + substring + replacer;
		endIndex = index + substringLength;
		index = string.indexOf(substring, endIndex);
	} while (index !== -1);

	returnValue += string.substr(endIndex);
	return returnValue;
};

const stringEncaseCRLFWithFirstIndex$1 = (string, prefix, postfix, index) => {
	let endIndex = 0;
	let returnValue = '';
	do {
		const gotCR = string[index - 1] === '\r';
		returnValue += string.substr(endIndex, (gotCR ? index - 1 : index) - endIndex) + prefix + (gotCR ? '\r\n' : '\n') + postfix;
		endIndex = index + 1;
		index = string.indexOf('\n', endIndex);
	} while (index !== -1);

	returnValue += string.substr(endIndex);
	return returnValue;
};

var util = {
	stringReplaceAll: stringReplaceAll$1,
	stringEncaseCRLFWithFirstIndex: stringEncaseCRLFWithFirstIndex$1
};

const TEMPLATE_REGEX = /(?:\\(u(?:[a-f\d]{4}|\{[a-f\d]{1,6}\})|x[a-f\d]{2}|.))|(?:\{(~)?(\w+(?:\([^)]*\))?(?:\.\w+(?:\([^)]*\))?)*)(?:[ \t]|(?=\r?\n)))|(\})|((?:.|[\r\n\f])+?)/gi;
const STYLE_REGEX = /(?:^|\.)(\w+)(?:\(([^)]*)\))?/g;
const STRING_REGEX = /^(['"])((?:\\.|(?!\1)[^\\])*)\1$/;
const ESCAPE_REGEX = /\\(u(?:[a-f\d]{4}|{[a-f\d]{1,6}})|x[a-f\d]{2}|.)|([^\\])/gi;

const ESCAPES = new Map([
	['n', '\n'],
	['r', '\r'],
	['t', '\t'],
	['b', '\b'],
	['f', '\f'],
	['v', '\v'],
	['0', '\0'],
	['\\', '\\'],
	['e', '\u001B'],
	['a', '\u0007']
]);

function unescape(c) {
	const u = c[0] === 'u';
	const bracket = c[1] === '{';

	if ((u && !bracket && c.length === 5) || (c[0] === 'x' && c.length === 3)) {
		return String.fromCharCode(parseInt(c.slice(1), 16));
	}

	if (u && bracket) {
		return String.fromCodePoint(parseInt(c.slice(2, -1), 16));
	}

	return ESCAPES.get(c) || c;
}

function parseArguments(name, arguments_) {
	const results = [];
	const chunks = arguments_.trim().split(/\s*,\s*/g);
	let matches;

	for (const chunk of chunks) {
		const number = Number(chunk);
		if (!Number.isNaN(number)) {
			results.push(number);
		} else if ((matches = chunk.match(STRING_REGEX))) {
			results.push(matches[2].replace(ESCAPE_REGEX, (m, escape, character) => escape ? unescape(escape) : character));
		} else {
			throw new Error(`Invalid Chalk template style argument: ${chunk} (in style '${name}')`);
		}
	}

	return results;
}

function parseStyle(style) {
	STYLE_REGEX.lastIndex = 0;

	const results = [];
	let matches;

	while ((matches = STYLE_REGEX.exec(style)) !== null) {
		const name = matches[1];

		if (matches[2]) {
			const args = parseArguments(name, matches[2]);
			results.push([name].concat(args));
		} else {
			results.push([name]);
		}
	}

	return results;
}

function buildStyle(chalk, styles) {
	const enabled = {};

	for (const layer of styles) {
		for (const style of layer.styles) {
			enabled[style[0]] = layer.inverse ? null : style.slice(1);
		}
	}

	let current = chalk;
	for (const [styleName, styles] of Object.entries(enabled)) {
		if (!Array.isArray(styles)) {
			continue;
		}

		if (!(styleName in current)) {
			throw new Error(`Unknown Chalk style: ${styleName}`);
		}

		current = styles.length > 0 ? current[styleName](...styles) : current[styleName];
	}

	return current;
}

var templates = (chalk, temporary) => {
	const styles = [];
	const chunks = [];
	let chunk = [];

	// eslint-disable-next-line max-params
	temporary.replace(TEMPLATE_REGEX, (m, escapeCharacter, inverse, style, close, character) => {
		if (escapeCharacter) {
			chunk.push(unescape(escapeCharacter));
		} else if (style) {
			const string = chunk.join('');
			chunk = [];
			chunks.push(styles.length === 0 ? string : buildStyle(chalk, styles)(string));
			styles.push({inverse, styles: parseStyle(style)});
		} else if (close) {
			if (styles.length === 0) {
				throw new Error('Found extraneous } in Chalk template literal');
			}

			chunks.push(buildStyle(chalk, styles)(chunk.join('')));
			chunk = [];
			styles.pop();
		} else {
			chunk.push(character);
		}
	});

	chunks.push(chunk.join(''));

	if (styles.length > 0) {
		const errMessage = `Chalk template literal is missing ${styles.length} closing bracket${styles.length === 1 ? '' : 's'} (\`}\`)`;
		throw new Error(errMessage);
	}

	return chunks.join('');
};

const ansiStyles = ansiStyles$2.exports;
const {stdout: stdoutColor, stderr: stderrColor} = supportsColor_1;
const {
	stringReplaceAll,
	stringEncaseCRLFWithFirstIndex
} = util;

const {isArray} = Array;

// `supportsColor.level` → `ansiStyles.color[name]` mapping
const levelMapping = [
	'ansi',
	'ansi',
	'ansi256',
	'ansi16m'
];

const styles = Object.create(null);

const applyOptions = (object, options = {}) => {
	if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
		throw new Error('The `level` option should be an integer from 0 to 3');
	}

	// Detect level if not set manually
	const colorLevel = stdoutColor ? stdoutColor.level : 0;
	object.level = options.level === undefined ? colorLevel : options.level;
};

class ChalkClass {
	constructor(options) {
		// eslint-disable-next-line no-constructor-return
		return chalkFactory(options);
	}
}

const chalkFactory = options => {
	const chalk = {};
	applyOptions(chalk, options);

	chalk.template = (...arguments_) => chalkTag(chalk.template, ...arguments_);

	Object.setPrototypeOf(chalk, Chalk.prototype);
	Object.setPrototypeOf(chalk.template, chalk);

	chalk.template.constructor = () => {
		throw new Error('`chalk.constructor()` is deprecated. Use `new chalk.Instance()` instead.');
	};

	chalk.template.Instance = ChalkClass;

	return chalk.template;
};

function Chalk(options) {
	return chalkFactory(options);
}

for (const [styleName, style] of Object.entries(ansiStyles)) {
	styles[styleName] = {
		get() {
			const builder = createBuilder(this, createStyler(style.open, style.close, this._styler), this._isEmpty);
			Object.defineProperty(this, styleName, {value: builder});
			return builder;
		}
	};
}

styles.visible = {
	get() {
		const builder = createBuilder(this, this._styler, true);
		Object.defineProperty(this, 'visible', {value: builder});
		return builder;
	}
};

const usedModels = ['rgb', 'hex', 'keyword', 'hsl', 'hsv', 'hwb', 'ansi', 'ansi256'];

for (const model of usedModels) {
	styles[model] = {
		get() {
			const {level} = this;
			return function (...arguments_) {
				const styler = createStyler(ansiStyles.color[levelMapping[level]][model](...arguments_), ansiStyles.color.close, this._styler);
				return createBuilder(this, styler, this._isEmpty);
			};
		}
	};
}

for (const model of usedModels) {
	const bgModel = 'bg' + model[0].toUpperCase() + model.slice(1);
	styles[bgModel] = {
		get() {
			const {level} = this;
			return function (...arguments_) {
				const styler = createStyler(ansiStyles.bgColor[levelMapping[level]][model](...arguments_), ansiStyles.bgColor.close, this._styler);
				return createBuilder(this, styler, this._isEmpty);
			};
		}
	};
}

const proto = Object.defineProperties(() => {}, {
	...styles,
	level: {
		enumerable: true,
		get() {
			return this._generator.level;
		},
		set(level) {
			this._generator.level = level;
		}
	}
});

const createStyler = (open, close, parent) => {
	let openAll;
	let closeAll;
	if (parent === undefined) {
		openAll = open;
		closeAll = close;
	} else {
		openAll = parent.openAll + open;
		closeAll = close + parent.closeAll;
	}

	return {
		open,
		close,
		openAll,
		closeAll,
		parent
	};
};

const createBuilder = (self, _styler, _isEmpty) => {
	const builder = (...arguments_) => {
		if (isArray(arguments_[0]) && isArray(arguments_[0].raw)) {
			// Called as a template literal, for example: chalk.red`2 + 3 = {bold ${2+3}}`
			return applyStyle(builder, chalkTag(builder, ...arguments_));
		}

		// Single argument is hot path, implicit coercion is faster than anything
		// eslint-disable-next-line no-implicit-coercion
		return applyStyle(builder, (arguments_.length === 1) ? ('' + arguments_[0]) : arguments_.join(' '));
	};

	// We alter the prototype because we must return a function, but there is
	// no way to create a function with a different prototype
	Object.setPrototypeOf(builder, proto);

	builder._generator = self;
	builder._styler = _styler;
	builder._isEmpty = _isEmpty;

	return builder;
};

const applyStyle = (self, string) => {
	if (self.level <= 0 || !string) {
		return self._isEmpty ? '' : string;
	}

	let styler = self._styler;

	if (styler === undefined) {
		return string;
	}

	const {openAll, closeAll} = styler;
	if (string.indexOf('\u001B') !== -1) {
		while (styler !== undefined) {
			// Replace any instances already present with a re-opening code
			// otherwise only the part of the string until said closing code
			// will be colored, and the rest will simply be 'plain'.
			string = stringReplaceAll(string, styler.close, styler.open);

			styler = styler.parent;
		}
	}

	// We can move both next actions out of loop, because remaining actions in loop won't have
	// any/visible effect on parts we add here. Close the styling before a linebreak and reopen
	// after next line to fix a bleed issue on macOS: https://github.com/chalk/chalk/pull/92
	const lfIndex = string.indexOf('\n');
	if (lfIndex !== -1) {
		string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
	}

	return openAll + string + closeAll;
};

let template;
const chalkTag = (chalk, ...strings) => {
	const [firstString] = strings;

	if (!isArray(firstString) || !isArray(firstString.raw)) {
		// If chalk() was called by itself or with a string,
		// return the string itself as a string.
		return strings.join(' ');
	}

	const arguments_ = strings.slice(1);
	const parts = [firstString.raw[0]];

	for (let i = 1; i < firstString.length; i++) {
		parts.push(
			String(arguments_[i - 1]).replace(/[{}\\]/g, '\\$&'),
			String(firstString.raw[i])
		);
	}

	if (template === undefined) {
		template = templates;
	}

	return template(chalk, parts.join(''));
};

Object.defineProperties(Chalk.prototype, styles);

const chalk = Chalk(); // eslint-disable-line new-cap
chalk.supportsColor = stdoutColor;
chalk.stderr = Chalk({level: stderrColor ? stderrColor.level : 0}); // eslint-disable-line new-cap
chalk.stderr.supportsColor = stderrColor;

var source = chalk;

const logSymbols = {
	info: 'ℹ️',
	success: '✅',
	warning: '⚠️',
	error: '❌️',
};

function isPlainObject(value) {
	if (Object.prototype.toString.call(value) !== '[object Object]') {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === null || prototype === Object.prototype;
}

function sortKeys(object, options = {}) {
	if (!isPlainObject(object) && !Array.isArray(object)) {
		throw new TypeError('Expected a plain object or array');
	}

	const {deep, compare} = options;
	const seenInput = [];
	const seenOutput = [];

	const deepSortArray = array => {
		const seenIndex = seenInput.indexOf(array);
		if (seenIndex !== -1) {
			return seenOutput[seenIndex];
		}

		const result = [];
		seenInput.push(array);
		seenOutput.push(result);

		result.push(...array.map(item => {
			if (Array.isArray(item)) {
				return deepSortArray(item);
			}

			if (isPlainObject(item)) {
				return _sortKeys(item);
			}

			return item;
		}));

		return result;
	};

	const _sortKeys = object => {
		const seenIndex = seenInput.indexOf(object);
		if (seenIndex !== -1) {
			return seenOutput[seenIndex];
		}

		const result = {};
		const keys = Object.keys(object).sort(compare);

		seenInput.push(object);
		seenOutput.push(result);

		for (const key of keys) {
			const value = object[key];
			let newValue;

			if (deep && Array.isArray(value)) {
				newValue = deepSortArray(value);
			} else {
				newValue = deep && isPlainObject(value) ? _sortKeys(value) : value;
			}

			Object.defineProperty(result, key, {
				...Object.getOwnPropertyDescriptor(object, key),
				value: newValue
			});
		}

		return result;
	};

	if (Array.isArray(object)) {
		return deep ? deepSortArray(object) : object.slice();
	}

	return _sortKeys(object);
}

// Dependencies
const { version } = JSON.parse(await promises.readFile('./package.json', 'utf8'));
// Action
commander.exports.program
    .version(version)
    .description('CLI tool to generate WordPress salts in various formats')
    .arguments('[options]')
    .usage('[options]')
    .option('-D, --dotenv', 'output as DotENV')
    .option('-J, --json', 'output as JSON')
    .option('-P, --php', 'output as PHP')
    .option('-Y, --yaml', 'output as YAML')
    .option('-b, --break', 'add line-breaks before and after the result')
    .option('-i, --indent <int>', 'indentation level for JSON output', parseInt)
    .option('-l, --length <int>', 'length of the salt (default: 64)', parseInt)
    .option('-s, --sort', 'sort keys alphabetically')
    .option('-u, --ugly', 'don\'t align JSON or PHP output')
    .parse(process.argv);
const options = commander.exports.program.opts();
if (options.indent && options.ugly) {
    console.error(logSymbols.error, 'You cannot combine the indent and ugly flags\n');
    process.exit();
}
let indentation;
Object.freeze(commander.exports.program);
if (options.indent && !isNaN(options.indent)) {
    indentation = options.indent;
}
else if (!options.indent && options.ugly) {
    indentation = 0;
}
else {
    indentation = 2;
}
const saltLength = (options.length)
    ? options.length
    : 64;
let salts = commander.exports.program.args.length
    ? wpSalts(commander.exports.program.args, saltLength)
    : wpSalts('', saltLength);
if (options.sort) {
    salts = sortKeys(salts);
}
Object.freeze(salts);
lineBreak(options);
if (options.json) {
    console.log(JSON.stringify(salts, null, indentation));
}
else if (options.yaml) {
    console.log(toYAML(salts));
}
else if (options.dotenv) {
    console.log(toDotEnv(salts));
}
else if (options.php) {
    console.log(toPHP(salts, !options.ugly));
}
else {
    const data = [
        [source.bold('Key'), source.bold('Salt')]
    ];
    Object.keys(salts).forEach((key) => {
        data.push([key, salts[key]]);
    });
    const output = src.table(data, { border: src.getBorderCharacters('norc') });
    console.log(output);
}
lineBreak(options);
// Helpers
function lineBreak(p) {
    if (p.break && (p.json || p.yaml || p.dotenv || p.php)) {
        console.log();
    }
}
