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


var _PptxProperties = __webpack_require__(2);

var _PptxProperties2 = _interopRequireDefault(_PptxProperties);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addPropertiesComponent(_PptxProperties2.default.title, _PptxProperties2.default, function (entity) {
  return entity.__entitySet === 'templates' && entity.recipe === 'pptx';
});

_jsreportStudio2.default.entityEditorComponentKeyResolvers.push(function (entity) {
  if (entity.__entitySet === 'templates' && entity.recipe === 'pptx') {
    var officeAsset = void 0;

    if (entity.pptx != null && entity.pptx.templateAssetShortid != null) {
      officeAsset = _jsreportStudio2.default.getEntityByShortid(entity.pptx.templateAssetShortid, false);
    }

    return {
      key: 'assets',
      entity: officeAsset,
      props: {
        icon: 'fa-link',
        embeddingCode: '',
        codeEntity: {
          _id: entity._id,
          shortid: entity.shortid,
          name: entity.name,
          helpers: entity.helpers
        },
        displayName: 'pptx asset: ' + (officeAsset != null ? officeAsset.name : '<none>'),
        emptyMessage: 'No pptx asset assigned, please add a reference to a pptx asset in the properties'
      }
    };
  }
});

_jsreportStudio2.default.runListeners.push(function (request, entities) {
  if (request.template.recipe !== 'pptx') {
    return;
  }

  if (_jsreportStudio2.default.extensions.pptx.options.preview.enabled === false) {
    return;
  }

  if (_jsreportStudio2.default.extensions.pptx.options.preview.showWarning === false) {
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
      'We need to upload your pptx report to our publicly hosted server to be able to use Office Online Service for previewing here in the studio. You can disable it in the configuration, see ',
      React.createElement(
        'a',
        { href: 'https://jsreport.net/learn/pptx', target: '_blank', rel: 'noreferrer' },
        'https://jsreport.net/learn/pptx'
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

var PptxProperties = function (_Component) {
  _inherits(PptxProperties, _Component);

  function PptxProperties() {
    _classCallCheck(this, PptxProperties);

    return _possibleConstructorReturn(this, (PptxProperties.__proto__ || Object.getPrototypeOf(PptxProperties)).apply(this, arguments));
  }

  _createClass(PptxProperties, [{
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
    key: 'removeInvalidReferences',
    value: function removeInvalidReferences() {
      var _props = this.props,
          entity = _props.entity,
          entities = _props.entities,
          onChange = _props.onChange;


      if (!entity.pptx) {
        return;
      }

      var updatedAssetItems = Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'assets' && entities[k].shortid === entity.pptx.templateAssetShortid;
      });

      if (updatedAssetItems.length === 0) {
        onChange({ _id: entity._id, pptx: null });
      }
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
            headingLabel: 'Select pptx template',
            newLabel: 'New pptx asset for template',
            value: entity.pptx ? entity.pptx.templateAssetShortid : '',
            onChange: function onChange(selected) {
              return _onChange({ _id: entity._id, pptx: selected.length > 0 ? { templateAssetShortid: selected[0].shortid } : null });
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
      if (!entity.pptx || !entity.pptx.templateAssetShortid) {
        return 'pptx';
      }

      var foundItems = PptxProperties.selectAssets(entities).filter(function (e) {
        return entity.pptx.templateAssetShortid === e.shortid;
      });

      if (!foundItems.length) {
        return 'pptx';
      }

      return 'pptx asset: ' + foundItems[0].name;
    }
  }]);

  return PptxProperties;
}(_react.Component);

exports.default = PptxProperties;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react'];

/***/ })
/******/ ]);