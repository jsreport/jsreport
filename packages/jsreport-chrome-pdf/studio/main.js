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
var CHROME_TAB_TITLE = exports.CHROME_TAB_TITLE = 'CHROME_TAB_TITLE';
var CHROME_TAB_EDITOR = exports.CHROME_TAB_EDITOR = 'CHROME_TAB_EDITOR';

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _ChromePdfProperties = __webpack_require__(4);

var _ChromePdfProperties2 = _interopRequireDefault(_ChromePdfProperties);

var _ChromeImageProperties = __webpack_require__(5);

var _ChromeImageProperties2 = _interopRequireDefault(_ChromeImageProperties);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _ChromeEditor = __webpack_require__(6);

var _ChromeEditor2 = _interopRequireDefault(_ChromeEditor);

var _constants = __webpack_require__(2);

var Constants = _interopRequireWildcard(_constants);

var _ChromeTitle = __webpack_require__(7);

var _ChromeTitle2 = _interopRequireDefault(_ChromeTitle);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addPropertiesComponent('chrome pdf', _ChromePdfProperties2.default, function (entity) {
  return entity.__entitySet === 'templates' && entity.recipe === 'chrome-pdf';
});
_jsreportStudio2.default.addPropertiesComponent('chrome image', _ChromeImageProperties2.default, function (entity) {
  return entity.__entitySet === 'templates' && entity.recipe === 'chrome-image';
});

_jsreportStudio2.default.addEditorComponent(Constants.CHROME_TAB_EDITOR, _ChromeEditor2.default);
_jsreportStudio2.default.addTabTitleComponent(Constants.CHROME_TAB_TITLE, _ChromeTitle2.default);
_jsreportStudio2.default.entityTreeIconResolvers.push(function (entity) {
  return entity.__entitySet === 'templates' && entity.recipe === 'chrome-pdf' ? 'fa-file-pdf-o' : null;
});
_jsreportStudio2.default.entityTreeIconResolvers.push(function (entity) {
  return entity.__entitySet === 'templates' && entity.recipe === 'chrome-image' ? 'fa-file-image-o' : null;
});

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _constants = __webpack_require__(2);

var Constants = _interopRequireWildcard(_constants);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ChromePdfProperties = function (_Component) {
  _inherits(ChromePdfProperties, _Component);

  function ChromePdfProperties(props) {
    _classCallCheck(this, ChromePdfProperties);

    var _this = _possibleConstructorReturn(this, (ChromePdfProperties.__proto__ || Object.getPrototypeOf(ChromePdfProperties)).call(this, props));

    _this.applyDefaultsToEntity = _this.applyDefaultsToEntity.bind(_this);
    _this.changeChrome = _this.changeChrome.bind(_this);
    return _this;
  }

  _createClass(ChromePdfProperties, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.applyDefaultsToEntity(this.props);
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(prevProps, prevState) {
      if (prevProps.entity._id !== this.props.entity._id) {
        this.applyDefaultsToEntity(this.props);
      }
    }
  }, {
    key: 'inform',
    value: function inform() {
      if (_jsreportStudio2.default.getSettingValueByKey('chrome-header-informed', false) === true) {
        return;
      }

      _jsreportStudio2.default.setSetting('chrome-header-informed', true);

      _jsreportStudio2.default.openModal(function () {
        return _react2.default.createElement(
          'div',
          null,
          'Here you can define chrome native headers/footers. Make sure "display header/footer" is selected and use margin to prepare the space for the header.',
          _react2.default.createElement('br', null),
          'Please note chrome currently prints headers with smaller font size and you need to style text explicitly to workaround it.',
          _react2.default.createElement('br', null),
          _react2.default.createElement('br', null),
          _react2.default.createElement(
            'b',
            null,
            'The chrome native implementation is also very limited and we recommend to use jsreport',
            _react2.default.createElement(
              'a',
              { href: 'https://jsreport.net/learn/pdf-utils', target: '_blank', rel: 'noreferrer' },
              ' pdf utils extension'
            ),
            ' in more complex use cases.'
          )
        );
      });
    }
  }, {
    key: 'openHeaderFooter',
    value: function openHeaderFooter(type) {
      this.inform();

      _jsreportStudio2.default.openTab({
        key: this.props.entity._id + 'chrome' + type,
        _id: this.props.entity._id,
        headerOrFooter: type,
        editorComponentKey: Constants.CHROME_TAB_EDITOR,
        titleComponentKey: Constants.CHROME_TAB_TITLE
      });
    }
  }, {
    key: 'applyDefaultsToEntity',
    value: function applyDefaultsToEntity(props) {
      var entity = props.entity;

      var entityNeedsDefault = false;

      if (entity.__isNew && (entity.chrome == null || entity.chrome.printBackground == null)) {
        entityNeedsDefault = true;
      }

      if (entityNeedsDefault) {
        this.changeChrome(props, {
          printBackground: true
        });
      }
    }
  }, {
    key: 'changeChrome',
    value: function changeChrome(props, change) {
      var entity = props.entity,
          onChange = props.onChange;

      var chrome = entity.chrome || {};

      onChange(_extends({}, entity, {
        chrome: _extends({}, chrome, change)
      }));
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var entity = this.props.entity;

      var chrome = entity.chrome || {};
      var changeChrome = this.changeChrome;

      return _react2.default.createElement(
        'div',
        { className: 'properties-section' },
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'scale'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            placeholder: '1',
            value: chrome.scale || '',
            onChange: function onChange(v) {
              var scaleValue = v.target.value;

              if (scaleValue.trim() === '') {
                scaleValue = null;
              }

              changeChrome(_this2.props, { scale: scaleValue });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'print background'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox',
            checked: chrome.printBackground === true,
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { printBackground: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'landscape'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox',
            checked: chrome.landscape === true,
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { landscape: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'pageRanges'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            placeholder: '1-5, 8, 11-13',
            value: chrome.pageRanges || '',
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { pageRanges: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'format'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            placeholder: 'Letter',
            value: chrome.format || '',
            title: 'Specifies a pre-defined size for the pdf',
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { format: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'pdf width'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            placeholder: '10cm',
            value: chrome.width || '',
            title: 'Specifies a custom width for the pdf',
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { width: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'pdf height'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            placeholder: '10cm',
            value: chrome.height || '',
            title: 'Specifies a custom height for the pdf',
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { height: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'pdf margin top'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            placeholder: '10cm',
            value: chrome.marginTop || '',
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { marginTop: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'pdf margin right'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            placeholder: '10cm',
            value: chrome.marginRight || '',
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { marginRight: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'pdf margin bottom'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            placeholder: '10cm',
            value: chrome.marginBottom || '',
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { marginBottom: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'pdf margin left'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            placeholder: '10cm',
            value: chrome.marginLeft || '',
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { marginLeft: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'viewport width'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            value: chrome.viewportWidth != null ? chrome.viewportWidth : '',
            title: 'Specifies the target viewport width of the chrome page',
            placeholder: '800',
            onChange: function onChange(v) {
              var viewportWidthValue = v.target.value;

              if (viewportWidthValue.trim() === '') {
                viewportWidthValue = null;
              }

              changeChrome(_this2.props, { viewportWidth: viewportWidthValue });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'viewport height'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            value: chrome.viewportHeight != null ? chrome.viewportHeight : '',
            title: 'Specifies the target viewport height of the chrome page',
            placeholder: '600',
            onChange: function onChange(v) {
              var viewportHeightValue = v.target.value;

              if (viewportHeightValue.trim() === '') {
                viewportHeightValue = null;
              }

              changeChrome(_this2.props, { viewportHeight: viewportHeightValue });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'display header/footer'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox',
            checked: chrome.displayHeaderFooter === true,
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { displayHeaderFooter: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'header'
          ),
          _react2.default.createElement(
            'button',
            { onClick: function onClick() {
                return _this2.openHeaderFooter('header');
              } },
            'open in tab...'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'footer'
          ),
          _react2.default.createElement(
            'button',
            { onClick: function onClick() {
                return _this2.openHeaderFooter('footer');
              } },
            'open in tab...'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'media type'
          ),
          _react2.default.createElement(
            'select',
            { value: chrome.mediaType || 'print', onChange: function onChange(v) {
                return changeChrome(_this2.props, { mediaType: v.target.value });
              } },
            _react2.default.createElement(
              'option',
              { key: 'print', value: 'print' },
              'print'
            ),
            _react2.default.createElement(
              'option',
              { key: 'screen', value: 'screen' },
              'screen'
            )
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'wait for network idle'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox',
            checked: chrome.waitForNetworkIdle === true,
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { waitForNetworkIdle: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            { title: 'window.JSREPORT_READY_TO_START=true;' },
            'wait for printing trigger'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox',
            title: 'window.JSREPORT_READY_TO_START=true;', checked: chrome.waitForJS === true,
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { waitForJS: v.target.checked });
            }
          })
        )
      );
    }
  }]);

  return ChromePdfProperties;
}(_react.Component);

exports.default = ChromePdfProperties;

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ImageProperties = function (_Component) {
  _inherits(ImageProperties, _Component);

  function ImageProperties(props) {
    _classCallCheck(this, ImageProperties);

    var _this = _possibleConstructorReturn(this, (ImageProperties.__proto__ || Object.getPrototypeOf(ImageProperties)).call(this, props));

    _this.changeChrome = _this.changeChrome.bind(_this);
    return _this;
  }

  _createClass(ImageProperties, [{
    key: 'changeChrome',
    value: function changeChrome(props, change) {
      var entity = props.entity,
          onChange = props.onChange;

      var chromeImage = entity.chromeImage || {};

      onChange(_extends({}, entity, {
        chromeImage: _extends({}, chromeImage, change)
      }));
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var entity = this.props.entity;

      var chrome = entity.chromeImage || {};
      var changeChrome = this.changeChrome;

      return _react2.default.createElement(
        'div',
        { className: 'properties-section' },
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'format'
          ),
          _react2.default.createElement(
            'select',
            { value: chrome.type || 'png', onChange: function onChange(v) {
                return changeChrome(_this2.props, { type: v.target.value });
              } },
            _react2.default.createElement(
              'option',
              { key: 'png', value: 'png' },
              'png'
            ),
            _react2.default.createElement(
              'option',
              { key: 'jpeg', value: 'jpeg' },
              'jpeg'
            )
          )
        ),
        chrome.type === 'jpeg' && _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'quality'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            placeholder: '0 - 100',
            value: chrome.quality != null ? chrome.quality : '',
            onChange: function onChange(v) {
              var qualityValue = v.target.value;

              if (qualityValue.trim() === '') {
                qualityValue = null;
              }

              changeChrome(_this2.props, { quality: qualityValue });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'full page'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox',
            checked: chrome.fullPage === true,
            title: 'Specifies whether to take a screenshot of the full scrollable page or not',
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { fullPage: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'viewport width'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            value: chrome.viewportWidth != null ? chrome.viewportWidth : '',
            title: 'Specifies the target viewport width of the chrome page',
            placeholder: '800',
            onChange: function onChange(v) {
              var viewportWidthValue = v.target.value;

              if (viewportWidthValue.trim() === '') {
                viewportWidthValue = null;
              }

              changeChrome(_this2.props, { viewportWidth: viewportWidthValue });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'viewport height'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            value: chrome.viewportHeight != null ? chrome.viewportHeight : '',
            title: 'Specifies the target viewport height of the chrome page',
            placeholder: '600',
            onChange: function onChange(v) {
              var viewportHeightValue = v.target.value;

              if (viewportHeightValue.trim() === '') {
                viewportHeightValue = null;
              }

              changeChrome(_this2.props, { viewportHeight: viewportHeightValue });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'clip X'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            value: chrome.clipX != null ? chrome.clipX : '',
            title: 'Specifies the x-coordinate of top-left corner of clipping region of the page',
            onChange: function onChange(v) {
              var clipXValue = v.target.value;

              if (clipXValue.trim() === '') {
                clipXValue = null;
              }

              changeChrome(_this2.props, { clipX: clipXValue });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'clip Y'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            value: chrome.clipY != null ? chrome.clipY : '',
            title: 'Specifies the y-coordinate of top-left corner of clipping region of the page',
            onChange: function onChange(v) {
              var clipYValue = v.target.value;

              if (clipYValue.trim() === '') {
                clipYValue = null;
              }

              changeChrome(_this2.props, { clipY: clipYValue });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'clip width'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            value: chrome.clipWidth != null ? chrome.clipWidth : '',
            title: 'Specifies the width of clipping region of the page',
            onChange: function onChange(v) {
              var clipWidthValue = v.target.value;

              if (clipWidthValue.trim() === '') {
                clipWidthValue = null;
              }

              changeChrome(_this2.props, { clipWidth: clipWidthValue });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'clip height'
          ),
          _react2.default.createElement('input', {
            type: 'text', value: chrome.clipHeight != null ? chrome.clipHeight : '',
            title: 'Specifies the height of clipping region of the page',
            onChange: function onChange(v) {
              var clipHeightValue = v.target.value;

              if (clipHeightValue.trim() === '') {
                clipHeightValue = null;
              }

              changeChrome(_this2.props, { clipHeight: clipHeightValue });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'omit background'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', checked: chrome.omitBackground === true,
            title: 'Specifies if the background should be hidden, therefore allowing capturing screenshots with transparency',
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { omitBackground: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'media type'
          ),
          _react2.default.createElement(
            'select',
            { value: chrome.mediaType || 'print', onChange: function onChange(v) {
                return changeChrome(_this2.props, { mediaType: v.target.value });
              } },
            _react2.default.createElement(
              'option',
              { key: 'print', value: 'print' },
              'print'
            ),
            _react2.default.createElement(
              'option',
              { key: 'screen', value: 'screen' },
              'screen'
            )
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'wait for network idle'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', checked: chrome.waitForNetworkIdle === true,
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { waitForNetworkIdle: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            { title: 'window.JSREPORT_READY_TO_START=true;' },
            'wait for printing trigger'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', title: 'window.JSREPORT_READY_TO_START=true;', checked: chrome.waitForJS === true,
            onChange: function onChange(v) {
              return changeChrome(_this2.props, { waitForJS: v.target.checked });
            }
          })
        )
      );
    }
  }]);

  return ImageProperties;
}(_react.Component);

exports.default = ImageProperties;

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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ChromeEditor = function (_Component) {
  _inherits(ChromeEditor, _Component);

  function ChromeEditor() {
    _classCallCheck(this, ChromeEditor);

    return _possibleConstructorReturn(this, (ChromeEditor.__proto__ || Object.getPrototypeOf(ChromeEditor)).apply(this, arguments));
  }

  _createClass(ChromeEditor, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          entity = _props.entity,
          _onUpdate = _props.onUpdate,
          tab = _props.tab;


      return _react2.default.createElement(_jsreportStudio.TextEditor, {
        name: entity._id + '_chrome' + tab.headerOrFooter,
        mode: 'handlebars',
        value: entity.chrome ? entity.chrome[tab.headerOrFooter + 'Template'] : '',
        onUpdate: function onUpdate(v) {
          return _onUpdate(Object.assign({}, entity, { chrome: Object.assign({}, entity.chrome, _defineProperty({}, tab.headerOrFooter + 'Template', v)) }));
        }
      });
    }
  }]);

  return ChromeEditor;
}(_react.Component);

exports.default = ChromeEditor;

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (props) {
  return _react2.default.createElement(
    'span',
    null,
    props.entity.name + ' ' + props.tab.headerOrFooter + (props.entity.__isDirty ? '*' : '')
  );
};

/***/ })
/******/ ]);