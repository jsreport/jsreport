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
/******/ 	return __webpack_require__(__webpack_require__.s = 6);
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

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactList = __webpack_require__(7);

var _reactList2 = _interopRequireDefault(_reactList);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _debounce2 = __webpack_require__(8);

var _debounce3 = _interopRequireDefault(_debounce2);

var _ScheduleEditor = __webpack_require__(18);

var _ScheduleEditor2 = _interopRequireDefault(_ScheduleEditor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _activeReport = void 0;

var ScheduleEditor = function (_Component) {
  _inherits(ScheduleEditor, _Component);

  function ScheduleEditor() {
    var _this2 = this;

    _classCallCheck(this, ScheduleEditor);

    var _this = _possibleConstructorReturn(this, (ScheduleEditor.__proto__ || Object.getPrototypeOf(ScheduleEditor)).call(this));

    _this.state = { tasks: [], active: null, running: false };
    _this.skip = 0;
    _this.top = 50;
    _this.pending = 0;
    _this.updateNextRun = (0, _debounce3.default)(_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
      var response;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!_this.props.entity.cron) {
                _context.next = 5;
                break;
              }

              _context.next = 3;
              return _jsreportStudio2.default.api.get('/api/scheduling/nextRun/' + encodeURIComponent(_this.props.entity.cron));

            case 3:
              response = _context.sent;

              _this.setState({ nextRun: response });

            case 5:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, _this2);
    })), 500);
    return _this;
  }

  _createClass(ScheduleEditor, [{
    key: 'onTabActive',
    value: function onTabActive() {
      this.updateNextRun();
      this.reloadTasks();
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.updateNextRun.cancel();
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.updateNextRun();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(prevProps, prevState) {
      if (this.props.entity.cron !== prevProps.entity.cron) {
        this.updateNextRun();
      }
    }
  }, {
    key: 'openReport',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(t) {
        var reports, report;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(t.state === 'success')) {
                  _context2.next = 10;
                  break;
                }

                _context2.next = 3;
                return _jsreportStudio2.default.api.get('/odata/reports?$filter=taskId eq \'' + t._id + '\'');

              case 3:
                reports = _context2.sent;
                report = reports.value[0];


                if (report.contentType === 'text/html' || report.contentType === 'text/plain' || report.contentType === 'application/pdf' || report.contentType && report.contentType.indexOf('image') !== -1) {
                  _jsreportStudio2.default.preview({
                    type: 'rawContent',
                    data: {
                      type: 'url',
                      content: _jsreportStudio2.default.rootUrl + '/reports/' + report._id + '/content'
                    },
                    completed: true
                  });
                } else {
                  window.open(_jsreportStudio2.default.rootUrl + '/reports/' + report._id + '/attachment', '_self');
                }

                this.setState({ active: t._id });
                _activeReport = report;
                _context2.next = 13;
                break;

              case 10:
                _activeReport = null;

                _jsreportStudio2.default.preview({
                  type: 'rawContent',
                  data: {
                    type: 'text/html',
                    content: t.error || t.state
                  },
                  completed: true
                });

                this.setState({ active: null });

              case 13:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function openReport(_x) {
        return _ref2.apply(this, arguments);
      }

      return openReport;
    }()
  }, {
    key: 'reloadTasks',
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3() {
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                this.skip = 0;
                this.top = 50;
                this.pending = 0;

                this.lazyFetch(true);

              case 4:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function reloadTasks() {
        return _ref3.apply(this, arguments);
      }

      return reloadTasks;
    }()
  }, {
    key: 'lazyFetch',
    value: function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(replace) {
        var response, tasks;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                if (!this.loading) {
                  _context4.next = 2;
                  break;
                }

                return _context4.abrupt('return');

              case 2:

                this.loading = true;
                _context4.next = 5;
                return _jsreportStudio2.default.api.get('/odata/tasks?$orderby=finishDate desc&$count=true&$top=' + this.top + '&$skip=' + this.skip + '&$filter=scheduleShortid eq \'' + this.props.entity.shortid + '\'');

              case 5:
                response = _context4.sent;

                this.skip += this.top;
                this.loading = false;

                tasks = void 0;


                if (replace) {
                  tasks = [];
                } else {
                  tasks = this.state.tasks;
                }

                this.setState({ tasks: tasks.concat(response.value), count: response['@odata.count'] });
                if (this.state.tasks.length <= this.pending && response.value.length) {
                  this.lazyFetch();
                }

              case 12:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function lazyFetch(_x2) {
        return _ref4.apply(this, arguments);
      }

      return lazyFetch;
    }()
  }, {
    key: 'runNow',
    value: function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5() {
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                this.setState({
                  running: true
                });

                _context5.prev = 1;
                _context5.next = 4;
                return _jsreportStudio2.default.api.post('/api/scheduling/runNow', {
                  data: {
                    scheduleId: this.props.entity._id
                  }
                });

              case 4:

                this.updateNextRun();
                this.reloadTasks();

              case 6:
                _context5.prev = 6;

                this.setState({
                  running: false
                });
                return _context5.finish(6);

              case 9:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this, [[1,, 6, 9]]);
      }));

      function runNow() {
        return _ref5.apply(this, arguments);
      }

      return runNow;
    }()
  }, {
    key: 'tryRenderItem',
    value: function tryRenderItem(index) {
      var task = this.state.tasks[index];
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
    key: 'renderItem',
    value: function renderItem(task, index) {
      var _this3 = this;

      return _react2.default.createElement(
        'tr',
        {
          key: index,
          className: this.state.active === task._id ? 'active' : '',
          onClick: function onClick() {
            return _this3.openReport(task);
          }
        },
        _react2.default.createElement(
          'td',
          null,
          _react2.default.createElement(
            'span',
            {
              className: _ScheduleEditor2.default.state + ' ' + (task.state === 'error' ? _ScheduleEditor2.default.error : task.state === 'success' ? _ScheduleEditor2.default.success : _ScheduleEditor2.default.canceled)
            },
            task.state
          )
        ),
        _react2.default.createElement(
          'td',
          null,
          _react2.default.createElement(
            'span',
            { className: _ScheduleEditor2.default.value },
            task.creationDate ? task.creationDate.toLocaleString() : ''
          )
        ),
        _react2.default.createElement(
          'td',
          null,
          _react2.default.createElement(
            'div',
            { className: _ScheduleEditor2.default.value },
            task.finishDate ? task.finishDate.toLocaleString() : ''
          )
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
              'start'
            ),
            _react2.default.createElement(
              'th',
              null,
              'finish'
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

      var entity = this.props.entity;
      var _state = this.state,
          count = _state.count,
          nextRun = _state.nextRun;

      nextRun = nextRun || entity.nextRun;

      return _react2.default.createElement(
        'div',
        { className: 'block custom-editor' },
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'h1',
            null,
            _react2.default.createElement('i', { className: 'fa fa-calendar' }),
            ' ',
            entity.name
          ),
          nextRun ? _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(
              'span',
              null,
              'next run\xA0\xA0'
            ),
            _react2.default.createElement(
              'small',
              null,
              nextRun.toLocaleString()
            ),
            !this.props.entity.__isNew && _react2.default.createElement(
              'button',
              {
                disabled: this.state.running,
                style: this.state.running ? { color: '#c6c6c6' } : {},
                className: 'button confirmation',
                onClick: function onClick() {
                  return _this4.runNow();
                }
              },
              _react2.default.createElement('i', { className: 'fa fa-play' }),
              ' ',
              _react2.default.createElement(
                'span',
                null,
                this.state.running ? 'Running..' : 'Run now'
              )
            )
          ) : _react2.default.createElement(
            'div',
            null,
            'Not planned yet. Fill CRON expression and report template in the properties.'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: _ScheduleEditor2.default.listContainer + ' block-item' },
          _react2.default.createElement(_reactList2.default, {
            type: 'uniform', itemsRenderer: this.renderItems, itemRenderer: function itemRenderer(index) {
              return _this4.tryRenderItem(index);
            },
            length: count
          })
        )
      );
    }
  }], [{
    key: 'ActiveReport',
    get: function get() {
      return _activeReport;
    }
  }]);

  return ScheduleEditor;
}(_react.Component);

exports.default = ScheduleEditor;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

module.exports = isObject;


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

var freeGlobal = __webpack_require__(10);

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

module.exports = root;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

var root = __webpack_require__(4);

/** Built-in value references. */
var Symbol = root.Symbol;

module.exports = Symbol;


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _ScheduleEditor = __webpack_require__(2);

var _ScheduleEditor2 = _interopRequireDefault(_ScheduleEditor);

var _ScheduleProperties = __webpack_require__(19);

var _ScheduleProperties2 = _interopRequireDefault(_ScheduleProperties);

var _DownloadButton = __webpack_require__(26);

var _DownloadButton2 = _interopRequireDefault(_DownloadButton);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

_jsreportStudio2.default.initializeListeners.push(_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
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

          _jsreportStudio2.default.addEntitySet({
            name: 'schedules',
            faIcon: 'fa-calendar',
            visibleName: 'schedule',
            entityTreePosition: 400
          });

          _jsreportStudio2.default.addEditorComponent('schedules', _ScheduleEditor2.default);
          _jsreportStudio2.default.addPropertiesComponent(_ScheduleProperties2.default.title, _ScheduleProperties2.default, function (entity) {
            return entity.__entitySet === 'schedules';
          });
          _jsreportStudio2.default.addToolbarComponent(_DownloadButton2.default);

        case 6:
        case 'end':
          return _context.stop();
      }
    }
  }, _callee, undefined);
})));

/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react-list'];

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

var isObject = __webpack_require__(3),
    now = __webpack_require__(9),
    toNumber = __webpack_require__(12);

/** Error message constants. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        timeWaiting = wait - timeSinceLastCall;

    return maxing
      ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        clearTimeout(timerId);
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

module.exports = debounce;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

var root = __webpack_require__(4);

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

module.exports = now;


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

module.exports = freeGlobal;

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(11)))

/***/ }),
/* 11 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

var isObject = __webpack_require__(3),
    isSymbol = __webpack_require__(13);

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = toNumber;


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

var baseGetTag = __webpack_require__(14),
    isObjectLike = __webpack_require__(17);

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

module.exports = isSymbol;


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

var Symbol = __webpack_require__(5),
    getRawTag = __webpack_require__(15),
    objectToString = __webpack_require__(16);

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

module.exports = baseGetTag;


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

var Symbol = __webpack_require__(5);

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

module.exports = getRawTag;


/***/ }),
/* 16 */
/***/ (function(module, exports) {

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

module.exports = objectToString;


/***/ }),
/* 17 */
/***/ (function(module, exports) {

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

module.exports = isObjectLike;


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"listContainer":"x-scheduling-ScheduleEditor-listContainer","state":"x-scheduling-ScheduleEditor-state","error":"x-scheduling-ScheduleEditor-error","cancelled":"x-scheduling-ScheduleEditor-cancelled","success":"x-scheduling-ScheduleEditor-success"};

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _ordinalNumberSuffix = __webpack_require__(20);

var _ordinalNumberSuffix2 = _interopRequireDefault(_ordinalNumberSuffix);

var _cronBuilder = __webpack_require__(21);

var _cronBuilder2 = _interopRequireDefault(_cronBuilder);

var _cronstrue = __webpack_require__(22);

var _cronstrue2 = _interopRequireDefault(_cronstrue);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _HourTimePicker = __webpack_require__(23);

var _HourTimePicker2 = _interopRequireDefault(_HourTimePicker);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EntityRefSelect = _jsreportStudio2.default.EntityRefSelect;
var sharedComponents = _jsreportStudio2.default.sharedComponents;

var ScheduleProperties = function (_Component) {
  _inherits(ScheduleProperties, _Component);

  function ScheduleProperties(props) {
    _classCallCheck(this, ScheduleProperties);

    var _this = _possibleConstructorReturn(this, (ScheduleProperties.__proto__ || Object.getPrototypeOf(ScheduleProperties)).call(this, props));

    _this.state = {
      useExpression: true,
      showHour: false,
      showMinute: false,
      showDay: false,
      showMonth: false,
      selectedPeriod: '',
      selectedHour: null,
      selectedMinute: null,
      selectedDay: null,
      selectedMonth: null,
      days: []
    };
    return _this;
  }

  _createClass(ScheduleProperties, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.normalizeUIState(this.props.entity);
      this.removeInvalidTemplateReferences();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(prevProps) {
      // when component changes because another schedule is selected
      // or when saving a new schedule
      if (prevProps.entity._id !== this.props.entity._id) {
        this.normalizeUIState(this.props.entity);
      }

      this.removeInvalidTemplateReferences();
    }
  }, {
    key: 'normalizeUIState',
    value: function normalizeUIState(entity) {
      var cronInfo = void 0;

      if (entity.__isNew && !entity.cron || !entity.cron) {
        cronInfo = this.onPeriodChange('', true);
      } else {
        cronInfo = this.getCronInformation(entity.cron);
      }

      if (cronInfo) {
        cronInfo.useExpression = false;
      } else {
        // if we couldn't parse the cron for the UI
        // reset values and enable the raw expression input.
        // false is returned when we want to still show the value in the UI editor
        if (cronInfo === false) {
          cronInfo = this.onPeriodChange('', true);
          cronInfo.useExpression = false;
        } else {
          cronInfo = this.onPeriodChange('', true);
          cronInfo.useExpression = true;
        }
      }

      this.setState(cronInfo);
    }
  }, {
    key: 'getCronInformation',
    value: function getCronInformation(cron) {
      if (cron == null || cron === '') {
        return false;
      }

      try {
        var cronExp = new _cronBuilder2.default(cron);
        var parsedCron = cronExp.getAll();
        var cronInfo = void 0;
        var selectedPeriod = void 0;
        var selectedHour = void 0;
        var selectedMinute = void 0;
        var selectedDay = void 0;
        var selectedMonth = void 0;
        var selectedDayOfTheMonth = void 0;
        var selectedDayOfTheWeek = void 0;

        // our cron editor doesn't support complex values
        if (parsedCron.dayOfTheMonth.length !== 1 || parsedCron.dayOfTheWeek.length !== 1 || parsedCron.hour.length !== 1 || parsedCron.minute.length !== 1 || parsedCron.month.length !== 1) {
          return null;
        }

        if (parsedCron.dayOfTheMonth[0] === '*' || !isNaN(parseInt(parsedCron.dayOfTheMonth[0], 10))) {
          selectedDayOfTheMonth = parsedCron.dayOfTheMonth[0] !== '*' ? parseInt(parsedCron.dayOfTheMonth[0], 10) : parsedCron.dayOfTheMonth[0];
        }

        if (parsedCron.dayOfTheWeek[0] === '*' || !isNaN(parseInt(parsedCron.dayOfTheWeek[0], 10))) {
          selectedDayOfTheWeek = parsedCron.dayOfTheWeek[0] !== '*' ? parseInt(parsedCron.dayOfTheWeek[0], 10) : parsedCron.dayOfTheWeek[0];
        }

        if (parsedCron.hour[0] === '*' || !isNaN(parseInt(parsedCron.hour[0], 10))) {
          selectedHour = parsedCron.hour[0] !== '*' ? ('0' + parsedCron.hour[0]).slice(-2) : parsedCron.hour[0];
        }

        if (parsedCron.minute[0] === '*' || !isNaN(parseInt(parsedCron.minute[0], 10))) {
          selectedMinute = parsedCron.minute[0] !== '*' ? ('0' + parsedCron.minute[0]).slice(-2) : parsedCron.minute[0];
        }

        if (parsedCron.month[0] === '*' || !isNaN(parseInt(parsedCron.month[0], 10))) {
          selectedMonth = parsedCron.month[0] !== '*' ? ('0' + parsedCron.month[0]).slice(-2) : parsedCron.month[0];
        }

        // return early if we don't have any value
        if (!selectedDayOfTheMonth && !selectedDayOfTheWeek && !selectedHour && !selectedMinute && !selectedMonth) {
          return null;
        }

        if (selectedDayOfTheWeek !== '*') {
          selectedDay = selectedDayOfTheWeek;
        } else {
          selectedDay = selectedDayOfTheMonth;
        }

        if (selectedDayOfTheMonth === '*' && selectedDayOfTheWeek === '*' && selectedHour === '*' && selectedMinute === '*' && selectedMonth === '*') {
          selectedPeriod = 'mn';
          cronInfo = {};
        } else if (selectedDayOfTheMonth === '*' && selectedDayOfTheWeek === '*' && selectedHour === '*' && selectedMonth === '*' && selectedMinute !== '*') {
          selectedPeriod = 'h';

          cronInfo = {
            selectedMinute: selectedMinute
          };
        } else if (selectedDayOfTheMonth === '*' && selectedDayOfTheWeek === '*' && selectedMonth === '*' && selectedHour !== '*' && selectedMinute !== '*') {
          selectedPeriod = 'd';

          cronInfo = {
            selectedHour: selectedHour,
            selectedMinute: selectedMinute
          };
        } else if (selectedDayOfTheMonth === '*' && selectedMonth === '*' && selectedDayOfTheWeek !== '*' && selectedHour !== '*' && selectedMinute !== '*') {
          selectedPeriod = 'w';

          cronInfo = {
            selectedDay: selectedDay,
            selectedHour: selectedHour,
            selectedMinute: selectedMinute
          };
        } else if (selectedDayOfTheWeek === '*' && selectedMonth === '*' && selectedDayOfTheMonth !== '*' && selectedHour !== '*' && selectedMinute !== '*') {
          selectedPeriod = 'm';

          cronInfo = {
            selectedDay: selectedDay,
            selectedHour: selectedHour,
            selectedMinute: selectedMinute
          };
        } else if (selectedDayOfTheWeek === '*' && selectedDayOfTheMonth !== '*' && selectedMonth !== '*' && selectedHour !== '*' && selectedMinute !== '*') {
          selectedPeriod = 'y';

          cronInfo = {
            selectedDay: selectedDay,
            selectedMonth: selectedMonth,
            selectedHour: selectedHour,
            selectedMinute: selectedMinute
          };
        }

        // if the period can't be detected just return
        if (!selectedPeriod) {
          return null;
        }

        cronInfo = _extends({}, this.onPeriodChange(selectedPeriod, true), cronInfo);

        return cronInfo;
      } catch (e) {
        return null;
      }
    }
  }, {
    key: 'removeInvalidTemplateReferences',
    value: function removeInvalidTemplateReferences() {
      var _props = this.props,
          entity = _props.entity,
          entities = _props.entities,
          onChange = _props.onChange;


      if (!entity.templateShortid) {
        return;
      }

      var updatedTemplates = Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'templates' && entities[k].shortid === entity.templateShortid;
      });

      if (updatedTemplates.length === 0) {
        onChange({ _id: entity._id, templateShortid: null });
      }
    }
  }, {
    key: 'onUseExpressionChange',
    value: function onUseExpressionChange(checked) {
      var entity = this.props.entity;

      var resetCron = false;
      var uiCronInfo = void 0;

      if (!checked) {
        uiCronInfo = this.getCronInformation(entity.cron);

        if (!uiCronInfo) {
          uiCronInfo = this.onPeriodChange('', true);
          resetCron = true;
        }
      } else {
        uiCronInfo = this.onPeriodChange('', true);
      }

      this.onCronBuilderChange(_extends({
        useExpression: checked
      }, uiCronInfo), resetCron);
    }
  }, {
    key: 'onCronBuilderChange',
    value: function onCronBuilderChange(stateToSet, resetCron) {
      var cronExp = new _cronBuilder2.default();

      var _props2 = this.props,
          onChange = _props2.onChange,
          entity = _props2.entity;
      var _state = this.state,
          selectedPeriod = _state.selectedPeriod,
          selectedHour = _state.selectedHour,
          selectedMinute = _state.selectedMinute,
          selectedDay = _state.selectedDay,
          selectedMonth = _state.selectedMonth;


      var cron = false;

      if (stateToSet && stateToSet.selectedPeriod !== undefined) {
        selectedPeriod = stateToSet.selectedPeriod;
      }

      if (stateToSet && stateToSet.selectedHour !== undefined) {
        selectedHour = stateToSet.selectedHour;
      }

      if (stateToSet && stateToSet.selectedMinute !== undefined) {
        selectedMinute = stateToSet.selectedMinute;
      }

      if (stateToSet && stateToSet.selectedDay !== undefined) {
        selectedDay = stateToSet.selectedDay;
      }

      if (stateToSet && stateToSet.selectedMonth !== undefined) {
        selectedMonth = stateToSet.selectedMonth;
      }

      if (selectedPeriod === 'mn') {
        cron = '* * * * *';
      } else if (selectedPeriod === 'h') {
        cronExp.addValue('minute', String(parseInt(selectedMinute, 10)));
      } else if (selectedPeriod === 'd') {
        cronExp.addValue('hour', String(parseInt(selectedHour, 10)));
        cronExp.addValue('minute', String(parseInt(selectedMinute, 10)));
      } else if (selectedPeriod === 'w') {
        cronExp.addValue('dayOfTheWeek', String(parseInt(selectedDay, 10)));
        cronExp.addValue('hour', String(parseInt(selectedHour, 10)));
        cronExp.addValue('minute', String(parseInt(selectedMinute, 10)));
      } else if (selectedPeriod === 'm') {
        cronExp.addValue('dayOfTheMonth', String(parseInt(selectedDay, 10)));
        cronExp.addValue('hour', String(parseInt(selectedHour, 10)));
        cronExp.addValue('minute', String(parseInt(selectedMinute, 10)));
      } else if (selectedPeriod === 'y') {
        cronExp.addValue('dayOfTheMonth', String(parseInt(selectedDay, 10)));
        cronExp.addValue('hour', String(parseInt(selectedHour, 10)));
        cronExp.addValue('minute', String(parseInt(selectedMinute, 10)));
        cronExp.addValue('month', String(parseInt(selectedMonth, 10)));
      } else {
        cron = resetCron ? '' : this.props.entity.cron;
      }

      if (cron === false) {
        cron = cronExp.build();
      }

      if (cron !== this.props.entity.cron) {
        onChange({
          _id: entity._id,
          cron: cron
        });
      }

      if (stateToSet) {
        this.setState(stateToSet);
      }
    }
  }, {
    key: 'onPeriodChange',
    value: function onPeriodChange(period, returnState) {
      var newState = {
        selectedPeriod: period
      };

      newState.days = [];

      if (period === 'm' || period === 'y') {
        for (var i = 1; i <= 31; i++) {
          newState.days.push({
            name: (0, _ordinalNumberSuffix2.default)(i),
            value: i
          });
        }
      }

      if (period === 'mn') {
        newState.showHour = false;
        newState.showMinute = false;
        newState.showDay = false;
        newState.showMonth = false;
        newState.selectedHour = null;
        newState.selectedMinute = null;
        newState.selectedDay = null;
        newState.selectedMonth = null;
      } else if (period === 'h') {
        newState.showHour = false;
        newState.showMinute = true;
        newState.showDay = false;
        newState.showMonth = false;
        newState.selectedHour = null;
        newState.selectedMinute = '00';
        newState.selectedDay = null;
        newState.selectedMonth = null;
      } else if (period === 'd') {
        newState.showHour = true;
        newState.showMinute = true;
        newState.showDay = false;
        newState.showMonth = false;
        newState.selectedHour = '12';
        newState.selectedMinute = '00';
        newState.selectedDay = null;
        newState.selectedMonth = null;
      } else if (period === 'w') {
        newState.showHour = true;
        newState.showMinute = true;
        newState.showDay = true;
        newState.showMonth = false;
        newState.selectedHour = '12';
        newState.selectedMinute = '00';
        newState.selectedDay = 1;
        newState.selectedMonth = null;

        newState.days = [{
          name: 'Monday',
          value: 1
        }, {
          name: 'Tuesday',
          value: 2
        }, {
          name: 'Wednesday',
          value: 3
        }, {
          name: 'Thursday',
          value: 4
        }, {
          name: 'Friday',
          value: 5
        }, {
          name: 'Saturday',
          value: 6
        }, {
          name: 'Sunday',
          value: 0
        }];
      } else if (period === 'm') {
        newState.showHour = true;
        newState.showMinute = true;
        newState.showDay = true;
        newState.showMonth = false;
        newState.selectedHour = '12';
        newState.selectedMinute = '00';
        newState.selectedDay = 1;
        newState.selectedMonth = null;
      } else if (period === 'y') {
        newState.showHour = true;
        newState.showMinute = true;
        newState.showDay = true;
        newState.showMonth = true;
        newState.selectedHour = '12';
        newState.selectedMinute = '00';
        newState.selectedDay = 1;
        newState.selectedMonth = '01';
      } else {
        newState.showHour = false;
        newState.showMinute = false;
        newState.showDay = false;
        newState.showMonth = false;
        newState.selectedHour = null;
        newState.selectedMinute = null;
        newState.selectedDay = null;
        newState.selectedMonth = null;
      }

      if (returnState) {
        return newState;
      }

      this.setState(newState);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _state2 = this.state,
          useExpression = _state2.useExpression,
          showHour = _state2.showHour,
          showMinute = _state2.showMinute,
          showDay = _state2.showDay,
          showMonth = _state2.showMonth,
          selectedPeriod = _state2.selectedPeriod,
          selectedHour = _state2.selectedHour,
          selectedMinute = _state2.selectedMinute,
          selectedDay = _state2.selectedDay,
          selectedMonth = _state2.selectedMonth,
          days = _state2.days;
      var _props3 = this.props,
          entity = _props3.entity,
          _onChange = _props3.onChange;

      var cronDescription = '';

      if (entity.cron) {
        try {
          cronDescription = _cronstrue2.default.toString(entity.cron);
        } catch (e) {
          cronDescription = 'Invalid cron expression';
        }
      }

      if (!entity || entity.__entitySet !== 'schedules') {
        return _react2.default.createElement('div', null);
      }

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Template'
          ),
          _react2.default.createElement(EntityRefSelect, {
            headingLabel: 'Select template',
            newLabel: 'New template for schedule',
            filter: function filter(references) {
              return { templates: references.templates };
            },
            value: entity.templateShortid ? entity.templateShortid : null,
            onChange: function onChange(selected) {
              return _onChange({ _id: entity._id, templateShortid: selected != null && selected.length > 0 ? selected[0].shortid : null });
            },
            renderNew: function renderNew(modalProps) {
              return _react2.default.createElement(sharedComponents.NewTemplateModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { defaults: { folder: entity.folder }, activateNewTab: false }) }));
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'CRON'
          ),
          !useExpression && _react2.default.createElement(
            'div',
            { className: 'form-group' },
            _react2.default.createElement(
              'span',
              null,
              'Expression: ',
              entity.cron
            )
          ),
          _react2.default.createElement(
            'div',
            { className: 'form-group' },
            _react2.default.createElement(
              'span',
              null,
              'Description: ',
              cronDescription
            )
          ),
          _react2.default.createElement(
            'div',
            { className: 'form-group' },
            _react2.default.createElement(
              'label',
              null,
              _react2.default.createElement('input', {
                type: 'checkbox',
                checked: useExpression,
                onChange: function onChange(v) {
                  return _this2.onUseExpressionChange(v.target.checked);
                }
              }),
              'Use expression'
            ),
            useExpression && _react2.default.createElement('input', {
              type: 'text',
              value: entity.cron || '',
              onChange: function onChange(v) {
                return _onChange({ _id: entity._id, cron: v.target.value });
              }
            })
          ),
          !useExpression && _react2.default.createElement(
            'div',
            { className: 'form-group' },
            _react2.default.createElement(
              'label',
              null,
              'Every',
              ' ',
              _react2.default.createElement(
                'select',
                {
                  value: selectedPeriod,
                  onChange: function onChange(ev) {
                    return _this2.onCronBuilderChange(_this2.onPeriodChange(ev.target.value, true));
                  }
                },
                _react2.default.createElement(
                  'option',
                  { key: '-', value: '' },
                  '- not selected -'
                ),
                _react2.default.createElement(
                  'option',
                  { key: 'mn', value: 'mn' },
                  'minute'
                ),
                _react2.default.createElement(
                  'option',
                  { key: 'h', value: 'h' },
                  'hour'
                ),
                _react2.default.createElement(
                  'option',
                  { key: 'd', value: 'd' },
                  'day'
                ),
                _react2.default.createElement(
                  'option',
                  { key: 'w', value: 'w' },
                  'week'
                ),
                _react2.default.createElement(
                  'option',
                  { key: 'm', value: 'm' },
                  'month'
                ),
                _react2.default.createElement(
                  'option',
                  { key: 'y', value: 'y' },
                  'year'
                )
              )
            )
          ),
          !useExpression && showDay && _react2.default.createElement(
            'div',
            { className: 'form-group' },
            _react2.default.createElement(
              'label',
              null,
              'on' + (showMonth ? ' the' : ''),
              ' ',
              _react2.default.createElement(
                'select',
                {
                  value: selectedDay,
                  onChange: function onChange(ev) {
                    return _this2.onCronBuilderChange({ selectedDay: ev.target.value });
                  }
                },
                days.map(function (day) {
                  return _react2.default.createElement(
                    'option',
                    { key: day.value, value: day.value },
                    day.name
                  );
                })
              )
            )
          ),
          !useExpression && showMonth && _react2.default.createElement(
            'div',
            { className: 'form-group' },
            _react2.default.createElement(
              'label',
              null,
              'of',
              ' ',
              _react2.default.createElement(
                'select',
                {
                  value: selectedMonth,
                  onChange: function onChange(ev) {
                    return _this2.onCronBuilderChange({ selectedMonth: ev.target.value });
                  }
                },
                _react2.default.createElement(
                  'option',
                  { key: '01', value: '01' },
                  'January'
                ),
                _react2.default.createElement(
                  'option',
                  { key: '02', value: '02' },
                  'February'
                ),
                _react2.default.createElement(
                  'option',
                  { key: '03', value: '03' },
                  'March'
                ),
                _react2.default.createElement(
                  'option',
                  { key: '04', value: '04' },
                  'April'
                ),
                _react2.default.createElement(
                  'option',
                  { key: '05', value: '05' },
                  'May'
                ),
                _react2.default.createElement(
                  'option',
                  { key: '06', value: '06' },
                  'June'
                ),
                _react2.default.createElement(
                  'option',
                  { key: '07', value: '07' },
                  'July'
                ),
                _react2.default.createElement(
                  'option',
                  { key: '08', value: '08' },
                  'August'
                ),
                _react2.default.createElement(
                  'option',
                  { key: '09', value: '09' },
                  'September'
                ),
                _react2.default.createElement(
                  'option',
                  { key: '10', value: '10' },
                  'October'
                ),
                _react2.default.createElement(
                  'option',
                  { key: '11', value: '11' },
                  'November'
                ),
                _react2.default.createElement(
                  'option',
                  { key: '12', value: '12' },
                  'December'
                )
              )
            )
          ),
          !useExpression && (showHour || showMinute) && _react2.default.createElement(
            'div',
            { className: 'form-group' },
            _react2.default.createElement(
              'div',
              null,
              'at',
              ' ',
              _react2.default.createElement(
                'div',
                { style: { display: 'inline-block' } },
                showHour && _react2.default.createElement(_HourTimePicker2.default, {
                  type: 'hour',
                  value: selectedHour,
                  onChange: function onChange(val) {
                    return _this2.onCronBuilderChange({ selectedHour: val });
                  }
                }),
                showHour && showMinute && ' : ',
                showMinute && _react2.default.createElement(_HourTimePicker2.default, {
                  type: 'minute',
                  value: selectedMinute,
                  onChange: function onChange(val) {
                    return _this2.onCronBuilderChange({ selectedMinute: val });
                  }
                })
              )
            )
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Enabled'
          ),
          _react2.default.createElement('input', { type: 'checkbox', checked: entity.enabled !== false, onChange: function onChange(v) {
              return _onChange({ _id: entity._id, enabled: v.target.checked });
            } })
        )
      );
    }
  }], [{
    key: 'title',
    value: function title(entity, entities) {
      var templates = Object.keys(entities).map(function (k) {
        return entities[k];
      }).filter(function (t) {
        return t.__entitySet === 'templates' && t.shortid === entity.templateShortid;
      });

      if (!templates.length) {
        return 'schedule (select template...)';
      }

      return 'schedule (' + templates[0].name + ') ' + (entity.enabled !== true && entity.enabled != null ? '(disabled)' : '');
    }
  }]);

  return ScheduleProperties;
}(_react.Component);

exports.default = ScheduleProperties;

/***/ }),
/* 20 */
/***/ (function(module, exports) {


/**
 * Get the ordinal number with suffix from `n`
 *
 * @api public
 * @param {Number} n
 * @return {String}
 */
exports = module.exports = function (n) {
  return n + exports.suffix(+n);
};

/**
 * Get the suffix for the given `n`
 *
 * @api private
 * @param {Number} n
 * @return {String}
 */
exports.suffix = function (n) {
  n %= 100
  return Math.floor(n / 10) === 1
      ? 'th'
      : (n % 10 === 1
        ? 'st'
        : (n % 10 === 2
          ? 'nd'
          : (n % 10 === 3
            ? 'rd'
            : 'th')));
};


/***/ }),
/* 21 */
/***/ (function(module, exports) {

var DEFAULT_INTERVAL = ['*'];

var CronValidator = (function() {
    /**
     * Contains the position-to-name mapping of the cron expression
     * @type {Object}
     * @const
     */
    var MeasureOfTimeMap = {
            0: 'minute',
            1: 'hour',
            2: 'dayOfTheMonth',
            3: 'month',
            4: 'dayOfTheWeek'
        },
        /**
         * contains every permissible 'measureOfTime' string constant
         * @const
         * @type {Array}
         */
        MeasureOfTimeValues = Object.keys(MeasureOfTimeMap).map(function (key) {
            return MeasureOfTimeMap[key];
        });

    /**
     * validates a given cron expression (object) for length, then calls validateValue on each value
     * @param {!{
        minute: Array.string,
        hour: Array.string,
        dayOfTheMonth: Array.string,
        month: Array.string,
        dayOfTheWeek: Array.string,
     * }} expression - rich object containing the state of the cron expression
     * @throws {Error} if expression contains more than 5 keys
     */
    var validateExpression = function(expression) {
        // don't care if it's less than 5, we'll just set those to the default '*'
        if (Object.keys(expression).length > 5) {
            throw new Error('Invalid cron expression; limited to 5 values.');
        }

        for (var measureOfTime in expression) {
            if (expression.hasOwnProperty(measureOfTime)) {
                this.validateValue(measureOfTime, expression[measureOfTime]);
            }
        }
    },

    /**
     * validates a given cron expression (string) for length, then calls validateValue on each value
     * @param {!String} expression - an optionally empty string containing at most 5 space delimited expressions.
     * @throws {Error} if the string contains more than 5 space delimited parts.
     */
    validateString = function(expression) {
        var splitExpression = expression.split(' ');

        if (splitExpression.length > 5) {
            throw new Error('Invalid cron expression; limited to 5 values.');
        }

        for (var i = 0; i < splitExpression.length; i++) {
            this.validateValue(MeasureOfTimeMap[i], splitExpression[i]);
        }
    },

    /**
     * validates any given measureOfTime and corresponding value
     * @param {!String} measureOfTime - as expected
     * @param {!String} value - the cron-ish interval specifier
     * @throws {Error} if measureOfTime is bogus
     * @throws {Error} if value contains an unsupported character
     */
    validateValue = function(measureOfTime, value) {
        var validatorObj = {
                minute:        {min: 0, max: 59},
                hour:          {min: 0, max: 23},
                dayOfTheMonth: {min: 1, max: 31},
                month:         {min: 1, max: 12},
                dayOfTheWeek:  {min: 1, max: 7}
            },
            range,
            validChars = /^[0-9*-]/;

        if (!validatorObj[measureOfTime]) {
            throw new Error('Invalid measureOfTime; Valid options are: ' + MeasureOfTimeValues.join(', '));
        }

        if (!validChars.test(value)) {
            throw new Error('Invalid value; Only numbers 0-9, "-", and "*" chars are allowed');
        }

        if (value !== '*') {
            // check to see if value is within range if value is not '*'
            if (value.indexOf('-') >= 0) {
                // value is a range and must be split into high and low
                range = value.split('-');
                if (!range[0] || range[0] < validatorObj[measureOfTime].min) {
                    throw new Error('Invalid value; bottom of range is not valid for "' + measureOfTime + '". Limit is ' + validatorObj[measureOfTime].min + '.');
                }

                if (!range[1] || range[1] > validatorObj[measureOfTime].max) {
                    throw new Error('Invalid value; top of range is not valid for "' + measureOfTime + '". Limit is ' + validatorObj[measureOfTime].max + '.');
                }
            } else {

                if (parseInt(value) < validatorObj[measureOfTime].min) {
                    throw new Error('Invalid value; given value is not valid for "' + measureOfTime + '". Minimum value is "' + validatorObj[measureOfTime].min + '".');
                }
                if (parseInt(value) > validatorObj[measureOfTime].max) {
                    throw new Error('Invalid value; given value is not valid for "' + measureOfTime + '". Maximum value is "' + validatorObj[measureOfTime].max + '".');
                }
            }
        }
    };


    return {
        measureOfTimeValues: MeasureOfTimeValues,
        validateExpression: validateExpression,
        validateString: validateString,
        validateValue: validateValue
    }
}());


/**
 * Initializes a CronBuilder with an optional initial cron expression.
 * @param {String=} initialExpression - if provided, it must be up to 5 space delimited parts
 * @throws {Error} if the initialExpression is bogus
 * @constructor
 */
var CronBuilder = (function() {
    function CronBuilder(initialExpression) {
        var splitExpression,
            expression;

        if (initialExpression) {
            CronValidator.validateString(initialExpression);

            splitExpression = initialExpression.split(' ');
            // check to see if initial expression is valid

            expression = {
                minute:        splitExpression[0] ? [splitExpression[0]] : DEFAULT_INTERVAL,
                hour:          splitExpression[1] ? [splitExpression[1]] : DEFAULT_INTERVAL,
                dayOfTheMonth: splitExpression[2] ? [splitExpression[2]] : DEFAULT_INTERVAL,
                month:         splitExpression[3] ? [splitExpression[3]] : DEFAULT_INTERVAL,
                dayOfTheWeek:  splitExpression[4] ? [splitExpression[4]] : DEFAULT_INTERVAL,
            };
        } else {
            expression = {
                minute: DEFAULT_INTERVAL,
                hour: DEFAULT_INTERVAL,
                dayOfTheMonth: DEFAULT_INTERVAL,
                month: DEFAULT_INTERVAL,
                dayOfTheWeek: DEFAULT_INTERVAL,
            };
        }

        /**
         * builds a working cron expression based on the state of the cron object
         * @returns {string} - working cron expression
         */
        this.build = function () {
            return [
                expression.minute.join(','),
                expression.hour.join(','),
                expression.dayOfTheMonth.join(','),
                expression.month.join(','),
                expression.dayOfTheWeek.join(','),
            ].join(' ');
        };

        /**
         * adds a value to what exists currently (builds)
         * @param {!String} measureOfTime
         * @param {!Number} value
         * @throws {Error} if measureOfTime or value fail validation
         */
        this.addValue = function (measureOfTime, value) {
            CronValidator.validateValue(measureOfTime, value);

            if (expression[measureOfTime].length === 1 && expression[measureOfTime][0] === '*') {
                expression[measureOfTime] = [value];
            } else {
                if (expression[measureOfTime].indexOf(value) < 0) {
                    expression[measureOfTime].push(value);
                }
            }
        };

        /**
         * removes a single explicit value (subtracts)
         * @param {!String} measureOfTime - as you might guess
         * @param {!String} value - the offensive value
         * @throws {Error} if measureOfTime is bogus.
         */
        this.removeValue = function (measureOfTime, value) {
            if (!expression[measureOfTime]) {
                throw new Error('Invalid measureOfTime: Valid options are: ' + CronValidator.measureOfTimeValues.join(', '));
            }

            if (expression[measureOfTime].length === 1 && expression[measureOfTime][0] === '*') {
                return 'The value for "' + measureOfTime + '" is already at the default value of "*" - this is a no-op.';
            }

            expression[measureOfTime] = expression[measureOfTime].filter(function (timeValue) {
               return value !== timeValue;
            });

            if (!expression[measureOfTime].length) {
                expression[measureOfTime] = DEFAULT_INTERVAL;
            }
        };

        /**
         * returns the current state of a given measureOfTime
         * @param {!String} measureOfTime one of "minute", "hour", etc
         * @returns {!String} comma separated blah blah
         * @throws {Error} if the measureOfTime is not one of the permitted values.
         */
        this.get = function (measureOfTime) {
            if (!expression[measureOfTime]) {
                throw new Error('Invalid measureOfTime: Valid options are: ' + CronValidator.measureOfTimeValues.join(', '));
            }

            return expression[measureOfTime].join(',');
        };

        /**
         * sets the state of a given measureOfTime
         * @param {!String} measureOfTime - yup
         * @param {!Array.<String>} value - the 5 tuple array of values to set
         * @returns {!String} the comma separated version of the value that you passed in
         * @throws {Error} if your "value" is not an Array&lt;String&gt;
         * @throws {Error} when any item in your value isn't a legal cron-ish descriptor
         */
        this.set = function (measureOfTime, value) {
            if (!Array.isArray(value)) {
                throw new Error('Invalid value; Value must be in the form of an Array.');
            }

            for(var i = 0; i < value.length; i++) {
                CronValidator.validateValue(measureOfTime, value[i]);
            }

            expression[measureOfTime] = value;

            return expression[measureOfTime].join(',');
        };

        /**
         * Returns a rich object that describes the current state of the cron expression.
         * @returns {!{
            minute: Array.string,
            hour: Array.string,
            dayOfTheMonth: Array.string,
            month: Array.string,
            dayOfTheWeek: Array.string,
         * }}
         */
        this.getAll = function () {
            return expression;
        };

        /**
         * sets the state for the entire cron expression
         * @param {!{
            minute: Array.string,
            hour: Array.string,
            dayOfTheMonth: Array.string,
            month: Array.string,
            dayOfTheWeek: Array.string,
         * }} expToSet - the entirety of the cron expression.
         * @throws {Error} as usual
         */
        this.setAll = function (expToSet) {
            CronValidator.validateExpression(expToSet);

            expression = expToSet;
        };
    }

    return CronBuilder;
}());

module.exports = CronBuilder;

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

!function(e,t){ true?module.exports=t():undefined}("undefined"!=typeof self?self:this,function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=4)}([function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=n(1),o=n(2),i=function(){function e(t,n){this.expression=t,this.options=n,this.expressionParts=new Array(5),e.locales[n.locale]?this.i18n=e.locales[n.locale]:(console.warn("Locale '"+n.locale+"' could not be found; falling back to 'en'."),this.i18n=e.locales.en),void 0===n.use24HourTimeFormat&&(n.use24HourTimeFormat=this.i18n.use24HourTimeFormatByDefault())}return e.toString=function(t,n){var r=void 0===n?{}:n,o=r.throwExceptionOnParseError,i=void 0===o||o,s=r.verbose,a=void 0!==s&&s,u=r.dayOfWeekStartIndexZero,c=void 0===u||u,f=r.use24HourTimeFormat,p=r.locale;return new e(t,{throwExceptionOnParseError:i,verbose:a,dayOfWeekStartIndexZero:c,use24HourTimeFormat:f,locale:void 0===p?"en":p}).getFullDescription()},e.initialize=function(t){e.specialCharacters=["/","-",",","*"],t.load(e.locales)},e.prototype.getFullDescription=function(){var e="";try{var t=new o.CronParser(this.expression,this.options.dayOfWeekStartIndexZero);this.expressionParts=t.parse();var n=this.getTimeOfDayDescription(),r=this.getDayOfMonthDescription(),i=this.getMonthDescription();e+=n+r+this.getDayOfWeekDescription()+i+this.getYearDescription(),e=(e=this.transformVerbosity(e,this.options.verbose)).charAt(0).toLocaleUpperCase()+e.substr(1)}catch(t){if(this.options.throwExceptionOnParseError)throw""+t;e=this.i18n.anErrorOccuredWhenGeneratingTheExpressionD()}return e},e.prototype.getTimeOfDayDescription=function(){var t=this.expressionParts[0],n=this.expressionParts[1],o=this.expressionParts[2],i="";if(r.StringUtilities.containsAny(n,e.specialCharacters)||r.StringUtilities.containsAny(o,e.specialCharacters)||r.StringUtilities.containsAny(t,e.specialCharacters))if(t||!(n.indexOf("-")>-1)||n.indexOf(",")>-1||n.indexOf("/")>-1||r.StringUtilities.containsAny(o,e.specialCharacters))if(!t&&o.indexOf(",")>-1&&-1==o.indexOf("-")&&-1==o.indexOf("/")&&!r.StringUtilities.containsAny(n,e.specialCharacters)){var s=o.split(",");i+=this.i18n.at();for(var a=0;a<s.length;a++)i+=" ",i+=this.formatTime(s[a],n,""),a<s.length-2&&(i+=","),a==s.length-2&&(i+=this.i18n.spaceAnd())}else{var u=this.getSecondsDescription(),c=this.getMinutesDescription(),f=this.getHoursDescription();(i+=u).length>0&&c.length>0&&(i+=", "),(i+=c).length>0&&f.length>0&&(i+=", "),i+=f}else{var p=n.split("-");i+=r.StringUtilities.format(this.i18n.everyMinuteBetweenX0AndX1(),this.formatTime(o,p[0],""),this.formatTime(o,p[1],""))}else i+=this.i18n.atSpace()+this.formatTime(o,n,t);return i},e.prototype.getSecondsDescription=function(){var e=this;return this.getSegmentDescription(this.expressionParts[0],this.i18n.everySecond(),function(e){return e},function(t){return r.StringUtilities.format(e.i18n.everyX0Seconds(),t)},function(t){return e.i18n.secondsX0ThroughX1PastTheMinute()},function(t){return"0"==t?"":parseInt(t)<20?e.i18n.atX0SecondsPastTheMinute():e.i18n.atX0SecondsPastTheMinuteGt20()||e.i18n.atX0SecondsPastTheMinute()})},e.prototype.getMinutesDescription=function(){var e=this,t=this.expressionParts[0];return this.getSegmentDescription(this.expressionParts[1],this.i18n.everyMinute(),function(e){return e},function(t){return r.StringUtilities.format(e.i18n.everyX0Minutes(),t)},function(t){return e.i18n.minutesX0ThroughX1PastTheHour()},function(n){try{return"0"==n&&""==t?"":parseInt(n)<20?e.i18n.atX0MinutesPastTheHour():e.i18n.atX0MinutesPastTheHourGt20()||e.i18n.atX0MinutesPastTheHour()}catch(t){return e.i18n.atX0MinutesPastTheHour()}})},e.prototype.getHoursDescription=function(){var e=this,t=this.expressionParts[2];return this.getSegmentDescription(t,this.i18n.everyHour(),function(t){return e.formatTime(t,"0","")},function(t){return r.StringUtilities.format(e.i18n.everyX0Hours(),t)},function(t){return e.i18n.betweenX0AndX1()},function(t){return e.i18n.atX0()})},e.prototype.getDayOfWeekDescription=function(){var e=this,t=this.i18n.daysOfTheWeek();return"*"==this.expressionParts[5]?"":this.getSegmentDescription(this.expressionParts[5],this.i18n.commaEveryDay(),function(e){var n=e;return e.indexOf("#")>-1?n=e.substr(0,e.indexOf("#")):e.indexOf("L")>-1&&(n=n.replace("L","")),t[parseInt(n)]},function(t){return r.StringUtilities.format(e.i18n.commaEveryX0DaysOfTheWeek(),t)},function(t){return e.i18n.commaX0ThroughX1()},function(t){var n=null;if(t.indexOf("#")>-1){var r=null;switch(t.substring(t.indexOf("#")+1)){case"1":r=e.i18n.first();break;case"2":r=e.i18n.second();break;case"3":r=e.i18n.third();break;case"4":r=e.i18n.fourth();break;case"5":r=e.i18n.fifth()}n=e.i18n.commaOnThe()+r+e.i18n.spaceX0OfTheMonth()}else if(t.indexOf("L")>-1)n=e.i18n.commaOnTheLastX0OfTheMonth();else{n="*"!=e.expressionParts[3]?e.i18n.commaAndOnX0():e.i18n.commaOnlyOnX0()}return n})},e.prototype.getMonthDescription=function(){var e=this,t=this.i18n.monthsOfTheYear();return this.getSegmentDescription(this.expressionParts[4],"",function(e){return t[parseInt(e)-1]},function(t){return r.StringUtilities.format(e.i18n.commaEveryX0Months(),t)},function(t){return e.i18n.commaMonthX0ThroughMonthX1()||e.i18n.commaX0ThroughX1()},function(t){return e.i18n.commaOnlyInX0()})},e.prototype.getDayOfMonthDescription=function(){var e=this,t=null,n=this.expressionParts[3];switch(n){case"L":t=this.i18n.commaOnTheLastDayOfTheMonth();break;case"WL":case"LW":t=this.i18n.commaOnTheLastWeekdayOfTheMonth();break;default:var o=n.match(/(\d{1,2}W)|(W\d{1,2})/);if(o){var i=parseInt(o[0].replace("W","")),s=1==i?this.i18n.firstWeekday():r.StringUtilities.format(this.i18n.weekdayNearestDayX0(),i.toString());t=r.StringUtilities.format(this.i18n.commaOnTheX0OfTheMonth(),s);break}var a=n.match(/L-(\d{1,2})/);if(a){var u=a[1];t=r.StringUtilities.format(this.i18n.commaDaysBeforeTheLastDayOfTheMonth(),u);break}t=this.getSegmentDescription(n,this.i18n.commaEveryDay(),function(t){return"L"==t?e.i18n.lastDay():t},function(t){return"1"==t?e.i18n.commaEveryDay():e.i18n.commaEveryX0Days()},function(t){return e.i18n.commaBetweenDayX0AndX1OfTheMonth()},function(t){return e.i18n.commaOnDayX0OfTheMonth()})}return t},e.prototype.getYearDescription=function(){var e=this;return this.getSegmentDescription(this.expressionParts[6],"",function(e){return/^\d+$/.test(e)?new Date(parseInt(e),1).getFullYear().toString():e},function(t){return r.StringUtilities.format(e.i18n.commaEveryX0Years(),t)},function(t){return e.i18n.commaYearX0ThroughYearX1()||e.i18n.commaX0ThroughX1()},function(t){return e.i18n.commaOnlyInX0()})},e.prototype.getSegmentDescription=function(e,t,n,o,i,s){var a=this,u=null;if(e)if("*"===e)u=t;else if(r.StringUtilities.containsAny(e,["/","-",","]))if(e.indexOf("/")>-1){var c=e.split("/");if(u=r.StringUtilities.format(o(c[1]),n(c[1])),c[0].indexOf("-")>-1)0!=(y=this.generateBetweenSegmentDescription(c[0],i,n)).indexOf(", ")&&(u+=", "),u+=y;else if(!r.StringUtilities.containsAny(c[0],["*",","])){var f=r.StringUtilities.format(s(c[0]),n(c[0]));f=f.replace(", ",""),u+=r.StringUtilities.format(this.i18n.commaStartingX0(),f)}}else if(e.indexOf(",")>-1){c=e.split(",");for(var p="",h=0;h<c.length;h++){var y;if(h>0&&c.length>2&&(p+=",",h<c.length-1&&(p+=" ")),h>0&&c.length>1&&(h==c.length-1||2==c.length)&&(p+=this.i18n.spaceAnd()+" "),c[h].indexOf("-")>-1)p+=y=(y=this.generateBetweenSegmentDescription(c[h],function(e){return a.i18n.commaX0ThroughX1()},n)).replace(", ","");else p+=n(c[h])}u=r.StringUtilities.format(s(e),p)}else e.indexOf("-")>-1&&(u=this.generateBetweenSegmentDescription(e,i,n));else u=r.StringUtilities.format(s(e),n(e));else u="";return u},e.prototype.generateBetweenSegmentDescription=function(e,t,n){var o="",i=e.split("-"),s=n(i[0]),a=n(i[1]);a=a.replace(":00",":59");var u=t(e);return o+=r.StringUtilities.format(u,s,a)},e.prototype.formatTime=function(e,t,n){var r=parseInt(e),o="";this.options.use24HourTimeFormat||(o=r>=12?" PM":" AM",r>12&&(r-=12),0===r&&(r=12));var i=t,s="";return n&&(s=":"+("00"+n).substring(n.length)),("00"+r.toString()).substring(r.toString().length)+":"+("00"+i.toString()).substring(i.toString().length)+s+o},e.prototype.transformVerbosity=function(e,t){return t||(e=(e=(e=(e=e.replace(new RegExp(this.i18n.commaEveryMinute(),"g"),"")).replace(new RegExp(this.i18n.commaEveryHour(),"g"),"")).replace(new RegExp(this.i18n.commaEveryDay(),"g"),"")).replace(/\, ?$/,"")),e},e.locales={},e}();t.ExpressionDescriptor=i},function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=function(){function e(){}return e.format=function(e){for(var t=[],n=1;n<arguments.length;n++)t[n-1]=arguments[n];return e.replace(/%s/g,function(){return t.shift()})},e.containsAny=function(e,t){return t.some(function(t){return e.indexOf(t)>-1})},e}();t.StringUtilities=r},function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=function(){function e(e,t){void 0===t&&(t=!0),this.expression=e,this.dayOfWeekStartIndexZero=t}return e.prototype.parse=function(){var e=this.extractParts(this.expression);return this.normalize(e),this.validate(e),e},e.prototype.extractParts=function(e){if(!this.expression)throw new Error("Expression is empty");var t=e.trim().split(" ");if(t.length<5)throw new Error("Expression has only "+t.length+" part"+(1==t.length?"":"s")+". At least 5 parts are required.");if(5==t.length)t.unshift(""),t.push("");else if(6==t.length)/\d{4}$/.test(t[5])?t.unshift(""):t.push("");else if(t.length>7)throw new Error("Expression has "+t.length+" parts; too many!");return t},e.prototype.normalize=function(e){var t=this;if(e[3]=e[3].replace("?","*"),e[5]=e[5].replace("?","*"),0==e[0].indexOf("0/")&&(e[0]=e[0].replace("0/","*/")),0==e[1].indexOf("0/")&&(e[1]=e[1].replace("0/","*/")),0==e[2].indexOf("0/")&&(e[2]=e[2].replace("0/","*/")),0==e[3].indexOf("1/")&&(e[3]=e[3].replace("1/","*/")),0==e[4].indexOf("1/")&&(e[4]=e[4].replace("1/","*/")),0==e[5].indexOf("1/")&&(e[5]=e[5].replace("1/","*/")),0==e[6].indexOf("1/")&&(e[6]=e[6].replace("1/","*/")),e[5]=e[5].replace(/(^\d)|([^#/\s]\d)/g,function(e){var n=e.replace(/\D/,""),r=n;return t.dayOfWeekStartIndexZero?"7"==n&&(r="0"):r=(parseInt(n)-1).toString(),e.replace(n,r)}),"L"==e[5]&&(e[5]="6"),"?"==e[3]&&(e[3]="*"),e[3].indexOf("W")>-1&&(e[3].indexOf(",")>-1||e[3].indexOf("-")>-1))throw new Error("The 'W' character can be specified only when the day-of-month is a single day, not a range or list of days.");var n={SUN:0,MON:1,TUE:2,WED:3,THU:4,FRI:5,SAT:6};for(var r in n)e[5]=e[5].replace(new RegExp(r,"gi"),n[r].toString());var o={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};for(var i in o)e[4]=e[4].replace(new RegExp(i,"gi"),o[i].toString());"0"==e[0]&&(e[0]=""),/\*|\-|\,|\//.test(e[2])||!/\*|\//.test(e[1])&&!/\*|\//.test(e[0])||(e[2]+="-"+e[2]);for(var s=0;s<e.length;s++)if("*/1"==e[s]&&(e[s]="*"),e[s].indexOf("/")>-1&&!/^\*|\-|\,/.test(e[s])){var a=null;switch(s){case 4:a="12";break;case 5:a="6";break;case 6:a="9999";break;default:a=null}if(null!=a){var u=e[s].split("/");e[s]=u[0]+"-"+a+"/"+u[1]}}},e.prototype.validate=function(e){this.assertNoInvalidCharacters("DOW",e[5]),this.assertNoInvalidCharacters("DOM",e[3])},e.prototype.assertNoInvalidCharacters=function(e,t){var n=t.match(/[A-KM-VX-Z]+/gi);if(n&&n.length)throw new Error(e+" part contains invalid values: '"+n.toString()+"'")},e}();t.CronParser=r},function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=function(){function e(){}return e.prototype.atX0SecondsPastTheMinuteGt20=function(){return null},e.prototype.atX0MinutesPastTheHourGt20=function(){return null},e.prototype.commaMonthX0ThroughMonthX1=function(){return null},e.prototype.commaYearX0ThroughYearX1=function(){return null},e.prototype.use24HourTimeFormatByDefault=function(){return!1},e.prototype.anErrorOccuredWhenGeneratingTheExpressionD=function(){return"An error occured when generating the expression description.  Check the cron expression syntax."},e.prototype.everyMinute=function(){return"every minute"},e.prototype.everyHour=function(){return"every hour"},e.prototype.atSpace=function(){return"At "},e.prototype.everyMinuteBetweenX0AndX1=function(){return"Every minute between %s and %s"},e.prototype.at=function(){return"At"},e.prototype.spaceAnd=function(){return" and"},e.prototype.everySecond=function(){return"every second"},e.prototype.everyX0Seconds=function(){return"every %s seconds"},e.prototype.secondsX0ThroughX1PastTheMinute=function(){return"seconds %s through %s past the minute"},e.prototype.atX0SecondsPastTheMinute=function(){return"at %s seconds past the minute"},e.prototype.everyX0Minutes=function(){return"every %s minutes"},e.prototype.minutesX0ThroughX1PastTheHour=function(){return"minutes %s through %s past the hour"},e.prototype.atX0MinutesPastTheHour=function(){return"at %s minutes past the hour"},e.prototype.everyX0Hours=function(){return"every %s hours"},e.prototype.betweenX0AndX1=function(){return"between %s and %s"},e.prototype.atX0=function(){return"at %s"},e.prototype.commaEveryDay=function(){return", every day"},e.prototype.commaEveryX0DaysOfTheWeek=function(){return", every %s days of the week"},e.prototype.commaX0ThroughX1=function(){return", %s through %s"},e.prototype.first=function(){return"first"},e.prototype.second=function(){return"second"},e.prototype.third=function(){return"third"},e.prototype.fourth=function(){return"fourth"},e.prototype.fifth=function(){return"fifth"},e.prototype.commaOnThe=function(){return", on the "},e.prototype.spaceX0OfTheMonth=function(){return" %s of the month"},e.prototype.lastDay=function(){return"the last day"},e.prototype.commaOnTheLastX0OfTheMonth=function(){return", on the last %s of the month"},e.prototype.commaOnlyOnX0=function(){return", only on %s"},e.prototype.commaAndOnX0=function(){return", and on %s"},e.prototype.commaEveryX0Months=function(){return", every %s months"},e.prototype.commaOnlyInX0=function(){return", only in %s"},e.prototype.commaOnTheLastDayOfTheMonth=function(){return", on the last day of the month"},e.prototype.commaOnTheLastWeekdayOfTheMonth=function(){return", on the last weekday of the month"},e.prototype.commaDaysBeforeTheLastDayOfTheMonth=function(){return", %s days before the last day of the month"},e.prototype.firstWeekday=function(){return"first weekday"},e.prototype.weekdayNearestDayX0=function(){return"weekday nearest day %s"},e.prototype.commaOnTheX0OfTheMonth=function(){return", on the %s of the month"},e.prototype.commaEveryX0Days=function(){return", every %s days"},e.prototype.commaBetweenDayX0AndX1OfTheMonth=function(){return", between day %s and %s of the month"},e.prototype.commaOnDayX0OfTheMonth=function(){return", on day %s of the month"},e.prototype.commaEveryMinute=function(){return", every minute"},e.prototype.commaEveryHour=function(){return", every hour"},e.prototype.commaEveryX0Years=function(){return", every %s years"},e.prototype.commaStartingX0=function(){return", starting %s"},e.prototype.daysOfTheWeek=function(){return["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},e.prototype.monthsOfTheYear=function(){return["January","February","March","April","May","June","July","August","September","October","November","December"]},e}();t.en=r},function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=n(0),o=n(5);r.ExpressionDescriptor.initialize(new o.enLocaleLoader),t.default=r.ExpressionDescriptor;var i=r.ExpressionDescriptor.toString;t.toString=i},function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=n(3),o=function(){function e(){}return e.prototype.load=function(e){e.en=new r.en},e}();t.enLocaleLoader=o}])});

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(1);

var _HourTimeSelect = __webpack_require__(24);

var _HourTimeSelect2 = _interopRequireDefault(_HourTimeSelect);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var HourTimePicker = function (_Component) {
  _inherits(HourTimePicker, _Component);

  function HourTimePicker(props) {
    _classCallCheck(this, HourTimePicker);

    var _this = _possibleConstructorReturn(this, (HourTimePicker.__proto__ || Object.getPrototypeOf(HourTimePicker)).call(this, props));

    _this.state = {
      editing: false
    };

    _this.handleSelect = _this.handleSelect.bind(_this);
    return _this;
  }

  _createClass(HourTimePicker, [{
    key: 'handleSelect',
    value: function handleSelect(val) {
      this.setState({ editing: false });
      this.props.onChange(val);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var editing = this.state.editing;
      var _props = this.props,
          type = _props.type,
          value = _props.value;


      return _react2.default.createElement(
        'div',
        { style: { display: 'inline-block' } },
        _react2.default.createElement('input', {
          type: 'text',
          readOnly: true,
          style: { width: '30px', cursor: 'pointer' },
          value: value,
          onClick: function onClick() {
            return _this2.setState({ editing: true });
          }
        }),
        _react2.default.createElement(
          _jsreportStudio.Popover,
          {
            wrapper: false,
            open: editing,
            onClose: function onClose() {
              return _this2.setState({ editing: false });
            }
          },
          _react2.default.createElement(_HourTimeSelect2.default, {
            type: type,
            value: value,
            onSelect: this.handleSelect
          })
        )
      );
    }
  }]);

  return HourTimePicker;
}(_react.Component);

exports.default = HourTimePicker;

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _HourTimeSelect = __webpack_require__(25);

var _HourTimeSelect2 = _interopRequireDefault(_HourTimeSelect);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var HourTimeSelectItem = function (_Component) {
  _inherits(HourTimeSelectItem, _Component);

  function HourTimeSelectItem(props) {
    _classCallCheck(this, HourTimeSelectItem);

    var _this = _possibleConstructorReturn(this, (HourTimeSelectItem.__proto__ || Object.getPrototypeOf(HourTimeSelectItem)).call(this, props));

    _this.handleClick = _this.handleClick.bind(_this);
    return _this;
  }

  _createClass(HourTimeSelectItem, [{
    key: 'handleClick',
    value: function handleClick() {
      this.props.onClick(this.props.value);
    }
  }, {
    key: 'render',
    value: function render() {
      var _props = this.props,
          value = _props.value,
          active = _props.active;


      return _react2.default.createElement(
        'div',
        {
          className: _HourTimeSelect2.default.item + ' ' + (active ? _HourTimeSelect2.default.itemSelected : ''),
          onClick: this.handleClick
        },
        value
      );
    }
  }]);

  return HourTimeSelectItem;
}(_react.Component);

var HourTimeSelect = function (_Component2) {
  _inherits(HourTimeSelect, _Component2);

  function HourTimeSelect(props) {
    _classCallCheck(this, HourTimeSelect);

    var _this2 = _possibleConstructorReturn(this, (HourTimeSelect.__proto__ || Object.getPrototypeOf(HourTimeSelect)).call(this, props));

    _this2.handleItemClick = _this2.handleItemClick.bind(_this2);
    return _this2;
  }

  _createClass(HourTimeSelect, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.itemsContainer.focus();
    }
  }, {
    key: 'handleItemClick',
    value: function handleItemClick(value) {
      this.props.onSelect(value);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var _props$type = this.props.type,
          type = _props$type === undefined ? 'hour' : _props$type;

      var title = 'Time: ' + (type[0].toUpperCase() + type.slice(1));
      var maxItems = void 0;
      var columnLimit = 6;
      var rowCount = 0;
      var items = [];

      if (type === 'hour') {
        maxItems = 24;
      } else if (type === 'minute') {
        maxItems = 60;
      }

      var maxRowCount = maxItems / columnLimit;

      while (rowCount < maxRowCount) {
        var value = rowCount;
        var cols = [];

        for (var i = 0; i < columnLimit; i++) {
          cols.push(value + maxRowCount * i);
        }

        items = items.concat(cols.map(function (colValue) {
          var valueItem = String(colValue).length === 1 ? '0' + colValue : String(colValue);

          return _react2.default.createElement(HourTimeSelectItem, {
            key: colValue,
            active: _this3.props.value === valueItem,
            value: valueItem,
            onClick: _this3.handleItemClick
          });
        }));

        rowCount++;
      }

      return _react2.default.createElement(
        'div',
        {
          className: _HourTimeSelect2.default.container,
          style: {
            width: '150px'
          }
        },
        _react2.default.createElement(
          'div',
          {
            className: _HourTimeSelect2.default.title
          },
          title
        ),
        _react2.default.createElement(
          'div',
          {
            className: _HourTimeSelect2.default.list,
            ref: function ref(itemsContainer) {
              _this3.itemsContainer = itemsContainer;
            },
            tabIndex: '-1'
          },
          items
        )
      );
    }
  }]);

  return HourTimeSelect;
}(_react.Component);

exports.default = HourTimeSelect;

/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"container":"x-scheduling-HourTimeSelect-container","title":"x-scheduling-HourTimeSelect-title","list":"x-scheduling-HourTimeSelect-list","item":"x-scheduling-HourTimeSelect-item","itemSelected":"x-scheduling-HourTimeSelect-itemSelected"};

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _ScheduleEditor = __webpack_require__(2);

var _ScheduleEditor2 = _interopRequireDefault(_ScheduleEditor);

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
    key: 'download',
    value: function download() {
      if (_ScheduleEditor2.default.ActiveReport) {
        window.open(_jsreportStudio2.default.rootUrl + '/reports/' + _ScheduleEditor2.default.ActiveReport._id + '/attachment', '_self');
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      if (!this.props.tab || !this.props.tab.entity || this.props.tab.entity.__entitySet !== 'schedules' || !_ScheduleEditor2.default.ActiveReport) {
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

/***/ })
/******/ ]);