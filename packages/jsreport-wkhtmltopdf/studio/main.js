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

module.exports = Studio;

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react'];

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var WK_TAB_TITLE = exports.WK_TAB_TITLE = 'WK_TAB_TITLE';
var WK_TAB_EDITOR = exports.WK_TAB_EDITOR = 'WK_TAB_EDITOR';

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _WKEditor = __webpack_require__(4);

var _WKEditor2 = _interopRequireDefault(_WKEditor);

var _WKProperties = __webpack_require__(5);

var _WKProperties2 = _interopRequireDefault(_WKProperties);

var _WKTitle = __webpack_require__(6);

var _WKTitle2 = _interopRequireDefault(_WKTitle);

var _constants = __webpack_require__(2);

var Constants = _interopRequireWildcard(_constants);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

_jsreportStudio2.default.addPropertiesComponent('wkhtmltopdf', _WKProperties2.default, function (entity) {
  return entity.__entitySet === 'templates' && entity.recipe === 'wkhtmltopdf';
});

var reformat = function reformat(reformatter, entity, tab) {
  var reformated = reformatter(entity.wkhtmltopdf[tab.headerOrFooter], 'html');

  return {
    wkhtmltopdf: _defineProperty({}, tab.headerOrFooter, reformated)
  };
};

_jsreportStudio2.default.addEditorComponent(Constants.WK_TAB_EDITOR, _WKEditor2.default, reformat);
_jsreportStudio2.default.addTabTitleComponent(Constants.WK_TAB_TITLE, _WKTitle2.default);

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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WKEditor = function (_Component) {
  _inherits(WKEditor, _Component);

  function WKEditor() {
    _classCallCheck(this, WKEditor);

    return _possibleConstructorReturn(this, (WKEditor.__proto__ || Object.getPrototypeOf(WKEditor)).apply(this, arguments));
  }

  _createClass(WKEditor, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          entity = _props.entity,
          _onUpdate = _props.onUpdate,
          tab = _props.tab;


      return _react2.default.createElement(_jsreportStudio.TextEditor, {
        name: entity._id + '_wk' + tab.headerOrFooter,
        mode: 'handlebars',
        value: entity.wkhtmltopdf ? entity.wkhtmltopdf[tab.headerOrFooter] : '',
        onUpdate: function onUpdate(v) {
          return _onUpdate(Object.assign({}, entity, { wkhtmltopdf: Object.assign({}, entity.wkhtmltopdf, _defineProperty({}, tab.headerOrFooter, v)) }));
        }
      });
    }
  }]);

  return WKEditor;
}(_react.Component);

exports.default = WKEditor;

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _constants = __webpack_require__(2);

var Constants = _interopRequireWildcard(_constants);

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Properties = function (_Component) {
  _inherits(Properties, _Component);

  function Properties() {
    _classCallCheck(this, Properties);

    return _possibleConstructorReturn(this, (Properties.__proto__ || Object.getPrototypeOf(Properties)).apply(this, arguments));
  }

  _createClass(Properties, [{
    key: 'openHeaderFooter',
    value: function openHeaderFooter(type) {
      _jsreportStudio2.default.openTab({
        key: this.props.entity._id + '_wk' + type,
        _id: this.props.entity._id,
        headerOrFooter: type,
        editorComponentKey: Constants.WK_TAB_EDITOR,
        titleComponentKey: Constants.WK_TAB_TITLE
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          entity = _props.entity,
          onChange = _props.onChange;

      var wkhtmltopdf = entity.wkhtmltopdf || {};

      var changeWK = function changeWK(change) {
        return onChange(Object.assign({}, entity, { wkhtmltopdf: Object.assign({}, entity.wkhtmltopdf, change) }));
      };

      var wkhtmltopdfVersions = _jsreportStudio2.default.extensions.wkhtmltopdf.options.wkhtmltopdfVersions;

      return _react2.default.createElement(
        'div',
        { className: 'properties-section' },
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'wkhtmltopdf version'
          ),
          _react2.default.createElement(
            'select',
            { value: wkhtmltopdf.wkhtmltopdfVersion || wkhtmltopdfVersions[0].version, onChange: function onChange(v) {
                return changeWK({ wkhtmltopdfVersion: v.target.value });
              } },
            wkhtmltopdfVersions.map(function (p) {
              return _react2.default.createElement(
                'option',
                { key: p.version, value: p.version },
                p.version
              );
            })
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Metadata - title'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: 'document title', value: wkhtmltopdf.title || '',
            onChange: function onChange(v) {
              return changeWK({ title: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Paper size'
          ),
          _react2.default.createElement(
            'select',
            { value: wkhtmltopdf.pageSize || '', onChange: function onChange(v) {
                return changeWK({ pageSize: v.target.value });
              } },
            _react2.default.createElement(
              'option',
              { key: 'A4', value: 'A4' },
              'A4'
            ),
            _react2.default.createElement(
              'option',
              { key: 'A3', value: 'A3' },
              'A3'
            ),
            _react2.default.createElement(
              'option',
              { key: 'A5', value: 'A5' },
              'A5'
            ),
            _react2.default.createElement(
              'option',
              { key: 'Legal', value: 'Legal' },
              'Legal'
            ),
            _react2.default.createElement(
              'option',
              { key: 'Letter', value: 'Letter' },
              'Letter'
            ),
            _react2.default.createElement(
              'option',
              { key: 'Tabloid', value: 'Tabloid' },
              'Tabloid'
            )
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Page width'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '600px', value: wkhtmltopdf.pageWidth || '',
            onChange: function onChange(v) {
              return changeWK({ pageWidth: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Page height'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '600px', value: wkhtmltopdf.pageHeight || '',
            onChange: function onChange(v) {
              return changeWK({ pageHeight: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { key: 'foo', className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Orientation'
          ),
          _react2.default.createElement(
            'select',
            { value: wkhtmltopdf.orientation || '', onChange: function onChange(v) {
                return changeWK({ orientation: v.target.value });
              } },
            _react2.default.createElement(
              'option',
              { key: 'portrait', value: 'portrait' },
              'Portrait'
            ),
            _react2.default.createElement(
              'option',
              { key: 'landscape', value: 'landscape' },
              'Landscape'
            )
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Dpi'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '96', value: wkhtmltopdf.dpi || '',
            onChange: function onChange(v) {
              return changeWK({ dpi: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Margin bottom'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '10mm', value: wkhtmltopdf.marginBottom || '',
            onChange: function onChange(v) {
              return changeWK({ marginBottom: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Margin left'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '10mm', value: wkhtmltopdf.marginLeft || '',
            onChange: function onChange(v) {
              return changeWK({ marginLeft: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Margin right'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '10mm', value: wkhtmltopdf.marginRight || '',
            onChange: function onChange(v) {
              return changeWK({ marginRight: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Margin top'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '10mm', value: wkhtmltopdf.marginTop || '',
            onChange: function onChange(v) {
              return changeWK({ marginTop: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Header height in mm'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '10', value: wkhtmltopdf.headerHeight || '',
            onChange: function onChange(v) {
              return changeWK({ headerHeight: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Header'
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
            'Footer height in mm'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '10', value: wkhtmltopdf.footerHeight || '',
            onChange: function onChange(v) {
              return changeWK({ footerHeight: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Footer'
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
            'Cover Page'
          ),
          _react2.default.createElement(
            'button',
            { onClick: function onClick() {
                return _this2.openHeaderFooter('cover');
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
            'Table of contents'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', checked: wkhtmltopdf.toc === true,
            onChange: function onChange(v) {
              return changeWK({ toc: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'TOC header text'
          ),
          _react2.default.createElement('input', {
            type: 'text', value: wkhtmltopdf.tocHeaderText || '',
            onChange: function onChange(v) {
              return changeWK({ tocHeaderText: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'TOC text size shrink'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '10mm', value: wkhtmltopdf.tocTextSizeShrink || '',
            onChange: function onChange(v) {
              return changeWK({ tocTextSizeShrink: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'TOC level indentation'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '10mm', value: wkhtmltopdf.tocLevelIndentation || '',
            onChange: function onChange(v) {
              return changeWK({ tocLevelIndentation: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Keep relative links'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', checked: wkhtmltopdf.keepRelativeLinks === true,
            onChange: function onChange(v) {
              return changeWK({ keepRelativeLinks: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Disable smart shrinking'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', checked: wkhtmltopdf.disableSmartShrinking === true,
            onChange: function onChange(v) {
              return changeWK({ disableSmartShrinking: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Print media type'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', checked: wkhtmltopdf.printMediaType === true,
            onChange: function onChange(v) {
              return changeWK({ printMediaType: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Javascript Delay'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '200', value: wkhtmltopdf.javascriptDelay || '',
            onChange: function onChange(v) {
              return changeWK({ javascriptDelay: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Window Status'
          ),
          _react2.default.createElement('input', {
            type: 'text', value: wkhtmltopdf.windowStatus || '',
            onChange: function onChange(v) {
              return changeWK({ windowStatus: v.target.value });
            }
          })
        )
      );
    }
  }]);

  return Properties;
}(_react.Component);

exports.default = Properties;

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (props) {
  return React.createElement(
    'span',
    null,
    props.entity.name + ' ' + props.tab.headerOrFooter
  );
};

/***/ })
/******/ ]);