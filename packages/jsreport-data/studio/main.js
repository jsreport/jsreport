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


class DataEditor extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  render() {
    const {
      entity,
      onUpdate
    } = this.props;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__.TextEditor, {
      name: entity._id,
      mode: "json",
      value: entity.dataJson || '',
      onUpdate: v => onUpdate(Object.assign({}, entity, {
        dataJson: v
      }))
    });
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (DataEditor);

/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Properties)
/* harmony export */ });
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5);
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



const EntityRefSelect = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().EntityRefSelect);
const sharedComponents = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().sharedComponents);
function selectDataItems(entities) {
  return Object.keys(entities).filter(k => entities[k].__entitySet === 'data').map(k => entities[k]);
}
class Properties extends react__WEBPACK_IMPORTED_MODULE_1__.Component {
  static title(entity, entities) {
    if (!entity.data || !entity.data.shortid) {
      return 'data';
    }
    const foundItems = selectDataItems(entities).filter(e => entity.data.shortid === e.shortid);
    if (!foundItems.length) {
      return 'data';
    }
    return 'sample data: ' + foundItems[0].name;
  }
  componentDidMount() {
    this.removeInvalidDataReferences();
  }
  componentDidUpdate() {
    this.removeInvalidDataReferences();
  }
  removeInvalidDataReferences() {
    const {
      entity,
      entities,
      onChange
    } = this.props;
    if (!entity.data) {
      return;
    }
    const updatedDataItems = Object.keys(entities).filter(k => entities[k].__entitySet === 'data' && entities[k].shortid === entity.data.shortid);
    if (updatedDataItems.length === 0) {
      onChange({
        _id: entity._id,
        data: null
      });
    }
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
      headingLabel: "Select data",
      newLabel: "New data for template",
      filter: references => ({
        data: references.data
      }),
      value: entity.data ? entity.data.shortid : null,
      onChange: selected => onChange({
        _id: entity._id,
        data: selected.length > 0 ? {
          shortid: selected[0].shortid
        } : null
      }),
      renderNew: modalProps => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(sharedComponents.NewEntityModal, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, modalProps, {
        options: {
          ...modalProps.options,
          entitySet: 'data',
          defaults: {
            folder: entity.folder
          },
          activateNewTab: false
        }
      }))
    })));
  }
}

/***/ }),
/* 5 */
/***/ ((module) => {

module.exports = Studio.runtime['helpers/extends'];

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
/* harmony import */ var _DataEditor_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _DataProperties_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().addEntitySet({
  name: 'data',
  faIcon: 'fa-database',
  visibleName: 'sample data',
  helpUrl: 'http://jsreport.net/learn/inline-data',
  entityTreePosition: 900
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().addPropertiesComponent(_DataProperties_js__WEBPACK_IMPORTED_MODULE_1__["default"].title, _DataProperties_js__WEBPACK_IMPORTED_MODULE_1__["default"], entity => entity.__entitySet === 'templates' || entity.__entitySet === 'components');
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().addEditorComponent('data', _DataEditor_js__WEBPACK_IMPORTED_MODULE_0__["default"], (reformatter, entity) => ({
  dataJson: reformatter(entity.dataJson, 'js')
}));
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().runListeners.push((request, entities) => {
  if (!request.template.data || !request.template.data.shortid) {
    return;
  }

  // try to fill request.data from the active open tab with sample data
  const dataDetails = Object.keys(entities).map(e => entities[e]).filter(d => d.shortid === request.template.data.shortid && d.__entitySet === 'data' && (d.__isLoaded || d.__isDirty || d.__isNew));
  if (!dataDetails.length) {
    return;
  }
  request.data = dataDetails[0].dataJson || JSON.stringify({});
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().entityNewListeners.push(entity => {
  if (entity.__entitySet === 'data' && entity.dataJson == null) {
    entity.dataJson = '{}';
  }
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().entitySaveListeners.push(entity => {
  if (entity.__entitySet === 'data' && entity.dataJson != null) {
    try {
      JSON.parse(entity.dataJson);
    } catch (e) {
      e.message = `Error validating new data entity, Invalid JSON input. ${e.message}`;
      throw e;
    }
  }
});
})();

/******/ })()
;