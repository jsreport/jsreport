/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = Studio.libraries['react'];

/***/ }),
/* 2 */
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
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


class FreezeModal extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  freeze() {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().setSetting('freeze', true);
    this.props.close();
  }
  render() {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Freeze changes"), /*#__PURE__*/React.createElement("p", null, "The freeze mode will block accidental changes in entities like templates.", /*#__PURE__*/React.createElement("br", null), "The only permitted operations in freeze mode are persisting logs and output reports.", /*#__PURE__*/React.createElement("br", null), "The freeze mode can be switched back to normal using the menu command \"Release freeze\"."), /*#__PURE__*/React.createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/React.createElement("button", {
      className: "button confirmation",
      onClick: () => this.freeze()
    }, "Freeze")));
  }
}
class ReleaseFreezeModal extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  release() {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().setSetting('freeze', false);
    this.props.close();
  }
  render() {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Release freeze"), /*#__PURE__*/React.createElement("p", null, "This will switch the editing mode to normal."), /*#__PURE__*/React.createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/React.createElement("button", {
      className: "button confirmation",
      onClick: () => this.release()
    }, "Release")));
  }
}
const freeze = () => {
  jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openModal(FreezeModal);
};
const release = () => {
  jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openModal(ReleaseFreezeModal);
};
jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().initializeListeners.push(() => {
  if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().authentication) && !jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().authentication.isUserAdmin((jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().authentication).user)) {
    return;
  }
  jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().addToolbarComponent(props => jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getSettingValueByKey('freeze', false) ? /*#__PURE__*/React.createElement("span", null) : /*#__PURE__*/React.createElement("div", {
    className: "toolbar-button",
    onClick: () => {
      freeze();
      props.closeMenu();
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa fa-lock"
  }), "Freeze edits"), 'settings');
  jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().addToolbarComponent(props => jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getSettingValueByKey('freeze', false) ? /*#__PURE__*/React.createElement("div", {
    className: "toolbar-button",
    onClick: () => {
      release();
      props.closeMenu();
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa fa-unlock"
  }), "Release freeze") : /*#__PURE__*/React.createElement("span", null), 'settings');
});
})();

/******/ })()
;