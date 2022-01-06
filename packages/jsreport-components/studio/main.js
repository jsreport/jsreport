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


var _NewComponentModal = __webpack_require__(3);

var _NewComponentModal2 = _interopRequireDefault(_NewComponentModal);

var _ComponentProperties = __webpack_require__(4);

var _ComponentProperties2 = _interopRequireDefault(_ComponentProperties);

var _ComponentPreview = __webpack_require__(5);

var _ComponentPreview2 = _interopRequireDefault(_ComponentPreview);

var _PreviewComponentToolbar = __webpack_require__(6);

var _PreviewComponentToolbar2 = _interopRequireDefault(_PreviewComponentToolbar);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addEntitySet({
  name: 'components',
  faIcon: 'fa-puzzle-piece',
  visibleName: 'component',
  onNew: function onNew(options) {
    return _jsreportStudio2.default.openModal(_NewComponentModal2.default, options);
  },
  entityTreePosition: 800
});

_jsreportStudio2.default.entityEditorComponentKeyResolvers.push(function (entity) {
  if (entity.__entitySet === 'components') {
    return {
      key: 'templates',
      entity: entity
    };
  }
});

_jsreportStudio2.default.addPropertiesComponent(_ComponentProperties2.default.title, _ComponentProperties2.default, function (entity) {
  return entity.__entitySet === 'components';
});
_jsreportStudio2.default.addToolbarComponent(_PreviewComponentToolbar2.default);

_jsreportStudio2.default.addPreviewComponent('component', _ComponentPreview2.default);

/***/ }),
/* 3 */
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

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* import PropTypes from 'prop-types' */


function getDefaultEngine() {
  var found = _jsreportStudio2.default.engines.find(function (e) {
    return e === 'handlebars';
  });

  if (found) {
    return found;
  }

  return _jsreportStudio2.default.engines[0];
}

var NewComponentModal = function (_Component) {
  _inherits(NewComponentModal, _Component);

  function NewComponentModal(props) {
    _classCallCheck(this, NewComponentModal);

    var _this = _possibleConstructorReturn(this, (NewComponentModal.__proto__ || Object.getPrototypeOf(NewComponentModal)).call(this, props));

    _this.nameInputRef = _react2.default.createRef();
    _this.engineInputRef = _react2.default.createRef();

    _this.state = {
      error: null,
      processing: false
    };
    return _this;
  }

  // the modal component for some reason after open focuses the panel itself


  _createClass(NewComponentModal, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this2 = this;

      setTimeout(function () {
        return _this2.nameInputRef.current.focus();
      }, 0);
    }
  }, {
    key: 'handleKeyPress',
    value: function handleKeyPress(e) {
      if (e.key === 'Enter') {
        this.submit(e.target.value);
      }
    }
  }, {
    key: 'submit',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(val) {
        var name, entity;
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
                name = val || this.nameInputRef.current.value;
                entity = _extends({}, this.props.options.defaults, {
                  name: name,
                  engine: this.engineInputRef.current.value,
                  __entitySet: 'components'
                });


                this.setState({ processing: true });

                _context.prev = 5;
                _context.next = 8;
                return _jsreportStudio2.default.api.post('/studio/validate-entity-name', {
                  data: {
                    _id: this.props.options.cloning === true ? undefined : entity._id,
                    name: name,
                    entitySet: 'components',
                    folderShortid: entity.folder != null ? entity.folder.shortid : null
                  }
                }, true);

              case 8:
                _context.next = 14;
                break;

              case 10:
                _context.prev = 10;
                _context.t0 = _context['catch'](5);

                this.setState({
                  error: _context.t0.message,
                  processing: false
                });

                return _context.abrupt('return');

              case 14:

                this.setState({
                  error: null,
                  processing: false
                });

                this.props.close();
                _jsreportStudio2.default.openNewTab({
                  entity: entity,
                  entitySet: 'components',
                  name: name
                });

              case 17:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[5, 10]]);
      }));

      function submit(_x) {
        return _ref.apply(this, arguments);
      }

      return submit;
    }()
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var _state = this.state,
          error = _state.error,
          processing = _state.processing;


      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'New component'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'name'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            placeholder: 'name...',
            ref: this.nameInputRef,
            onKeyPress: function onKeyPress(e) {
              return _this3.handleKeyPress(e);
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'engine'
          ),
          _react2.default.createElement(
            'select',
            {
              defaultValue: getDefaultEngine(),
              ref: this.engineInputRef
            },
            _jsreportStudio2.default.engines.map(function (e) {
              return _react2.default.createElement(
                'option',
                { key: e, value: e },
                e
              );
            })
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'span',
            {
              style: {
                color: 'red',
                display: error ? 'block' : 'none',
                marginLeft: 'auto',
                marginRight: 'auto',
                maxWidth: '360px'
              }
            },
            error
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'button-bar' },
          _react2.default.createElement(
            'button',
            { className: 'button confirmation', disabled: processing, onClick: function onClick() {
                return _this3.submit();
              } },
            'Ok'
          )
        )
      );
    }
  }]);

  return NewComponentModal;
}(_react.Component);

exports.default = NewComponentModal;

/***/ }),
/* 4 */
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* import PropTypes from 'prop-types' */


var ComponentProperties = function (_Component) {
  _inherits(ComponentProperties, _Component);

  function ComponentProperties() {
    _classCallCheck(this, ComponentProperties);

    return _possibleConstructorReturn(this, (ComponentProperties.__proto__ || Object.getPrototypeOf(ComponentProperties)).apply(this, arguments));
  }

  _createClass(ComponentProperties, [{
    key: 'renderEngines',
    value: function renderEngines() {
      var _props = this.props,
          entity = _props.entity,
          _onChange = _props.onChange;


      return _react2.default.createElement(
        'select',
        { value: entity.engine, onChange: function onChange(v) {
            return _onChange({ _id: entity._id, engine: v.target.value });
          } },
        _jsreportStudio2.default.engines.map(function (e) {
          return _react2.default.createElement(
            'option',
            { key: e, value: e },
            e
          );
        })
      );
    }
  }, {
    key: 'render',
    value: function render() {
      if (this.props.entity.__entitySet !== 'components') {
        return _react2.default.createElement('div', null);
      }

      return _react2.default.createElement(
        'div',
        { className: 'properties-section' },
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'engine'
          ),
          ' ',
          this.renderEngines()
        )
      );
    }
  }], [{
    key: 'title',
    value: function title(entity) {
      return entity.engine;
    }
  }]);

  return ComponentProperties;
}(_react.Component);

exports.default = ComponentProperties;

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(1);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var FramePreview = _jsreportStudio2.default.sharedComponents.FramePreview;

var ComponentPreview = function ComponentPreview(props) {
  var data = props.data;


  var src = (0, _react.useMemo)(function () {
    if (data.type == null && data.content == null) {
      return null;
    }

    var blob = new Blob([data.content], { type: data.type });
    return window.URL.createObjectURL(blob);
  }, [data.type, data.content]);

  var styles = (0, _react.useMemo)(function () {
    if (data.type !== 'text/html') {
      return {};
    }

    // match default browser styles
    return {
      backgroundColor: '#fff',
      color: '#000'
    };
  }, [data.type]);

  return React.createElement(FramePreview, {
    src: src,
    styles: styles
  });
};

exports.default = ComponentPreview;

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _react = __webpack_require__(1);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PreviewComponentToolbar = function PreviewComponentToolbar(props) {
  var _useState = (0, _react.useState)(false),
      _useState2 = _slicedToArray(_useState, 2),
      isRunning = _useState2[0],
      setIsRunning = _useState2[1];

  var stopPreviewRef = (0, _react.useRef)(null);
  var entity = props.tab != null && props.tab.entity != null ? props.tab.entity : undefined;

  var previewComponent = (0, _react.useCallback)(function previewComponent(componentShortid, componentName) {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    _jsreportStudio2.default.startProgress();

    var previewId = _jsreportStudio2.default.preview({
      type: 'component',
      data: {}
    });

    var componentPayload = {
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
      var dataDetails = _jsreportStudio2.default.getAllEntities().filter(function (d) {
        return d.shortid === entity.data.shortid && d.__entitySet === 'data' && (d.__isLoaded || d.__isDirty || d.__isNew);
      });

      if (dataDetails.length > 0) {
        componentPayload.data = dataDetails[0].dataJson ? JSON.parse(dataDetails[0].dataJson) : {};
      }
    }

    var componentUrl = _jsreportStudio2.default.resolveUrl('/api/component');

    var previewController = new AbortController();

    stopPreviewRef.current = function () {
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
    }).then(function (response) {
      var contentType = '';

      if (response.headers != null) {
        contentType = response.headers.get('Content-Type') || '';
      }

      var contentPromise = void 0;

      if (response.status !== 200) {
        if (contentType.indexOf('application/json') === 0) {
          contentPromise = response.json();
        } else {
          contentPromise = response.text();
        }
      } else {
        contentPromise = response.text();
      }

      return contentPromise.then(function (content) {
        return {
          status: response.status,
          content: content
        };
      });
    }).then(function (_ref) {
      var status = _ref.status,
          content = _ref.content;

      if (status !== 200) {
        var notOkError = void 0;

        if (typeof content !== 'string' && content.message && content.stack) {
          notOkError = new Error(content.message);
          notOkError.stack = content.stack;
        } else {
          notOkError = new Error('Got not ok response, status: ' + status + ', message: ' + content);
        }

        throw notOkError;
      }

      setIsRunning(false);
      _jsreportStudio2.default.stopProgress();
      stopPreviewRef.current = null;

      _jsreportStudio2.default.updatePreview(previewId, {
        data: {
          type: 'text/html',
          content: content
        },
        completed: true
      });
    }).catch(function (err) {
      setIsRunning(false);
      _jsreportStudio2.default.stopProgress();
      stopPreviewRef.current = null;

      _jsreportStudio2.default.updatePreview(previewId, {
        data: {
          type: 'text/plain',
          content: 'Component' + (componentName != null ? ' "' + componentName + '"' : '') + ' preview failed.\n\n' + err.message + '\n' + (err.stack || '')
        },
        completed: true
      });
    });
  }, [entity, isRunning]);

  var stopPreviewComponent = (0, _react.useCallback)(function stopPreviewComponent() {
    if (stopPreviewRef.current != null) {
      stopPreviewRef.current();
    }
  });

  var handleEarlyShortcut = (0, _react.useCallback)(function handleEarlyShortcut(e) {
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

  (0, _react.useEffect)(function () {
    window.addEventListener('keydown', handleEarlyShortcut, true);

    return function () {
      window.removeEventListener('keydown', handleEarlyShortcut, true);
    };
  }, [handleEarlyShortcut]);

  if (!props.tab || !props.tab.entity || props.tab.entity.__entitySet !== 'components') {
    return React.createElement('span', null);
  }

  return React.createElement(
    'div',
    {
      title: 'Run and preview component (F9)',
      className: 'toolbar-button',
      onClick: function onClick() {
        if (isRunning) {
          stopPreviewComponent();
        } else {
          previewComponent(props.tab.entity.shortid, props.tab.entity.name);
        }
      }
    },
    React.createElement('i', { className: 'fa fa-' + (isRunning ? 'stop' : 'eye') }),
    'Component'
  );
};

exports.default = PreviewComponentToolbar;

/***/ })
/******/ ]);