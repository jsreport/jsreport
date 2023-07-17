/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ ((module) => {

module.exports = Studio;

/***/ }),
/* 1 */,
/* 2 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _ShareModal_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4);



class ShareModal extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.state = {
      entity: props.options.entity
    };
  }
  async generateLink(method) {
    const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.post(`/api/templates/sharing/${this.props.options.entity.shortid}/access/${method}`, {});
    const entity = this.state.entity;
    const tokenProperty = method + 'SharingToken';
    const updated = {
      ...entity,
      [tokenProperty]: response.token
    };
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().updateEntity(updated);
    this.setState({
      entity: updated
    });
  }
  async removeLink() {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().updateEntity({
      _id: this.state.entity._id,
      readSharingToken: null
    });
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().saveEntity(this.state.entity._id);
    this.setState({
      entity: {
        ...this.state.entity,
        readSharingToken: null
      }
    });
  }
  render() {
    const {
      entity
    } = this.state;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h2", null, "Link with read permissions"), entity.readSharingToken ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("a", {
      target: "_blank",
      rel: "noreferrer",
      href: (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().rootUrl) + `/public-templates?access_token=${entity.readSharingToken}`
    }, (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().rootUrl) + `/public-templates?access_token=${entity.readSharingToken}`)) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      type: "button",
      className: "button confirmation",
      onClick: () => this.generateLink('read')
    }, "Generate Read Link")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _ShareModal_css__WEBPACK_IMPORTED_MODULE_2__["default"].infoBox
    }, "When requesting this link, jsreport will skip the authentication and authorization and render this particular template. User will be also able to execute any of the jsreport recipes from the served page but won't be allowed to access any of the existing templates or other entities."), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button confirmation",
      onClick: () => this.props.close()
    }, "ok"), entity.readSharingToken ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button danger",
      onClick: () => this.removeLink()
    }, "Remove") : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null)));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ShareModal);

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = Studio.libraries['react'];

/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// extracted by mini-css-extract-plugin
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({"infoBox":"x-public-templates-ShareModal-infoBox"});

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
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ShareModal_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);


jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addToolbarComponent(props => {
  if (!props.tab || !props.tab.entity || props.tab.entity.__entitySet !== 'templates') {
    return /*#__PURE__*/React.createElement("span", null);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "toolbar-button",
    onClick: () => {
      jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().openModal(_ShareModal_js__WEBPACK_IMPORTED_MODULE_1__["default"], {
        entity: props.tab.entity
      });
      props.closeMenu();
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa fa-unlock"
  }), "Share");
});
})();

/******/ })()
;