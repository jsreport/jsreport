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


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _PermissionProperties = __webpack_require__(2);

var _PermissionProperties2 = _interopRequireDefault(_PermissionProperties);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

_jsreportStudio2.default.initializeListeners.push(_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
  return regeneratorRuntime.wrap(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          if (!(!_jsreportStudio2.default.authentication || !_jsreportStudio2.default.authentication.user.isAdmin)) {
            _context.next = 2;
            break;
          }

          return _context.abrupt('return');

        case 2:

          _jsreportStudio2.default.addPropertiesComponent('permissions', _PermissionProperties2.default, function (entity) {
            return _jsreportStudio2.default.extensions.authorization.options.sharedEntitySets.indexOf(entity.__entitySet) === -1;
          });

          _jsreportStudio2.default.authentication.useEditorComponents.push(function (user) {
            return React.createElement(
              'div',
              null,
              React.createElement(
                'h2',
                null,
                'Authorization'
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'div',
                  { className: 'form-group' },
                  React.createElement(
                    'label',
                    null,
                    'Allow read all entities'
                  ),
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: user.readAllPermissions === true,
                    onChange: function onChange(v) {
                      return _jsreportStudio2.default.updateEntity(_extends({}, user, { readAllPermissions: v.target.checked }));
                    }
                  })
                ),
                React.createElement(
                  'div',
                  { className: 'form-group' },
                  React.createElement(
                    'label',
                    null,
                    'Allow edit all entities'
                  ),
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: user.editAllPermissions === true,
                    onChange: function onChange(v) {
                      return _jsreportStudio2.default.updateEntity(_extends({}, user, { editAllPermissions: v.target.checked }));
                    }
                  })
                )
              )
            );
          });

        case 4:
        case 'end':
          return _context.stop();
      }
    }
  }, _callee, undefined);
})));

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

var selectValues = function selectValues(selected) {
  return selected.map(function (e) {
    return e._id;
  });
};

var PermissionProperties = function (_Component) {
  _inherits(PermissionProperties, _Component);

  function PermissionProperties() {
    _classCallCheck(this, PermissionProperties);

    return _possibleConstructorReturn(this, (PermissionProperties.__proto__ || Object.getPrototypeOf(PermissionProperties)).apply(this, arguments));
  }

  _createClass(PermissionProperties, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.removeInvalidUserReferences();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      this.removeInvalidUserReferences();
    }
  }, {
    key: 'removeInvalidUserReferences',
    value: function removeInvalidUserReferences() {
      var _props = this.props,
          entity = _props.entity,
          onChange = _props.onChange;


      if (Array.isArray(entity.readPermissions) && entity.readPermissions.length > 0) {
        var updatedReadPermissions = entity.readPermissions.map(function (_id) {
          var currentEntity = _jsreportStudio2.default.getEntityById(_id, false);
          return currentEntity ? currentEntity._id : null;
        }).filter(function (i) {
          return i != null;
        });

        if (updatedReadPermissions.length !== entity.readPermissions.length) {
          onChange({ _id: entity._id, readPermissions: updatedReadPermissions });
        }
      }

      if (Array.isArray(entity.editPermissions) && entity.editPermissions.length > 0) {
        var updatedEditPermissions = entity.editPermissions.map(function (_id) {
          var currentEntity = _jsreportStudio2.default.getEntityById(_id, false);
          return currentEntity ? currentEntity._id : null;
        }).filter(function (i) {
          return i != null;
        });

        if (updatedEditPermissions.length !== entity.editPermissions.length) {
          onChange({ _id: entity._id, editPermissions: updatedEditPermissions });
        }
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _props2 = this.props,
          entity = _props2.entity,
          _onChange = _props2.onChange;


      if (entity.__entitySet === 'users') {
        return _react2.default.createElement('div', null);
      }

      var readPermissionsEntities = entity.readPermissions ? entity.readPermissions.map(function (_id) {
        var currentEntity = _jsreportStudio2.default.getEntityById(_id, false);
        return currentEntity != null ? currentEntity : null;
      }).filter(function (i) {
        return i != null;
      }) : [];

      var editPermissionsEntities = entity.editPermissions ? entity.editPermissions.map(function (_id) {
        var currentEntity = _jsreportStudio2.default.getEntityById(_id, false);
        return currentEntity != null ? currentEntity : null;
      }).filter(function (i) {
        return i != null;
      }) : [];

      return _react2.default.createElement(
        'div',
        { className: 'properties-section' },
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'read permissions'
          ),
          _react2.default.createElement(EntityRefSelect, {
            headingLabel: 'Select user (read permissions)',
            newLabel: 'New user (read permissions)',
            filter: function filter(references) {
              var users = references.users.filter(function (e) {
                return !e.__isNew;
              });
              return { users: users };
            },
            value: readPermissionsEntities.map(function (r) {
              return r.shortid;
            }),
            onChange: function onChange(selected) {
              return _onChange({ _id: entity._id, readPermissions: selectValues(selected) });
            },
            renderNew: function renderNew(modalProps) {
              return _react2.default.createElement(sharedComponents.NewUserModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { defaults: { folder: entity.folder } }) }));
            },
            multiple: true
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'edit permissions'
          ),
          _react2.default.createElement(EntityRefSelect, {
            headingLabel: 'Select user (edit permissions)',
            newLabel: 'New user (edit permissions)',
            filter: function filter(references) {
              var users = references.users.filter(function (e) {
                return !e.__isNew;
              });
              return { users: users };
            },
            value: editPermissionsEntities.map(function (e) {
              return e.shortid;
            }),
            onChange: function onChange(selected) {
              return _onChange({ _id: entity._id, editPermissions: selectValues(selected) });
            },
            renderNew: function renderNew(modalProps) {
              return _react2.default.createElement(sharedComponents.NewUserModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { defaults: { folder: entity.folder } }) }));
            },
            multiple: true
          })
        )
      );
    }
  }]);

  return PermissionProperties;
}(_react.Component);

exports.default = PermissionProperties;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react'];

/***/ })
/******/ ]);