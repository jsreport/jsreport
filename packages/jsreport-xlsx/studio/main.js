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


var _XlsxTemplateProperties = __webpack_require__(2);

var _XlsxTemplateProperties2 = _interopRequireDefault(_XlsxTemplateProperties);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addPropertiesComponent(_XlsxTemplateProperties2.default.title, _XlsxTemplateProperties2.default, function (entity) {
  return entity.__entitySet === 'templates' && entity.recipe === 'xlsx';
});

_jsreportStudio2.default.entityEditorComponentKeyResolvers.push(function (entity) {
  if (entity.__entitySet === 'templates' && entity.recipe === 'xlsx') {
    var officeAsset = void 0;

    if (entity.xlsx != null && entity.xlsx.templateAssetShortid != null) {
      officeAsset = _jsreportStudio2.default.getEntityByShortid(entity.xlsx.templateAssetShortid, false);
    }

    var initialCodeActive = true;

    if (officeAsset != null && (entity.content == null || entity.content === '')) {
      initialCodeActive = false;
    }

    return {
      key: 'assets',
      entity: officeAsset,
      props: {
        icon: 'fa-link',
        embeddingCode: '',
        initialCodeActive: initialCodeActive,
        codeEntity: {
          _id: entity._id,
          shortid: entity.shortid,
          name: entity.name,
          content: entity.content,
          helpers: entity.helpers
        },
        displayName: 'xlsx asset: ' + (officeAsset != null ? officeAsset.name : '<none>'),
        emptyMessage: 'No xlsx asset assigned, please add a reference to a xlsx asset in the properties'
      }
    };
  }
});

_jsreportStudio2.default.runListeners.push(function (request, entities) {
  if (request.template.recipe !== 'xlsx') {
    return;
  }

  if (_jsreportStudio2.default.extensions.xlsx.options.preview.enabled === false) {
    return;
  }

  if (_jsreportStudio2.default.extensions.xlsx.options.preview.showWarning === false) {
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
      'We need to upload your office report to our publicly hosted server to be able to use Excel Online Service for previewing here in the studio. You can disable it in the configuration, see ',
      React.createElement(
        'a',
        { href: 'https://jsreport.net/learn/xlsx', rel: 'noopener noreferrer', target: '_blank' },
        'https://jsreport.net/learn/xlsx'
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

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EntityRefSelect = _jsreportStudio2.default.EntityRefSelect;
var sharedComponents = _jsreportStudio2.default.sharedComponents;

var XlsxTemplateProperties = function (_Component) {
  _inherits(XlsxTemplateProperties, _Component);

  function XlsxTemplateProperties() {
    _classCallCheck(this, XlsxTemplateProperties);

    return _possibleConstructorReturn(this, (XlsxTemplateProperties.__proto__ || Object.getPrototypeOf(XlsxTemplateProperties)).apply(this, arguments));
  }

  _createClass(XlsxTemplateProperties, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.removeInvalidXlsxTemplateReferences();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      this.removeInvalidXlsxTemplateReferences();
    }
  }, {
    key: 'removeInvalidXlsxTemplateReferences',
    value: function removeInvalidXlsxTemplateReferences() {
      var _props = this.props,
          entity = _props.entity,
          entities = _props.entities,
          onChange = _props.onChange;


      if (!entity.xlsx) {
        return;
      }

      var updatedXlsxAssets = Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'assets' && entity.xlsx != null && entities[k].shortid === entity.xlsx.templateAssetShortid;
      });

      if (entity.xlsx && entity.xlsx.templateAssetShortid && updatedXlsxAssets.length === 0) {
        onChange({ _id: entity._id, xlsx: null });
      }
    }
  }, {
    key: 'changeXlsxTemplate',
    value: function changeXlsxTemplate(oldXlsxTemplate, prop, value) {
      var newValue = void 0;

      if (value == null) {
        newValue = _extends({}, oldXlsxTemplate);
        newValue[prop] = null;
      } else {
        return _extends({}, oldXlsxTemplate, _defineProperty({}, prop, value));
      }

      newValue = Object.keys(newValue).length ? newValue : null;

      return newValue;
    }
  }, {
    key: 'render',
    value: function render() {
      var _props2 = this.props,
          entity = _props2.entity,
          _onChange = _props2.onChange;


      return _react2.default.createElement(
        'div',
        { className: 'properties-section' },
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(EntityRefSelect, {
            headingLabel: 'Select xlsx template',
            newLabel: 'New xlsx asset for template',
            value: entity.xlsx ? entity.xlsx.templateAssetShortid : '',
            onChange: function onChange(selected) {
              return _onChange({
                _id: entity._id,
                xlsx: selected != null && selected.length > 0 ? { templateAssetShortid: selected[0].shortid } : null
              });
            },
            filter: function filter(references) {
              return { assets: references.assets };
            },
            renderNew: function renderNew(modalProps) {
              return _react2.default.createElement(sharedComponents.NewAssetModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { defaults: { folder: entity.folder }, activateNewTab: false }) }));
            }
          })
        )
      );
    }
  }], [{
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
      if (!entity.xlsx || !entity.xlsx.templateAssetShortid) {
        return 'xlsx';
      }

      var foundAssets = XlsxTemplateProperties.selectAssets(entities).filter(function (e) {
        return entity.xlsx != null && entity.xlsx.templateAssetShortid === e.shortid;
      });

      if (!foundAssets.length) {
        return 'xlsx';
      }

      var name = foundAssets[0].name;

      return 'xlsx asset: ' + name;
    }
  }]);

  return XlsxTemplateProperties;
}(_react.Component);

exports.default = XlsxTemplateProperties;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react'];

/***/ })
/******/ ]);