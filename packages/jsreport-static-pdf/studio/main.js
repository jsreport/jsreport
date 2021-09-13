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


var _StaticPdfTemplateProperties = __webpack_require__(2);

var _StaticPdfTemplateProperties2 = _interopRequireDefault(_StaticPdfTemplateProperties);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addPropertiesComponent(_StaticPdfTemplateProperties2.default.title, _StaticPdfTemplateProperties2.default, function (entity) {
  return entity.__entitySet === 'templates' && entity.recipe === 'static-pdf';
});

_jsreportStudio2.default.entityEditorComponentKeyResolvers.push(function (entity) {
  if (entity.__entitySet === 'templates' && entity.recipe === 'static-pdf') {
    var pdfAsset = void 0;

    if (entity.staticPdf != null && entity.staticPdf.pdfAssetShortid != null) {
      pdfAsset = _jsreportStudio2.default.getEntityByShortid(entity.staticPdf.pdfAssetShortid, false);
    }

    return {
      key: 'assets',
      entity: pdfAsset,
      props: {
        icon: 'fa-link',
        embeddingCode: '',
        displayName: 'pdf asset: ' + (pdfAsset != null ? pdfAsset.name : '<none>'),
        emptyMessage: 'No pdf asset assigned, please add a reference to a pdf asset in the properties'
      }
    };
  }
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

var StaticPdfTemplateProperties = function (_Component) {
  _inherits(StaticPdfTemplateProperties, _Component);

  function StaticPdfTemplateProperties() {
    _classCallCheck(this, StaticPdfTemplateProperties);

    return _possibleConstructorReturn(this, (StaticPdfTemplateProperties.__proto__ || Object.getPrototypeOf(StaticPdfTemplateProperties)).apply(this, arguments));
  }

  _createClass(StaticPdfTemplateProperties, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.removeInvalidReferences();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      this.removeInvalidReferences();
    }
  }, {
    key: 'changeStaticPdf',
    value: function changeStaticPdf(props, change) {
      var entity = props.entity,
          onChange = props.onChange;

      var staticPdf = entity.staticPdf || {};

      onChange(_extends({}, entity, {
        staticPdf: _extends({}, staticPdf, change)
      }));
    }
  }, {
    key: 'removeInvalidReferences',
    value: function removeInvalidReferences() {
      var _props = this.props,
          entity = _props.entity,
          entities = _props.entities,
          onChange = _props.onChange;


      if (!entity.staticPdf) {
        return;
      }

      var updatedAssetItems = Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'assets' && entities[k].shortid === entity.staticPdf.pdfAssetShortid;
      });

      if (updatedAssetItems.length === 0 && entity.staticPdf.pdfAssetShortid) {
        onChange({
          _id: entity._id,
          staticPdf: _extends({}, entity.staticPdf, {
            pdfAssetShortid: null
          })
        });
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var entity = this.props.entity;

      var staticPdf = entity.staticPdf || {};
      var changeStaticPdf = this.changeStaticPdf;

      return _react2.default.createElement(
        'div',
        { className: 'properties-section' },
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Select PDF asset'
          ),
          _react2.default.createElement(EntityRefSelect, {
            headingLabel: 'Select PDF asset',
            newLabel: 'New PDF asset for template',
            value: staticPdf.pdfAssetShortid || '',
            onChange: function onChange(selected) {
              return changeStaticPdf(_this2.props, { pdfAssetShortid: selected.length > 0 ? selected[0].shortid : null });
            },
            filter: function filter(references) {
              return { data: references.assets };
            },
            renderNew: function renderNew(modalProps) {
              return _react2.default.createElement(sharedComponents.NewAssetModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { defaults: { folder: entity.folder }, activateNewTab: false }) }));
            }
          })
        )
      );
    }
  }], [{
    key: 'title',
    value: function title(entity, entities) {
      if (!entity.staticPdf || !entity.staticPdf.pdfAssetShortid) {
        return 'static pdf';
      }

      var foundItems = StaticPdfTemplateProperties.selectAssets(entities).filter(function (e) {
        return entity.staticPdf.pdfAssetShortid === e.shortid;
      });

      if (!foundItems.length) {
        return 'static pdf';
      }

      return 'static pdf: ' + foundItems[0].name;
    }
  }, {
    key: 'selectAssets',
    value: function selectAssets(entities) {
      return Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'assets';
      }).map(function (k) {
        return entities[k];
      });
    }
  }]);

  return StaticPdfTemplateProperties;
}(_react.Component);

exports.default = StaticPdfTemplateProperties;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react'];

/***/ })
/******/ ]);