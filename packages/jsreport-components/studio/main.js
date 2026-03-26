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
/* 2 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



if (true) {
  module.exports = __webpack_require__(5);
} else // removed by dead control flow
{}


/***/ }),
/* 3 */,
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);
/* import PropTypes from 'prop-types' */



function getDefaultEngine() {
  const found = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().engines.find(e => e === 'handlebars');
  if (found) {
    return found;
  }
  return (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().engines)[0];
}
class NewComponentModal extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.nameInputRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.engineInputRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.state = {
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
      engine: this.engineInputRef.current.value,
      __entitySet: 'components'
    };
    this.setState({
      processing: true
    });
    try {
      await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.post('/studio/validate-entity-name', {
        data: {
          _id: this.props.options.cloning === true ? undefined : entity._id,
          name: name,
          entitySet: 'components',
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
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openNewTab({
      entity,
      entitySet: 'components',
      name
    });
  }
  render() {
    const {
      error,
      processing
    } = this.state;
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
        className: "form-group",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "New component"
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "name"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "text",
          placeholder: "name...",
          ref: this.nameInputRef,
          onKeyPress: e => this.handleKeyPress(e)
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "engine"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("select", {
          defaultValue: getDefaultEngine(),
          ref: this.engineInputRef,
          children: jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().engines.map(e => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("option", {
            value: e,
            children: e
          }, e))
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
        className: "form-group",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
          style: {
            color: 'red',
            display: error ? 'block' : 'none',
            marginLeft: 'auto',
            marginRight: 'auto',
            maxWidth: '360px'
          },
          children: error
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
        className: "button-bar",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("button", {
          className: "button confirmation",
          disabled: processing,
          onClick: () => this.submit(),
          children: "Ok"
        })
      })]
    });
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (NewComponentModal);

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


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ComponentProperties)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);
/* import PropTypes from 'prop-types' */



class ComponentProperties extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  renderEngines() {
    const {
      entity,
      onChange
    } = this.props;
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("select", {
      value: entity.engine,
      onChange: v => onChange({
        _id: entity._id,
        engine: v.target.value
      }),
      children: jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().engines.map(e => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("option", {
        value: e,
        children: e
      }, e))
    });
  }
  static title(entity) {
    return entity.engine;
  }
  render() {
    if (this.props.entity.__entitySet !== 'components') {
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {});
    }
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
      className: "properties-section",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "engine"
        }), " ", this.renderEngines()]
      })
    });
  }
}

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);



const FramePreview = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().sharedComponents).FramePreview;
const ComponentPreview = props => {
  const {
    data
  } = props;
  const src = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    if (data.type == null && data.content == null) {
      return null;
    }
    const blob = new Blob([data.content], {
      type: data.type
    });
    return window.URL.createObjectURL(blob);
  }, [data.type, data.content]);
  const styles = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    if (data.type !== 'text/html') {
      return {};
    }

    // match default browser styles
    return {
      backgroundColor: '#fff',
      color: '#000'
    };
  }, [data.type]);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(FramePreview, {
    src: src,
    styles: styles
  });
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ComponentPreview);

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);



const PreviewComponentToolbar = props => {
  const [isRunning, setIsRunning] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const stopPreviewRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(undefined);
  const entity = props.tab != null && props.tab.entity != null ? props.tab.entity : undefined;
  const previewComponent = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(function previewComponent(componentShortid, componentName) {
    if (isRunning) {
      return;
    }
    setIsRunning(true);
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().startProgress();
    const previewId = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().preview({
      type: 'component',
      data: {}
    });
    const componentPayload = {
      component: {
        shortid: componentShortid,
        content: entity.content || ''
      }
    };
    if (entity.engine != null) {
      componentPayload.component.engine = entity.engine;
    }
    if (entity.helpers != null) {
      componentPayload.component.helpers = entity.helpers;
    }
    if (entity.data && entity.data.shortid) {
      // try to fill request.data from the active open tab with sample data
      const dataDetails = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getAllEntities().filter(d => d.shortid === entity.data.shortid && d.__entitySet === 'data' && (d.__isLoaded || d.__isDirty || d.__isNew));
      if (dataDetails.length > 0) {
        componentPayload.data = dataDetails[0].dataJson ? JSON.parse(dataDetails[0].dataJson) : {};
      }
    }
    const componentUrl = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().resolveUrl('/api/component');
    const previewController = new AbortController();
    stopPreviewRef.current = () => {
      previewController.abort();
    };
    window.fetch(componentUrl, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(componentPayload),
      signal: previewController.signal
    }).then(response => {
      let contentType = '';
      if (response.headers != null) {
        contentType = response.headers.get('Content-Type') || '';
      }
      let contentPromise;
      if (response.status !== 200) {
        if (contentType.indexOf('application/json') === 0) {
          contentPromise = response.json();
        } else {
          contentPromise = response.text();
        }
      } else {
        contentPromise = response.text();
      }
      return contentPromise.then(content => ({
        status: response.status,
        content
      }));
    }).then(_ref => {
      let {
        status,
        content
      } = _ref;
      if (status !== 200) {
        let notOkError;
        if (typeof content !== 'string' && content.message && content.stack) {
          notOkError = new Error(content.message);
          notOkError.stack = content.stack;
        } else {
          notOkError = new Error(`Got not ok response, status: ${status}, message: ${content}`);
        }
        throw notOkError;
      }
      setIsRunning(false);
      jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().stopProgress();
      stopPreviewRef.current = null;
      jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().updatePreview(previewId, {
        data: {
          type: 'text/html',
          content
        },
        completed: true
      });
    }).catch(err => {
      setIsRunning(false);
      jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().stopProgress();
      stopPreviewRef.current = null;
      jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().updatePreview(previewId, {
        data: {
          type: 'text/plain',
          content: `Component${componentName != null ? ` "${componentName}"` : ''} preview failed.\n\n${err.message}\n${err.stack || ''}`
        },
        completed: true
      });
    });
  }, [entity, isRunning]);
  const stopPreviewComponent = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(function stopPreviewComponent() {
    if (stopPreviewRef.current != null) {
      stopPreviewRef.current();
    }
  });
  const handleEarlyShortcut = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(function handleEarlyShortcut(e) {
    if (e.which === 120 && entity && entity.__entitySet === 'components') {
      e.preventDefault();
      e.stopPropagation();
      if (isRunning) {
        stopPreviewComponent();
      } else {
        previewComponent(entity.shortid, entity.name);
      }
      return false;
    }
  }, [previewComponent, isRunning, entity]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    window.addEventListener('keydown', handleEarlyShortcut, true);
    return () => {
      window.removeEventListener('keydown', handleEarlyShortcut, true);
    };
  }, [handleEarlyShortcut]);
  if (!props.tab || !props.tab.entity || props.tab.entity.__entitySet !== 'components') {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {});
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
    title: "Run and preview component (F9)",
    className: "toolbar-button",
    onClick: () => {
      if (isRunning) {
        stopPreviewComponent();
      } else {
        previewComponent(props.tab.entity.shortid, props.tab.entity.name);
      }
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("i", {
      className: `fa fa-${isRunning ? 'stop' : 'eye'}`
    }), "Component"]
  });
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PreviewComponentToolbar);

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
/* harmony import */ var _NewComponentModal__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var _ComponentProperties__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6);
/* harmony import */ var _ComponentPreview__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7);
/* harmony import */ var _PreviewComponentToolbar__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(8);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_4__);





jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addEntitySet({
  name: 'components',
  faIcon: 'fa-puzzle-piece',
  visibleName: 'component',
  onNew: options => jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().openModal(_NewComponentModal__WEBPACK_IMPORTED_MODULE_0__["default"], options),
  entityTreePosition: 800
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().entityEditorComponentKeyResolvers.push(entity => {
  if (entity.__entitySet === 'components') {
    return {
      key: 'templates',
      entity
    };
  }
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addPropertiesComponent(_ComponentProperties__WEBPACK_IMPORTED_MODULE_1__["default"].title, _ComponentProperties__WEBPACK_IMPORTED_MODULE_1__["default"], entity => entity.__entitySet === 'components');
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addToolbarComponent(_PreviewComponentToolbar__WEBPACK_IMPORTED_MODULE_3__["default"]);
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addPreviewComponent('component', _ComponentPreview__WEBPACK_IMPORTED_MODULE_2__["default"]);
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().textEditorInitializeListeners.push(_ref => {
  let {
    monaco
  } = _ref;
  registerHandlebarsLanguage(monaco);
});

/**
 * We implement monaco registerLinkProvider & registerLinkOpener for Handlebars.
 * This allows to Ctrl+Click (or Cmd+Click on Mac) on {{component "path/to/component"}} expressions
 */
function registerHandlebarsLanguage(monaco) {
  const languageId = 'handlebars';
  const handlebarComponentRegex = /\{\{\s*component\s+(["'])([^"']+)\1[^}]*?\}\}/g;
  const handlebarLinkScheme = 'jsreport-studio';
  const handlebarLinkAuthority = 'handlebars-link';
  monaco.languages.registerLinkProvider(languageId, {
    provideLinks: model => {
      const links = [];
      const lines = model.getLinesContent();
      for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        let match;
        while ((match = handlebarComponentRegex.exec(lines[lineNumber])) !== null) {
          const path = match[2];
          const entityPath = jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().resolveEntityPath(jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().getActiveEntity());
          const parentPath = `/${entityPath.split('/').slice(1, -1).join('/')}`;
          const {
            entity: targetEntity
          } = jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().resolveEntityFromPath(path, 'components', {
            currentPath: parentPath
          });
          if ((targetEntity === null || targetEntity === void 0 ? void 0 : targetEntity.__entitySet) !== 'components') {
            continue;
          }

          // Add link to the editor model
          const url = `${handlebarLinkScheme}://${handlebarLinkAuthority}/${encodeURIComponent(path)}`;
          const startColumn = match.index + match[0].indexOf(path);
          const endColumn = startColumn + path.length;
          links.push({
            range: new monaco.Range(lineNumber + 1, startColumn + 1, lineNumber + 1, endColumn + 1),
            url: url
          });
        }
      }
      return {
        links
      };
    }
  });
  monaco.editor.registerLinkOpener({
    open: url => {
      if (!(url.scheme === handlebarLinkScheme && url.authority === handlebarLinkAuthority)) {
        return false;
      }
      const entityPath = jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().resolveEntityPath(jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().getActiveEntity());
      const parentPath = `/${entityPath.split('/').slice(1, -1).join('/')}`;
      const {
        entity: targetEntity
      } = jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().resolveEntityFromPath(url.path.slice(1), 'components', {
        currentPath: parentPath
      });
      if (!targetEntity) {
        return false;
      }
      jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().openTab({
        _id: targetEntity._id
      });
      return true;
    }
  });
}
})();

/******/ })()
;