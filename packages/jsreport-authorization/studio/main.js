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


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _NewUsersGroupModal = __webpack_require__(3);

var _NewUsersGroupModal2 = _interopRequireDefault(_NewUsersGroupModal);

var _UsersGroupEditor = __webpack_require__(4);

var _UsersGroupEditor2 = _interopRequireDefault(_UsersGroupEditor);

var _UsersGroupProperties = __webpack_require__(5);

var _UsersGroupProperties2 = _interopRequireDefault(_UsersGroupProperties);

var _PermissionProperties = __webpack_require__(6);

var _PermissionProperties2 = _interopRequireDefault(_PermissionProperties);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

_jsreportStudio2.default.sharedComponents.NewUsersGroupModal = _NewUsersGroupModal2.default;

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

          _jsreportStudio2.default.addEntitySet({
            name: 'usersGroups',
            faIcon: 'fa-users',
            visibleName: 'group',
            onNew: function onNew(options) {
              return _jsreportStudio2.default.openModal(_NewUsersGroupModal2.default, options);
            },
            entityTreePosition: 300
          });

          _jsreportStudio2.default.addEditorComponent('usersGroups', _UsersGroupEditor2.default);

          _jsreportStudio2.default.addPropertiesComponent(_UsersGroupProperties2.default.title, _UsersGroupProperties2.default, function (entity) {
            return entity.__entitySet === 'usersGroups';
          });

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

        case 7:
        case 'end':
          return _context.stop();
      }
    }
  }, _callee, undefined);
})));

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _react = __webpack_require__(1);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var NewUsersGroupModal = function NewUsersGroupModal(props) {
  var close = props.close;
  var onNewEntity = props.options.onNewEntity;
  var activateNewTab = props.options.activateNewTab;
  var defaults = props.options.defaults || {};

  var _useState = (0, _react.useState)(false),
      _useState2 = _slicedToArray(_useState, 2),
      groupNameError = _useState2[0],
      setGroupNameError = _useState2[1];

  var _useState3 = (0, _react.useState)(null),
      _useState4 = _slicedToArray(_useState3, 2),
      apiError = _useState4[0],
      setApiError = _useState4[1];

  var groupNameRef = (0, _react.useRef)();

  var validateGroupName = (0, _react.useCallback)(function () {
    setGroupNameError(groupNameRef.current.value === '');
    setApiError(null);
  }, []);

  var createGroup = (0, _react.useCallback)(_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    var entity, response;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            entity = {};


            if (defaults != null) {
              entity = Object.assign(entity, defaults);
            }

            if (groupNameRef.current.value) {
              _context.next = 4;
              break;
            }

            return _context.abrupt('return', setGroupNameError(true));

          case 4:

            entity.name = groupNameRef.current.value;
            entity.users = entity.users || [];

            _context.prev = 6;
            _context.next = 9;
            return _jsreportStudio2.default.api.post('/odata/usersGroups', {
              data: entity
            });

          case 9:
            response = _context.sent;


            response.__entitySet = 'usersGroups';

            _jsreportStudio2.default.addExistingEntity(response);
            _jsreportStudio2.default.openTab(response, activateNewTab);

            if (onNewEntity) {
              onNewEntity(response);
            }

            close();
            _context.next = 20;
            break;

          case 17:
            _context.prev = 17;
            _context.t0 = _context['catch'](6);

            setApiError(_context.t0.message);

          case 20:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined, [[6, 17]]);
  })), [defaults, activateNewTab, onNewEntity, close]);

  var handleKeyPress = (0, _react.useCallback)(function (e) {
    if (e.key === 'Enter') {
      createGroup();
    }
  }, [createGroup]);

  (0, _react.useEffect)(function () {
    setTimeout(function () {
      return groupNameRef.current.focus();
    }, 0);
  }, []);

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { className: 'form-group' },
      React.createElement(
        'label',
        null,
        'New group'
      )
    ),
    React.createElement(
      'div',
      { className: 'form-group' },
      React.createElement(
        'label',
        null,
        'name'
      ),
      React.createElement('input', { type: 'text', ref: groupNameRef, onChange: function onChange() {
          return validateGroupName();
        }, onKeyPress: function onKeyPress(e) {
          return handleKeyPress(e);
        } })
    ),
    React.createElement(
      'div',
      { className: 'form-group' },
      React.createElement(
        'span',
        {
          style: { color: 'red', display: groupNameError ? 'block' : 'none' }
        },
        'group name must be filled'
      ),
      React.createElement(
        'span',
        { style: { color: 'red', display: apiError ? 'block' : 'none' } },
        apiError
      )
    ),
    React.createElement(
      'div',
      { className: 'button-bar' },
      React.createElement(
        'button',
        { className: 'button confirmation', onClick: function onClick() {
            return createGroup();
          } },
        'ok'
      )
    )
  );
};

exports.default = NewUsersGroupModal;

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var UsersGroupEditor = function UsersGroupEditor(props) {
  var entity = props.entity;


  return React.createElement(
    'div',
    { className: 'custom-editor' },
    React.createElement(
      'h1',
      null,
      React.createElement('i', { className: 'fa fa-users' }),
      ' ',
      entity.name
    )
  );
};

exports.default = UsersGroupEditor;

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = __webpack_require__(1);

var _jsreportStudio = __webpack_require__(0);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EntityRefSelect = _jsreportStudio2.default.EntityRefSelect;
var sharedComponents = _jsreportStudio2.default.sharedComponents;

var UsersGroupProperties = function UsersGroupProperties(props) {
  var entity = props.entity,
      entities = props.entities,
      _onChange = props.onChange;


  var removeInvalidUserReferences = (0, _react.useCallback)(function removeInvalidUserReferences() {
    if (!entity.users) {
      return;
    }

    var updatedUsers = entity.users.filter(function (u) {
      return Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'users' && entities[k].shortid === u.shortid;
      }).length;
    });

    if (updatedUsers.length !== entity.users.length) {
      _onChange({ _id: entity._id, users: updatedUsers });
    }
  }, [entity, entities, _onChange]);

  (0, _react.useEffect)(function () {
    removeInvalidUserReferences();
  });

  return React.createElement(
    'div',
    { className: 'properties-section' },
    React.createElement(
      'div',
      { className: 'form-group' },
      React.createElement(EntityRefSelect, {
        headingLabel: 'Select user',
        newLabel: 'New user for group',
        filter: function filter(references) {
          var users = references.users.filter(function (e) {
            return !e.__isNew;
          });
          return { users: users };
        },
        value: entity.users ? entity.users.map(function (u) {
          return u.shortid;
        }) : [],
        onChange: function onChange(selected) {
          return _onChange({ _id: entity._id, users: selected.map(function (u) {
              return { shortid: u.shortid };
            }) });
        },
        renderNew: function renderNew(modalProps) {
          return React.createElement(sharedComponents.NewUserModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { defaults: { folder: entity.folder }, activateNewTab: false }) }));
        },
        multiple: true
      })
    )
  );
};

UsersGroupProperties.title = function (entity, entities) {
  if (!entity.users || !entity.users.length) {
    return 'users';
  }

  return 'users (' + entity.users.length + ')';
};

exports.default = UsersGroupProperties;

/***/ }),
/* 6 */
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
      this.removeInvalidUsersGroupReferences();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      this.removeInvalidUserReferences();
      this.removeInvalidUsersGroupReferences();
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
    key: 'removeInvalidUsersGroupReferences',
    value: function removeInvalidUsersGroupReferences() {
      var _props2 = this.props,
          entity = _props2.entity,
          onChange = _props2.onChange;


      if (Array.isArray(entity.readPermissionsGroup) && entity.readPermissionsGroup.length > 0) {
        var updatedReadPermissionsGroup = entity.readPermissionsGroup.map(function (_id) {
          var currentEntity = _jsreportStudio2.default.getEntityById(_id, false);
          return currentEntity ? currentEntity._id : null;
        }).filter(function (i) {
          return i != null;
        });

        if (updatedReadPermissionsGroup.length !== entity.readPermissionsGroup.length) {
          onChange({ _id: entity._id, readPermissionsGroup: updatedReadPermissionsGroup });
        }
      }

      if (Array.isArray(entity.editPermissionsGroup) && entity.editPermissionsGroup.length > 0) {
        var updatedEditPermissionsGroup = entity.editPermissionsGroup.map(function (_id) {
          var currentEntity = _jsreportStudio2.default.getEntityById(_id, false);
          return currentEntity ? currentEntity._id : null;
        }).filter(function (i) {
          return i != null;
        });

        if (updatedEditPermissionsGroup.length !== entity.editPermissionsGroup.length) {
          onChange({ _id: entity._id, editPermissionsGroup: updatedEditPermissionsGroup });
        }
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _props3 = this.props,
          entity = _props3.entity,
          _onChange = _props3.onChange;


      if (entity.__entitySet === 'users' || entity.__entitySet === 'usersGroups') {
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

      var readPermissionsGroupEntities = entity.readPermissionsGroup ? entity.readPermissionsGroup.map(function (_id) {
        var currentEntity = _jsreportStudio2.default.getEntityById(_id, false);
        return currentEntity != null ? currentEntity : null;
      }).filter(function (i) {
        return i != null;
      }) : [];

      var editPermissionsGroupEntities = entity.editPermissionsGroup ? entity.editPermissionsGroup.map(function (_id) {
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
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'read permissions group'
          ),
          _react2.default.createElement(EntityRefSelect, {
            headingLabel: 'Select group (read permissions group)',
            newLabel: 'New group (read permissions group)',
            filter: function filter(references) {
              var groups = references.usersGroups.filter(function (e) {
                return !e.__isNew;
              });
              return { usersGroups: groups };
            },
            value: readPermissionsGroupEntities.map(function (r) {
              return r.shortid;
            }),
            onChange: function onChange(selected) {
              return _onChange({ _id: entity._id, readPermissionsGroup: selectValues(selected) });
            },
            renderNew: function renderNew(modalProps) {
              return _react2.default.createElement(sharedComponents.NewUsersGroupModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { defaults: { folder: entity.folder } }) }));
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
            'edit permissions group'
          ),
          _react2.default.createElement(EntityRefSelect, {
            headingLabel: 'Select group (edit permissions group)',
            newLabel: 'New group (edit permissions group)',
            filter: function filter(references) {
              var groups = references.usersGroups.filter(function (e) {
                return !e.__isNew;
              });
              return { usersGroups: groups };
            },
            value: editPermissionsGroupEntities.map(function (e) {
              return e.shortid;
            }),
            onChange: function onChange(selected) {
              return _onChange({ _id: entity._id, editPermissionsGroup: selectValues(selected) });
            },
            renderNew: function renderNew(modalProps) {
              return _react2.default.createElement(sharedComponents.NewUsersGroupModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { defaults: { folder: entity.folder } }) }));
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

/***/ })
/******/ ]);