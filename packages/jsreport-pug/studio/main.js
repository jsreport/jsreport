/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.textEditorInitializeListeners.push(function (_ref) {
  var monaco = _ref.monaco,
      theme = _ref.theme;

  registerPugLanguage(monaco);
});

_jsreportStudio2.default.templateEditorModeResolvers.push(function (template) {
  return template.engine === 'pug' ? 'pug' : null;
});

function registerPugLanguage(monaco) {
  var languageId = 'pug';

  var language = {
    defaultToken: '',
    tokenPostfix: '.pug',

    ignoreCase: true,

    brackets: [{ token: 'delimiter.curly', open: '{', close: '}' }, { token: 'delimiter.array', open: '[', close: ']' }, { token: 'delimiter.parenthesis', open: '(', close: ')' }],

    keywords: ['append', 'block', 'case', 'default', 'doctype', 'each', 'else', 'extends', 'for', 'if', 'in', 'include', 'mixin', 'typeof', 'unless', 'var', 'when'],

    tags: ['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'basefont', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'command', 'datalist', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'keygen', 'kbd', 'label', 'li', 'link', 'map', 'mark', 'menu', 'meta', 'meter', 'nav', 'noframes', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'tracks', 'tt', 'u', 'ul', 'video', 'wbr'],

    // we include these common regular expressions
    // eslint-disable-next-line no-useless-escape
    symbols: /[\+\-\*\%\&\|\!\=\/\.\,\:]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
      root: [
      // Tag or a keyword at start
      [/^(\s*)([a-zA-Z_-][\w-]*)/, {
        cases: {
          '$2@tags': {
            cases: {
              '@eos': ['', 'tag'],
              '@default': ['', { token: 'tag', next: '@tag.$1' }]
            }
          },
          '$2@keywords': ['', { token: 'keyword.$2' }],
          '@default': ['', '']
        }
      }],

      // id
      [/^(\s*)(#[a-zA-Z_-][\w-]*)/, {
        cases: {
          '@eos': ['', 'tag.id'],
          '@default': ['', { token: 'tag.id', next: '@tag.$1' }]
        }
      }],

      // class
      [/^(\s*)(\.[a-zA-Z_-][\w-]*)/, {
        cases: {
          '@eos': ['', 'tag.class'],
          '@default': ['', { token: 'tag.class', next: '@tag.$1' }]
        }
      }],

      // plain text with pipe
      [/^(\s*)(\|.*)$/, ''], { include: '@whitespace' },

      // keywords
      [/[a-zA-Z_$][\w$]*/, {
        cases: {
          '@keywords': { token: 'keyword.$0' },
          '@default': ''
        }
      }],

      // delimiters and operators
      // eslint-disable-next-line no-useless-escape
      [/[{}()\[\]]/, '@brackets'], [/@symbols/, 'delimiter'],

      // numbers
      // eslint-disable-next-line no-useless-escape
      [/\d+\.\d+([eE][\-+]?\d+)?/, 'number.float'], [/\d+/, 'number'],

      // strings:
      [/"/, 'string', '@string."'], [/'/, 'string', "@string.'"]],

      tag: [[/(\.)(\s*$)/, [{ token: 'delimiter', next: '@blockText.$S2.' }, '']], [/\s+/, { token: '', next: '@simpleText' }],

      // id
      [/#[a-zA-Z_-][\w-]*/, {
        cases: {
          '@eos': { token: 'tag.id', next: '@pop' },
          '@default': 'tag.id'
        }
      }],
      // class
      [/\.[a-zA-Z_-][\w-]*/, {
        cases: {
          '@eos': { token: 'tag.class', next: '@pop' },
          '@default': 'tag.class'
        }
      }],
      // attributes
      [/\(/, { token: 'delimiter.parenthesis', next: '@attributeList' }]],

      simpleText: [[/[^#]+$/, { token: '', next: '@popall' }], [/[^#]+/, { token: '' }],

      // interpolation
      [/(#{)([^}]*)(})/, {
        cases: {
          '@eos': ['interpolation.delimiter', 'interpolation', {
            token: 'interpolation.delimiter',
            next: '@popall'
          }],
          '@default': ['interpolation.delimiter', 'interpolation', 'interpolation.delimiter']
        }
      }], [/#$/, { token: '', next: '@popall' }], [/#/, '']],

      attributeList: [[/\s+/, ''], [/(\w+)(\s*=\s*)("|')/, ['attribute.name', 'delimiter', { token: 'attribute.value', next: '@value.$3' }]], [/\w+/, 'attribute.name'], [/,/, {
        cases: {
          '@eos': {
            token: 'attribute.delimiter',
            next: '@popall'
          },
          '@default': 'attribute.delimiter'
        }
      }], [/\)$/, { token: 'delimiter.parenthesis', next: '@popall' }], [/\)/, { token: 'delimiter.parenthesis', next: '@pop' }]],

      whitespace: [[/^(\s*)(\/\/.*)$/, { token: 'comment', next: '@blockText.$1.comment' }], [/[ \t\r\n]+/, ''], [/<!--/, { token: 'comment', next: '@comment' }]],

      blockText: [[/^\s+.*$/, {
        cases: {
          '($S2\\s+.*$)': { token: '$S3' },
          '@default': { token: '@rematch', next: '@popall' }
        }
      }], [/./, { token: '@rematch', next: '@popall' }]],

      comment: [
      // eslint-disable-next-line no-useless-escape
      [/[^<\-]+/, 'comment.content'], [/-->/, { token: 'comment', next: '@pop' }], [/<!--/, 'comment.content.invalid'],
      // eslint-disable-next-line no-useless-escape
      [/[<\-]/, 'comment.content']],

      string: [[/[^\\"'#]+/, {
        cases: {
          '@eos': { token: 'string', next: '@popall' },
          '@default': 'string'
        }
      }], [/@escapes/, {
        cases: {
          '@eos': { token: 'string.escape', next: '@popall' },
          '@default': 'string.escape'
        }
      }], [/\\./, {
        cases: {
          '@eos': {
            token: 'string.escape.invalid',
            next: '@popall'
          },
          '@default': 'string.escape.invalid'
        }
      }],
      // interpolation
      [/(#{)([^}]*)(})/, ['interpolation.delimiter', 'interpolation', 'interpolation.delimiter']], [/#/, 'string'], [/["']/, {
        cases: {
          '$#==$S2': { token: 'string', next: '@pop' },
          '@default': { token: 'string' }
        }
      }]],

      // Almost identical to above, except for escapes and the output token
      value: [[/[^\\"']+/, {
        cases: {
          '@eos': { token: 'attribute.value', next: '@popall' },
          '@default': 'attribute.value'
        }
      }], [/\\./, {
        cases: {
          '@eos': { token: 'attribute.value', next: '@popall' },
          '@default': 'attribute.value'
        }
      }], [/["']/, {
        cases: {
          '$#==$S2': { token: 'attribute.value', next: '@pop' },
          '@default': { token: 'attribute.value' }
        }
      }]]
    }

    // took from https://github.com/microsoft/monaco-languages/blob/main/src/pug/pug.ts
  };var conf = {
    comments: {
      lineComment: '//'
    },
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    autoClosingPairs: [{ open: '"', close: '"', notIn: ['string', 'comment'] }, { open: "'", close: "'", notIn: ['string', 'comment'] }, { open: '{', close: '}', notIn: ['string', 'comment'] }, { open: '[', close: ']', notIn: ['string', 'comment'] }, { open: '(', close: ')', notIn: ['string', 'comment'] }],
    folding: {
      offSide: true
    }
  };

  monaco.languages.register({ id: languageId });

  monaco.languages.setMonarchTokensProvider(languageId, language);
  monaco.languages.setLanguageConfiguration(languageId, conf);
}

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = Studio;

/***/ })
/******/ ]);