/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = Studio;

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react'];

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _ExportModal = __webpack_require__(3);

var _ExportModal2 = _interopRequireDefault(_ExportModal);

var _ImportModal = __webpack_require__(5);

var _ImportModal2 = _interopRequireDefault(_ImportModal);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

_jsreportStudio2.default.addToolbarComponent(function (props) {
  return React.createElement(
    'div',
    {
      className: 'toolbar-button',
      onClick: function onClick() {
        _jsreportStudio2.default.openModal(_ExportModal2.default);
        props.closeMenu();
      }
    },
    React.createElement('i', { className: 'fa fa-download' }),
    'Export'
  );
}, 'settings');

_jsreportStudio2.default.addToolbarComponent(function (props) {
  return React.createElement(
    'div',
    {
      className: 'toolbar-button',
      onClick: function onClick() {
        _jsreportStudio2.default.openModal(_ImportModal2.default);
        props.closeMenu();
      }
    },
    React.createElement('i', { className: 'fa fa-upload' }),
    'Import'
  );
}, 'settings');

_jsreportStudio2.default.addEntityTreeContextMenuItemsResolver(function (_ref) {
  var node = _ref.node,
      entity = _ref.entity,
      isRoot = _ref.isRoot,
      isGroupEntity = _ref.isGroupEntity,
      getAllEntitiesInHierarchy = _ref.getAllEntitiesInHierarchy;

  var items = [];

  if (isRoot) {
    items.push({
      key: 'Import',
      title: 'Import',
      icon: 'fa-upload',
      onClick: function onClick() {
        _jsreportStudio2.default.openModal(_ImportModal2.default);
      }
    });

    items.push({
      key: 'Export',
      title: 'Export',
      icon: 'fa-download',
      onClick: function onClick() {
        _jsreportStudio2.default.openModal(_ExportModal2.default);
      }
    });
  } else if (isGroupEntity && entity.__entitySet === 'folders') {
    items.push({
      key: 'Import',
      title: 'Import into folder',
      icon: 'fa-upload',
      onClick: function onClick() {
        _jsreportStudio2.default.openModal(_ImportModal2.default, { selectedFolderShortid: entity.shortid });
      }
    });

    items.push({
      key: 'Export',
      title: 'Export folder',
      icon: 'fa-download',
      onClick: function onClick() {
        var selected = getAllEntitiesInHierarchy(node, true);
        _jsreportStudio2.default.openModal(_ExportModal2.default, { initialSelected: selected });
      }
    });
  }

  return {
    grouped: true,
    items: items
  };
});

_jsreportStudio2.default.entityTreeDropResolvers.push({
  type: _jsreportStudio2.default.dragAndDropNativeTypes.FILE,
  handler: function handler(_ref2) {
    var _this = this;

    var draggedItem = _ref2.draggedItem,
        dragOverContext = _ref2.dragOverContext,
        dropComplete = _ref2.dropComplete;
    return _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
      var files, targetInfo, opts;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              files = draggedItem.files;
              targetInfo = {
                shortid: null
              };


              if (dragOverContext && dragOverContext.containerTargetEntity) {
                targetInfo.shortid = dragOverContext.containerTargetEntity.shortid;
              }

              if (files && files.length === 1 && (/\.zip$/.test(files[0].name) || /\.jsrexport$/.test(files[0].name))) {
                dropComplete();

                opts = {
                  selectedFile: files[0]
                };


                if (targetInfo.shortid) {
                  opts.selectedFolderShortid = targetInfo.shortid;
                }

                _jsreportStudio2.default.openModal(_ImportModal2.default, opts);
              }

            case 4:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, _this);
    }))();
  }
});

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _filesaver = __webpack_require__(4);

var _filesaver2 = _interopRequireDefault(_filesaver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ExportModal = function (_Component) {
  _inherits(ExportModal, _Component);

  function ExportModal(props) {
    _classCallCheck(this, ExportModal);

    var _this = _possibleConstructorReturn(this, (ExportModal.__proto__ || Object.getPrototypeOf(ExportModal)).call(this, props));

    var options = props.options;


    var selections = {};

    var references = _this.getExportableReferences(_jsreportStudio2.default.getReferences());

    Object.keys(references).forEach(function (k) {
      Object.keys(references[k]).forEach(function (e) {
        if (options.initialSelected != null) {
          var selected = Array.isArray(options.initialSelected) ? options.initialSelected : [options.initialSelected];

          selected.forEach(function (s) {
            if (references[k][e]._id === s) {
              selections[references[k][e]._id] = true;
            } else if (selections[references[k][e]._id] == null) {
              selections[references[k][e]._id] = false;
            }
          });
        } else {
          selections[references[k][e]._id] = true;
        }
      });
    });

    _this.state = {};
    _this.state.processing = false;
    _this.state.selected = selections;

    _this.handleSelectionChange = _this.handleSelectionChange.bind(_this);
    return _this;
  }

  _createClass(ExportModal, [{
    key: 'getExportableReferences',
    value: function getExportableReferences(references) {
      var exportableEntitySets = _jsreportStudio2.default.extensions['import-export'].options.exportableEntitySets;

      return Object.keys(references).reduce(function (acu, entitySetName) {
        if (exportableEntitySets.indexOf(entitySetName) !== -1) {
          acu[entitySetName] = references[entitySetName];
        }

        return acu;
      }, {});
    }
  }, {
    key: 'download',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var _this2 = this;

        var response;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!this.state.processing) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt('return');

              case 2:

                this.setState({
                  processing: true
                });

                _context.prev = 3;
                _context.next = 6;
                return _jsreportStudio2.default.api.post('api/export', {
                  data: {
                    selection: Object.keys(this.state.selected).filter(function (k) {
                      return _this2.state.selected[k] === true;
                    })
                  },
                  responseType: 'blob'
                }, true);

              case 6:
                response = _context.sent;


                _filesaver2.default.saveAs(response, 'export.jsrexport');

                this.setState({
                  processing: false
                });
                _context.next = 15;
                break;

              case 11:
                _context.prev = 11;
                _context.t0 = _context['catch'](3);

                this.setState({
                  processing: false
                });

                alert('Unable to prepare export ' + _context.t0.message + ' ' + _context.t0.stack);

              case 15:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[3, 11]]);
      }));

      function download() {
        return _ref.apply(this, arguments);
      }

      return download;
    }()
  }, {
    key: 'handleSelectionChange',
    value: function handleSelectionChange(selected) {
      this.setState({
        selected: selected
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var references = this.getExportableReferences(_jsreportStudio2.default.getReferences());
      var _state = this.state,
          selected = _state.selected,
          processing = _state.processing;


      return _react2.default.createElement(
        'div',
        { className: 'form-group' },
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'h1',
            null,
            _react2.default.createElement('i', { className: 'fa fa-download' }),
            ' Export objects'
          )
        ),
        _react2.default.createElement(
          'div',
          { style: { height: '30rem', overflow: 'auto' } },
          _react2.default.createElement(_jsreportStudio.EntityTree, {
            entities: references,
            selectable: true,
            selected: selected,
            onSelectionChanged: this.handleSelectionChange
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'button-bar' },
          _react2.default.createElement(
            'a',
            { className: 'button confirmation ' + (processing ? 'disabled' : ''), onClick: function onClick() {
                return _this3.download();
              } },
            _react2.default.createElement('i', { className: 'fa fa-circle-o-notch fa-spin', style: { display: processing ? 'inline-block' : 'none' } }),
            _react2.default.createElement(
              'span',
              { style: { display: processing ? 'none' : 'inline' } },
              'Download'
            )
          )
        )
      );
    }
  }]);

  return ExportModal;
}(_react.Component);

exports.default = ExportModal;

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['filesaver.js-npm'];

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EntityRefSelect = _jsreportStudio2.default.EntityRefSelect;
var FileInput = _jsreportStudio2.default.FileInput;
var sharedComponents = _jsreportStudio2.default.sharedComponents;

var ImportFinishedModal = function (_Component) {
  _inherits(ImportFinishedModal, _Component);

  function ImportFinishedModal() {
    _classCallCheck(this, ImportFinishedModal);

    return _possibleConstructorReturn(this, (ImportFinishedModal.__proto__ || Object.getPrototypeOf(ImportFinishedModal)).apply(this, arguments));
  }

  _createClass(ImportFinishedModal, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this2 = this;

      setTimeout(function () {
        return _this2.confirmBtn.focus();
      }, 0);
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      _jsreportStudio2.default.reset().catch(function () {});
    }
  }, {
    key: 'confirm',
    value: function confirm() {
      this.props.close();

      _jsreportStudio2.default.reset().catch(function (e) {
        console.error(e);
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var log = this.props.options.log;


      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'h1',
          null,
          _react2.default.createElement('i', { className: 'fa fa-info-circle' }),
          ' Import finished'
        ),
        log != null && log !== '' && _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(
              'i',
              null,
              'Some errors/warnings happened during the import:'
            )
          ),
          _react2.default.createElement('textarea', { style: { width: '100%', boxSizing: 'border-box' }, rows: '10', readOnly: true, value: log })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'i',
            null,
            'Now we need to reload the studio..'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'button-bar' },
          _react2.default.createElement(
            'button',
            { ref: function ref(el) {
                _this3.confirmBtn = el;
              }, className: 'button confirmation', onClick: function onClick() {
                return _this3.confirm();
              } },
            'Ok'
          )
        )
      );
    }
  }]);

  return ImportFinishedModal;
}(_react.Component);

var ImportModal = function (_Component2) {
  _inherits(ImportModal, _Component2);

  function ImportModal(props) {
    _classCallCheck(this, ImportModal);

    var _this4 = _possibleConstructorReturn(this, (ImportModal.__proto__ || Object.getPrototypeOf(ImportModal)).call(this, props));

    _this4.state = {
      selectedFolderShortid: props.options != null && props.options.selectedFolderShortid ? props.options.selectedFolderShortid : null,
      fullImport: false,
      retryWithContinueOnFail: false,
      validated: false
    };

    if (props.options && props.options.selectedFile) {
      _this4.state.selectedFile = props.options.selectedFile;
    }

    _this4.handleImportModeChange = _this4.handleImportModeChange.bind(_this4);
    return _this4;
  }

  _createClass(ImportModal, [{
    key: 'handleImportModeChange',
    value: function handleImportModeChange(ev) {
      if (this.state.processing === true || this.state.validated) {
        return;
      }

      var fullImport = false;

      if (ev.target.value === 'full') {
        fullImport = true;
      }

      this.setState({
        fullImport: fullImport
      });
    }
  }, {
    key: 'validate',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(file) {
        var params, result;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(!file || this.state.processing)) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt('return');

              case 2:

                this.setState({
                  status: '1',
                  processing: true,
                  log: 'Validating import....'
                });

                _context.prev = 3;
                params = {
                  fullImport: this.state.fullImport
                };


                if (this.state.selectedFolderShortid != null) {
                  params.targetFolder = this.state.selectedFolderShortid;
                }

                _context.next = 8;
                return _jsreportStudio2.default.api.post('api/validate-import', {
                  params: params,
                  attach: { filename: 'import.jsrexport', file: file }
                }, true);

              case 8:
                result = _context.sent;


                this.setState({
                  validated: true,
                  status: result.status,
                  processing: false,
                  log: result.log
                });
                _context.next = 15;
                break;

              case 12:
                _context.prev = 12;
                _context.t0 = _context['catch'](3);

                this.setState({
                  validated: true,
                  status: '1',
                  processing: false,
                  log: _context.t0.message + ' ' + _context.t0.stack
                });

              case 15:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[3, 12]]);
      }));

      function validate(_x) {
        return _ref.apply(this, arguments);
      }

      return validate;
    }()
  }, {
    key: 'import',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
        var retryWithContinueOnFail, params, result, stateToUpdate;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!this.state.processing) {
                  _context2.next = 2;
                  break;
                }

                return _context2.abrupt('return');

              case 2:
                retryWithContinueOnFail = this.state.retryWithContinueOnFail;
                _context2.prev = 3;

                this.setState({
                  status: '1',
                  processing: true,
                  log: 'Working on import....'
                });

                params = {
                  fullImport: this.state.fullImport,
                  continueOnFail: retryWithContinueOnFail
                };


                if (this.state.selectedFolderShortid != null) {
                  params.targetFolder = this.state.selectedFolderShortid;
                }

                _context2.next = 9;
                return _jsreportStudio2.default.api.post('api/import', {
                  params: params,
                  attach: { filename: 'import.jsrexport', file: this.state.selectedFile }
                }, true);

              case 9:
                result = _context2.sent;


                this.setState({
                  processing: false,
                  retryWithContinueOnFail: false
                });

                _jsreportStudio2.default.openModal(ImportFinishedModal, {
                  log: result.log
                });
                _context2.next = 19;
                break;

              case 14:
                _context2.prev = 14;
                _context2.t0 = _context2['catch'](3);
                stateToUpdate = {
                  status: '1',
                  processing: false,
                  log: _context2.t0.message + ' ' + _context2.t0.stack
                };


                if (!retryWithContinueOnFail && _context2.t0.canContinueAfterFail) {
                  stateToUpdate.retryWithContinueOnFail = true;
                } else {
                  stateToUpdate.retryWithContinueOnFail = false;
                }

                this.setState(stateToUpdate);

              case 19:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this, [[3, 14]]);
      }));

      function _import() {
        return _ref2.apply(this, arguments);
      }

      return _import;
    }()
  }, {
    key: 'cancel',
    value: function cancel() {
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
  }, {
    key: 'render',
    value: function render() {
      var _this5 = this;

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'h1',
          null,
          _react2.default.createElement('i', { className: 'fa fa-upload' }),
          ' Import objects'
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'p',
            null,
            'A ',
            _react2.default.createElement(
              'b',
              null,
              'validation is run first'
            ),
            ', so you can safely upload the exported package and review the changes which will be performed. Afterwards ',
            _react2.default.createElement(
              'b',
              null,
              'you can confirm or cancel the import'
            ),
            '.'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(FileInput, {
            placeholder: 'select export file to import...',
            selectedFile: this.state.selectedFile,
            onFileSelect: function onFileSelect(file) {
              return _this5.setState({ selectedFile: file });
            },
            disabled: this.state.processing === true || this.state.validated
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'fieldset',
            { style: { padding: '0px', margin: '0px', borderWidth: '1px' } },
            _react2.default.createElement(
              'legend',
              { style: { marginLeft: '0.2rem' } },
              'Options'
            ),
            _react2.default.createElement(
              'div',
              { className: 'form-group' },
              _react2.default.createElement(
                'div',
                { style: { opacity: this.state.processing === true || this.state.validated ? 0.7 : 1 } },
                _react2.default.createElement(
                  'label',
                  null,
                  _react2.default.createElement('input', {
                    type: 'radio',
                    name: 'import-mode',
                    value: 'merge',
                    style: { verticalAlign: 'middle', margin: '0px' },
                    checked: !this.state.fullImport,
                    onChange: this.handleImportModeChange
                  }),
                  _react2.default.createElement(
                    'span',
                    { style: { display: 'inline-block', verticalAlign: 'middle', paddingLeft: '0.2rem', paddingRight: '0.5rem' } },
                    'Merge'
                  )
                ),
                _react2.default.createElement(
                  'label',
                  null,
                  _react2.default.createElement('input', {
                    type: 'radio',
                    name: 'import-mode',
                    value: 'full',
                    style: { verticalAlign: 'middle', margin: '0px' },
                    checked: this.state.fullImport,
                    onChange: this.handleImportModeChange
                  }),
                  _react2.default.createElement(
                    'span',
                    { style: { display: 'inline-block', verticalAlign: 'middle', paddingLeft: '0.2rem', paddingRight: '0.5rem' } },
                    'Full'
                  )
                )
              )
            ),
            _react2.default.createElement(
              'div',
              { className: 'form-group' },
              _react2.default.createElement(
                'div',
                {
                  style: {
                    display: !this.state.fullImport ? 'block' : 'none',
                    border: '1px dashed black',
                    padding: '0.6rem',
                    opacity: this.state.processing === true || this.state.validated ? 0.7 : 1
                  }
                },
                _react2.default.createElement(
                  'label',
                  { style: { display: 'inline-block', marginBottom: '5px' } },
                  _react2.default.createElement(
                    'b',
                    null,
                    'Optionally'
                  ),
                  ' you can select a folder in which the entities  will be inserted'
                ),
                _react2.default.createElement(
                  'div',
                  { style: { maxHeight: '20rem', overflow: 'auto' } },
                  _react2.default.createElement(EntityRefSelect, {
                    noModal: true,
                    treeStyle: { minHeight: 'auto', maxHeight: 'none' },
                    headingLabel: 'Select folder',
                    newLabel: 'New folder for import',
                    filter: function filter(references) {
                      return { folders: references.folders };
                    },
                    selectableFilter: function selectableFilter(isGroup, entity) {
                      return entity.__entitySet === 'folders';
                    },
                    value: this.state.selectedFolderShortid,
                    disabled: this.state.processing === true || this.state.validated,
                    onChange: function onChange(selected) {
                      _this5.setState({
                        selectedFolderShortid: selected.length > 0 ? selected[0].shortid : null
                      });
                    },
                    renderNew: function renderNew(modalProps) {
                      return _react2.default.createElement(sharedComponents.NewFolderModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { entitySet: 'folders' }) }));
                    }
                  })
                )
              ),
              this.state.fullImport && _react2.default.createElement(
                'p',
                { style: { marginTop: '10px' } },
                'A ',
                _react2.default.createElement(
                  'b',
                  null,
                  'full import'
                ),
                ' means that ',
                _react2.default.createElement(
                  'b',
                  null,
                  'all the entities that are not present in the export file will be deleted'
                ),
                ', after the import ',
                _react2.default.createElement(
                  'b',
                  null,
                  'you will have only the entities that were present in the export file'
                ),
                '.'
              )
            )
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          !this.state.validated && _react2.default.createElement(
            'div',
            { className: 'button-bar' },
            _react2.default.createElement(
              'button',
              {
                className: 'button confirmation ' + (this.state.processing ? 'disabled' : ''),
                style: { opacity: this.state.selectedFile == null ? 0.7 : 1 },
                disabled: this.state.selectedFile == null,
                onClick: function onClick() {
                  return _this5.validate(_this5.state.selectedFile);
                }
              },
              _react2.default.createElement('i', { className: 'fa fa-circle-o-notch fa-spin', style: { display: this.state.processing ? 'inline-block' : 'none' } }),
              _react2.default.createElement(
                'span',
                { style: { display: this.state.processing ? 'none' : 'inline' } },
                'Validate'
              )
            )
          ),
          _react2.default.createElement('br', null),
          this.state.validated && _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(
              'div',
              null,
              _react2.default.createElement(
                'i',
                null,
                'Log of changes with the import:'
              )
            ),
            _react2.default.createElement('textarea', { style: { width: '100%', boxSizing: 'border-box' }, rows: '10', readOnly: true, value: this.state.log })
          ),
          this.state.validated && _react2.default.createElement(
            'div',
            { className: 'button-bar' },
            _react2.default.createElement(
              'button',
              { className: 'button danger ' + (this.state.processing ? 'disabled' : ''), onClick: function onClick() {
                  return _this5.cancel();
                } },
              'Cancel'
            ),
            (this.state.status === '0' || this.state.retryWithContinueOnFail) && _react2.default.createElement(
              'button',
              { className: 'button confirmation ' + (this.state.processing ? 'disabled' : ''), onClick: function onClick() {
                  return _this5.import();
                } },
              _react2.default.createElement('i', { className: 'fa fa-circle-o-notch fa-spin', style: { display: this.state.processing ? 'inline-block' : 'none' } }),
              _react2.default.createElement(
                'span',
                { style: { display: this.state.processing ? 'none' : 'inline' } },
                this.state.retryWithContinueOnFail ? 'Ignore errors and continue' : 'Import'
              )
            )
          )
        )
      );
    }
  }]);

  return ImportModal;
}(_react.Component);

exports.default = ImportModal;

/***/ })
/******/ ]);