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
                });

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
            { style: { color: 'red', display: error ? 'block' : 'none' } },
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

/***/ })
/******/ ]);