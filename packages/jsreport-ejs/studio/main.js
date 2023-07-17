/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = Studio;

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_0__);

jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().textEditorInitializeListeners.push(_ref => {
  let {
    monaco,
    theme
  } = _ref;
  registerEJSLanguage(monaco);
  updateThemeRule(theme, 'delimiter.ejs', 'aa0d91');
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().templateEditorModeResolvers.push(template => template.engine === 'ejs' ? 'ejs' : null);
function registerEJSLanguage(monaco) {
  const languageId = 'ejs';
  const EMPTY_ELEMENTS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr'];
  const conf = {
    // eslint-disable-next-line no-useless-escape
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
    comments: {
      blockComment: ['<%#', '%>']
    },
    brackets: [['<!--', '-->'], ['<', '>'], ['{{', '}}'], ['{', '}'], ['(', ')']],
    autoClosingPairs: [{
      open: '{',
      close: '}'
    }, {
      open: '[',
      close: ']'
    }, {
      open: '(',
      close: ')'
    }, {
      open: '"',
      close: '"'
    }, {
      open: '\'',
      close: '\''
    }],
    surroundingPairs: [{
      open: '<',
      close: '>'
    }, {
      open: '"',
      close: '"'
    }, {
      open: '\'',
      close: '\''
    }],
    onEnterRules: [{
      beforeText: new RegExp('<(?!(?:' + EMPTY_ELEMENTS.join('|') + '))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$', 'i'),
      afterText: /^<\/(\w[\w\d]*)\s*>$/i,
      action: {
        indentAction: monaco.languages.IndentAction.IndentOutdent
      }
    }, {
      beforeText: new RegExp('<(?!(?:' + EMPTY_ELEMENTS.join('|') + '))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$', 'i'),
      action: {
        indentAction: monaco.languages.IndentAction.Indent
      }
    }]
  };
  const language = {
    defaultToken: '',
    tokenPostfix: '',
    // ignoreCase: true,
    // The main tokenizer for our languages
    tokenizer: {
      root: [[/<%#/, 'comment.ejs', '@commentEJS'], [/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.root'
      }], [/<!DOCTYPE/, 'metatag.html', '@doctype'], [/<!--/, 'comment.html', '@comment'], [/(<)(\w+)(\/>)/, ['delimiter.html', 'tag.html', 'delimiter.html']], [/(<)(script)/, ['delimiter.html', {
        token: 'tag.html',
        next: '@script'
      }]], [/(<)(style)/, ['delimiter.html', {
        token: 'tag.html',
        next: '@style'
      }]], [/(<)([:\w]+)/, ['delimiter.html', {
        token: 'tag.html',
        next: '@otherTag'
      }]], [/(<\/)(\w+)/, ['delimiter.html', {
        token: 'tag.html',
        next: '@otherTag'
      }]], [/</, 'delimiter.html'], [/\{/, 'delimiter.html'], [/[^<{]+/] // text
      ],

      doctype: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.comment'
      }], [/[^>]+/, 'metatag.content.html'], [/>/, 'metatag.html', '@pop']],
      comment: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.comment'
      }], [/-->/, 'comment.html', '@pop'], [/[^-]+/, 'comment.content.html'], [/./, 'comment.content.html']],
      commentEJS: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.comment'
      }], [/[-_]?%>/, 'comment.ejs', '@pop'], [/[^%-_]+/, 'comment.content.ejs'], [/./, 'comment.content.ejs']],
      otherTag: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.otherTag'
      }], [/\/?>/, 'delimiter.html', '@pop'], [/"([^"]*)"/, 'attribute.value'], [/'([^']*)'/, 'attribute.value'],
      // eslint-disable-next-line no-useless-escape
      [/[\w\-]+/, 'attribute.name'], [/=/, 'delimiter'], [/[ \t\r\n]+/]],
      // -- BEGIN <script> tags handling
      // After <script
      script: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.script'
      }], [/type/, 'attribute.name', '@scriptAfterType'], [/"([^"]*)"/, 'attribute.value'], [/'([^']*)'/, 'attribute.value'],
      // eslint-disable-next-line no-useless-escape
      [/[\w\-]+/, 'attribute.name'], [/=/, 'delimiter'], [/>/, {
        token: 'delimiter.html',
        next: '@scriptEmbedded.text/javascript',
        nextEmbedded: 'text/javascript'
      }], [/[ \t\r\n]+/], [/(<\/)(script\s*)(>)/, ['delimiter.html', 'tag.html', {
        token: 'delimiter.html',
        next: '@pop'
      }]]],
      // After <script ... type
      scriptAfterType: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.scriptAfterType'
      }], [/=/, 'delimiter', '@scriptAfterTypeEquals'], [/>/, {
        token: 'delimiter.html',
        next: '@scriptEmbedded.text/javascript',
        nextEmbedded: 'text/javascript'
      }], [/[ \t\r\n]+/], [/<\/script\s*>/, {
        token: '@rematch',
        next: '@pop'
      }]],
      // After <script ... type =
      scriptAfterTypeEquals: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.scriptAfterTypeEquals'
      }], [/"([^"]*)"/, {
        token: 'attribute.value',
        switchTo: '@scriptWithCustomType.$1'
      }], [/'([^']*)'/, {
        token: 'attribute.value',
        switchTo: '@scriptWithCustomType.$1'
      }], [/>/, {
        token: 'delimiter.html',
        next: '@scriptEmbedded.text/javascript',
        nextEmbedded: 'text/javascript'
      }], [/[ \t\r\n]+/], [/<\/script\s*>/, {
        token: '@rematch',
        next: '@pop'
      }]],
      // After <script ... type = $S2
      scriptWithCustomType: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.scriptWithCustomType.$S2'
      }], [/>/, {
        token: 'delimiter.html',
        next: '@scriptEmbedded.$S2',
        nextEmbedded: '$S2'
      }], [/"([^"]*)"/, 'attribute.value'], [/'([^']*)'/, 'attribute.value'],
      // eslint-disable-next-line no-useless-escape
      [/[\w\-]+/, 'attribute.name'], [/=/, 'delimiter'], [/[ \t\r\n]+/], [/<\/script\s*>/, {
        token: '@rematch',
        next: '@pop'
      }]],
      scriptEmbedded: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInEmbeddedState.scriptEmbedded.$S2',
        nextEmbedded: '@pop'
      }], [/<\/script/, {
        token: '@rematch',
        next: '@pop',
        nextEmbedded: '@pop'
      }]],
      // -- END <script> tags handling
      // -- BEGIN <style> tags handling
      // After <style
      style: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.style'
      }], [/type/, 'attribute.name', '@styleAfterType'], [/"([^"]*)"/, 'attribute.value'], [/'([^']*)'/, 'attribute.value'],
      // eslint-disable-next-line no-useless-escape
      [/[\w\-]+/, 'attribute.name'], [/=/, 'delimiter'], [/>/, {
        token: 'delimiter.html',
        next: '@styleEmbedded.text/css',
        nextEmbedded: 'text/css'
      }], [/[ \t\r\n]+/], [/(<\/)(style\s*)(>)/, ['delimiter.html', 'tag.html', {
        token: 'delimiter.html',
        next: '@pop'
      }]]],
      // After <style ... type
      styleAfterType: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.styleAfterType'
      }], [/=/, 'delimiter', '@styleAfterTypeEquals'], [/>/, {
        token: 'delimiter.html',
        next: '@styleEmbedded.text/css',
        nextEmbedded: 'text/css'
      }], [/[ \t\r\n]+/], [/<\/style\s*>/, {
        token: '@rematch',
        next: '@pop'
      }]],
      // After <style ... type =
      styleAfterTypeEquals: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.styleAfterTypeEquals'
      }], [/"([^"]*)"/, {
        token: 'attribute.value',
        switchTo: '@styleWithCustomType.$1'
      }], [/'([^']*)'/, {
        token: 'attribute.value',
        switchTo: '@styleWithCustomType.$1'
      }], [/>/, {
        token: 'delimiter.html',
        next: '@styleEmbedded.text/css',
        nextEmbedded: 'text/css'
      }], [/[ \t\r\n]+/], [/<\/style\s*>/, {
        token: '@rematch',
        next: '@pop'
      }]],
      // After <style ... type = $S2
      styleWithCustomType: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInSimpleState.styleWithCustomType.$S2'
      }], [/>/, {
        token: 'delimiter.html',
        next: '@styleEmbedded.$S2',
        nextEmbedded: '$S2'
      }], [/"([^"]*)"/, 'attribute.value'], [/'([^']*)'/, 'attribute.value'],
      // eslint-disable-next-line no-useless-escape
      [/[\w\-]+/, 'attribute.name'], [/=/, 'delimiter'], [/[ \t\r\n]+/], [/<\/style\s*>/, {
        token: '@rematch',
        next: '@pop'
      }]],
      styleEmbedded: [[/<%[=\-_]?/, {
        token: '@rematch',
        switchTo: '@ejsInEmbeddedState.styleEmbedded.$S2',
        nextEmbedded: '@pop'
      }], [/<\/style/, {
        token: '@rematch',
        next: '@pop',
        nextEmbedded: '@pop'
      }]],
      // -- END <style> tags handling
      ejsInSimpleState: [[/<%[=\-_]?/, {
        token: 'delimiter.ejs',
        next: '@ejsRoot',
        nextEmbedded: 'text/javascript'
      }], [/[_-]?%>/, {
        token: 'delimiter.ejs',
        switchTo: '@$S2.$S3'
      }]],
      ejsInEmbeddedState: [[/<%[=\-_]?/, {
        token: 'delimiter.ejs',
        next: '@ejsRoot',
        nextEmbedded: 'text/javascript'
      }], [/[_-]?%>/, {
        token: 'delimiter.ejs',
        switchTo: '@$S2.$S3',
        nextEmbedded: '$S3'
      }]],
      ejsRoot: [[/[^%-_]+/, ''], [/[\s]+/, ''], [/[_-]?%>/, {
        token: '@rematch',
        next: '@pop',
        nextEmbedded: '@pop'
      }]]
    }
  };
  monaco.languages.register({
    id: languageId
  });
  monaco.languages.setMonarchTokensProvider(languageId, language);
  monaco.languages.setLanguageConfiguration(languageId, conf);
}
function updateThemeRule(theme, tokenName, foregroundColor) {
  const r = theme.rules.find(i => i.token === tokenName);
  if (r) {
    r.foreground = foregroundColor;
  } else {
    theme.rules.push({
      foreground: foregroundColor,
      token: tokenName
    });
  }
}
})();

/******/ })()
;