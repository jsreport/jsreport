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
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _ElectronPdfProperties = __webpack_require__(1);

var _ElectronPdfProperties2 = _interopRequireDefault(_ElectronPdfProperties);

var _jsreportStudio = __webpack_require__(3);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addPropertiesComponent('electron-pdf', _ElectronPdfProperties2.default, function (entity) {
  return entity.__entitySet === 'templates' && entity.recipe === 'electron-pdf';
});

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(2);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ElectronPdfProperties = function (_Component) {
  _inherits(ElectronPdfProperties, _Component);

  function ElectronPdfProperties(props) {
    _classCallCheck(this, ElectronPdfProperties);

    var _this = _possibleConstructorReturn(this, (ElectronPdfProperties.__proto__ || Object.getPrototypeOf(ElectronPdfProperties)).call(this, props));

    _this.state = {
      customPaperFormat: false,
      paperWidth: null,
      paperHeight: null
    };
    return _this;
  }

  _createClass(ElectronPdfProperties, [{
    key: 'getStandardFormats',
    value: function getStandardFormats() {
      return [{
        name: 'A4',
        value: 'A4'
      }, {
        name: 'A3',
        value: 'A3'
      }, {
        name: 'Legal',
        value: 'Legal'
      }, {
        name: 'Letter',
        value: 'Letter'
      }, {
        name: 'Tabloid',
        value: 'Tabloid'
      }];
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.normalizeUIState(this.props.entity);
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(prevProps) {
      // when component changes because another entity is selected
      // or when saving a new entity
      if (prevProps.entity._id !== this.props.entity._id) {
        this.normalizeUIState(this.props.entity);
      }
    }
  }, {
    key: 'changeCustomPaperSize',
    value: function changeCustomPaperSize(_ref) {
      var width = _ref.width,
          height = _ref.height,
          customPaperFormat = _ref.customPaperFormat;
      var _state = this.state,
          paperWidth = _state.paperWidth,
          paperHeight = _state.paperHeight;
      var _props = this.props,
          entity = _props.entity,
          onChange = _props.onChange;

      var stateToSet = {};
      var paperSize = {};

      if (customPaperFormat === false) {
        stateToSet.customPaperFormat = customPaperFormat;
        stateToSet.paperWidth = null;
        stateToSet.paperHeight = null;

        onChange(_extends({}, entity, { electron: _extends({}, entity.electron, { format: 'A4' }) }));
      } else {
        if (customPaperFormat != null) {
          stateToSet.customPaperFormat = customPaperFormat;
        }

        if (width != null) {
          if (!isNaN(parseInt(width, 10))) {
            paperSize.width = parseInt(width, 10);
          } else {
            paperSize.width = null;
          }
        } else {
          paperSize.width = paperWidth;
        }

        if (height != null) {
          if (!isNaN(parseInt(height, 10))) {
            paperSize.height = parseInt(height, 10);
          } else {
            paperSize.height = null;
          }
        } else {
          paperSize.height = paperHeight;
        }

        stateToSet.paperWidth = paperSize.width;
        stateToSet.paperHeight = paperSize.height;

        if (paperSize.width != null || paperSize.height != null) {
          onChange(_extends({}, entity, { electron: _extends({}, entity.electron, { format: JSON.stringify(paperSize) }) }));
        } else {
          onChange(_extends({}, entity, { electron: _extends({}, entity.electron, { format: null }) }));
        }
      }

      if (Object.keys(stateToSet).length > 0) {
        this.setState(stateToSet);
      }
    }
  }, {
    key: 'normalizeUIState',
    value: function normalizeUIState(entity) {
      var stateToSet = {};

      if (entity.__isNew) {
        stateToSet.customPaperFormat = false;
        stateToSet.paperWidth = null;
        stateToSet.paperHeight = null;
      } else {
        stateToSet.customPaperFormat = false;
        stateToSet.paperWidth = null;
        stateToSet.paperHeight = null;

        if (entity.electron && entity.electron.format) {
          var standardFormats = this.getStandardFormats().map(function (format) {
            return format.value;
          });
          var customFormat = void 0;

          if (standardFormats.indexOf(entity.electron.format) === -1) {
            try {
              customFormat = JSON.parse(entity.electron.format);
            } catch (e) {}

            if (customFormat) {
              stateToSet.customPaperFormat = true;

              if (customFormat.width != null) {
                stateToSet.paperWidth = customFormat.width;
              }

              if (customFormat.height != null) {
                stateToSet.paperHeight = customFormat.height;
              }
            }
          }
        }
      }

      if (Object.keys(stateToSet).length > 0) {
        this.setState(stateToSet);
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _state2 = this.state,
          customPaperFormat = _state2.customPaperFormat,
          paperWidth = _state2.paperWidth,
          paperHeight = _state2.paperHeight;
      var _props2 = this.props,
          entity = _props2.entity,
          onChange = _props2.onChange;

      var electron = entity.electron || {};

      var change = function change(_change) {
        return onChange(_extends({}, entity, { electron: _extends({}, entity.electron, _change) }));
      };

      return _react2.default.createElement(
        'div',
        { className: 'properties-section' },
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Margin type'
          ),
          _react2.default.createElement(
            'select',
            { value: electron.marginsType || 0, onChange: function onChange(v) {
                return change({ marginsType: parseInt(v.target.value) });
              } },
            _react2.default.createElement(
              'option',
              { key: '0', value: '0' },
              'Default'
            ),
            _react2.default.createElement(
              'option',
              { key: '1', value: '1' },
              'None'
            ),
            _react2.default.createElement(
              'option',
              { key: '2', value: '2' },
              'Minimum'
            )
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Paper format'
          ),
          _react2.default.createElement(
            'label',
            null,
            _react2.default.createElement('input', {
              type: 'checkbox', checked: customPaperFormat === true,
              onChange: function onChange(v) {
                return _this2.changeCustomPaperSize({ customPaperFormat: v.target.checked });
              }
            }),
            'Use custom format'
          ),
          customPaperFormat && _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(
              'label',
              { style: { display: 'block' } },
              'Paper width ',
              _react2.default.createElement(
                'a',
                { href: 'https://en.wikipedia.org/wiki/Micrometre', target: '_blank', rel: 'noreferrer' },
                '(in microns)'
              )
            ),
            _react2.default.createElement('input', {
              style: { display: 'block', width: '100%' },
              type: 'text', placeholder: '148000', value: paperWidth,
              onChange: function onChange(v) {
                return _this2.changeCustomPaperSize({ width: v.target.value });
              }
            })
          ),
          customPaperFormat && _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(
              'label',
              { style: { display: 'block' } },
              'Paper height ',
              _react2.default.createElement(
                'a',
                { href: 'https://en.wikipedia.org/wiki/Micrometre', target: '_blank', rel: 'noreferrer' },
                '(in microns)'
              )
            ),
            _react2.default.createElement('input', {
              style: { display: 'block', width: '100%' },
              type: 'text', placeholder: '210000', value: paperHeight,
              onChange: function onChange(v) {
                return _this2.changeCustomPaperSize({ height: v.target.value });
              }
            })
          ),
          customPaperFormat && _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(
              'span',
              null,
              _react2.default.createElement(
                'i',
                null,
                _react2.default.createElement(
                  'a',
                  { href: 'http://www.papersizes.org/a-sizes-all-units.htm', target: '_blank', rel: 'noreferrer' },
                  'See this for common paper sizes in microns'
                )
              )
            )
          ),
          !customPaperFormat && _react2.default.createElement(
            'select',
            { value: electron.format || '', onChange: function onChange(v) {
                return change({ format: v.target.value });
              } },
            this.getStandardFormats().map(function (paperFormat) {
              return _react2.default.createElement(
                'option',
                { key: paperFormat.name, value: paperFormat.value },
                paperFormat.name
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
            'Web Page width'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '600', value: electron.width || '',
            onChange: function onChange(v) {
              return change({ width: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Web Page height'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '600', value: electron.height || '',
            onChange: function onChange(v) {
              return change({ height: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Orientation'
          ),
          _react2.default.createElement(
            'select',
            { value: electron.landscape + '', onChange: function onChange(v) {
                return change({ landscape: v.target.value === 'true' });
              } },
            _react2.default.createElement(
              'option',
              { key: 'false', value: 'false' },
              'Portrait'
            ),
            _react2.default.createElement(
              'option',
              { key: 'true', value: 'true' },
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
            'Print background'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', checked: electron.printBackground === true,
            onChange: function onChange(v) {
              return change({ printBackground: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Print delay'
          ),
          _react2.default.createElement('input', {
            type: 'text', placeholder: '800', value: electron.printDelay || '',
            onChange: function onChange(v) {
              return change({ printDelay: v.target.value });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            { title: 'window.JSREPORT_READY_TO_START=true;' },
            'Wait for printing trigger'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', title: 'window.JSREPORT_READY_TO_START=true;', checked: electron.waitForJS === true,
            onChange: function onChange(v) {
              return change({ waitForJS: v.target.checked });
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Block javascript'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', checked: electron.blockJavaScript === true,
            onChange: function onChange(v) {
              return change({ blockJavaScript: v.target.checked });
            }
          })
        )
      );
    }
  }]);

  return ElectronPdfProperties;
}(_react.Component);

exports.default = ElectronPdfProperties;

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react'];

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = Studio;

/***/ })
/******/ ]);