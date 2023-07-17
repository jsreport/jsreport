/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ ((module) => {

module.exports = Studio.libraries['react'];

/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = Studio;

/***/ }),
/* 2 */,
/* 3 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


class PhantomEditor extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  render() {
    const {
      entity,
      onUpdate,
      headerOrFooter,
      tab
    } = this.props;
    const editorName = `${entity._id}_${tab.docProp.replace(/\./g, '_')}`;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__.TextEditor, {
      name: editorName,
      mode: "handlebars",
      value: entity.phantom ? entity.phantom[headerOrFooter] : '',
      onUpdate: v => onUpdate(Object.assign({}, entity, {
        phantom: Object.assign({}, entity.phantom, {
          [headerOrFooter]: v
        })
      }))
    });
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PhantomEditor);

/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


class PhantomPdfProperties extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.state = {
      customMargin: false,
      marginOptions: undefined
    };
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
  normalizeUIState(entity) {
    const stateToSet = {};
    stateToSet.customMargin = false;
    stateToSet.marginOptions = undefined;
    if (entity.phantom && entity.phantom.margin) {
      let customMargin;
      if (entity.phantom.margin.trim()[0] === '{') {
        try {
          customMargin = JSON.parse(entity.phantom.margin);
        } catch (e) {}
        if (customMargin) {
          stateToSet.customMargin = true;
          if (customMargin.top != null || customMargin.left != null || customMargin.right != null || customMargin.bottom != null) {
            stateToSet.marginOptions = customMargin;
          }
        }
      }
    }
    if (Object.keys(stateToSet).length > 0) {
      this.setState(stateToSet);
    }
  }
  changeCustomMargin(_ref) {
    let {
      left,
      right,
      top,
      bottom,
      customMargin
    } = _ref;
    const {
      marginOptions: {
        top: marginTop,
        left: marginLeft,
        right: marginRight,
        bottom: marginBottom
      } = {}
    } = this.state;
    const {
      entity,
      onChange
    } = this.props;
    const stateToSet = {};
    const margin = {};
    if (customMargin === false) {
      stateToSet.customMargin = customMargin;
      stateToSet.marginOptions = undefined;
      onChange({
        ...entity,
        phantom: {
          ...entity.phantom,
          margin: ''
        }
      });
    } else {
      if (customMargin != null) {
        stateToSet.customMargin = customMargin;
      }
      if (top != null) {
        margin.top = top;
      } else {
        margin.top = marginTop;
      }
      if (left != null) {
        margin.left = left;
      } else {
        margin.left = marginLeft;
      }
      if (right != null) {
        margin.right = right;
      } else {
        margin.right = marginRight;
      }
      if (bottom != null) {
        margin.bottom = bottom;
      } else {
        margin.bottom = marginBottom;
      }
      stateToSet.marginOptions = margin;
      if (margin.top != null || margin.left != null || margin.right != null || margin.bottom != null) {
        onChange({
          ...entity,
          phantom: {
            ...entity.phantom,
            margin: JSON.stringify(margin)
          }
        });
      } else {
        onChange({
          ...entity,
          phantom: {
            ...entity.phantom,
            margin: ''
          }
        });
      }
    }
    if (Object.keys(stateToSet).length > 0) {
      this.setState(stateToSet);
    }
  }
  openHeaderFooter(type) {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openTab({
      _id: this.props.entity._id,
      docProp: `phantom.${type}`
    });
  }
  render() {
    const {
      customMargin,
      marginOptions = {}
    } = this.state;
    const {
      entity,
      onChange
    } = this.props;
    const phantom = entity.phantom || {};
    const changePhantom = change => onChange({
      ...entity,
      phantom: {
        ...entity.phantom,
        ...change
      }
    });
    const phantoms = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().extensions)['phantom-pdf'].options.phantoms;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "properties-section"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "phantomjs version"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: phantom.phantomjsVersion || phantoms[0].version,
      onChange: v => changePhantom({
        phantomjsVersion: v.target.value
      })
    }, phantoms.map(p => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: p.version,
      value: p.version
    }, p.version)))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "margin"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: customMargin === true,
      onChange: v => this.changeCustomMargin({
        customMargin: v.target.checked
      })
    }), "Use custom margin"), customMargin && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", {
      style: {
        display: 'block'
      }
    }, "Margin left"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      style: {
        display: 'block',
        width: '100%'
      },
      type: "text",
      placeholder: "8px",
      value: marginOptions.left,
      onChange: v => this.changeCustomMargin({
        left: v.target.value
      })
    })), customMargin && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", {
      style: {
        display: 'block'
      }
    }, "Margin right"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      style: {
        display: 'block',
        width: '100%'
      },
      type: "text",
      placeholder: "8px",
      value: marginOptions.right,
      onChange: v => this.changeCustomMargin({
        right: v.target.value
      })
    })), customMargin && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", {
      style: {
        display: 'block'
      }
    }, "Margin top"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      style: {
        display: 'block',
        width: '100%'
      },
      type: "text",
      placeholder: "8px",
      value: marginOptions.top,
      onChange: v => this.changeCustomMargin({
        top: v.target.value
      })
    })), customMargin && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", {
      style: {
        display: 'block'
      }
    }, "Margin bottom"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      style: {
        display: 'block',
        width: '100%'
      },
      type: "text",
      placeholder: "8px",
      value: marginOptions.bottom,
      onChange: v => this.changeCustomMargin({
        bottom: v.target.value
      })
    })), !customMargin && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "1cm",
      value: phantom.margin || '',
      onChange: v => changePhantom({
        margin: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "header height"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "1cm",
      value: phantom.headerHeight || '',
      onChange: v => changePhantom({
        headerHeight: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "header"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      onClick: () => this.openHeaderFooter('header')
    }, "open in tab...")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "footer height"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "1cm",
      value: phantom.footerHeight || '',
      onChange: v => changePhantom({
        footerHeight: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "footer"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      onClick: () => this.openHeaderFooter('footer')
    }, "open in tab...")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "paper format"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: phantom.format || '',
      onChange: v => changePhantom({
        format: v.target.value
      })
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: "A4",
      value: "A4"
    }, "A4"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: "A3",
      value: "A3"
    }, "A3"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: "A5",
      value: "A5"
    }, "A5"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: "Legal",
      value: "Legal"
    }, "Legal"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: "Letter",
      value: "Letter"
    }, "Letter"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: "Tabloid",
      value: "Tabloid"
    }, "Tabloid"))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "paper width"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "1cm",
      value: phantom.width || '',
      onChange: v => changePhantom({
        width: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "paper height"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "1cm",
      value: phantom.height || '',
      onChange: v => changePhantom({
        height: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "orientation"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: phantom.orientation || '',
      onChange: v => changePhantom({
        orientation: v.target.value
      })
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: "portrait",
      value: "portrait"
    }, "portrait"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: "landscape",
      value: "landscape"
    }, "landscape"))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "print delay"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "1000",
      value: phantom.printDelay || '',
      onChange: v => changePhantom({
        printDelay: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "resource timeout"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "1000",
      value: phantom.resourceTimeout || '',
      onChange: v => changePhantom({
        resourceTimeout: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", {
      title: "window.JSREPORT_READY_TO_START=true;"
    }, "wait for printing trigger"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      title: "window.JSREPORT_READY_TO_START=true;",
      checked: phantom.waitForJS === true,
      onChange: v => changePhantom({
        waitForJS: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "block javascript"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: phantom.blockJavaScript === true,
      onChange: v => changePhantom({
        blockJavaScript: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "fit to page"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: phantom.fitToPage === true,
      onChange: v => changePhantom({
        fitToPage: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "use custom phantomjs (deprecated)"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: phantom.customPhantomJS === true,
      onChange: v => changePhantom({
        customPhantomJS: v.target.checked
      })
    })));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PhantomPdfProperties);

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (props => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, props.entity.name + ' ' + props.headerOrFooter + (props.entity.__isDirty ? '*' : '')));

/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PHANTOM_TAB_EDITOR: () => (/* binding */ PHANTOM_TAB_EDITOR),
/* harmony export */   PHANTOM_TAB_TITLE: () => (/* binding */ PHANTOM_TAB_TITLE)
/* harmony export */ });
const PHANTOM_TAB_TITLE = 'PHANTOM_TAB_TITLE';
const PHANTOM_TAB_EDITOR = 'PHANTOM_TAB_EDITOR';

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
/* harmony import */ var _PhantomEditor_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _PhantomPdfProperties_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
/* harmony import */ var _PhantomTitle_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(5);
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(6);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_4__);





jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addPropertiesComponent('phantom pdf', _PhantomPdfProperties_js__WEBPACK_IMPORTED_MODULE_1__["default"], entity => entity.__entitySet === 'templates' && entity.recipe === 'phantom-pdf');
const supportedDocProps = ['phantom.header', 'phantom.footer'];
const shortNameMap = {
  'phantom.header': 'header',
  'phantom.footer': 'footer'
};
const reformat = (reformatter, entity, tab) => {
  const lastPhantomProperties = entity.phantom || {};
  const targetProp = shortNameMap[tab.docProp];
  const reformated = reformatter(lastPhantomProperties[targetProp], 'html');
  return {
    phantom: {
      ...lastPhantomProperties,
      [targetProp]: reformated
    }
  };
};
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addEditorComponent(_constants_js__WEBPACK_IMPORTED_MODULE_3__.PHANTOM_TAB_EDITOR, _PhantomEditor_js__WEBPACK_IMPORTED_MODULE_0__["default"], reformat);
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addTabTitleComponent(_constants_js__WEBPACK_IMPORTED_MODULE_3__.PHANTOM_TAB_TITLE, _PhantomTitle_js__WEBPACK_IMPORTED_MODULE_2__["default"]);
function componentKeyResolver(entity, docProp, key) {
  if (docProp == null) {
    return;
  }
  if (entity.__entitySet === 'templates' && supportedDocProps.includes(docProp)) {
    return {
      key,
      props: {
        headerOrFooter: shortNameMap[docProp]
      }
    };
  }
}
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().entityEditorComponentKeyResolvers.push((entity, docProp) => componentKeyResolver(entity, docProp, _constants_js__WEBPACK_IMPORTED_MODULE_3__.PHANTOM_TAB_EDITOR));
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().tabTitleComponentKeyResolvers.push((entity, docProp) => componentKeyResolver(entity, docProp, _constants_js__WEBPACK_IMPORTED_MODULE_3__.PHANTOM_TAB_TITLE));
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().entityTreeIconResolvers.push(entity => entity.__entitySet === 'templates' && entity.recipe === 'phantom-pdf' ? 'fa-file-pdf-o' : null);
})();

/******/ })()
;