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
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



const EntityRefSelect = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().EntityRefSelect);
const sharedComponents = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().sharedComponents);
class DocxProperties extends react__WEBPACK_IMPORTED_MODULE_1__.Component {
  static selectAssets(entities) {
    return Object.keys(entities).filter(k => entities[k].__entitySet === 'assets').map(k => entities[k]);
  }
  componentDidMount() {
    this.removeInvalidReferences();
  }
  componentDidUpdate() {
    this.removeInvalidReferences();
  }
  removeInvalidReferences() {
    const {
      entity,
      entities,
      onChange
    } = this.props;
    if (!entity.docx) {
      return;
    }
    const updatedAssetItems = Object.keys(entities).filter(k => entities[k].__entitySet === 'assets' && entities[k].shortid === entity.docx.templateAssetShortid);
    if (updatedAssetItems.length === 0) {
      onChange({
        _id: entity._id,
        docx: null
      });
    }
  }
  static title(entity, entities) {
    if (!entity.docx || !entity.docx.templateAssetShortid) {
      return 'docx';
    }
    const foundItems = DocxProperties.selectAssets(entities).filter(e => entity.docx.templateAssetShortid === e.shortid);
    if (!foundItems.length) {
      return 'docx';
    }
    return 'docx asset: ' + foundItems[0].name;
  }
  render() {
    const {
      entity,
      onChange
    } = this.props;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "properties-section"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(EntityRefSelect, {
      headingLabel: "Select docx template",
      newLabel: "New docx asset for template",
      value: entity.docx ? entity.docx.templateAssetShortid : '',
      onChange: selected => onChange({
        _id: entity._id,
        docx: selected.length > 0 ? {
          templateAssetShortid: selected[0].shortid
        } : null
      }),
      filter: references => ({
        data: references.assets
      }),
      renderNew: modalProps => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(sharedComponents.NewAssetModal, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, modalProps, {
        options: {
          ...modalProps.options,
          defaults: {
            folder: entity.folder
          },
          activateNewTab: false
        }
      }))
    })));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (DocxProperties);

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = Studio.runtime['helpers/extends'];

/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = Studio.libraries['react'];

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
/* harmony import */ var _DocxProperties__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().addPropertiesComponent(_DocxProperties__WEBPACK_IMPORTED_MODULE_0__["default"].title, _DocxProperties__WEBPACK_IMPORTED_MODULE_0__["default"], entity => entity.__entitySet === 'templates' && entity.recipe === 'docx');
jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().entityEditorComponentKeyResolvers.push(entity => {
  if (entity.__entitySet === 'templates' && entity.recipe === 'docx') {
    let officeAsset;
    if (entity.docx != null && entity.docx.templateAssetShortid != null) {
      officeAsset = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getEntityByShortid(entity.docx.templateAssetShortid, false);
    }
    return {
      key: 'assets',
      entity: officeAsset,
      props: {
        icon: 'fa-link',
        embeddingCode: '',
        codeEntity: {
          _id: entity._id,
          shortid: entity.shortid,
          name: entity.name,
          helpers: entity.helpers
        },
        displayName: `docx asset: ${officeAsset != null ? officeAsset.name : '<none>'}`,
        emptyMessage: 'No docx asset assigned, please add a reference to a docx asset in the properties'
      }
    };
  }
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().runListeners.push((request, entities) => {
  if (request.template.recipe !== 'docx') {
    return;
  }
  if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().extensions).docx.options.preview.enabled === false) {
    return;
  }
  if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().extensions).docx.options.preview.showWarning === false) {
    return;
  }
  if (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getSettingValueByKey('office-preview-informed', false) === true) {
    return;
  }
  jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openModal(() => /*#__PURE__*/React.createElement("div", null, "We need to upload your docx report to our publicly hosted server to be able to use Office Online Service for previewing here in the studio. You can disable it in the configuration, see ", /*#__PURE__*/React.createElement("a", {
    href: "https://jsreport.net/learn/docx",
    target: "_blank",
    rel: "noreferrer"
  }, "https://jsreport.net/learn/docx"), " for details."));
});
})();

/******/ })()
;