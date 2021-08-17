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

  registerEJSLanguage(monaco);
  updateThemeRule(theme, 'delimiter.ejs', 'aa0d91');
});

_jsreportStudio2.default.templateEditorModeResolvers.push(function (template) {
  return template.engine === 'ejs' ? 'ejs' : null;
});

function registerEJSLanguage(monaco) {
  var languageId = 'ejs';

  var EMPTY_ELEMENTS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr'];

  var conf = {
    // eslint-disable-next-line no-useless-escape
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
    comments: {
      blockComment: ['<%#', '%>']
    },
    brackets: [['<!--', '-->'], ['<', '>'], ['{{', '}}'], ['{', '}'], ['(', ')']],
    autoClosingPairs: [{ open: '{', close: '}' }, { open: '[', close: ']' }, { open: '(', close: ')' }, { open: '"', close: '"' }, { open: '\'', close: '\'' }],
    surroundingPairs: [{ open: '<', close: '>' }, { open: '"', close: '"' }, { open: '\'', close: '\'' }],
    onEnterRules: [{
      beforeText: new RegExp('<(?!(?:' + EMPTY_ELEMENTS.join('|') + '))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$', 'i'),
      afterText: /^<\/(\w[\w\d]*)\s*>$/i,
      action: { indentAction: monaco.languages.IndentAction.IndentOutdent }
    }, {
      beforeText: new RegExp('<(?!(?:' + EMPTY_ELEMENTS.join('|') + '))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$', 'i'),
      action: { indentAction: monaco.languages.IndentAction.Indent }
    }]
  };

  var language = {
    defaultToken: '',
    tokenPostfix: '',
    // ignoreCase: true,
    // The main tokenizer for our languages
    tokenizer: {
      root: [[/<%#/, 'comment.ejs', '@commentEJS'], [/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.root' }], [/<!DOCTYPE/, 'metatag.html', '@doctype'], [/<!--/, 'comment.html', '@comment'], [/(<)(\w+)(\/>)/, ['delimiter.html', 'tag.html', 'delimiter.html']], [/(<)(script)/, ['delimiter.html', { token: 'tag.html', next: '@script' }]], [/(<)(style)/, ['delimiter.html', { token: 'tag.html', next: '@style' }]], [/(<)([:\w]+)/, ['delimiter.html', { token: 'tag.html', next: '@otherTag' }]], [/(<\/)(\w+)/, ['delimiter.html', { token: 'tag.html', next: '@otherTag' }]], [/</, 'delimiter.html'], [/\{/, 'delimiter.html'], [/[^<{]+/] // text
      ],
      doctype: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.comment' }], [/[^>]+/, 'metatag.content.html'], [/>/, 'metatag.html', '@pop']],
      comment: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.comment' }], [/-->/, 'comment.html', '@pop'], [/[^-]+/, 'comment.content.html'], [/./, 'comment.content.html']],
      commentEJS: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.comment' }], [/[-_]?%>/, 'comment.ejs', '@pop'], [/[^%-_]+/, 'comment.content.ejs'], [/./, 'comment.content.ejs']],
      otherTag: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.otherTag' }], [/\/?>/, 'delimiter.html', '@pop'], [/"([^"]*)"/, 'attribute.value'], [/'([^']*)'/, 'attribute.value'],
      // eslint-disable-next-line no-useless-escape
      [/[\w\-]+/, 'attribute.name'], [/=/, 'delimiter'], [/[ \t\r\n]+/]],
      // -- BEGIN <script> tags handling
      // After <script
      script: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.script' }], [/type/, 'attribute.name', '@scriptAfterType'], [/"([^"]*)"/, 'attribute.value'], [/'([^']*)'/, 'attribute.value'],
      // eslint-disable-next-line no-useless-escape
      [/[\w\-]+/, 'attribute.name'], [/=/, 'delimiter'], [/>/, { token: 'delimiter.html', next: '@scriptEmbedded.text/javascript', nextEmbedded: 'text/javascript' }], [/[ \t\r\n]+/], [/(<\/)(script\s*)(>)/, ['delimiter.html', 'tag.html', { token: 'delimiter.html', next: '@pop' }]]],
      // After <script ... type
      scriptAfterType: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.scriptAfterType' }], [/=/, 'delimiter', '@scriptAfterTypeEquals'], [/>/, { token: 'delimiter.html', next: '@scriptEmbedded.text/javascript', nextEmbedded: 'text/javascript' }], [/[ \t\r\n]+/], [/<\/script\s*>/, { token: '@rematch', next: '@pop' }]],
      // After <script ... type =
      scriptAfterTypeEquals: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.scriptAfterTypeEquals' }], [/"([^"]*)"/, { token: 'attribute.value', switchTo: '@scriptWithCustomType.$1' }], [/'([^']*)'/, { token: 'attribute.value', switchTo: '@scriptWithCustomType.$1' }], [/>/, { token: 'delimiter.html', next: '@scriptEmbedded.text/javascript', nextEmbedded: 'text/javascript' }], [/[ \t\r\n]+/], [/<\/script\s*>/, { token: '@rematch', next: '@pop' }]],
      // After <script ... type = $S2
      scriptWithCustomType: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.scriptWithCustomType.$S2' }], [/>/, { token: 'delimiter.html', next: '@scriptEmbedded.$S2', nextEmbedded: '$S2' }], [/"([^"]*)"/, 'attribute.value'], [/'([^']*)'/, 'attribute.value'],
      // eslint-disable-next-line no-useless-escape
      [/[\w\-]+/, 'attribute.name'], [/=/, 'delimiter'], [/[ \t\r\n]+/], [/<\/script\s*>/, { token: '@rematch', next: '@pop' }]],
      scriptEmbedded: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInEmbeddedState.scriptEmbedded.$S2', nextEmbedded: '@pop' }], [/<\/script/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }]],
      // -- END <script> tags handling
      // -- BEGIN <style> tags handling
      // After <style
      style: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.style' }], [/type/, 'attribute.name', '@styleAfterType'], [/"([^"]*)"/, 'attribute.value'], [/'([^']*)'/, 'attribute.value'],
      // eslint-disable-next-line no-useless-escape
      [/[\w\-]+/, 'attribute.name'], [/=/, 'delimiter'], [/>/, { token: 'delimiter.html', next: '@styleEmbedded.text/css', nextEmbedded: 'text/css' }], [/[ \t\r\n]+/], [/(<\/)(style\s*)(>)/, ['delimiter.html', 'tag.html', { token: 'delimiter.html', next: '@pop' }]]],
      // After <style ... type
      styleAfterType: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.styleAfterType' }], [/=/, 'delimiter', '@styleAfterTypeEquals'], [/>/, { token: 'delimiter.html', next: '@styleEmbedded.text/css', nextEmbedded: 'text/css' }], [/[ \t\r\n]+/], [/<\/style\s*>/, { token: '@rematch', next: '@pop' }]],
      // After <style ... type =
      styleAfterTypeEquals: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.styleAfterTypeEquals' }], [/"([^"]*)"/, { token: 'attribute.value', switchTo: '@styleWithCustomType.$1' }], [/'([^']*)'/, { token: 'attribute.value', switchTo: '@styleWithCustomType.$1' }], [/>/, { token: 'delimiter.html', next: '@styleEmbedded.text/css', nextEmbedded: 'text/css' }], [/[ \t\r\n]+/], [/<\/style\s*>/, { token: '@rematch', next: '@pop' }]],
      // After <style ... type = $S2
      styleWithCustomType: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInSimpleState.styleWithCustomType.$S2' }], [/>/, { token: 'delimiter.html', next: '@styleEmbedded.$S2', nextEmbedded: '$S2' }], [/"([^"]*)"/, 'attribute.value'], [/'([^']*)'/, 'attribute.value'],
      // eslint-disable-next-line no-useless-escape
      [/[\w\-]+/, 'attribute.name'], [/=/, 'delimiter'], [/[ \t\r\n]+/], [/<\/style\s*>/, { token: '@rematch', next: '@pop' }]],
      styleEmbedded: [[/<%[=\-_]?/, { token: '@rematch', switchTo: '@ejsInEmbeddedState.styleEmbedded.$S2', nextEmbedded: '@pop' }], [/<\/style/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }]],
      // -- END <style> tags handling
      ejsInSimpleState: [[/<%[=\-_]?/, { token: 'delimiter.ejs', next: '@ejsRoot', nextEmbedded: 'text/javascript' }], [/[_-]?%>/, { token: 'delimiter.ejs', switchTo: '@$S2.$S3' }]],
      ejsInEmbeddedState: [[/<%[=\-_]?/, { token: 'delimiter.ejs', next: '@ejsRoot', nextEmbedded: 'text/javascript' }], [/[_-]?%>/, { token: 'delimiter.ejs', switchTo: '@$S2.$S3', nextEmbedded: '$S3' }]],
      ejsRoot: [[/[^%-_]+/, ''], [/[\s]+/, ''], [/[_-]?%>/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }]]
    }
  };

  monaco.languages.register({ id: languageId });

  monaco.languages.setMonarchTokensProvider(languageId, language);
  monaco.languages.setLanguageConfiguration(languageId, conf);
}

function updateThemeRule(theme, tokenName, foregroundColor) {
  var r = theme.rules.find(function (i) {
    return i.token === tokenName;
  });

  if (r) {
    r.foreground = foregroundColor;
  } else {
    theme.rules.push({
      foreground: foregroundColor,
      token: tokenName
    });
  }
}

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = Studio;

/***/ })
/******/ ]);