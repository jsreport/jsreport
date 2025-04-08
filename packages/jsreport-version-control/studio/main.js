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
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _DownloadBigFileModal__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6);


const openDiff = async change => {
  if (change.type === 'bigfile') {
    return jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().openModal(_DownloadBigFileModal__WEBPACK_IMPORTED_MODULE_1__["default"], {
      change
    });
  }
  const previewId = jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().preview({
    type: 'rawContent',
    data: {}
  });
  try {
    const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().api.post('/studio/diff-html', {
      parseJSON: false,
      data: {
        patch: change.patch
      }
    });
    jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().updatePreview(previewId, {
      type: 'rawContent',
      data: {
        type: 'text/html',
        content: response
      },
      completed: true
    });
  } catch (err) {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().updatePreview(previewId, {
      type: 'rawContent',
      data: {
        type: 'text/html',
        content: err.stack
      },
      completed: true
    });
  }
};
const operationIcon = operation => {
  switch (operation) {
    case 'insert':
      return 'fa fa-plus';
    case 'remove':
      return 'fa fa-eraser';
    case 'update':
      return 'fa fa-pencil';
  }
};
const renderChange = c => {
  return /*#__PURE__*/React.createElement("tbody", {
    key: `${c.entitySet}-${c.path}`
  }, /*#__PURE__*/React.createElement("tr", {
    onClick: () => openDiff(c)
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: operationIcon(c.operation)
  })), /*#__PURE__*/React.createElement("td", null, c.path), /*#__PURE__*/React.createElement("td", null, c.entitySet)));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_ref => {
  let {
    changes
  } = _ref;
  return /*#__PURE__*/React.createElement("table", {
    className: "table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      width: '20px'
    }
  }, "operation"), /*#__PURE__*/React.createElement("th", null, "path"), /*#__PURE__*/React.createElement("th", null, "entity set"))), changes.map(c => renderChange(c)));
});

/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// extracted by mini-css-extract-plugin
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({"runCaret":"x-version-control-VersionControl-runCaret fa fa-caret-down","listContainer":"x-version-control-VersionControl-listContainer"});

/***/ }),
/* 4 */,
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ HistoryEditor)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _ChangesTable_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);
/* harmony import */ var _VersionControl_css__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3);




class HistoryEditor extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor() {
    super();
    this.state = {
      history: [],
      inExecution: false
    };
  }
  onTabActive() {
    this.load();
  }
  async load() {
    if (this.fetchRequested) {
      return;
    }
    this.fetchRequested = true;
    try {
      const res = await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.get('/api/version-control/history');
      this.setState({
        history: res
      });
    } catch (e) {
      alert(e);
    } finally {
      this.fetchRequested = false;
    }
  }
  async checkout(id) {
    if (this.state.inExecution) {
      return;
    }
    try {
      this.setState({
        inExecution: true
      });
      const localChanges = await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.get('/api/version-control/local-changes');
      if (localChanges.length > 0) {
        this.setState({
          inExecution: false
        });
        return this.setState({
          error: 'You have uncommitted changes. You need to commit or revert them before checkout.'
        });
      }
      if (confirm('This will change the state of all entities to the state stored with selected commit. Are you sure?')) {
        await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.post('/api/version-control/checkout', {
          data: {
            _id: id
          }
        });
        this.setState({
          inExecution: false
        });
        return jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().reset().catch(e => console.error(e));
      } else {
        this.setState({
          inExecution: false
        });
      }
    } catch (e) {
      this.setState({
        inExecution: false
      });
      alert(e);
    }
  }
  async selectCommit(c) {
    this.setState({
      commit: c
    });
    try {
      const res = await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.get(`/api/version-control/diff/${c._id}`);
      this.setState({
        diff: res
      });
    } catch (e) {
      alert(e);
    }
  }
  renderCommit(commit) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h2", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-info-circle"
    }), " ", commit.message), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("small", null, commit.date.toLocaleString()), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button danger",
      disabled: this.state.inExecution,
      onClick: () => this.checkout(commit._id)
    }, "Checkout"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        color: 'red',
        marginTop: '0.5rem',
        display: this.state.error ? 'block' : 'none'
      }
    }, this.state.error)));
  }
  localChanges() {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openTab({
      key: 'versionControlLocalChanges',
      editorComponentKey: 'versionControlLocalChanges',
      title: 'Uncommitted changes'
    });
  }
  async clearAllCommits() {
    if (window.confirm('This will permanently delete all commits. Are you sure you want to perform this action?')) {
      try {
        const res = await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.get('/odata/versions');
        await Promise.all(res.value.map(v => jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.del(`/odata/versions('${v._id}')`)));
        this.load();
      } catch (e) {
        alert(e);
      }
    }
  }
  render() {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "block custom-editor"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h2", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-history"
    }), " Commits history", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button confirmation",
      onClick: () => this.localChanges()
    }, "Uncommitted changes"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button danger",
      onClick: () => this.clearAllCommits()
    }, "Clear all commits")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      style: {
        marginTop: '1rem',
        marginBottom: '1rem'
      }
    }, this.state.history.length > 0 ? 'Select a commit from the list to inspect the changes..' : ''), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _VersionControl_css__WEBPACK_IMPORTED_MODULE_3__["default"].listContainer + ' block-item'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("table", {
      className: "table"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("thead", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("tr", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("th", null, "date"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("th", null, "message"))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("tbody", null, this.state.history.map(h => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("tr", {
      key: h._id,
      onClick: () => this.selectCommit(h)
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("td", null, h.date.toLocaleString()), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("td", null, h.message)))))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      style: {
        marginTop: '1rem',
        marginBottom: '1rem'
      }
    }, this.state.commit ? this.renderCommit(this.state.commit) : null), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _VersionControl_css__WEBPACK_IMPORTED_MODULE_3__["default"].listContainer + ' block-item'
    }, this.state.diff ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_ChangesTable_js__WEBPACK_IMPORTED_MODULE_2__["default"], {
      changes: this.state.diff
    }) : ''));
  }
}

/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ DownloadBigFileModal)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var filesaver_js_npm__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7);
/* harmony import */ var filesaver_js_npm__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(filesaver_js_npm__WEBPACK_IMPORTED_MODULE_1__);


const b64toBlob = function (b64Data) {
  let contentType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  let sliceSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 512;
  const byteCharacters = atob(b64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  const blob = new Blob(byteArrays, {
    type: contentType
  });
  return blob;
};
class DownloadBigFileModal extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  download() {
    const blob = b64toBlob(this.props.options.change.patch, this.props.options.change.contentMimeType);
    const nameParts = this.props.options.change.name.split('.');
    let nameExtension;
    if (nameParts.length > 1) {
      nameExtension = nameParts.slice(-1)[0];
    }
    let filename = '';
    if (nameExtension != null && nameExtension === this.props.options.change.contentFileExtension) {
      filename = this.props.options.change.name;
    } else {
      filename = `${this.props.options.change.name}.${this.props.options.change.contentFileExtension}`;
    }
    filesaver_js_npm__WEBPACK_IMPORTED_MODULE_1___default().saveAs(blob, filename);
  }
  renderDownload() {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", null, "The version control doesn't diff big or binary files. Please download it to see its content"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button confirmation",
      onClick: () => this.download()
    }, "Download")));
  }
  renderEmpty() {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", null, "The new document is empty."), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button confirmation",
      onClick: () => this.props.close()
    }, "Ok")));
  }
  render() {
    const filename = this.props.options.change.path.split('/')[0];
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h2", null, filename), this.props.options.change.patch ? this.renderDownload() : this.renderEmpty());
  }
}

/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = Studio.libraries['filesaver.js-npm'];

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ LocalChangesEditor)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _ChangesTable_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);
/* harmony import */ var _VersionControl_css__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3);




class LocalChangesEditor extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: '',
      inExecution: false
    };
  }
  onTabActive() {
    this.load();
  }
  async load() {
    if (this.fetchRequested) {
      return;
    }
    this.fetchRequested = true;
    try {
      const res = await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.get('/api/version-control/local-changes');
      this.setState({
        diff: res
      });
    } catch (e) {
      alert(e);
    } finally {
      this.fetchRequested = false;
    }
  }
  async commit() {
    if (this.state.inExecution) {
      return;
    }
    if (!this.state.message) {
      return this.setState({
        error: 'Commit message must be filled'
      });
    }
    this.setState({
      inExecution: true
    });
    try {
      await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.post('/api/version-control/commit', {
        data: {
          message: this.state.message
        }
      });
      this.setState({
        message: '',
        error: null,
        inExecution: false
      });
      await this.load();
    } catch (e) {
      this.setState({
        inExecution: false
      });
      alert(e);
    }
  }
  async revert() {
    if (this.state.inExecution) {
      return;
    }
    this.setState({
      inExecution: true
    });
    try {
      if (confirm('This will revert all your changes to the previous commit. In case you have no previous commit, you will loose all entities! Are you sure?')) {
        await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.post('/api/version-control/revert');
        this.setState({
          inExecution: false
        });
        return jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().reset().catch(e => console.error(e));
      } else {
        this.setState({
          inExecution: false
        });
      }
    } catch (e) {
      this.setState({
        inExecution: false
      });
      alert(e);
    }
  }
  history() {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openTab({
      key: 'versionControlHistory',
      editorComponentKey: 'versionControlHistory',
      title: 'Commits history'
    });
  }
  render() {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "block custom-editor"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h1", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-history"
    }), " uncommitted changes", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button confirmation",
      onClick: () => this.history()
    }, "Commits history")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, "The version control is currently in beta."), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Message"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      value: this.state.message,
      onChange: event => this.setState({
        message: event.target.value,
        error: null
      })
    }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        color: 'red',
        display: this.state.error ? 'block' : 'none'
      }
    }, this.state.error)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button confirmation",
      disabled: this.state.inExecution,
      onClick: () => this.commit()
    }, "Commit"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button danger",
      disabled: this.state.inExecution,
      onClick: () => this.revert()
    }, "Revert")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _VersionControl_css__WEBPACK_IMPORTED_MODULE_3__["default"].listContainer + ' block-item'
    }, this.state.diff ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_ChangesTable_js__WEBPACK_IMPORTED_MODULE_2__["default"], {
      changes: this.state.diff
    }) : ''));
  }
}

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
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _HistoryEditor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(5);
/* harmony import */ var _LocalChangesEditor__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(8);




jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().initializeListeners.push(async () => {
  if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication) && !jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication.isUserAdmin((jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication).user)) {
    return;
  }
  jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addEditorComponent('versionControlHistory', _HistoryEditor__WEBPACK_IMPORTED_MODULE_2__["default"]);
  jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addEditorComponent('versionControlLocalChanges', _LocalChangesEditor__WEBPACK_IMPORTED_MODULE_3__["default"]);
  jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addToolbarComponent(() => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
    title: "History",
    className: "toolbar-button",
    onClick: () => jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().openTab({
      key: 'versionControlLocalChanges',
      editorComponentKey: 'versionControlLocalChanges',
      title: 'Uncommited changes'
    })
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("i", {
    className: "fa fa-history"
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", null, "Version control")), 'settings');
});
})();

/******/ })()
;