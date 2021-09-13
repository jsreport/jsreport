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

module.exports = Studio.libraries['react'];

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = Studio;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _ScriptEditor = __webpack_require__(3);

var _ScriptEditor2 = _interopRequireDefault(_ScriptEditor);

var _TemplateScriptProperties = __webpack_require__(4);

var _TemplateScriptProperties2 = _interopRequireDefault(_TemplateScriptProperties);

var _ScriptProperties = __webpack_require__(5);

var _ScriptProperties2 = _interopRequireDefault(_ScriptProperties);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addEntitySet({
  name: 'scripts',
  faIcon: 'fa-cog',
  visibleName: 'script',
  helpUrl: 'http://jsreport.net/learn/scripts',
  referenceAttributes: ['isGlobal'],
  entityTreePosition: 800
});

_jsreportStudio2.default.addPropertiesComponent(_TemplateScriptProperties2.default.title, _TemplateScriptProperties2.default, function (entity) {
  return entity.__entitySet === 'templates';
});
_jsreportStudio2.default.addPropertiesComponent(_ScriptProperties2.default.title, _ScriptProperties2.default, function (entity) {
  return entity.__entitySet === 'scripts';
});

_jsreportStudio2.default.addEditorComponent('scripts', _ScriptEditor2.default, function (reformatter, entity) {
  return { content: reformatter(entity.content, 'js') };
});

_jsreportStudio2.default.runListeners.push(function (request, entities) {
  if (!request.template.scripts) {
    return;
  }

  request.template.scripts = request.template.scripts.map(function (s) {
    var script = _jsreportStudio2.default.getEntityByShortid(s.shortid, false);

    if (!script) {
      return s;
    }

    return script;
  }).filter(function (s) {
    return !s.__isNew || s.content;
  });
});

_jsreportStudio2.default.entityNewListeners.push(function (entity) {
  if (entity.__entitySet === 'scripts' && entity.content == null) {
    entity.content = getDefaultScriptContent();
  }
});

_jsreportStudio2.default.entitySaveListeners.push(function (entity) {
  if (entity.__entitySet === 'scripts' && entity.content != null && entity.content.indexOf('function beforeRender') === -1 && entity.content.indexOf('function afterRender') === -1) {
    _jsreportStudio2.default.openModal(function () {
      return React.createElement(
        'div',
        null,
        'The script "',
        entity.name,
        '" doesn\'t have a function hook defined. This means the script won\'t do anything. You should define either "beforeRender" or "afterRender" function hooks.',
        React.createElement('br', null),
        'See the ',
        React.createElement(
          'a',
          { href: 'https://jsreport.net/learn/scripts' },
          'scripts docummentation'
        ),
        ' for the details.'
      );
    });
  }
});

_jsreportStudio2.default.entityTreeIconResolvers.push(function (entity) {
  return entity.__entitySet === 'scripts' && entity.isGlobal ? 'fa-cogs' : null;
});

function getDefaultScriptContent() {
  return '// Use the "beforeRender" or "afterRender" hook\n// to manipulate and control the report generation\nasync function beforeRender (req, res) {\n\n}';
}

/***/ }),
/* 3 */
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

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ScriptEditor = function (_Component) {
  _inherits(ScriptEditor, _Component);

  function ScriptEditor() {
    _classCallCheck(this, ScriptEditor);

    return _possibleConstructorReturn(this, (ScriptEditor.__proto__ || Object.getPrototypeOf(ScriptEditor)).apply(this, arguments));
  }

  _createClass(ScriptEditor, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          entity = _props.entity,
          _onUpdate = _props.onUpdate;


      return _react2.default.createElement(_jsreportStudio.TextEditor, {
        name: entity._id,
        mode: 'javascript',
        value: entity.content,
        onUpdate: function onUpdate(v) {
          return _onUpdate(Object.assign({}, entity, { content: v }));
        }
      });
    }
  }]);

  return ScriptEditor;
}(_react.Component);

exports.default = ScriptEditor;

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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EntityRefSelect = _jsreportStudio2.default.EntityRefSelect;
var sharedComponents = _jsreportStudio2.default.sharedComponents;

var TemplateScriptProperties = function (_Component) {
  _inherits(TemplateScriptProperties, _Component);

  function TemplateScriptProperties() {
    _classCallCheck(this, TemplateScriptProperties);

    return _possibleConstructorReturn(this, (TemplateScriptProperties.__proto__ || Object.getPrototypeOf(TemplateScriptProperties)).apply(this, arguments));
  }

  _createClass(TemplateScriptProperties, [{
    key: 'renderOrder',
    value: function renderOrder() {
      var scripts = TemplateScriptProperties.getSelectedScripts(this.props.entity, this.props.entities);

      return _react2.default.createElement(
        'span',
        null,
        scripts.map(function (s) {
          return _react2.default.createElement(
            'span',
            { key: s.shortid },
            s.name + ' '
          );
        })
      );
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.removeInvalidScriptReferences();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      this.removeInvalidScriptReferences();
    }
  }, {
    key: 'removeInvalidScriptReferences',
    value: function removeInvalidScriptReferences() {
      var _props = this.props,
          entity = _props.entity,
          entities = _props.entities,
          onChange = _props.onChange;


      if (!entity.scripts) {
        return;
      }

      var updatedScripts = entity.scripts.filter(function (s) {
        return Object.keys(entities).filter(function (k) {
          return entities[k].__entitySet === 'scripts' && entities[k].shortid === s.shortid;
        }).length;
      });

      if (updatedScripts.length !== entity.scripts.length) {
        onChange({ _id: entity._id, scripts: updatedScripts });
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
            headingLabel: 'Select script',
            newLabel: 'New script for template',
            filter: function filter(references) {
              var scripts = references.scripts.filter(function (e) {
                return !e.isGlobal;
              });
              return { scripts: scripts };
            },
            value: entity.scripts ? entity.scripts.map(function (s) {
              return s.shortid;
            }) : [],
            onChange: function onChange(selected) {
              return _onChange({ _id: entity._id, scripts: selected.map(function (s) {
                  return { shortid: s.shortid };
                }) });
            },
            renderNew: function renderNew(modalProps) {
              return _react2.default.createElement(sharedComponents.NewEntityModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { entitySet: 'scripts', defaults: { folder: entity.folder }, activateNewTab: false }) }));
            },
            multiple: true
          }),
          entity.scripts && entity.scripts.length ? _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(
              'span',
              null,
              'Run order:'
            ),
            this.renderOrder()
          ) : _react2.default.createElement('div', null)
        )
      );
    }
  }], [{
    key: 'getSelectedScripts',
    value: function getSelectedScripts(entity, entities) {
      var getName = function getName(s) {
        var foundScripts = Object.keys(entities).map(function (k) {
          return entities[k];
        }).filter(function (sc) {
          return sc.shortid === s.shortid;
        });

        return foundScripts.length ? foundScripts[0].name : '';
      };

      return (entity.scripts || []).map(function (s) {
        return _extends({}, s, {
          name: getName(s)
        });
      });
    }
  }, {
    key: 'title',
    value: function title(entity, entities) {
      if (!entity.scripts || !entity.scripts.length) {
        return 'scripts';
      }

      return 'scripts: ' + TemplateScriptProperties.getSelectedScripts(entity, entities).map(function (s) {
        return s.name;
      }).join(', ');
    }
  }]);

  return TemplateScriptProperties;
}(_react.Component);

exports.default = TemplateScriptProperties;

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ScriptProperties = function (_Component) {
  _inherits(ScriptProperties, _Component);

  function ScriptProperties() {
    _classCallCheck(this, ScriptProperties);

    return _possibleConstructorReturn(this, (ScriptProperties.__proto__ || Object.getPrototypeOf(ScriptProperties)).apply(this, arguments));
  }

  _createClass(ScriptProperties, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          entity = _props.entity,
          _onChange = _props.onChange;

      return _react2.default.createElement(
        'div',
        { className: 'properties-section' },
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'run every time'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', checked: entity.isGlobal === true,
            onChange: function onChange(v) {
              return _onChange({ _id: entity._id, isGlobal: v.target.checked });
            }
          })
        )
      );
    }
  }], [{
    key: 'title',
    value: function title(entity, entities) {
      return 'scripts (global: ' + (entity.isGlobal === true) + ')';
    }
  }]);

  return ScriptProperties;
}(_react.Component);

exports.default = ScriptProperties;

/***/ })
/******/ ]);