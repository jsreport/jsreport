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
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
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

// extracted by mini-css-extract-plugin
module.exports = {"runCaret":"x-version-control-VersionControl-runCaret","listContainer":"x-version-control-VersionControl-listContainer"};

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _DownloadBigFileModal = __webpack_require__(6);

var _DownloadBigFileModal2 = _interopRequireDefault(_DownloadBigFileModal);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var openDiff = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(change) {
    var previewId, response;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!(change.type === 'bigfile')) {
              _context.next = 2;
              break;
            }

            return _context.abrupt('return', _jsreportStudio2.default.openModal(_DownloadBigFileModal2.default, {
              change: change
            }));

          case 2:
            previewId = _jsreportStudio2.default.preview({
              type: 'rawContent',
              data: {}
            });
            _context.prev = 3;
            _context.next = 6;
            return _jsreportStudio2.default.api.post('/studio/diff-html', {
              parseJSON: false,
              data: {
                patch: change.patch
              }
            });

          case 6:
            response = _context.sent;


            _jsreportStudio2.default.updatePreview(previewId, {
              type: 'rawContent',
              data: {
                type: 'text/html',
                content: response
              },
              completed: true
            });
            _context.next = 13;
            break;

          case 10:
            _context.prev = 10;
            _context.t0 = _context['catch'](3);

            _jsreportStudio2.default.updatePreview(previewId, {
              type: 'rawContent',
              data: {
                type: 'text/html',
                content: _context.t0.stack
              },
              completed: true
            });

          case 13:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined, [[3, 10]]);
  }));

  return function openDiff(_x) {
    return _ref.apply(this, arguments);
  };
}();

var operationIcon = function operationIcon(operation) {
  switch (operation) {
    case 'insert':
      return 'fa fa-plus';
    case 'remove':
      return 'fa fa-eraser';
    case 'update':
      return 'fa fa-pencil';
  }
};

var renderChange = function renderChange(c) {
  return React.createElement(
    'tbody',
    { key: c.entitySet + '-' + c.path },
    React.createElement(
      'tr',
      { onClick: function onClick() {
          return openDiff(c);
        } },
      React.createElement(
        'td',
        { style: { textAlign: 'center' } },
        React.createElement('i', { className: operationIcon(c.operation) })
      ),
      React.createElement(
        'td',
        null,
        c.path
      ),
      React.createElement(
        'td',
        null,
        c.entitySet
      )
    )
  );
};

exports.default = function (_ref2) {
  var changes = _ref2.changes;
  return React.createElement(
    'table',
    { className: 'table' },
    React.createElement(
      'thead',
      null,
      React.createElement(
        'tr',
        null,
        React.createElement(
          'th',
          { style: { width: '20px' } },
          'operation'
        ),
        React.createElement(
          'th',
          null,
          'path'
        ),
        React.createElement(
          'th',
          null,
          'entity set'
        )
      )
    ),
    changes.map(function (c) {
      return renderChange(c);
    })
  );
};

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _HistoryEditor = __webpack_require__(5);

var _HistoryEditor2 = _interopRequireDefault(_HistoryEditor);

var _LocalChangesEditor = __webpack_require__(8);

var _LocalChangesEditor2 = _interopRequireDefault(_LocalChangesEditor);

var _VersionControl = __webpack_require__(2);

var _VersionControl2 = _interopRequireDefault(_VersionControl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var Popup = _jsreportStudio2.default.Popup;

_jsreportStudio2.default.initializeListeners.push(_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
  var VCToolbar;
  return regeneratorRuntime.wrap(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          if (!(_jsreportStudio2.default.authentication && !_jsreportStudio2.default.authentication.user.isAdmin)) {
            _context.next = 2;
            break;
          }

          return _context.abrupt('return');

        case 2:

          _jsreportStudio2.default.addEditorComponent('versionControlHistory', _HistoryEditor2.default);
          _jsreportStudio2.default.addEditorComponent('versionControlLocalChanges', _LocalChangesEditor2.default);

          VCToolbar = function (_Component) {
            _inherits(VCToolbar, _Component);

            function VCToolbar(props) {
              _classCallCheck(this, VCToolbar);

              var _this = _possibleConstructorReturn(this, (VCToolbar.__proto__ || Object.getPrototypeOf(VCToolbar)).call(this, props));

              _this.state = {
                expandedMenu: false
              };

              _this.handleVCMenuTrigger = _this.handleVCMenuTrigger.bind(_this);

              _this.vcMenuTriggerRef = _react2.default.createRef();
              _this.vcMenuContainerRef = _react2.default.createRef();
              return _this;
            }

            _createClass(VCToolbar, [{
              key: 'openHistory',
              value: function openHistory(e) {
                e.stopPropagation();
                _jsreportStudio2.default.openTab({ key: 'versionControlHistory', editorComponentKey: 'versionControlHistory', title: 'Commits history' });
              }
            }, {
              key: 'openLocalChanges',
              value: function openLocalChanges(e) {
                e.stopPropagation();
                _jsreportStudio2.default.openTab({ key: 'versionControlLocalChanges', editorComponentKey: 'versionControlLocalChanges', title: 'Uncommited changes' });
              }
            }, {
              key: 'handleVCMenuTrigger',
              value: function handleVCMenuTrigger(e) {
                e.stopPropagation();

                if (this.vcMenuTriggerRef.current == null || this.vcMenuContainerRef.current == null) {
                  return;
                }

                if (this.vcMenuTriggerRef.current.contains(e.target) && !this.vcMenuContainerRef.current.contains(e.target)) {
                  this.setState(function (prevState) {
                    return {
                      expandedMenu: !prevState.expandedMenu
                    };
                  });
                }
              }
            }, {
              key: 'render',
              value: function render() {
                var _this2 = this;

                return _react2.default.createElement(
                  'div',
                  {
                    ref: this.vcMenuTriggerRef,
                    className: 'toolbar-button',
                    onClick: function onClick(e) {
                      _this2.openLocalChanges(e);
                      _this2.setState({ expandedMenu: false });
                    }
                  },
                  _react2.default.createElement('i', { className: 'fa fa-history ' }),
                  'Commit',
                  _react2.default.createElement('span', {
                    className: _VersionControl2.default.runCaret,
                    onClick: this.handleVCMenuTrigger
                  }),
                  _react2.default.createElement(
                    Popup,
                    {
                      ref: this.vcMenuContainerRef,
                      open: this.state.expandedMenu,
                      position: { top: undefined, right: undefined },
                      onRequestClose: function onRequestClose() {
                        return _this2.setState({ expandedMenu: false });
                      }
                    },
                    function (itemProps) {
                      if (!itemProps.open) {
                        return;
                      }

                      return _react2.default.createElement(
                        'div',
                        {
                          title: 'History',
                          className: 'toolbar-button',
                          onClick: function onClick(e) {
                            _this2.openHistory(e);
                            itemProps.closeMenu();
                          }
                        },
                        _react2.default.createElement('i', { className: 'fa fa-history' }),
                        _react2.default.createElement(
                          'span',
                          null,
                          'History'
                        )
                      );
                    }
                  )
                );
              }
            }]);

            return VCToolbar;
          }(_react.Component);

          _jsreportStudio2.default.addToolbarComponent(VCToolbar);

        case 6:
        case 'end':
          return _context.stop();
      }
    }
  }, _callee, undefined);
})));

/***/ }),
/* 5 */
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

var _ChangesTable = __webpack_require__(3);

var _ChangesTable2 = _interopRequireDefault(_ChangesTable);

var _VersionControl = __webpack_require__(2);

var _VersionControl2 = _interopRequireDefault(_VersionControl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var HistoryEditor = function (_Component) {
  _inherits(HistoryEditor, _Component);

  function HistoryEditor() {
    _classCallCheck(this, HistoryEditor);

    var _this = _possibleConstructorReturn(this, (HistoryEditor.__proto__ || Object.getPrototypeOf(HistoryEditor)).call(this));

    _this.state = { history: [], inExecution: false };
    return _this;
  }

  _createClass(HistoryEditor, [{
    key: 'onTabActive',
    value: function onTabActive() {
      this.load();
    }
  }, {
    key: 'load',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var res;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!this.fetchRequested) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt('return');

              case 2:

                this.fetchRequested = true;

                _context.prev = 3;
                _context.next = 6;
                return _jsreportStudio2.default.api.get('/api/version-control/history');

              case 6:
                res = _context.sent;

                this.setState({ history: res });
                _context.next = 13;
                break;

              case 10:
                _context.prev = 10;
                _context.t0 = _context['catch'](3);

                alert(_context.t0);

              case 13:
                _context.prev = 13;

                this.fetchRequested = false;
                return _context.finish(13);

              case 16:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[3, 10, 13, 16]]);
      }));

      function load() {
        return _ref.apply(this, arguments);
      }

      return load;
    }()
  }, {
    key: 'checkout',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(id) {
        var localChanges;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!this.state.inExecution) {
                  _context2.next = 2;
                  break;
                }

                return _context2.abrupt('return');

              case 2:
                _context2.prev = 2;

                this.setState({ inExecution: true });

                _context2.next = 6;
                return _jsreportStudio2.default.api.get('/api/version-control/local-changes');

              case 6:
                localChanges = _context2.sent;

                if (!(localChanges.length > 0)) {
                  _context2.next = 10;
                  break;
                }

                this.setState({ inExecution: false });
                return _context2.abrupt('return', this.setState({ error: 'You have uncommitted changes. You need to commit or revert them before checkout.' }));

              case 10:
                if (!confirm('This will change the state of all entities to the state stored with selected commit. Are you sure?')) {
                  _context2.next = 17;
                  break;
                }

                _context2.next = 13;
                return _jsreportStudio2.default.api.post('/api/version-control/checkout', {
                  data: {
                    _id: id
                  }
                });

              case 13:

                this.setState({ inExecution: false });
                return _context2.abrupt('return', _jsreportStudio2.default.reset().catch(function (e) {
                  return console.error(e);
                }));

              case 17:
                this.setState({ inExecution: false });

              case 18:
                _context2.next = 24;
                break;

              case 20:
                _context2.prev = 20;
                _context2.t0 = _context2['catch'](2);

                this.setState({ inExecution: false });
                alert(_context2.t0);

              case 24:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this, [[2, 20]]);
      }));

      function checkout(_x) {
        return _ref2.apply(this, arguments);
      }

      return checkout;
    }()
  }, {
    key: 'selectCommit',
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(c) {
        var res;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                this.setState({ commit: c });

                _context3.prev = 1;
                _context3.next = 4;
                return _jsreportStudio2.default.api.get('/api/version-control/diff/' + c._id);

              case 4:
                res = _context3.sent;

                this.setState({ diff: res });
                _context3.next = 11;
                break;

              case 8:
                _context3.prev = 8;
                _context3.t0 = _context3['catch'](1);

                alert(_context3.t0);

              case 11:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this, [[1, 8]]);
      }));

      function selectCommit(_x2) {
        return _ref3.apply(this, arguments);
      }

      return selectCommit;
    }()
  }, {
    key: 'renderCommit',
    value: function renderCommit(commit) {
      var _this2 = this;

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'h2',
          null,
          _react2.default.createElement('i', { className: 'fa fa-info-circle' }),
          ' ',
          commit.message
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'small',
            null,
            commit.date.toLocaleString()
          ),
          _react2.default.createElement(
            'button',
            { className: 'button danger', disabled: this.state.inExecution, onClick: function onClick() {
                return _this2.checkout(commit._id);
              } },
            'Checkout'
          ),
          _react2.default.createElement(
            'span',
            { style: { color: 'red', marginTop: '0.5rem', display: this.state.error ? 'block' : 'none' } },
            this.state.error
          )
        )
      );
    }
  }, {
    key: 'localChanges',
    value: function localChanges() {
      _jsreportStudio2.default.openTab({ key: 'versionControlLocalChanges', editorComponentKey: 'versionControlLocalChanges', title: 'Uncommitted changes' });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      return _react2.default.createElement(
        'div',
        { className: 'block custom-editor' },
        _react2.default.createElement(
          'h2',
          null,
          _react2.default.createElement('i', { className: 'fa fa-history' }),
          ' Commits history',
          _react2.default.createElement(
            'button',
            { className: 'button confirmation', onClick: function onClick() {
                return _this3.localChanges();
              } },
            'Uncommitted changes'
          )
        ),
        _react2.default.createElement(
          'div',
          { style: { marginTop: '1rem', marginBottom: '1rem' } },
          this.state.history.length > 0 ? 'Select a commit from the list to inspect the changes..' : ''
        ),
        _react2.default.createElement(
          'div',
          { className: _VersionControl2.default.listContainer + ' block-item' },
          _react2.default.createElement(
            'table',
            { className: 'table' },
            _react2.default.createElement(
              'thead',
              null,
              _react2.default.createElement(
                'tr',
                null,
                _react2.default.createElement(
                  'th',
                  null,
                  'date'
                ),
                _react2.default.createElement(
                  'th',
                  null,
                  'message'
                )
              )
            ),
            _react2.default.createElement(
              'tbody',
              null,
              this.state.history.map(function (h) {
                return _react2.default.createElement(
                  'tr',
                  { key: h._id, onClick: function onClick() {
                      return _this3.selectCommit(h);
                    } },
                  _react2.default.createElement(
                    'td',
                    null,
                    h.date.toLocaleString()
                  ),
                  _react2.default.createElement(
                    'td',
                    null,
                    h.message
                  )
                );
              })
            )
          )
        ),
        _react2.default.createElement(
          'div',
          { style: { marginTop: '1rem', marginBottom: '1rem' } },
          this.state.commit ? this.renderCommit(this.state.commit) : null
        ),
        _react2.default.createElement(
          'div',
          { className: _VersionControl2.default.listContainer + ' block-item' },
          this.state.diff ? _react2.default.createElement(_ChangesTable2.default, { changes: this.state.diff }) : ''
        )
      );
    }
  }]);

  return HistoryEditor;
}(_react.Component);

exports.default = HistoryEditor;

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _filesaver = __webpack_require__(7);

var _filesaver2 = _interopRequireDefault(_filesaver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var b64toBlob = function b64toBlob(b64Data) {
  var contentType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var sliceSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 512;

  var byteCharacters = atob(b64Data);
  var byteArrays = [];

  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    var slice = byteCharacters.slice(offset, offset + sliceSize);

    var byteNumbers = new Array(slice.length);
    for (var i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    var byteArray = new Uint8Array(byteNumbers);

    byteArrays.push(byteArray);
  }

  var blob = new Blob(byteArrays, { type: contentType });
  return blob;
};

var DownloadBigFileModal = function (_Component) {
  _inherits(DownloadBigFileModal, _Component);

  function DownloadBigFileModal() {
    _classCallCheck(this, DownloadBigFileModal);

    return _possibleConstructorReturn(this, (DownloadBigFileModal.__proto__ || Object.getPrototypeOf(DownloadBigFileModal)).apply(this, arguments));
  }

  _createClass(DownloadBigFileModal, [{
    key: 'download',
    value: function download() {
      var blob = b64toBlob(this.props.options.change.patch, this.props.options.change.contentMimeType);
      var nameParts = this.props.options.change.name.split('.');
      var nameExtension = void 0;

      if (nameParts.length > 1) {
        nameExtension = nameParts.slice(-1)[0];
      }

      var filename = '';

      if (nameExtension != null && nameExtension === this.props.options.change.contentFileExtension) {
        filename = this.props.options.change.name;
      } else {
        filename = this.props.options.change.name + '.' + this.props.options.change.contentFileExtension;
      }

      _filesaver2.default.saveAs(blob, filename);
    }
  }, {
    key: 'renderDownload',
    value: function renderDownload() {
      var _this2 = this;

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'p',
          null,
          'The version control doesn\'t diff big or binary files. Please download it to see its content'
        ),
        _react2.default.createElement(
          'div',
          { className: 'button-bar' },
          _react2.default.createElement(
            'button',
            { className: 'button confirmation', onClick: function onClick() {
                return _this2.download();
              } },
            'Download'
          )
        )
      );
    }
  }, {
    key: 'renderEmpty',
    value: function renderEmpty() {
      var _this3 = this;

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'p',
          null,
          'The new document is empty.'
        ),
        _react2.default.createElement(
          'div',
          { className: 'button-bar' },
          _react2.default.createElement(
            'button',
            { className: 'button confirmation', onClick: function onClick() {
                return _this3.props.close();
              } },
            'Ok'
          )
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      var filename = this.props.options.change.path.split('/')[0];

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'h2',
          null,
          filename
        ),
        this.props.options.change.patch ? this.renderDownload() : this.renderEmpty()
      );
    }
  }]);

  return DownloadBigFileModal;
}(_react.Component);

exports.default = DownloadBigFileModal;

/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['filesaver.js-npm'];

/***/ }),
/* 8 */
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

var _ChangesTable = __webpack_require__(3);

var _ChangesTable2 = _interopRequireDefault(_ChangesTable);

var _VersionControl = __webpack_require__(2);

var _VersionControl2 = _interopRequireDefault(_VersionControl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LocalChangesEditor = function (_Component) {
  _inherits(LocalChangesEditor, _Component);

  function LocalChangesEditor(props) {
    _classCallCheck(this, LocalChangesEditor);

    var _this = _possibleConstructorReturn(this, (LocalChangesEditor.__proto__ || Object.getPrototypeOf(LocalChangesEditor)).call(this, props));

    _this.state = { message: '', inExecution: false };
    return _this;
  }

  _createClass(LocalChangesEditor, [{
    key: 'onTabActive',
    value: function onTabActive() {
      this.load();
    }
  }, {
    key: 'load',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var res;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!this.fetchRequested) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt('return');

              case 2:

                this.fetchRequested = true;

                _context.prev = 3;
                _context.next = 6;
                return _jsreportStudio2.default.api.get('/api/version-control/local-changes');

              case 6:
                res = _context.sent;

                this.setState({ diff: res });
                _context.next = 13;
                break;

              case 10:
                _context.prev = 10;
                _context.t0 = _context['catch'](3);

                alert(_context.t0);

              case 13:
                _context.prev = 13;

                this.fetchRequested = false;
                return _context.finish(13);

              case 16:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[3, 10, 13, 16]]);
      }));

      function load() {
        return _ref.apply(this, arguments);
      }

      return load;
    }()
  }, {
    key: 'commit',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!this.state.inExecution) {
                  _context2.next = 2;
                  break;
                }

                return _context2.abrupt('return');

              case 2:
                if (this.state.message) {
                  _context2.next = 4;
                  break;
                }

                return _context2.abrupt('return', this.setState({ error: 'Commit message must be filled' }));

              case 4:

                this.setState({ inExecution: true });

                _context2.prev = 5;
                _context2.next = 8;
                return _jsreportStudio2.default.api.post('/api/version-control/commit', {
                  data: {
                    message: this.state.message
                  }
                });

              case 8:
                this.setState({ message: '', error: null, inExecution: false });
                _context2.next = 11;
                return this.load();

              case 11:
                _context2.next = 17;
                break;

              case 13:
                _context2.prev = 13;
                _context2.t0 = _context2['catch'](5);

                this.setState({ inExecution: false });
                alert(_context2.t0);

              case 17:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this, [[5, 13]]);
      }));

      function commit() {
        return _ref2.apply(this, arguments);
      }

      return commit;
    }()
  }, {
    key: 'revert',
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3() {
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (!this.state.inExecution) {
                  _context3.next = 2;
                  break;
                }

                return _context3.abrupt('return');

              case 2:

                this.setState({ inExecution: true });

                _context3.prev = 3;

                if (!confirm('This will revert all your changes to the previous commit. In case you have no previous commit, you will loose all entities! Are you sure?')) {
                  _context3.next = 11;
                  break;
                }

                _context3.next = 7;
                return _jsreportStudio2.default.api.post('/api/version-control/revert');

              case 7:
                this.setState({ inExecution: false });
                return _context3.abrupt('return', _jsreportStudio2.default.reset().catch(function (e) {
                  return console.error(e);
                }));

              case 11:
                this.setState({ inExecution: false });

              case 12:
                _context3.next = 18;
                break;

              case 14:
                _context3.prev = 14;
                _context3.t0 = _context3['catch'](3);

                this.setState({ inExecution: false });
                alert(_context3.t0);

              case 18:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this, [[3, 14]]);
      }));

      function revert() {
        return _ref3.apply(this, arguments);
      }

      return revert;
    }()
  }, {
    key: 'history',
    value: function history() {
      _jsreportStudio2.default.openTab({ key: 'versionControlHistory', editorComponentKey: 'versionControlHistory', title: 'Commits history' });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      return _react2.default.createElement(
        'div',
        { className: 'block custom-editor' },
        _react2.default.createElement(
          'h1',
          null,
          _react2.default.createElement('i', { className: 'fa fa-history' }),
          ' uncommitted changes',
          _react2.default.createElement(
            'button',
            { className: 'button confirmation', onClick: function onClick() {
                return _this2.history();
              } },
            'Commits history'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          'The version control is currently in beta.'
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Message'
          ),
          _react2.default.createElement('input', { type: 'text', value: this.state.message, onChange: function onChange(event) {
              return _this2.setState({ message: event.target.value, error: null });
            } }),
          _react2.default.createElement(
            'span',
            { style: { color: 'red', display: this.state.error ? 'block' : 'none' } },
            this.state.error
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'button',
            { className: 'button confirmation', disabled: this.state.inExecution, onClick: function onClick() {
                return _this2.commit();
              } },
            'Commit'
          ),
          _react2.default.createElement(
            'button',
            { className: 'button danger', disabled: this.state.inExecution, onClick: function onClick() {
                return _this2.revert();
              } },
            'Revert'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: _VersionControl2.default.listContainer + ' block-item' },
          this.state.diff ? _react2.default.createElement(_ChangesTable2.default, { changes: this.state.diff }) : ''
        )
      );
    }
  }]);

  return LocalChangesEditor;
}(_react.Component);

exports.default = LocalChangesEditor;

/***/ })
/******/ ]);