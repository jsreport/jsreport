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


var _HtmlToXlsxProperties = __webpack_require__(2);

var _HtmlToXlsxProperties2 = _interopRequireDefault(_HtmlToXlsxProperties);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addPropertiesComponent('html to xlsx', _HtmlToXlsxProperties2.default, function (entity) {
  return entity.__entitySet === 'templates' && entity.recipe === 'html-to-xlsx';
});

_jsreportStudio2.default.runListeners.push(function (request, entities) {
  if (request.template.recipe !== 'html-to-xlsx') {
    return;
  }

  if (_jsreportStudio2.default.extensions['html-to-xlsx'].options.preview.enabled === false) {
    return;
  }

  if (_jsreportStudio2.default.extensions['html-to-xlsx'].options.preview.showWarning === false) {
    return;
  }

  if (_jsreportStudio2.default.getSettingValueByKey('office-preview-informed', false) === true) {
    return;
  }

  _jsreportStudio2.default.setSetting('office-preview-informed', true);

  _jsreportStudio2.default.openModal(function () {
    return React.createElement(
      'div',
      null,
      'We need to upload your office report to our publicly hosted server to be able to use Office Online Service for previewing here in the studio. You can disable it in the configuration, see',
      React.createElement(
        'a',
        {
          href: 'https://jsreport.net/learn/html-to-xlsx',
          target: '_blank',
          rel: 'noopener noreferrer'
        },
        'https://jsreport.net/learn/html-to-xlsx'
      ),
      ' for details.'
    );
  });
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EntityRefSelect = _jsreportStudio2.default.EntityRefSelect;
var sharedComponents = _jsreportStudio2.default.sharedComponents;

var HtmlToXlsxProperties = function (_Component) {
  _inherits(HtmlToXlsxProperties, _Component);

  _createClass(HtmlToXlsxProperties, null, [{
    key: 'selectAssets',
    value: function selectAssets(entities) {
      return Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'assets';
      }).map(function (k) {
        return entities[k];
      });
    }
  }, {
    key: 'title',
    value: function title(entity, entities) {
      if (!entity.htmlToXlsx || !entity.htmlToXlsx.templateAssetShortid) {
        return 'xlsx template';
      }

      var foundAssets = HtmlToXlsxProperties.selectAssets(entities).filter(function (e) {
        return entity.htmlToXlsx != null && entity.htmlToXlsx.templateAssetShortid === e.shortid;
      });

      if (!foundAssets.length) {
        return 'xlsx template';
      }

      var name = foundAssets[0].name;

      return 'xlsx template: ' + name;
    }
  }]);

  function HtmlToXlsxProperties(props) {
    _classCallCheck(this, HtmlToXlsxProperties);

    var _this = _possibleConstructorReturn(this, (HtmlToXlsxProperties.__proto__ || Object.getPrototypeOf(HtmlToXlsxProperties)).call(this, props));

    _this.applyDefaultsToEntity = _this.applyDefaultsToEntity.bind(_this);
    _this.changeHtmlToXlsx = _this.changeHtmlToXlsx.bind(_this);
    return _this;
  }

  _createClass(HtmlToXlsxProperties, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.applyDefaultsToEntity(this.props);
      this.removeInvalidHtmlEngine();
      this.removeInvalidXlsxTemplateReferences();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(prevProps) {
      // when component changes because another template is created
      if (prevProps.entity._id !== this.props.entity._id) {
        this.applyDefaultsToEntity(this.props);
      }

      this.removeInvalidHtmlEngine();
      this.removeInvalidXlsxTemplateReferences();
    }
  }, {
    key: 'removeInvalidXlsxTemplateReferences',
    value: function removeInvalidXlsxTemplateReferences() {
      var _props = this.props,
          entity = _props.entity,
          entities = _props.entities;


      if (!entity.htmlToXlsx) {
        return;
      }

      var updatedXlsxAssets = Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'assets' && entity.htmlToXlsx != null && entities[k].shortid === entity.htmlToXlsx.templateAssetShortid;
      });

      if (entity.htmlToXlsx && entity.htmlToXlsx.templateAssetShortid && updatedXlsxAssets.length === 0) {
        this.changeHtmlToXlsx(this.props, {
          templateAssetShortid: null
        });
      }
    }
  }, {
    key: 'removeInvalidHtmlEngine',
    value: function removeInvalidHtmlEngine() {
      var entity = this.props.entity;


      if (!entity.htmlToXlsx || !entity.htmlToXlsx.htmlEngine) {
        return;
      }

      var htmlEngines = _jsreportStudio2.default.extensions['html-to-xlsx'].options.htmlEngines;
      var isValidHtmlEngine = htmlEngines.includes(entity.htmlToXlsx.htmlEngine);

      if (!isValidHtmlEngine) {
        this.changeHtmlToXlsx(this.props, { htmlEngine: htmlEngines[0] });
      }
    }
  }, {
    key: 'applyDefaultsToEntity',
    value: function applyDefaultsToEntity(props) {
      var entity = props.entity;

      var htmlEngines = _jsreportStudio2.default.extensions['html-to-xlsx'].options.htmlEngines;
      var entityNeedsDefault = false;

      if (entity.__isNew || entity.htmlToXlsx == null || entity.htmlToXlsx.htmlEngine == null) {
        entityNeedsDefault = true;
      }

      if (htmlEngines != null && htmlEngines[0] != null && entityNeedsDefault) {
        this.changeHtmlToXlsx(props, {
          htmlEngine: htmlEngines[0]
        });
      }
    }
  }, {
    key: 'changeHtmlToXlsx',
    value: function changeHtmlToXlsx(props, change) {
      var entity = props.entity,
          onChange = props.onChange;

      var htmlToXlsx = entity.htmlToXlsx || {};

      onChange(_extends({}, entity, {
        htmlToXlsx: _extends({}, htmlToXlsx, change)
      }));
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var entity = this.props.entity;

      var htmlToXlsx = entity.htmlToXlsx || {};
      var htmlEngines = _jsreportStudio2.default.extensions['html-to-xlsx'].options.htmlEngines;

      return _react2.default.createElement(
        'div',
        { className: 'properties-section' },
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'html engine'
          ),
          _react2.default.createElement(
            'select',
            {
              value: htmlToXlsx.htmlEngine,
              onChange: function onChange(v) {
                return _this2.changeHtmlToXlsx(_this2.props, { htmlEngine: v.target.value });
              }
            },
            htmlEngines.map(function (engine) {
              return _react2.default.createElement(
                'option',
                { key: engine, value: engine },
                engine
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
            'xlsx asset'
          ),
          _react2.default.createElement(EntityRefSelect, {
            headingLabel: 'Select xlsx template',
            newLabel: 'New xlsx asset for template',
            filter: function filter(references) {
              return { data: references.assets };
            },
            value: entity.htmlToXlsx ? entity.htmlToXlsx.templateAssetShortid : null,
            onChange: function onChange(selected) {
              return _this2.changeHtmlToXlsx(_this2.props, {
                templateAssetShortid: selected != null && selected.length > 0 ? selected[0].shortid : null
              });
            },
            renderNew: function renderNew(modalProps) {
              return _react2.default.createElement(sharedComponents.NewAssetModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { defaults: { folder: entity.folder }, activateNewTab: false }) }));
            }
          })
        ),
        htmlToXlsx.htmlEngine !== 'cheerio' && _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            { title: 'window.JSREPORT_READY_TO_START=true;' },
            'wait for conversion trigger'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', title: 'window.JSREPORT_READY_TO_START=true;', checked: htmlToXlsx.waitForJS === true,
            onChange: function onChange(v) {
              return _this2.changeHtmlToXlsx(_this2.props, { waitForJS: v.target.checked });
            }
          })
        )
      );
    }
  }]);

  return HtmlToXlsxProperties;
}(_react.Component);

exports.default = HtmlToXlsxProperties;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react'];

/***/ })
/******/ ]);