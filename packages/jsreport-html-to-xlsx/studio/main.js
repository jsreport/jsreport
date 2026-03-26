/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ ((module) => {

module.exports = Studio;

/***/ }),
/* 1 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



if (true) {
  module.exports = __webpack_require__(5);
} else // removed by dead control flow
{}


/***/ }),
/* 2 */,
/* 3 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);



const EntityRefSelect = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().EntityRefSelect);
const sharedComponents = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().sharedComponents);
class HtmlToXlsxProperties extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  static selectAssets(entities) {
    return Object.keys(entities).filter(k => entities[k].__entitySet === 'assets').map(k => entities[k]);
  }
  static title(entity, entities) {
    if (!entity.htmlToXlsx || !entity.htmlToXlsx.templateAssetShortid) {
      return 'xlsx template';
    }
    const foundAssets = HtmlToXlsxProperties.selectAssets(entities).filter(e => entity.htmlToXlsx != null && entity.htmlToXlsx.templateAssetShortid === e.shortid);
    if (!foundAssets.length) {
      return 'xlsx template';
    }
    const name = foundAssets[0].name;
    return 'xlsx template: ' + name;
  }
  constructor(props) {
    super(props);
    this.applyDefaultsToEntity = this.applyDefaultsToEntity.bind(this);
    this.changeHtmlToXlsx = this.changeHtmlToXlsx.bind(this);
  }
  componentDidMount() {
    this.applyDefaultsToEntity(this.props);
    this.removeInvalidHtmlEngine();
    this.removeInvalidXlsxTemplateReferences();
  }
  componentDidUpdate(prevProps) {
    // when component changes because another template is created
    if (prevProps.entity._id !== this.props.entity._id) {
      this.applyDefaultsToEntity(this.props);
    }
    this.removeInvalidHtmlEngine();
    this.removeInvalidXlsxTemplateReferences();
  }
  removeInvalidXlsxTemplateReferences() {
    const {
      entity,
      entities
    } = this.props;
    if (!entity.htmlToXlsx) {
      return;
    }
    const updatedXlsxAssets = Object.keys(entities).filter(k => entities[k].__entitySet === 'assets' && entity.htmlToXlsx != null && entities[k].shortid === entity.htmlToXlsx.templateAssetShortid);
    if (entity.htmlToXlsx && entity.htmlToXlsx.templateAssetShortid && updatedXlsxAssets.length === 0) {
      this.changeHtmlToXlsx(this.props, {
        templateAssetShortid: null
      });
    }
  }
  removeInvalidHtmlEngine() {
    const {
      entity
    } = this.props;
    if (!entity.htmlToXlsx || !entity.htmlToXlsx.htmlEngine) {
      return;
    }
    const htmlEngines = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().extensions)['html-to-xlsx'].options.htmlEngines;
    const isValidHtmlEngine = htmlEngines.includes(entity.htmlToXlsx.htmlEngine);
    if (!isValidHtmlEngine) {
      this.changeHtmlToXlsx(this.props, {
        htmlEngine: htmlEngines[0]
      });
    }
  }
  applyDefaultsToEntity(props) {
    const {
      entity
    } = props;
    const htmlEngines = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().extensions)['html-to-xlsx'].options.htmlEngines;
    let entityNeedsDefault = false;
    if (entity.__isNew || entity.htmlToXlsx == null || entity.htmlToXlsx.htmlEngine == null) {
      entityNeedsDefault = true;
    }
    if (htmlEngines != null && htmlEngines[0] != null && entityNeedsDefault) {
      this.changeHtmlToXlsx(props, {
        htmlEngine: htmlEngines[0]
      });
    }
  }
  changeHtmlToXlsx(props, change) {
    const {
      entity,
      onChange
    } = props;
    const htmlToXlsx = entity.htmlToXlsx || {};
    onChange({
      ...entity,
      htmlToXlsx: {
        ...htmlToXlsx,
        ...change
      }
    });
  }
  render() {
    const {
      entity
    } = this.props;
    const htmlToXlsx = entity.htmlToXlsx || {};
    const htmlEngines = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().extensions)['html-to-xlsx'].options.htmlEngines;
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      className: "properties-section",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "html engine"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("select", {
          value: htmlToXlsx.htmlEngine,
          onChange: v => this.changeHtmlToXlsx(this.props, {
            htmlEngine: v.target.value
          }),
          children: htmlEngines.map(engine => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("option", {
            value: engine,
            children: engine
          }, engine))
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "xlsx asset"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(EntityRefSelect, {
          headingLabel: "Select xlsx template",
          newLabel: "New xlsx asset for template",
          filter: references => ({
            data: references.assets
          }),
          value: entity.htmlToXlsx ? entity.htmlToXlsx.templateAssetShortid : null,
          onChange: selected => this.changeHtmlToXlsx(this.props, {
            templateAssetShortid: selected != null && selected.length > 0 ? selected[0].shortid : null
          }),
          renderNew: modalProps => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(sharedComponents.NewAssetModal, {
            ...modalProps,
            options: {
              ...modalProps.options,
              defaults: {
                folder: entity.folder
              },
              activateNewTab: false
            }
          })
        })]
      }), htmlToXlsx.htmlEngine !== 'cheerio' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          title: "window.JSREPORT_READY_TO_START=true;",
          children: "wait for conversion trigger"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "checkbox",
          title: "window.JSREPORT_READY_TO_START=true;",
          checked: htmlToXlsx.waitForJS === true,
          onChange: v => this.changeHtmlToXlsx(this.props, {
            waitForJS: v.target.checked
          })
        })]
      })]
    });
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (HtmlToXlsxProperties);

/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = Studio.libraries['react'];

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports) => {

/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
function jsxProd(type, config, maybeKey) {
  var key = null;
  void 0 !== maybeKey && (key = "" + maybeKey);
  void 0 !== config.key && (key = "" + config.key);
  if ("key" in config) {
    maybeKey = {};
    for (var propName in config)
      "key" !== propName && (maybeKey[propName] = config[propName]);
  } else maybeKey = config;
  config = maybeKey.ref;
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type: type,
    key: key,
    ref: void 0 !== config ? config : null,
    props: maybeKey
  };
}
exports.Fragment = REACT_FRAGMENT_TYPE;
exports.jsx = jsxProd;
exports.jsxs = jsxProd;


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
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _HtmlToXlsxProperties__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);



jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().addPropertiesComponent('html to xlsx', _HtmlToXlsxProperties__WEBPACK_IMPORTED_MODULE_0__["default"], entity => entity.__entitySet === 'templates' && entity.recipe === 'html-to-xlsx');
jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().runListeners.push((request, entities) => {
  if (request.template.recipe !== 'html-to-xlsx') {
    return;
  }
  if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().extensions)['html-to-xlsx'].options.preview.enabled === false) {
    return;
  }
  if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().extensions)['html-to-xlsx'].options.preview.showWarning === false) {
    return;
  }
  if (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getSettingValueByKey('office-preview-informed', false) === true) {
    return;
  }
  jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().setSetting('office-preview-informed', true);
  jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openModal(() => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
    children: ["We need to upload your office report to our publicly hosted server to be able to use Office Online Service for previewing here in the studio. You can disable it in the configuration, see", /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("a", {
      href: "https://jsreport.net/learn/html-to-xlsx",
      target: "_blank",
      rel: "noopener noreferrer",
      children: "https://jsreport.net/learn/html-to-xlsx"
    }), " for details."]
  }));
});
})();

/******/ })()
;