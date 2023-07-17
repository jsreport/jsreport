/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ ((module) => {

module.exports = Studio;

/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = Studio.libraries['react'];

/***/ }),
/* 2 */,
/* 3 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


class WKEditor extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
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
      value: entity.wkhtmltopdf ? entity.wkhtmltopdf[headerOrFooter] : '',
      onUpdate: v => onUpdate(Object.assign({}, entity, {
        wkhtmltopdf: Object.assign({}, entity.wkhtmltopdf, {
          [headerOrFooter]: v
        })
      }))
    });
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (WKEditor);

/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Properties)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


class Properties extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  openHeaderFooter(type) {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openTab({
      _id: this.props.entity._id,
      docProp: `wkhtmltopdf.${type}`
    });
  }
  render() {
    const {
      entity,
      onChange
    } = this.props;
    const wkhtmltopdf = entity.wkhtmltopdf || {};
    const changeWK = change => onChange(Object.assign({}, entity, {
      wkhtmltopdf: Object.assign({}, entity.wkhtmltopdf, change)
    }));
    const wkhtmltopdfVersions = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().extensions).wkhtmltopdf.options.wkhtmltopdfVersions;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "properties-section"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "wkhtmltopdf version"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: wkhtmltopdf.wkhtmltopdfVersion || wkhtmltopdfVersions[0].version,
      onChange: v => changeWK({
        wkhtmltopdfVersion: v.target.value
      })
    }, wkhtmltopdfVersions.map(p => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: p.version,
      value: p.version
    }, p.version)))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Metadata - title"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "document title",
      value: wkhtmltopdf.title || '',
      onChange: v => changeWK({
        title: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Paper size"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: wkhtmltopdf.pageSize || '',
      onChange: v => changeWK({
        pageSize: v.target.value
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
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Page width"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "600px",
      value: wkhtmltopdf.pageWidth || '',
      onChange: v => changeWK({
        pageWidth: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Page height"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "600px",
      value: wkhtmltopdf.pageHeight || '',
      onChange: v => changeWK({
        pageHeight: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      key: "foo",
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Orientation"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: wkhtmltopdf.orientation || '',
      onChange: v => changeWK({
        orientation: v.target.value
      })
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: "portrait",
      value: "portrait"
    }, "Portrait"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: "landscape",
      value: "landscape"
    }, "Landscape"))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Dpi"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "96",
      value: wkhtmltopdf.dpi || '',
      onChange: v => changeWK({
        dpi: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Margin bottom"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "10mm",
      value: wkhtmltopdf.marginBottom || '',
      onChange: v => changeWK({
        marginBottom: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Margin left"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "10mm",
      value: wkhtmltopdf.marginLeft || '',
      onChange: v => changeWK({
        marginLeft: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Margin right"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "10mm",
      value: wkhtmltopdf.marginRight || '',
      onChange: v => changeWK({
        marginRight: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Margin top"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "10mm",
      value: wkhtmltopdf.marginTop || '',
      onChange: v => changeWK({
        marginTop: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Header height in mm"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "10",
      value: wkhtmltopdf.headerHeight || '',
      onChange: v => changeWK({
        headerHeight: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Header"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      onClick: () => this.openHeaderFooter('header')
    }, "open in tab...")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Footer height in mm"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "10",
      value: wkhtmltopdf.footerHeight || '',
      onChange: v => changeWK({
        footerHeight: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Footer"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      onClick: () => this.openHeaderFooter('footer')
    }, "open in tab...")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Cover Page"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      onClick: () => this.openHeaderFooter('cover')
    }, "open in tab...")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Table of contents"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: wkhtmltopdf.toc === true,
      onChange: v => changeWK({
        toc: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "TOC header text"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      value: wkhtmltopdf.tocHeaderText || '',
      onChange: v => changeWK({
        tocHeaderText: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "TOC text size shrink"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "10mm",
      value: wkhtmltopdf.tocTextSizeShrink || '',
      onChange: v => changeWK({
        tocTextSizeShrink: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "TOC level indentation"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "10mm",
      value: wkhtmltopdf.tocLevelIndentation || '',
      onChange: v => changeWK({
        tocLevelIndentation: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Keep relative links"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: wkhtmltopdf.keepRelativeLinks === true,
      onChange: v => changeWK({
        keepRelativeLinks: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Disable smart shrinking"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: wkhtmltopdf.disableSmartShrinking === true,
      onChange: v => changeWK({
        disableSmartShrinking: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Print media type"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: wkhtmltopdf.printMediaType === true,
      onChange: v => changeWK({
        printMediaType: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Javascript Delay"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "200",
      value: wkhtmltopdf.javascriptDelay || '',
      onChange: v => changeWK({
        javascriptDelay: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Window Status"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      value: wkhtmltopdf.windowStatus || '',
      onChange: v => changeWK({
        windowStatus: v.target.value
      })
    })));
  }
}

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (props => /*#__PURE__*/React.createElement("span", null, props.entity.name + ' ' + props.headerOrFooter));

/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WK_TAB_EDITOR: () => (/* binding */ WK_TAB_EDITOR),
/* harmony export */   WK_TAB_TITLE: () => (/* binding */ WK_TAB_TITLE)
/* harmony export */ });
const WK_TAB_TITLE = 'WK_TAB_TITLE';
const WK_TAB_EDITOR = 'WK_TAB_EDITOR';

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
/* harmony import */ var _WKEditor_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _WKProperties_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
/* harmony import */ var _WKTitle_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(5);
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(6);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_4__);





jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addPropertiesComponent('wkhtmltopdf', _WKProperties_js__WEBPACK_IMPORTED_MODULE_1__["default"], entity => entity.__entitySet === 'templates' && entity.recipe === 'wkhtmltopdf');
const supportedDocProps = ['wkhtmltopdf.header', 'wkhtmltopdf.footer', 'wkhtmltopdf.cover'];
const shortNameMap = {
  'wkhtmltopdf.header': 'header',
  'wkhtmltopdf.footer': 'footer',
  'wkhtmltopdf.cover': 'cover'
};
const reformat = (reformatter, entity, tab) => {
  const targetProp = shortNameMap[tab.docProp];
  const reformated = reformatter(entity.wkhtmltopdf[targetProp], 'html');
  return {
    wkhtmltopdf: {
      [targetProp]: reformated
    }
  };
};
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addEditorComponent(_constants_js__WEBPACK_IMPORTED_MODULE_3__.WK_TAB_EDITOR, _WKEditor_js__WEBPACK_IMPORTED_MODULE_0__["default"], reformat);
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addTabTitleComponent(_constants_js__WEBPACK_IMPORTED_MODULE_3__.WK_TAB_TITLE, _WKTitle_js__WEBPACK_IMPORTED_MODULE_2__["default"]);
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
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().entityEditorComponentKeyResolvers.push((entity, docProp) => componentKeyResolver(entity, docProp, _constants_js__WEBPACK_IMPORTED_MODULE_3__.WK_TAB_EDITOR));
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().tabTitleComponentKeyResolvers.push((entity, docProp) => componentKeyResolver(entity, docProp, _constants_js__WEBPACK_IMPORTED_MODULE_3__.WK_TAB_TITLE));
})();

/******/ })()
;