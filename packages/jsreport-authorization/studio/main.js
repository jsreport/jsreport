/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ ((module) => {

module.exports = Studio;

/***/ }),
/* 1 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



if (true) {
  module.exports = __webpack_require__(5);
} else // removed by dead control flow
{}


/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = Studio.libraries['react'];

/***/ }),
/* 3 */,
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);



const NewUsersGroupModal = props => {
  const close = props.close;
  const onNewEntity = props.options.onNewEntity;
  const activateNewTab = props.options.activateNewTab;
  const defaults = props.options.defaults || {};
  const [groupNameError, setGroupNameError] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [apiError, setApiError] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const groupNameRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(undefined);
  const validateGroupName = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    setGroupNameError(groupNameRef.current.value === '');
    setApiError(null);
  }, []);
  const createGroup = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async () => {
    let entity = {};
    if (defaults != null) {
      entity = Object.assign(entity, defaults);
    }
    if (!groupNameRef.current.value) {
      return setGroupNameError(true);
    }
    entity.name = groupNameRef.current.value;
    entity.users = entity.users || [];
    try {
      const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.post('/odata/usersGroups', {
        data: entity
      });
      response.__entitySet = 'usersGroups';
      jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().addExistingEntity(response);
      jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openTab(response, activateNewTab);
      if (onNewEntity) {
        onNewEntity(response);
      }
      close();
    } catch (e) {
      setApiError(e.message);
    }
  }, [defaults, activateNewTab, onNewEntity, close]);
  const handleKeyPress = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(e => {
    if (e.key === 'Enter') {
      createGroup();
    }
  }, [createGroup]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    setTimeout(() => groupNameRef.current.focus(), 0);
  }, []);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
      className: "form-group",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
        children: "New group"
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      className: "form-group",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
        children: "name"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
        type: "text",
        ref: groupNameRef,
        onChange: () => validateGroupName(),
        onKeyPress: e => handleKeyPress(e)
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      className: "form-group",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
        style: {
          color: 'red',
          display: groupNameError ? 'block' : 'none'
        },
        children: "group name must be filled"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
        style: {
          color: 'red',
          display: apiError ? 'block' : 'none'
        },
        children: apiError
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
      className: "button-bar",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("button", {
        className: "button confirmation",
        onClick: () => createGroup(),
        children: "ok"
      })
    })]
  });
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (NewUsersGroupModal);

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports) => {

/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
function jsxProd(type, config, maybeKey) {
  var key = null;
  void 0 !== maybeKey && (key = "" + maybeKey);
  void 0 !== config.key && (key = "" + config.key);
  if ("key" in config) {
    maybeKey = {};
    for (var propName in config)
      "key" !== propName && (maybeKey[propName] = config[propName]);
  } else maybeKey = config;
  config = maybeKey.ref;
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type: type,
    key: key,
    ref: void 0 !== config ? config : null,
    props: maybeKey
  };
}
exports.Fragment = REACT_FRAGMENT_TYPE;
exports.jsx = jsxProd;
exports.jsxs = jsxProd;


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);


const UsersGroupEditor = props => {
  const {
    entity
  } = props;
  let content = null;
  if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication).user.isSuperAdmin) {
    content = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("h2", {
        children: "Admin Management"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "form-group",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
            children: "Give admin privileges"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
            type: "checkbox",
            checked: entity.isAdmin === true,
            onChange: v => jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().updateEntity({
              ...entity,
              isAdmin: v.target.checked
            })
          })]
        })
      })]
    });
  }
  const groupIcon = jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().resolveEntityTreeIconStyle(entity);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
    className: "custom-editor",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("h1", {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("i", {
        className: `fa ${groupIcon}`
      }), " ", entity.name]
    }), entity.isAdmin && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("b", {
        children: "Admin group"
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
        children: content
      })
    })]
  });
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (UsersGroupEditor);

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);



const EntityRefSelect = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().EntityRefSelect);
const sharedComponents = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().sharedComponents);
const UsersGroupProperties = props => {
  const {
    entity,
    entities,
    onChange
  } = props;
  const removeInvalidUserReferences = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(function removeInvalidUserReferences() {
    if (!entity.users) {
      return;
    }
    const updatedUsers = entity.users.filter(u => Object.keys(entities).filter(k => entities[k].__entitySet === 'users' && entities[k].shortid === u.shortid).length);
    if (updatedUsers.length !== entity.users.length) {
      onChange({
        _id: entity._id,
        users: updatedUsers
      });
    }
  }, [entity, entities, onChange]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    removeInvalidUserReferences();
  });
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
    className: "properties-section",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
      className: "form-group",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(EntityRefSelect, {
        headingLabel: "Select user",
        newLabel: "New user for group",
        filter: references => {
          const users = references.users.filter(e => !e.__isNew);
          return {
            users
          };
        },
        value: entity.users ? entity.users.map(u => u.shortid) : [],
        onChange: selected => onChange({
          _id: entity._id,
          users: selected.map(u => ({
            shortid: u.shortid
          }))
        }),
        renderNew: modalProps => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(sharedComponents.NewUserModal, {
          ...modalProps,
          options: {
            ...modalProps.options,
            defaults: {
              folder: entity.folder
            },
            activateNewTab: false
          }
        }),
        multiple: true
      })
    })
  });
};
UsersGroupProperties.title = (entity, entities) => {
  if (!entity.users || !entity.users.length) {
    return 'users';
  }
  return `users (${entity.users.length})`;
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (UsersGroupProperties);

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);



const EntityRefSelect = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().EntityRefSelect);
const sharedComponents = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().sharedComponents);
const selectValues = selected => {
  return selected.map(e => e._id);
};
class PermissionProperties extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  componentDidMount() {
    this.removeInvalidUserReferences();
    this.removeInvalidUsersGroupReferences();
  }
  componentDidUpdate() {
    this.removeInvalidUserReferences();
    this.removeInvalidUsersGroupReferences();
  }
  removeInvalidUserReferences() {
    const {
      entity,
      onChange
    } = this.props;
    if (Array.isArray(entity.readPermissions) && entity.readPermissions.length > 0) {
      const updatedReadPermissions = entity.readPermissions.map(_id => {
        const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getEntityById(_id, false);
        return currentEntity ? currentEntity._id : null;
      }).filter(i => i != null);
      if (updatedReadPermissions.length !== entity.readPermissions.length) {
        onChange({
          _id: entity._id,
          readPermissions: updatedReadPermissions
        });
      }
    }
    if (Array.isArray(entity.editPermissions) && entity.editPermissions.length > 0) {
      const updatedEditPermissions = entity.editPermissions.map(_id => {
        const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getEntityById(_id, false);
        return currentEntity ? currentEntity._id : null;
      }).filter(i => i != null);
      if (updatedEditPermissions.length !== entity.editPermissions.length) {
        onChange({
          _id: entity._id,
          editPermissions: updatedEditPermissions
        });
      }
    }
  }
  removeInvalidUsersGroupReferences() {
    const {
      entity,
      onChange
    } = this.props;
    if (Array.isArray(entity.readPermissionsGroup) && entity.readPermissionsGroup.length > 0) {
      const updatedReadPermissionsGroup = entity.readPermissionsGroup.map(_id => {
        const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getEntityById(_id, false);
        return currentEntity ? currentEntity._id : null;
      }).filter(i => i != null);
      if (updatedReadPermissionsGroup.length !== entity.readPermissionsGroup.length) {
        onChange({
          _id: entity._id,
          readPermissionsGroup: updatedReadPermissionsGroup
        });
      }
    }
    if (Array.isArray(entity.editPermissionsGroup) && entity.editPermissionsGroup.length > 0) {
      const updatedEditPermissionsGroup = entity.editPermissionsGroup.map(_id => {
        const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getEntityById(_id, false);
        return currentEntity ? currentEntity._id : null;
      }).filter(i => i != null);
      if (updatedEditPermissionsGroup.length !== entity.editPermissionsGroup.length) {
        onChange({
          _id: entity._id,
          editPermissionsGroup: updatedEditPermissionsGroup
        });
      }
    }
  }
  render() {
    const {
      entity,
      onChange
    } = this.props;
    if (entity.__entitySet === 'users' || entity.__entitySet === 'usersGroups') {
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {});
    }
    const readPermissionsEntities = entity.readPermissions ? entity.readPermissions.map(_id => {
      const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getEntityById(_id, false);
      return currentEntity != null ? currentEntity : null;
    }).filter(i => i != null) : [];
    const editPermissionsEntities = entity.editPermissions ? entity.editPermissions.map(_id => {
      const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getEntityById(_id, false);
      return currentEntity != null ? currentEntity : null;
    }).filter(i => i != null) : [];
    const readPermissionsGroupEntities = entity.readPermissionsGroup ? entity.readPermissionsGroup.map(_id => {
      const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getEntityById(_id, false);
      return currentEntity != null ? currentEntity : null;
    }).filter(i => i != null) : [];
    const editPermissionsGroupEntities = entity.editPermissionsGroup ? entity.editPermissionsGroup.map(_id => {
      const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getEntityById(_id, false);
      return currentEntity != null ? currentEntity : null;
    }).filter(i => i != null) : [];
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      className: "properties-section",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "read permissions"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(EntityRefSelect, {
          headingLabel: "Select user (read permissions)",
          newLabel: "New user (read permissions)",
          filter: references => {
            const users = references.users.filter(e => !e.__isNew);
            return {
              users: users
            };
          },
          value: readPermissionsEntities.map(r => r.shortid),
          onChange: selected => onChange({
            _id: entity._id,
            readPermissions: selectValues(selected)
          }),
          renderNew: modalProps => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(sharedComponents.NewUserModal, {
            ...modalProps,
            options: {
              ...modalProps.options,
              defaults: {
                folder: entity.folder
              }
            }
          }),
          multiple: true
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "edit permissions"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(EntityRefSelect, {
          headingLabel: "Select user (edit permissions)",
          newLabel: "New user (edit permissions)",
          filter: references => {
            const users = references.users.filter(e => !e.__isNew);
            return {
              users: users
            };
          },
          value: editPermissionsEntities.map(e => e.shortid),
          onChange: selected => onChange({
            _id: entity._id,
            editPermissions: selectValues(selected)
          }),
          renderNew: modalProps => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(sharedComponents.NewUserModal, {
            ...modalProps,
            options: {
              ...modalProps.options,
              defaults: {
                folder: entity.folder
              }
            }
          }),
          multiple: true
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "read permissions group"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(EntityRefSelect, {
          headingLabel: "Select group (read permissions group)",
          newLabel: "New group (read permissions group)",
          filter: references => {
            const groups = references.usersGroups.filter(e => !e.__isNew);
            return {
              usersGroups: groups
            };
          },
          value: readPermissionsGroupEntities.map(r => r.shortid),
          onChange: selected => onChange({
            _id: entity._id,
            readPermissionsGroup: selectValues(selected)
          }),
          renderNew: modalProps => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(sharedComponents.NewUsersGroupModal, {
            ...modalProps,
            options: {
              ...modalProps.options,
              defaults: {
                folder: entity.folder
              }
            }
          }),
          multiple: true
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "edit permissions group"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(EntityRefSelect, {
          headingLabel: "Select group (edit permissions group)",
          newLabel: "New group (edit permissions group)",
          filter: references => {
            const groups = references.usersGroups.filter(e => !e.__isNew);
            return {
              usersGroups: groups
            };
          },
          value: editPermissionsGroupEntities.map(e => e.shortid),
          onChange: selected => onChange({
            _id: entity._id,
            editPermissionsGroup: selectValues(selected)
          }),
          renderNew: modalProps => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(sharedComponents.NewUsersGroupModal, {
            ...modalProps,
            options: {
              ...modalProps.options,
              defaults: {
                folder: entity.folder
              }
            }
          }),
          multiple: true
        })]
      })]
    });
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PermissionProperties);

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _NewUsersGroupModal__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var _UsersGroupEditor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6);
/* harmony import */ var _UsersGroupProperties__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7);
/* harmony import */ var _PermissionProperties__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(8);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(1);






(jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().sharedComponents).NewUsersGroupModal = _NewUsersGroupModal__WEBPACK_IMPORTED_MODULE_0__["default"];
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().initializeListeners.push(async () => {
  if (!(jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().authentication) || !jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().authentication.isUserAdmin((jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().authentication).user)) {
    return;
  }
  jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addEntitySet({
    name: 'usersGroups',
    faIcon: 'fa-users',
    visibleName: 'group',
    referenceAttributes: ['users', 'isAdmin'],
    onNew: options => jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().openModal(_NewUsersGroupModal__WEBPACK_IMPORTED_MODULE_0__["default"], options),
    entityTreePosition: 300
  });
  jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addEditorComponent('usersGroups', _UsersGroupEditor__WEBPACK_IMPORTED_MODULE_1__["default"]);
  jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addPropertiesComponent(_UsersGroupProperties__WEBPACK_IMPORTED_MODULE_2__["default"].title, _UsersGroupProperties__WEBPACK_IMPORTED_MODULE_2__["default"], entity => entity.__entitySet === 'usersGroups');
  jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addPropertiesComponent('permissions', _PermissionProperties__WEBPACK_IMPORTED_MODULE_3__["default"], entity => {
    return jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().extensions.authorization.options.sharedEntitySets.indexOf(entity.__entitySet) === -1;
  });
  jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().authentication.useEditorComponents.push(user => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("h2", {
      children: "Authorization"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("label", {
          children: "Allow read all entities"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("input", {
          type: "checkbox",
          checked: user.readAllPermissions === true,
          onChange: v => jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().updateEntity({
            ...user,
            readAllPermissions: v.target.checked
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("label", {
          children: "Allow edit all entities"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("input", {
          type: "checkbox",
          checked: user.editAllPermissions === true,
          onChange: v => jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().updateEntity({
            ...user,
            editAllPermissions: v.target.checked
          })
        })]
      })]
    })]
  }));
});
})();

/******/ })()
;