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
/* harmony export */   "default": () => (/* binding */ ReportEditor)
/* harmony export */ });
/* harmony import */ var react_list__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var react_list__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_list__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ReportEditor_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_3__);




let _instance;
class ReportEditor extends react__WEBPACK_IMPORTED_MODULE_2__.Component {
  static get Instance() {
    return _instance;
  }
  constructor() {
    super();
    this.state = {
      reports: [],
      active: null
    };
    _instance = this;
  }
  refresh() {
    this.skip = 0;
    this.top = 50;
    this.pending = 0;
    this.ActiveReport = null;
  }
  onTabActive() {
    this.refresh();
    this.setState({
      reports: [],
      active: null,
      count: 0
    }, () => {
      this.lazyFetch();
    });
  }
  componentWillUnmount() {
    this.ActiveReport = null;
  }
  async openReport(r) {
    let state = r.state;
    if (state == null && r.blobName != null) {
      state = 'success';
    }
    if (state === 'success') {
      if (r.contentType === 'text/html' || r.contentType === 'text/plain' || r.contentType === 'application/pdf' || r.contentType && r.contentType.indexOf('image') !== -1) {
        jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().preview({
          type: 'rawContent',
          data: {
            type: 'url',
            content: `${(jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().rootUrl)}/reports/${r._id}/content`
          },
          completed: true
        });
      } else {
        window.open(`${(jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().rootUrl)}/reports/${r._id}/attachment`, '_self');
      }
      this.setState({
        active: r._id
      });
      this.ActiveReport = r;
    } else if (state === 'error') {
      jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().preview({
        type: 'rawContent',
        data: {
          type: 'text/html',
          content: r.error || r.state
        },
        completed: true
      });
      this.setState({
        active: null
      });
      this.ActiveReport = null;
    }
  }
  async lazyFetch() {
    if (this.loading) {
      return;
    }
    this.loading = true;
    const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().api.get(`/odata/reports?$orderby=creationDate desc&$count=true&$top=${this.top}&$skip=${this.skip}`);
    this.skip += this.top;
    this.loading = false;
    this.setState({
      reports: this.state.reports.concat(response.value),
      count: response['@odata.count']
    });
    if (this.state.reports.length <= this.pending && response.value.length) {
      this.lazyFetch();
    }
  }
  tryRenderItem(index) {
    const task = this.state.reports[index];
    if (!task) {
      this.pending = Math.max(this.pending, index);
      this.lazyFetch();
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("tr", {
        key: index
      }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("td", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("i", {
        className: "fa fa-spinner fa-spin fa-fw"
      })));
    }
    return this.renderItem(task, index);
  }
  async remove() {
    const id = this.ActiveReport._id;
    this.ActiveReport = null;
    await jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().api.del(`/odata/reports(${id})`);
    this.setState({
      reports: this.state.reports.filter(r => r._id !== id)
    });
  }
  renderItem(report, index) {
    let state = report.state;
    let stateClass;
    if (state == null && report.blobName != null) {
      state = 'success';
    } else if (state == null) {
      state = 'error';
    }
    if (state === 'error') {
      stateClass = 'error';
    } else if (state === 'success') {
      stateClass = 'success';
    } else {
      stateClass = 'cancelled';
    }
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("tr", {
      key: index,
      className: this.state.active === report._id ? 'active' : '',
      onClick: () => this.openReport(report)
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("td", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("span", {
      className: `${_ReportEditor_css__WEBPACK_IMPORTED_MODULE_1__["default"].state} ${_ReportEditor_css__WEBPACK_IMPORTED_MODULE_1__["default"][stateClass]}`
    }, state)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("td", {
      className: "selection"
    }, report.reportName), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("td", null, report.creationDate.toLocaleString()), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("td", null, report.recipe));
  }
  renderItems(items, ref) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("table", {
      className: "table",
      ref: ref
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("thead", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("tr", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("th", null, "state"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("th", null, "name"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("th", null, "created on"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("th", null, "recipe"))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("tbody", null, items));
  }
  render() {
    const {
      count
    } = this.state;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("div", {
      className: "block custom-editor"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("h1", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("i", {
      className: "fa fa-folder-open-o"
    }), " Reports")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement("div", {
      className: _ReportEditor_css__WEBPACK_IMPORTED_MODULE_1__["default"].listContainer + ' block-item'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2___default().createElement((react_list__WEBPACK_IMPORTED_MODULE_0___default()), {
      type: "uniform",
      itemsRenderer: this.renderItems,
      itemRenderer: index => this.tryRenderItem(index),
      length: count
    })));
  }
}

/***/ }),
/* 3 */,
/* 4 */
/***/ ((module) => {

module.exports = Studio.libraries['react-list'];

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// extracted by mini-css-extract-plugin
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({"listContainer":"x-reports-ReportEditor-listContainer","state":"x-reports-ReportEditor-state","error":"x-reports-ReportEditor-error","cancelled":"x-reports-ReportEditor-cancelled","success":"x-reports-ReportEditor-success"});

/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


class ReportsButton extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  openReports() {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openTab({
      key: 'Reports',
      editorComponentKey: 'reports',
      title: 'Reports'
    });
  }
  render() {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      onClick: () => {
        this.openReports();
        this.props.closeMenu();
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-folder-open-o"
    }), "Reports");
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ReportsButton);

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ReportEditor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



class DownloadButton extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  getReportEditorInstance() {
    return _ReportEditor__WEBPACK_IMPORTED_MODULE_1__["default"]["default"] ? _ReportEditor__WEBPACK_IMPORTED_MODULE_1__["default"]["default"].Instance : _ReportEditor__WEBPACK_IMPORTED_MODULE_1__["default"].Instance;
  }
  download() {
    const instance = this.getReportEditorInstance();
    if (instance && instance.ActiveReport) {
      window.open(`${(jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().rootUrl)}/reports/${instance.ActiveReport._id}/attachment`, '_self');
    }
  }
  render() {
    if (!this.props.tab || this.props.tab.key !== 'Reports' || !this.getReportEditorInstance() || !this.getReportEditorInstance().ActiveReport) {
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null);
    }
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "toolbar-button",
      onClick: () => this.download()
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-download"
    }), "Download");
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (DownloadButton);

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ReportEditor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);


class DeleteButton extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  getReportEditorInstance() {
    return _ReportEditor__WEBPACK_IMPORTED_MODULE_1__["default"]["default"] ? _ReportEditor__WEBPACK_IMPORTED_MODULE_1__["default"]["default"].Instance : _ReportEditor__WEBPACK_IMPORTED_MODULE_1__["default"].Instance;
  }
  render() {
    if (!this.props.tab || this.props.tab.key !== 'Reports' || !this.getReportEditorInstance() || !this.getReportEditorInstance().ActiveReport) {
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null);
    }
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "toolbar-button",
      onClick: () => this.getReportEditorInstance().remove()
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-trash"
    }), "Delete");
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (DeleteButton);

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
/* harmony import */ var _ReportEditor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
/* harmony import */ var _ReportsButton__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6);
/* harmony import */ var _DownloadButton_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7);
/* harmony import */ var _DeleteButton_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(8);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_4__);





jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addEditorComponent('reports', _ReportEditor__WEBPACK_IMPORTED_MODULE_0__["default"]);
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addToolbarComponent(_ReportsButton__WEBPACK_IMPORTED_MODULE_1__["default"], 'settings');
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addToolbarComponent(_DownloadButton_js__WEBPACK_IMPORTED_MODULE_2__["default"]);
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addToolbarComponent(_DeleteButton_js__WEBPACK_IMPORTED_MODULE_3__["default"]);
})();

/******/ })()
;