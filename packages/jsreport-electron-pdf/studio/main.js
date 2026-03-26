/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);


class ElectronPdfProperties extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.state = {
      customPaperFormat: false,
      paperWidth: null,
      paperHeight: null
    };
  }
  getStandardFormats() {
    return [{
      name: 'A4',
      value: 'A4'
    }, {
      name: 'A3',
      value: 'A3'
    }, {
      name: 'Legal',
      value: 'Legal'
    }, {
      name: 'Letter',
      value: 'Letter'
    }, {
      name: 'Tabloid',
      value: 'Tabloid'
    }];
  }
  componentDidMount() {
    this.normalizeUIState(this.props.entity);
  }
  componentDidUpdate(prevProps) {
    // when component changes because another entity is selected
    // or when saving a new entity
    if (prevProps.entity._id !== this.props.entity._id) {
      this.normalizeUIState(this.props.entity);
    }
  }
  changeCustomPaperSize(_ref) {
    let {
      width,
      height,
      customPaperFormat
    } = _ref;
    const {
      paperWidth,
      paperHeight
    } = this.state;
    const {
      entity,
      onChange
    } = this.props;
    const stateToSet = {};
    const paperSize = {};
    if (customPaperFormat === false) {
      stateToSet.customPaperFormat = customPaperFormat;
      stateToSet.paperWidth = null;
      stateToSet.paperHeight = null;
      onChange({
        ...entity,
        electron: {
          ...entity.electron,
          format: 'A4'
        }
      });
    } else {
      if (customPaperFormat != null) {
        stateToSet.customPaperFormat = customPaperFormat;
      }
      if (width != null) {
        if (!isNaN(parseInt(width, 10))) {
          paperSize.width = parseInt(width, 10);
        } else {
          paperSize.width = null;
        }
      } else {
        paperSize.width = paperWidth;
      }
      if (height != null) {
        if (!isNaN(parseInt(height, 10))) {
          paperSize.height = parseInt(height, 10);
        } else {
          paperSize.height = null;
        }
      } else {
        paperSize.height = paperHeight;
      }
      stateToSet.paperWidth = paperSize.width;
      stateToSet.paperHeight = paperSize.height;
      if (paperSize.width != null || paperSize.height != null) {
        onChange({
          ...entity,
          electron: {
            ...entity.electron,
            format: JSON.stringify(paperSize)
          }
        });
      } else {
        onChange({
          ...entity,
          electron: {
            ...entity.electron,
            format: null
          }
        });
      }
    }
    if (Object.keys(stateToSet).length > 0) {
      this.setState(stateToSet);
    }
  }
  normalizeUIState(entity) {
    const stateToSet = {};
    if (entity.__isNew) {
      stateToSet.customPaperFormat = false;
      stateToSet.paperWidth = null;
      stateToSet.paperHeight = null;
    } else {
      stateToSet.customPaperFormat = false;
      stateToSet.paperWidth = null;
      stateToSet.paperHeight = null;
      if (entity.electron && entity.electron.format) {
        const standardFormats = this.getStandardFormats().map(format => format.value);
        let customFormat;
        if (standardFormats.indexOf(entity.electron.format) === -1) {
          try {
            customFormat = JSON.parse(entity.electron.format);
          } catch (e) {}
          if (customFormat) {
            stateToSet.customPaperFormat = true;
            if (customFormat.width != null) {
              stateToSet.paperWidth = customFormat.width;
            }
            if (customFormat.height != null) {
              stateToSet.paperHeight = customFormat.height;
            }
          }
        }
      }
    }
    if (Object.keys(stateToSet).length > 0) {
      this.setState(stateToSet);
    }
  }
  render() {
    const {
      customPaperFormat,
      paperWidth,
      paperHeight
    } = this.state;
    const {
      entity,
      onChange
    } = this.props;
    const electron = entity.electron || {};
    const change = change => onChange({
      ...entity,
      electron: {
        ...entity.electron,
        ...change
      }
    });
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
      className: "properties-section",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "Margin type"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("select", {
          value: electron.marginsType || 0,
          onChange: v => change({
            marginsType: parseInt(v.target.value)
          }),
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
            value: "0",
            children: "Default"
          }, '0'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
            value: "1",
            children: "None"
          }, '1'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
            value: "2",
            children: "Minimum"
          }, '2')]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "Paper format"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("label", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
            type: "checkbox",
            checked: customPaperFormat === true,
            onChange: v => this.changeCustomPaperSize({
              customPaperFormat: v.target.checked
            })
          }), "Use custom format"]
        }), customPaperFormat && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("label", {
            style: {
              display: 'block'
            },
            children: ["Paper width ", /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("a", {
              href: "https://en.wikipedia.org/wiki/Micrometre",
              target: "_blank",
              rel: "noreferrer",
              children: "(in microns)"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
            style: {
              display: 'block',
              width: '100%'
            },
            type: "text",
            placeholder: "148000",
            value: paperWidth,
            onChange: v => this.changeCustomPaperSize({
              width: v.target.value
            })
          })]
        }), customPaperFormat && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("label", {
            style: {
              display: 'block'
            },
            children: ["Paper height ", /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("a", {
              href: "https://en.wikipedia.org/wiki/Micrometre",
              target: "_blank",
              rel: "noreferrer",
              children: "(in microns)"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
            style: {
              display: 'block',
              width: '100%'
            },
            type: "text",
            placeholder: "210000",
            value: paperHeight,
            onChange: v => this.changeCustomPaperSize({
              height: v.target.value
            })
          })]
        }), customPaperFormat && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("i", {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("a", {
                href: "http://www.papersizes.org/a-sizes-all-units.htm",
                target: "_blank",
                rel: "noreferrer",
                children: "See this for common paper sizes in microns"
              })
            })
          })
        }), !customPaperFormat && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("select", {
          value: electron.format || '',
          onChange: v => change({
            format: v.target.value
          }),
          children: this.getStandardFormats().map(paperFormat => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
            value: paperFormat.value,
            children: paperFormat.name
          }, paperFormat.name))
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "Web Page width"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "text",
          placeholder: "600",
          value: electron.width || '',
          onChange: v => change({
            width: v.target.value
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "Web Page height"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "text",
          placeholder: "600",
          value: electron.height || '',
          onChange: v => change({
            height: v.target.value
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "Orientation"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("select", {
          value: electron.landscape + '',
          onChange: v => change({
            landscape: v.target.value === 'true'
          }),
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
            value: "false",
            children: "Portrait"
          }, 'false'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
            value: "true",
            children: "Landscape"
          }, 'true')]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "Print background"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "checkbox",
          checked: electron.printBackground === true,
          onChange: v => change({
            printBackground: v.target.checked
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "Print delay"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "text",
          placeholder: "800",
          value: electron.printDelay || '',
          onChange: v => change({
            printDelay: v.target.value
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          title: "window.JSREPORT_READY_TO_START=true;",
          children: "Wait for printing trigger"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "checkbox",
          title: "window.JSREPORT_READY_TO_START=true;",
          checked: electron.waitForJS === true,
          onChange: v => change({
            waitForJS: v.target.checked
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "Block javascript"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "checkbox",
          checked: electron.blockJavaScript === true,
          onChange: v => change({
            blockJavaScript: v.target.checked
          })
        })]
      })]
    });
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ElectronPdfProperties);

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = Studio.libraries['react'];

/***/ }),
/* 3 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



if (true) {
  module.exports = __webpack_require__(4);
} else // removed by dead control flow
{}


/***/ }),
/* 4 */
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


/***/ }),
/* 5 */
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
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _ElectronPdfProperties_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().addPropertiesComponent('electron-pdf', _ElectronPdfProperties_js__WEBPACK_IMPORTED_MODULE_0__["default"], entity => entity.__entitySet === 'templates' && entity.recipe === 'electron-pdf');
})();

/******/ })()
;