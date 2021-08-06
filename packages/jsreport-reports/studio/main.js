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
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react'];

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = Studio;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _reactList = __webpack_require__(4);

var _reactList2 = _interopRequireDefault(_reactList);

var _ReportEditor = __webpack_require__(5);

var _ReportEditor2 = _interopRequireDefault(_ReportEditor);

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _instance = void 0;

var ReportEditor = function (_Component) {
  _inherits(ReportEditor, _Component);

  _createClass(ReportEditor, null, [{
    key: 'Instance',
    get: function get() {
      return _instance;
    }
  }]);

  function ReportEditor() {
    _classCallCheck(this, ReportEditor);

    var _this = _possibleConstructorReturn(this, (ReportEditor.__proto__ || Object.getPrototypeOf(ReportEditor)).call(this));

    _this.state = { reports: [], active: null };
    _instance = _this;
    return _this;
  }

  _createClass(ReportEditor, [{
    key: 'refresh',
    value: function refresh() {
      this.skip = 0;
      this.top = 50;
      this.pending = 0;
      this.ActiveReport = null;
    }
  }, {
    key: 'onTabActive',
    value: function onTabActive() {
      var _this2 = this;

      this.refresh();

      this.setState({
        reports: [],
        active: null,
        count: 0
      }, function () {
        _this2.lazyFetch();
      });
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.ActiveReport = null;
    }
  }, {
    key: 'openReport',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(r) {
        var state;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                state = r.state;


                if (state == null && r.blobName != null) {
                  state = 'success';
                }

                if (state === 'success') {
                  if (r.contentType === 'text/html' || r.contentType === 'text/plain' || r.contentType === 'application/pdf' || r.contentType && r.contentType.indexOf('image') !== -1) {
                    _jsreportStudio2.default.preview({
                      type: 'rawContent',
                      data: {
                        type: 'url',
                        content: _jsreportStudio2.default.rootUrl + '/reports/' + r._id + '/content'
                      },
                      completed: true
                    });
                  } else {
                    window.open(_jsreportStudio2.default.rootUrl + '/reports/' + r._id + '/attachment', '_self');
                  }

                  this.setState({ active: r._id });
                  this.ActiveReport = r;
                } else if (state === 'error') {
                  _jsreportStudio2.default.preview({
                    type: 'rawContent',
                    data: {
                      type: 'text/html',
                      content: r.error || r.state
                    },
                    completed: true
                  });

                  this.setState({ active: null });
                  this.ActiveReport = null;
                }

              case 3:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function openReport(_x) {
        return _ref.apply(this, arguments);
      }

      return openReport;
    }()
  }, {
    key: 'lazyFetch',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
        var response;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!this.loading) {
                  _context2.next = 2;
                  break;
                }

                return _context2.abrupt('return');

              case 2:

                this.loading = true;
                _context2.next = 5;
                return _jsreportStudio2.default.api.get('/odata/reports?$orderby=creationDate desc&$count=true&$top=' + this.top + '&$skip=' + this.skip);

              case 5:
                response = _context2.sent;

                this.skip += this.top;
                this.loading = false;
                this.setState({ reports: this.state.reports.concat(response.value), count: response['@odata.count'] });
                if (this.state.reports.length <= this.pending && response.value.length) {
                  this.lazyFetch();
                }

              case 10:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function lazyFetch() {
        return _ref2.apply(this, arguments);
      }

      return lazyFetch;
    }()
  }, {
    key: 'tryRenderItem',
    value: function tryRenderItem(index) {
      var task = this.state.reports[index];
      if (!task) {
        this.pending = Math.max(this.pending, index);
        this.lazyFetch();
        return _react2.default.createElement(
          'tr',
          { key: index },
          _react2.default.createElement(
            'td',
            null,
            _react2.default.createElement('i', { className: 'fa fa-spinner fa-spin fa-fw' })
          )
        );
      }

      return this.renderItem(task, index);
    }
  }, {
    key: 'remove',
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3() {
        var id;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                id = this.ActiveReport._id;

                this.ActiveReport = null;
                _context3.next = 4;
                return _jsreportStudio2.default.api.del('/odata/reports(' + id + ')');

              case 4:
                this.setState({ reports: this.state.reports.filter(function (r) {
                    return r._id !== id;
                  }) });

              case 5:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function remove() {
        return _ref3.apply(this, arguments);
      }

      return remove;
    }()
  }, {
    key: 'renderItem',
    value: function renderItem(report, index) {
      var _this3 = this;

      var state = report.state;
      var stateClass = void 0;

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

      return _react2.default.createElement(
        'tr',
        {
          key: index,
          className: this.state.active === report._id ? 'active' : '',
          onClick: function onClick() {
            return _this3.openReport(report);
          }
        },
        _react2.default.createElement(
          'td',
          null,
          _react2.default.createElement(
            'span',
            { className: _ReportEditor2.default.state + ' ' + _ReportEditor2.default[stateClass] },
            state
          )
        ),
        _react2.default.createElement(
          'td',
          { className: 'selection' },
          report.reportName
        ),
        _react2.default.createElement(
          'td',
          null,
          report.creationDate.toLocaleString()
        ),
        _react2.default.createElement(
          'td',
          null,
          report.recipe
        )
      );
    }
  }, {
    key: 'renderItems',
    value: function renderItems(items, ref) {
      return _react2.default.createElement(
        'table',
        { className: 'table', ref: ref },
        _react2.default.createElement(
          'thead',
          null,
          _react2.default.createElement(
            'tr',
            null,
            _react2.default.createElement(
              'th',
              null,
              'state'
            ),
            _react2.default.createElement(
              'th',
              null,
              'name'
            ),
            _react2.default.createElement(
              'th',
              null,
              'created on'
            ),
            _react2.default.createElement(
              'th',
              null,
              'recipe'
            )
          )
        ),
        _react2.default.createElement(
          'tbody',
          null,
          items
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      var _this4 = this;

      var count = this.state.count;


      return _react2.default.createElement(
        'div',
        { className: 'block custom-editor' },
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'h1',
            null,
            _react2.default.createElement('i', { className: 'fa fa-folder-open-o' }),
            ' Reports'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: _ReportEditor2.default.listContainer + ' block-item' },
          _react2.default.createElement(_reactList2.default, {
            type: 'uniform',
            itemsRenderer: this.renderItems,
            itemRenderer: function itemRenderer(index) {
              return _this4.tryRenderItem(index);
            },
            length: count
          })
        )
      );
    }
  }]);

  return ReportEditor;
}(_react.Component);

exports.default = ReportEditor;

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _ReportEditor = __webpack_require__(2);

var _ReportEditor2 = _interopRequireDefault(_ReportEditor);

var _ReportsButton = __webpack_require__(6);

var _ReportsButton2 = _interopRequireDefault(_ReportsButton);

var _DownloadButton = __webpack_require__(7);

var _DownloadButton2 = _interopRequireDefault(_DownloadButton);

var _DeleteButton = __webpack_require__(8);

var _DeleteButton2 = _interopRequireDefault(_DeleteButton);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addEditorComponent('reports', _ReportEditor2.default);

_jsreportStudio2.default.addToolbarComponent(_ReportsButton2.default, 'settings');
_jsreportStudio2.default.addToolbarComponent(_DownloadButton2.default);
_jsreportStudio2.default.addToolbarComponent(_DeleteButton2.default);

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react-list'];

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"listContainer":"x-reports-ReportEditor-listContainer","state":"x-reports-ReportEditor-state","error":"x-reports-ReportEditor-error","cancelled":"x-reports-ReportEditor-cancelled","success":"x-reports-ReportEditor-success"};

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ReportsButton = function (_Component) {
  _inherits(ReportsButton, _Component);

  function ReportsButton() {
    _classCallCheck(this, ReportsButton);

    return _possibleConstructorReturn(this, (ReportsButton.__proto__ || Object.getPrototypeOf(ReportsButton)).apply(this, arguments));
  }

  _createClass(ReportsButton, [{
    key: 'openReports',
    value: function openReports() {
      _jsreportStudio2.default.openTab({ key: 'Reports', editorComponentKey: 'reports', title: 'Reports' });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      return _react2.default.createElement(
        'div',
        {
          onClick: function onClick() {
            _this2.openReports();
            _this2.props.closeMenu();
          }
        },
        _react2.default.createElement('i', { className: 'fa fa-folder-open-o' }),
        'Reports'
      );
    }
  }]);

  return ReportsButton;
}(_react.Component);

exports.default = ReportsButton;

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _ReportEditor = __webpack_require__(2);

var _ReportEditor2 = _interopRequireDefault(_ReportEditor);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DownloadButton = function (_Component) {
  _inherits(DownloadButton, _Component);

  function DownloadButton() {
    _classCallCheck(this, DownloadButton);

    return _possibleConstructorReturn(this, (DownloadButton.__proto__ || Object.getPrototypeOf(DownloadButton)).apply(this, arguments));
  }

  _createClass(DownloadButton, [{
    key: 'getReportEditorInstance',
    value: function getReportEditorInstance() {
      return _ReportEditor2.default.default ? _ReportEditor2.default.default.Instance : _ReportEditor2.default.Instance;
    }
  }, {
    key: 'download',
    value: function download() {
      var instance = this.getReportEditorInstance();

      if (instance && instance.ActiveReport) {
        window.open(_jsreportStudio2.default.rootUrl + '/reports/' + instance.ActiveReport._id + '/attachment', '_self');
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      if (!this.props.tab || this.props.tab.key !== 'Reports' || !this.getReportEditorInstance() || !this.getReportEditorInstance().ActiveReport) {
        return _react2.default.createElement('div', null);
      }

      return _react2.default.createElement(
        'div',
        { className: 'toolbar-button', onClick: function onClick() {
            return _this2.download();
          } },
        _react2.default.createElement('i', { className: 'fa fa-download' }),
        'Download'
      );
    }
  }]);

  return DownloadButton;
}(_react.Component);

exports.default = DownloadButton;

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _ReportEditor = __webpack_require__(2);

var _ReportEditor2 = _interopRequireDefault(_ReportEditor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DeleteButton = function (_Component) {
  _inherits(DeleteButton, _Component);

  function DeleteButton() {
    _classCallCheck(this, DeleteButton);

    return _possibleConstructorReturn(this, (DeleteButton.__proto__ || Object.getPrototypeOf(DeleteButton)).apply(this, arguments));
  }

  _createClass(DeleteButton, [{
    key: 'getReportEditorInstance',
    value: function getReportEditorInstance() {
      return _ReportEditor2.default.default ? _ReportEditor2.default.default.Instance : _ReportEditor2.default.Instance;
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      if (!this.props.tab || this.props.tab.key !== 'Reports' || !this.getReportEditorInstance() || !this.getReportEditorInstance().ActiveReport) {
        return _react2.default.createElement('div', null);
      }

      return _react2.default.createElement(
        'div',
        { className: 'toolbar-button', onClick: function onClick() {
            return _this2.getReportEditorInstance().remove();
          } },
        _react2.default.createElement('i', { className: 'fa fa-trash' }),
        'Delete'
      );
    }
  }]);

  return DeleteButton;
}(_react.Component);

exports.default = DeleteButton;

/***/ })
/******/ ]);