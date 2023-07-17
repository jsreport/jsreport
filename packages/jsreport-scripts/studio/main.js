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
/* 2 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ([{
  key: 'template',
  title: 'template',
  value: 'template',
  desc: 'script will only run for the templates it is being explicitly attached'
}, {
  key: 'global',
  title: 'global',
  value: 'global',
  desc: 'script will run for all templates'
}, {
  key: 'folder',
  title: 'folder',
  value: 'folder',
  desc: 'script will run for all templates in the same folder hierarchy'
}]);

/***/ }),
/* 3 */,
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _scopeOptions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



class NewScriptModal extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.nameInputRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.state = {
      selectedScope: 'template',
      error: null,
      processing: false
    };
  }

  // the modal component for some reason after open focuses the panel itself
  componentDidMount() {
    setTimeout(() => this.nameInputRef.current.focus(), 0);
  }
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      this.submit(e.target.value);
    }
  }
  async submit(val) {
    if (this.state.processing) {
      return;
    }
    const name = val || this.nameInputRef.current.value;
    const entity = {
      ...this.props.options.defaults,
      name,
      scope: this.state.selectedScope,
      __entitySet: 'scripts'
    };
    this.setState({
      processing: true
    });
    try {
      await jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().api.post('/studio/validate-entity-name', {
        data: {
          _id: this.props.options.cloning === true ? undefined : entity._id,
          name: name,
          entitySet: 'scripts',
          folderShortid: entity.folder != null ? entity.folder.shortid : null
        }
      }, true);
    } catch (e) {
      this.setState({
        error: e.message,
        processing: false
      });
      return;
    }
    this.setState({
      error: null,
      processing: false
    });
    this.props.close();
    jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openNewTab({
      entity,
      entitySet: 'scripts',
      name
    });
  }
  render() {
    const {
      selectedScope,
      error,
      processing
    } = this.state;
    const currentScopeValue = selectedScope;
    const currentScopeOption = _scopeOptions__WEBPACK_IMPORTED_MODULE_1__["default"].find(opt => opt.value === currentScopeValue);
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "New script")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "name"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "name...",
      ref: this.nameInputRef,
      onKeyPress: e => this.handleKeyPress(e)
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "scope"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: currentScopeValue,
      onChange: v => {
        const newScope = v.target.value;
        this.setState({
          selectedScope: newScope
        });
      }
    }, _scopeOptions__WEBPACK_IMPORTED_MODULE_1__["default"].map(opt => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: opt.key,
      value: opt.value,
      title: opt.desc
    }, opt.title))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("em", null, currentScopeOption.desc)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        color: 'red',
        display: error ? 'block' : 'none',
        marginLeft: 'auto',
        marginRight: 'auto',
        maxWidth: '360px'
      }
    }, error)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button confirmation",
      disabled: processing,
      onClick: () => this.submit()
    }, "Ok")));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (NewScriptModal);

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ScriptEditor)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


class ScriptEditor extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  render() {
    const {
      entity,
      onUpdate
    } = this.props;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__.TextEditor, {
      name: entity._id,
      mode: "javascript",
      value: entity.content,
      onUpdate: v => onUpdate(Object.assign({}, entity, {
        content: v
      }))
    });
  }
}

/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(7);
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



const EntityRefSelect = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().EntityRefSelect);
const sharedComponents = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().sharedComponents);
class TemplateScriptProperties extends react__WEBPACK_IMPORTED_MODULE_1__.Component {
  static getSelectedScripts(entity, entities) {
    const getName = s => {
      const foundScripts = Object.keys(entities).map(k => entities[k]).filter(sc => sc.shortid === s.shortid);
      return foundScripts.length ? foundScripts[0].name : '';
    };
    return (entity.scripts || []).map(s => ({
      ...s,
      name: getName(s)
    }));
  }
  renderOrder() {
    const scripts = TemplateScriptProperties.getSelectedScripts(this.props.entity, this.props.entities);
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", null, scripts.map(s => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", {
      key: s.shortid
    }, s.name + ' ')));
  }
  componentDidMount() {
    this.removeInvalidScriptReferences();
  }
  componentDidUpdate() {
    this.removeInvalidScriptReferences();
  }
  static title(entity, entities) {
    if (!entity.scripts || !entity.scripts.length) {
      return 'scripts';
    }
    return 'scripts: ' + TemplateScriptProperties.getSelectedScripts(entity, entities).map(s => s.name).join(', ');
  }
  removeInvalidScriptReferences() {
    const {
      entity,
      entities,
      onChange
    } = this.props;
    if (!entity.scripts) {
      return;
    }
    const updatedScripts = entity.scripts.filter(s => Object.keys(entities).filter(k => entities[k].__entitySet === 'scripts' && entities[k].shortid === s.shortid && (entities[k].scope === 'template' || entities[k].scope == null && !entities[k].isGlobal)).length);
    if (updatedScripts.length !== entity.scripts.length) {
      onChange({
        _id: entity._id,
        scripts: updatedScripts
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
      headingLabel: "Select script",
      newLabel: "New script for template",
      filter: references => {
        const scripts = references.scripts.filter(e => {
          return e.scope === 'template' || e.scope == null && !e.isGlobal;
        });
        return {
          scripts: scripts
        };
      },
      value: entity.scripts ? entity.scripts.map(s => s.shortid) : [],
      onChange: selected => onChange({
        _id: entity._id,
        scripts: selected.map(s => ({
          shortid: s.shortid
        }))
      }),
      renderNew: modalProps => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(sharedComponents.NewEntityModal, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, modalProps, {
        options: {
          ...modalProps.options,
          entitySet: 'scripts',
          defaults: {
            folder: entity.folder
          },
          activateNewTab: false
        }
      })),
      multiple: true
    }), entity.scripts && entity.scripts.length ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", null, "Run order:"), this.renderOrder()) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", null)));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TemplateScriptProperties);

/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = Studio.runtime['helpers/extends'];

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _scopeOptions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);


class ScriptProperties extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  static title(entity, entities) {
    if (entity.scope != null) {
      return `scripts (scope: ${entity.scope})`;
    }
    return 'scripts';
  }
  componentDidMount() {
    this.removeOldIsGlobalProperty();
  }
  componentDidUpdate() {
    this.removeOldIsGlobalProperty();
  }
  removeOldIsGlobalProperty() {
    const {
      entity,
      onChange
    } = this.props;
    if (entity.isGlobal === true) {
      onChange({
        _id: entity._id,
        scope: 'global',
        isGlobal: false
      });
    } else if (entity.scope == null && !entity.isGlobal) {
      onChange({
        _id: entity._id,
        scope: 'template',
        isGlobal: false
      });
    }
  }
  render() {
    const {
      entity,
      onChange
    } = this.props;
    const currentScopeValue = entity.scope != null ? entity.scope : 'template';
    const currentScopeOption = _scopeOptions__WEBPACK_IMPORTED_MODULE_1__["default"].find(opt => opt.value === currentScopeValue);
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "properties-section"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "scope"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: currentScopeValue,
      onChange: v => {
        const newScope = v.target.value;
        onChange({
          _id: entity._id,
          scope: newScope
        });
      }
    }, _scopeOptions__WEBPACK_IMPORTED_MODULE_1__["default"].map(opt => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: opt.key,
      value: opt.value,
      title: opt.desc
    }, opt.title))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("em", null, currentScopeOption.desc)));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ScriptProperties);

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
/* harmony import */ var _NewScriptModal__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var _ScriptEditor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5);
/* harmony import */ var _TemplateScriptProperties__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6);
/* harmony import */ var _ScriptProperties__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(8);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_4__);





jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addEntitySet({
  name: 'scripts',
  faIcon: 'fa-cog',
  visibleName: 'script',
  onNew: options => jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().openModal(_NewScriptModal__WEBPACK_IMPORTED_MODULE_0__["default"], options),
  helpUrl: 'http://jsreport.net/learn/scripts',
  referenceAttributes: ['isGlobal', 'scope'],
  entityTreePosition: 800
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addPropertiesComponent(_TemplateScriptProperties__WEBPACK_IMPORTED_MODULE_2__["default"].title, _TemplateScriptProperties__WEBPACK_IMPORTED_MODULE_2__["default"], entity => entity.__entitySet === 'templates');
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addPropertiesComponent(_ScriptProperties__WEBPACK_IMPORTED_MODULE_3__["default"].title, _ScriptProperties__WEBPACK_IMPORTED_MODULE_3__["default"], entity => entity.__entitySet === 'scripts');
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addEditorComponent('scripts', _ScriptEditor__WEBPACK_IMPORTED_MODULE_1__["default"], (reformatter, entity) => ({
  content: reformatter(entity.content, 'js')
}));
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().runListeners.push((request, entities) => {
  if (!request.template.scripts) {
    return;
  }
  request.template.scripts = request.template.scripts.map(s => {
    const script = jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().getEntityByShortid(s.shortid, false);
    if (!script) {
      return s;
    }
    return script;
  }).filter(s => !s.__isNew || s.content);
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().entityNewListeners.push(entity => {
  if (entity.__entitySet === 'scripts' && entity.content == null) {
    entity.content = getDefaultScriptContent();
  }
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().entitySaveListeners.push(entity => {
  if (entity.__entitySet === 'scripts' && entity.content != null && entity.content.indexOf('function beforeRender') === -1 && entity.content.indexOf('function afterRender') === -1) {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().openModal(() => /*#__PURE__*/React.createElement("div", null, "The script \"", entity.name, "\" doesn't have a function hook defined. This means the script won't do anything. You should define either \"beforeRender\" or \"afterRender\" function hooks.", /*#__PURE__*/React.createElement("br", null), "See the ", /*#__PURE__*/React.createElement("a", {
      href: "https://jsreport.net/learn/scripts"
    }, "scripts documentation"), " for the details."));
  }
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().entityTreeIconResolvers.push(entity => {
  if (entity.__entitySet === 'scripts' && (Object.prototype.hasOwnProperty.call(entity, 'scope') && (entity.scope === 'global' || entity.scope === 'folder') || entity.isGlobal)) {
    return 'fa-cogs';
  }
  return null;
});
function getDefaultScriptContent() {
  return `// Use the "beforeRender" or "afterRender" hook
// to manipulate and control the report generation
async function beforeRender (req, res) {

}`;
}
})();

/******/ })()
;