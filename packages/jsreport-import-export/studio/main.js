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
/* harmony import */ var filesaver_js_npm__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4);
/* harmony import */ var filesaver_js_npm__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(filesaver_js_npm__WEBPACK_IMPORTED_MODULE_2__);



const useEntitiesSelector = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().createUseEntitiesSelector();
function ExportModal(props) {
  const {
    options
  } = props;
  const references = useEntitiesSelector(entities => entities);
  const [processing, setProcessing] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const entityTreeRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const exportableReferences = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    const exportableEntitySets = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().extensions)['import-export'].options.exportableEntitySets;
    return Object.keys(references).reduce((acu, entitySetName) => {
      if (exportableEntitySets.indexOf(entitySetName) !== -1) {
        acu[entitySetName] = references[entitySetName];
      }
      return acu;
    }, {});
  }, [references]);
  const initialSelected = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    const selections = {};
    Object.keys(exportableReferences).forEach(k => {
      Object.keys(exportableReferences[k]).forEach(e => {
        if (options.initialSelected != null) {
          const selected = Array.isArray(options.initialSelected) ? options.initialSelected : [options.initialSelected];
          selected.forEach(s => {
            if (exportableReferences[k][e]._id === s) {
              selections[exportableReferences[k][e]._id] = true;
            } else if (selections[exportableReferences[k][e]._id] == null) {
              selections[exportableReferences[k][e]._id] = false;
            }
          });
        } else {
          selections[exportableReferences[k][e]._id] = true;
        }
      });
    });
    return selections;
  }, []);
  const download = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async () => {
    if (processing) {
      return;
    }
    setProcessing(true);
    try {
      const selected = entityTreeRef.current.selected;
      const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.post('api/export', {
        data: {
          selection: Object.keys(selected).filter(k => selected[k] === true)
        },
        responseType: 'blob'
      }, true);
      filesaver_js_npm__WEBPACK_IMPORTED_MODULE_2___default().saveAs(response, 'export.jsrexport');
      setProcessing(false);
    } catch (e) {
      setProcessing(false);
      alert('Unable to prepare export ' + e.message + ' ' + e.stack);
    }
  }, [processing]);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h1", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
    className: "fa fa-download"
  }), " Export objects")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
    style: {
      height: '30rem',
      overflow: 'auto'
    }
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__.EntityTree, {
    ref: entityTreeRef,
    entities: exportableReferences,
    selectable: true,
    initialSelected: initialSelected
  })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
    className: "button-bar"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("a", {
    className: `button confirmation ${processing ? 'disabled' : ''}`,
    onClick: () => download()
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
    className: "fa fa-circle-o-notch fa-spin",
    style: {
      display: processing ? 'inline-block' : 'none'
    }
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
    style: {
      display: processing ? 'none' : 'inline'
    }
  }, "Download"))));
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ExportModal);

/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = Studio.libraries['filesaver.js-npm'];

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6);
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



const EntityRefSelect = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().EntityRefSelect);
const FileInput = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().FileInput);
const sharedComponents = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().sharedComponents);
class ImportFinishedModal extends react__WEBPACK_IMPORTED_MODULE_1__.Component {
  componentDidMount() {
    setTimeout(() => this.confirmBtn.focus(), 0);
  }
  componentWillUnmount() {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().reset().catch(() => {});
  }
  confirm() {
    this.props.close();
    jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().reset().catch(e => {
      console.error(e);
    });
  }
  render() {
    const {
      log
    } = this.props.options;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("h1", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("i", {
      className: "fa fa-info-circle"
    }), " Import finished"), log != null && log !== '' && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("i", null, "Some errors/warnings happened during the import:")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("textarea", {
      style: {
        width: '100%',
        boxSizing: 'border-box'
      },
      rows: "10",
      readOnly: true,
      value: log
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("i", null, "Now we need to reload the studio..")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("button", {
      ref: el => {
        this.confirmBtn = el;
      },
      className: "button confirmation",
      onClick: () => this.confirm()
    }, "Ok")));
  }
}
class ImportModal extends react__WEBPACK_IMPORTED_MODULE_1__.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedFolderShortid: props.options != null && props.options.selectedFolderShortid ? props.options.selectedFolderShortid : null,
      fullImport: false,
      retryWithContinueOnFail: false,
      validated: false
    };
    if (props.options && props.options.selectedFile) {
      this.state.selectedFile = props.options.selectedFile;
    }
    this.handleImportModeChange = this.handleImportModeChange.bind(this);
  }
  handleImportModeChange(ev) {
    if (this.state.processing === true || this.state.validated) {
      return;
    }
    let fullImport = false;
    if (ev.target.value === 'full') {
      fullImport = true;
    }
    this.setState({
      fullImport
    });
  }
  async validate(file) {
    if (!file || this.state.processing) {
      return;
    }
    this.setState({
      status: '1',
      processing: true,
      log: 'Validating import....'
    });
    try {
      const params = {
        fullImport: this.state.fullImport
      };
      if (this.state.selectedFolderShortid != null) {
        params.targetFolder = this.state.selectedFolderShortid;
      }
      const result = await jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().api.post('api/validate-import', {
        params,
        attach: {
          filename: 'import.jsrexport',
          file
        }
      }, true);
      this.setState({
        validated: true,
        status: result.status,
        processing: false,
        log: result.log
      });
    } catch (e) {
      this.setState({
        validated: true,
        status: '1',
        processing: false,
        log: e.message + ' ' + e.stack
      });
    }
  }
  async import() {
    if (this.state.processing) {
      return;
    }
    const {
      retryWithContinueOnFail
    } = this.state;
    try {
      this.setState({
        status: '1',
        processing: true,
        log: 'Working on import....'
      });
      const params = {
        fullImport: this.state.fullImport,
        continueOnFail: retryWithContinueOnFail
      };
      if (this.state.selectedFolderShortid != null) {
        params.targetFolder = this.state.selectedFolderShortid;
      }
      const result = await jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().api.post('api/import', {
        params,
        attach: {
          filename: 'import.jsrexport',
          file: this.state.selectedFile
        }
      }, true);
      this.setState({
        processing: false,
        retryWithContinueOnFail: false
      });
      jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openModal(ImportFinishedModal, {
        log: result.log
      });
    } catch (e) {
      const stateToUpdate = {
        status: '1',
        processing: false,
        log: e.message + ' ' + e.stack
      };
      if (!retryWithContinueOnFail && e.canContinueAfterFail) {
        stateToUpdate.retryWithContinueOnFail = true;
      } else {
        stateToUpdate.retryWithContinueOnFail = false;
      }
      this.setState(stateToUpdate);
    }
  }
  cancel() {
    if (this.state.processing) {
      return;
    }
    this.setState({
      status: null,
      log: null,
      retryWithContinueOnFail: false,
      validated: false
    });
  }
  render() {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("h1", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("i", {
      className: "fa fa-upload"
    }), " Import objects"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("p", null, "A ", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("b", null, "validation is run first"), ", so you can safely upload the exported package and review the changes which will be performed. Afterwards ", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("b", null, "you can confirm or cancel the import"), ".")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(FileInput, {
      placeholder: "select export file to import...",
      selectedFile: this.state.selectedFile,
      onFileSelect: file => this.setState({
        selectedFile: file
      }),
      disabled: this.state.processing === true || this.state.validated
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("fieldset", {
      style: {
        padding: '0px',
        margin: '0px',
        borderWidth: '1px'
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("legend", {
      style: {
        marginLeft: '0.2rem'
      }
    }, "Options"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      style: {
        opacity: this.state.processing === true || this.state.validated ? 0.7 : 1
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("input", {
      type: "radio",
      name: "import-mode",
      value: "merge",
      style: {
        verticalAlign: 'middle',
        margin: '0px'
      },
      checked: !this.state.fullImport,
      onChange: this.handleImportModeChange
    }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", {
      style: {
        display: 'inline-block',
        verticalAlign: 'middle',
        paddingLeft: '0.2rem',
        paddingRight: '0.5rem'
      }
    }, "Merge")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("input", {
      type: "radio",
      name: "import-mode",
      value: "full",
      style: {
        verticalAlign: 'middle',
        margin: '0px'
      },
      checked: this.state.fullImport,
      onChange: this.handleImportModeChange
    }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", {
      style: {
        display: 'inline-block',
        verticalAlign: 'middle',
        paddingLeft: '0.2rem',
        paddingRight: '0.5rem'
      }
    }, "Full")))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      style: {
        display: !this.state.fullImport ? 'block' : 'none',
        border: '1px dashed black',
        padding: '0.6rem',
        opacity: this.state.processing === true || this.state.validated ? 0.7 : 1
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", {
      style: {
        display: 'inline-block',
        marginBottom: '5px'
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("b", null, "Optionally"), " you can select a folder in which the entities  will be inserted"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      style: {
        maxHeight: '20rem',
        overflow: 'auto'
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(EntityRefSelect, {
      noModal: true,
      treeStyle: {
        minHeight: 'auto',
        maxHeight: 'none'
      },
      headingLabel: "Select folder",
      newLabel: "New folder for import",
      filter: references => ({
        folders: references.folders
      }),
      selectableFilter: (isGroup, entity) => entity.__entitySet === 'folders',
      value: this.state.selectedFolderShortid,
      disabled: this.state.processing === true || this.state.validated,
      onChange: selected => {
        this.setState({
          selectedFolderShortid: selected.length > 0 ? selected[0].shortid : null
        });
      },
      renderNew: modalProps => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(sharedComponents.NewFolderModal, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, modalProps, {
        options: {
          ...modalProps.options,
          entitySet: 'folders'
        }
      }))
    }))), this.state.fullImport && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("p", {
      style: {
        marginTop: '10px'
      }
    }, "A ", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("b", null, "full import"), " means that ", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("b", null, "all the entities that are not present in the export file will be deleted"), ", after the import ", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("b", null, "you will have only the entities that were present in the export file"), ".")))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, !this.state.validated && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("button", {
      className: `button confirmation ${this.state.processing ? 'disabled' : ''}`,
      style: {
        opacity: this.state.selectedFile == null ? 0.7 : 1
      },
      disabled: this.state.selectedFile == null,
      onClick: () => this.validate(this.state.selectedFile)
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("i", {
      className: "fa fa-circle-o-notch fa-spin",
      style: {
        display: this.state.processing ? 'inline-block' : 'none'
      }
    }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", {
      style: {
        display: this.state.processing ? 'none' : 'inline'
      }
    }, "Validate"))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("br", null), this.state.validated && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("i", null, "Log of changes with the import:")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("textarea", {
      style: {
        width: '100%',
        boxSizing: 'border-box'
      },
      rows: "10",
      readOnly: true,
      value: this.state.log
    })), this.state.validated && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("button", {
      className: `button danger ${this.state.processing ? 'disabled' : ''}`,
      onClick: () => this.cancel()
    }, "Cancel"), (this.state.status === '0' || this.state.retryWithContinueOnFail) && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("button", {
      className: `button confirmation ${this.state.processing ? 'disabled' : ''}`,
      onClick: () => this.import()
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("i", {
      className: "fa fa-circle-o-notch fa-spin",
      style: {
        display: this.state.processing ? 'inline-block' : 'none'
      }
    }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", {
      style: {
        display: this.state.processing ? 'none' : 'inline'
      }
    }, this.state.retryWithContinueOnFail ? 'Ignore errors and continue' : 'Import')))));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ImportModal);

/***/ }),
/* 6 */
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
/* harmony import */ var _ExportModal_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _ImportModal_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().addToolbarComponent(props => /*#__PURE__*/React.createElement("div", {
  className: "toolbar-button",
  onClick: () => {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openModal(_ExportModal_js__WEBPACK_IMPORTED_MODULE_0__["default"]);
    props.closeMenu();
  }
}, /*#__PURE__*/React.createElement("i", {
  className: "fa fa-download"
}), "Export"), 'settings');
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().addToolbarComponent(props => /*#__PURE__*/React.createElement("div", {
  className: "toolbar-button",
  onClick: () => {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openModal(_ImportModal_js__WEBPACK_IMPORTED_MODULE_1__["default"]);
    props.closeMenu();
  }
}, /*#__PURE__*/React.createElement("i", {
  className: "fa fa-upload"
}), "Import"), 'settings');
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().addEntityTreeContextMenuItemsResolver(_ref => {
  let {
    node,
    entity,
    editSelection,
    isRoot,
    isGroupEntity,
    getAllEntitiesInHierarchy
  } = _ref;
  if (editSelection != null) {
    return;
  }
  const items = [];
  if (isRoot) {
    items.push({
      key: 'Import',
      title: 'Import',
      icon: 'fa-upload',
      onClick: () => {
        jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openModal(_ImportModal_js__WEBPACK_IMPORTED_MODULE_1__["default"]);
      }
    });
    items.push({
      key: 'Export',
      title: 'Export',
      icon: 'fa-download',
      onClick: () => {
        jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openModal(_ExportModal_js__WEBPACK_IMPORTED_MODULE_0__["default"]);
      }
    });
  } else if (isGroupEntity && entity.__entitySet === 'folders') {
    items.push({
      key: 'Import',
      title: 'Import into folder',
      icon: 'fa-upload',
      onClick: () => {
        jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openModal(_ImportModal_js__WEBPACK_IMPORTED_MODULE_1__["default"], {
          selectedFolderShortid: entity.shortid
        });
      }
    });
    items.push({
      key: 'Export',
      title: 'Export folder',
      icon: 'fa-download',
      onClick: () => {
        const selected = getAllEntitiesInHierarchy(node, true);
        jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openModal(_ExportModal_js__WEBPACK_IMPORTED_MODULE_0__["default"], {
          initialSelected: selected
        });
      }
    });
  }
  return {
    grouped: true,
    items
  };
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().entityTreeDropResolvers.push({
  type: (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().dragAndDropNativeTypes).FILE,
  async handler(_ref2) {
    let {
      draggedItem,
      dragOverContext,
      dropComplete
    } = _ref2;
    const files = draggedItem.files;
    const targetInfo = {
      shortid: null
    };
    if (dragOverContext && dragOverContext.containerTargetEntity) {
      targetInfo.shortid = dragOverContext.containerTargetEntity.shortid;
    }
    if (files && files.length === 1 && (/\.zip$/.test(files[0].name) || /\.jsrexport$/.test(files[0].name))) {
      dropComplete();
      const opts = {
        selectedFile: files[0]
      };
      if (targetInfo.shortid) {
        opts.selectedFolderShortid = targetInfo.shortid;
      }
      jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openModal(_ImportModal_js__WEBPACK_IMPORTED_MODULE_1__["default"], opts);
    }
  }
});
})();

/******/ })()
;