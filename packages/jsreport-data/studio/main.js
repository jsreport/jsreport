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


var _DataEditor = __webpack_require__(3);

var _DataEditor2 = _interopRequireDefault(_DataEditor);

var _DataProperties = __webpack_require__(4);

var _DataProperties2 = _interopRequireDefault(_DataProperties);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addEntitySet({
  name: 'data',
  faIcon: 'fa-database',
  visibleName: 'sample data',
  helpUrl: 'http://jsreport.net/learn/inline-data',
  entityTreePosition: 900
});

_jsreportStudio2.default.addPropertiesComponent(_DataProperties2.default.title, _DataProperties2.default, function (entity) {
  return entity.__entitySet === 'templates' || entity.__entitySet === 'components';
});
_jsreportStudio2.default.addEditorComponent('data', _DataEditor2.default, function (reformatter, entity) {
  return { dataJson: reformatter(entity.dataJson, 'js') };
});

_jsreportStudio2.default.runListeners.push(function (request, entities) {
  if (!request.template.data || !request.template.data.shortid) {
    return;
  }

  // try to fill request.data from the active open tab with sample data
  var dataDetails = Object.keys(entities).map(function (e) {
    return entities[e];
  }).filter(function (d) {
    return d.shortid === request.template.data.shortid && d.__entitySet === 'data' && (d.__isLoaded || d.__isDirty || d.__isNew);
  });

  if (!dataDetails.length) {
    return;
  }

  request.data = dataDetails[0].dataJson || JSON.stringify({});
});

_jsreportStudio2.default.entityNewListeners.push(function (entity) {
  if (entity.__entitySet === 'data' && entity.dataJson == null) {
    entity.dataJson = '{}';
  }
});

_jsreportStudio2.default.entitySaveListeners.push(function (entity) {
  if (entity.__entitySet === 'data' && entity.dataJson != null) {
    try {
      JSON.parse(entity.dataJson);
    } catch (e) {
      e.message = 'Error validating new data entity, Invalid JSON input. ' + e.message;
      throw e;
    }
  }
});

/***/ }),
/* 3 */
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

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DataEditor = function (_Component) {
  _inherits(DataEditor, _Component);

  function DataEditor() {
    _classCallCheck(this, DataEditor);

    return _possibleConstructorReturn(this, (DataEditor.__proto__ || Object.getPrototypeOf(DataEditor)).apply(this, arguments));
  }

  _createClass(DataEditor, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          entity = _props.entity,
          _onUpdate = _props.onUpdate;


      return _react2.default.createElement(_jsreportStudio.TextEditor, {
        name: entity._id,
        mode: 'json',
        value: entity.dataJson || '',
        onUpdate: function onUpdate(v) {
          return _onUpdate(Object.assign({}, entity, { dataJson: v }));
        }
      });
    }
  }]);

  return DataEditor;
}(_react.Component);

exports.default = DataEditor;

/***/ }),
/* 4 */
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

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EntityRefSelect = _jsreportStudio2.default.EntityRefSelect;
var sharedComponents = _jsreportStudio2.default.sharedComponents;

function selectDataItems(entities) {
  return Object.keys(entities).filter(function (k) {
    return entities[k].__entitySet === 'data';
  }).map(function (k) {
    return entities[k];
  });
}

var Properties = function (_Component) {
  _inherits(Properties, _Component);

  function Properties() {
    _classCallCheck(this, Properties);

    return _possibleConstructorReturn(this, (Properties.__proto__ || Object.getPrototypeOf(Properties)).apply(this, arguments));
  }

  _createClass(Properties, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.removeInvalidDataReferences();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      this.removeInvalidDataReferences();
    }
  }, {
    key: 'removeInvalidDataReferences',
    value: function removeInvalidDataReferences() {
      var _props = this.props,
          entity = _props.entity,
          entities = _props.entities,
          onChange = _props.onChange;


      if (!entity.data) {
        return;
      }

      var updatedDataItems = Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'data' && entities[k].shortid === entity.data.shortid;
      });

      if (updatedDataItems.length === 0) {
        onChange({ _id: entity._id, data: null });
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
            headingLabel: 'Select data',
            newLabel: 'New data for template',
            filter: function filter(references) {
              return { data: references.data };
            },
            value: entity.data ? entity.data.shortid : null,
            onChange: function onChange(selected) {
              return _onChange({ _id: entity._id, data: selected.length > 0 ? { shortid: selected[0].shortid } : null });
            },
            renderNew: function renderNew(modalProps) {
              return _react2.default.createElement(sharedComponents.NewEntityModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { entitySet: 'data', defaults: { folder: entity.folder }, activateNewTab: false }) }));
            }
          })
        )
      );
    }
  }], [{
    key: 'title',
    value: function title(entity, entities) {
      if (!entity.data || !entity.data.shortid) {
        return 'data';
      }

      var foundItems = selectDataItems(entities).filter(function (e) {
        return entity.data.shortid === e.shortid;
      });

      if (!foundItems.length) {
        return 'data';
      }

      return 'sample data: ' + foundItems[0].name;
    }
  }]);

  return Properties;
}(_react.Component);

exports.default = Properties;

/***/ })
/******/ ]);