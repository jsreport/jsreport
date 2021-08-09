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
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = Studio;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _ShareModal = __webpack_require__(2);

var _ShareModal2 = _interopRequireDefault(_ShareModal);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addToolbarComponent(function (props) {
  if (!props.tab || !props.tab.entity || props.tab.entity.__entitySet !== 'templates') {
    return React.createElement('span', null);
  }

  return React.createElement(
    'div',
    {
      className: 'toolbar-button',
      onClick: function onClick() {
        _jsreportStudio2.default.openModal(_ShareModal2.default, { entity: props.tab.entity });
        props.closeMenu();
      }
    },
    React.createElement('i', { className: 'fa fa-unlock' }),
    'Share'
  );
});

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(3);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _ShareModal = __webpack_require__(4);

var _ShareModal2 = _interopRequireDefault(_ShareModal);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ShareModal = function (_Component) {
  _inherits(ShareModal, _Component);

  function ShareModal(props) {
    _classCallCheck(this, ShareModal);

    var _this = _possibleConstructorReturn(this, (ShareModal.__proto__ || Object.getPrototypeOf(ShareModal)).call(this, props));

    _this.state = { entity: props.options.entity };
    return _this;
  }

  _createClass(ShareModal, [{
    key: 'generateLink',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(method) {
        var response, entity, tokenProperty, updated;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return _jsreportStudio2.default.api.post('/api/templates/sharing/' + this.props.options.entity.shortid + '/access/' + method, {});

              case 2:
                response = _context.sent;
                entity = this.state.entity;
                tokenProperty = method + 'SharingToken';
                updated = _extends({}, entity, _defineProperty({}, tokenProperty, response.token));

                _jsreportStudio2.default.updateEntity(updated);
                this.setState({ entity: updated });

              case 8:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function generateLink(_x) {
        return _ref.apply(this, arguments);
      }

      return generateLink;
    }()
  }, {
    key: 'removeLink',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _jsreportStudio2.default.updateEntity({ _id: this.state.entity._id, readSharingToken: null });
                _jsreportStudio2.default.saveEntity(this.state.entity._id);
                this.setState({ entity: _extends({}, this.state.entity, { readSharingToken: null }) });

              case 3:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function removeLink() {
        return _ref2.apply(this, arguments);
      }

      return removeLink;
    }()
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var entity = this.state.entity;


      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'h2',
          null,
          'Link with read permissions'
        ),
        entity.readSharingToken ? _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'a',
            { target: '_blank', rel: 'noreferrer', href: _jsreportStudio2.default.rootUrl + ('/public-templates?access_token=' + entity.readSharingToken) },
            _jsreportStudio2.default.rootUrl + ('/public-templates?access_token=' + entity.readSharingToken)
          )
        ) : _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'button',
            { type: 'button', className: 'button confirmation', onClick: function onClick() {
                return _this2.generateLink('read');
              } },
            'Generate Read Link'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: _ShareModal2.default.infoBox },
          'When requesting this link, jsreport will skip the authentication and authorization and render this particular template. User will be also able to execute any of the jsreport recipes from the served page but won\'t be allowed to access any of the existing templates or other entities.'
        ),
        _react2.default.createElement(
          'div',
          { className: 'button-bar' },
          _react2.default.createElement(
            'button',
            { className: 'button confirmation', onClick: function onClick() {
                return _this2.props.close();
              } },
            'ok'
          ),
          entity.readSharingToken ? _react2.default.createElement(
            'button',
            { className: 'button danger', onClick: function onClick() {
                return _this2.removeLink();
              } },
            'Remove'
          ) : _react2.default.createElement('span', null)
        )
      );
    }
  }]);

  return ShareModal;
}(_react.Component);

exports.default = ShareModal;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react'];

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"infoBox":"x-public-templates-ShareModal-infoBox"};

/***/ })
/******/ ]);