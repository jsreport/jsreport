/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ ((module) => {

module.exports = Studio;

/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = Studio.libraries['react'];

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = Studio.runtime['helpers/extends'];

/***/ }),
/* 3 */,
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


const NewUsersGroupModal = props => {
  const close = props.close;
  const onNewEntity = props.options.onNewEntity;
  const activateNewTab = props.options.activateNewTab;
  const defaults = props.options.defaults || {};
  const [groupNameError, setGroupNameError] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [apiError, setApiError] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const groupNameRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)();
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
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", null, "New group")), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", null, "name"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    ref: groupNameRef,
    onChange: () => validateGroupName(),
    onKeyPress: e => handleKeyPress(e)
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'red',
      display: groupNameError ? 'block' : 'none'
    }
  }, "group name must be filled"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'red',
      display: apiError ? 'block' : 'none'
    }
  }, apiError)), /*#__PURE__*/React.createElement("div", {
    className: "button-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "button confirmation",
    onClick: () => createGroup()
  }, "ok")));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (NewUsersGroupModal);

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_0__);

const UsersGroupEditor = props => {
  const {
    entity
  } = props;
  let content = null;
  if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication).user.isSuperAdmin) {
    content = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Admin Management"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", null, "Give admin privileges"), /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: entity.isAdmin === true,
      onChange: v => jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().updateEntity({
        ...entity,
        isAdmin: v.target.checked
      })
    }))));
  }
  const groupIcon = jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().resolveEntityTreeIconStyle(entity);
  return /*#__PURE__*/React.createElement("div", {
    className: "custom-editor"
  }, /*#__PURE__*/React.createElement("h1", null, /*#__PURE__*/React.createElement("i", {
    className: `fa ${groupIcon}`
  }), " ", entity.name), entity.isAdmin && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Admin group")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", null, content)));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (UsersGroupEditor);

/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



const EntityRefSelect = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().EntityRefSelect);
const sharedComponents = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().sharedComponents);
const UsersGroupProperties = props => {
  const {
    entity,
    entities,
    onChange
  } = props;
  const removeInvalidUserReferences = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(function removeInvalidUserReferences() {
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
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    removeInvalidUserReferences();
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "properties-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement(EntityRefSelect, {
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
    renderNew: modalProps => /*#__PURE__*/React.createElement(sharedComponents.NewUserModal, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, modalProps, {
      options: {
        ...modalProps.options,
        defaults: {
          folder: entity.folder
        },
        activateNewTab: false
      }
    })),
    multiple: true
  })));
};
UsersGroupProperties.title = (entity, entities) => {
  if (!entity.users || !entity.users.length) {
    return 'users';
  }
  return `users (${entity.users.length})`;
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (UsersGroupProperties);

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



const EntityRefSelect = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().EntityRefSelect);
const sharedComponents = (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().sharedComponents);
const selectValues = selected => {
  return selected.map(e => e._id);
};
class PermissionProperties extends react__WEBPACK_IMPORTED_MODULE_1__.Component {
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
        const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().getEntityById(_id, false);
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
        const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().getEntityById(_id, false);
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
        const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().getEntityById(_id, false);
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
        const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().getEntityById(_id, false);
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
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", null);
    }
    const readPermissionsEntities = entity.readPermissions ? entity.readPermissions.map(_id => {
      const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().getEntityById(_id, false);
      return currentEntity != null ? currentEntity : null;
    }).filter(i => i != null) : [];
    const editPermissionsEntities = entity.editPermissions ? entity.editPermissions.map(_id => {
      const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().getEntityById(_id, false);
      return currentEntity != null ? currentEntity : null;
    }).filter(i => i != null) : [];
    const readPermissionsGroupEntities = entity.readPermissionsGroup ? entity.readPermissionsGroup.map(_id => {
      const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().getEntityById(_id, false);
      return currentEntity != null ? currentEntity : null;
    }).filter(i => i != null) : [];
    const editPermissionsGroupEntities = entity.editPermissionsGroup ? entity.editPermissionsGroup.map(_id => {
      const currentEntity = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().getEntityById(_id, false);
      return currentEntity != null ? currentEntity : null;
    }).filter(i => i != null) : [];
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "properties-section"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, "read permissions"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(EntityRefSelect, {
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
      renderNew: modalProps => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(sharedComponents.NewUserModal, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, modalProps, {
        options: {
          ...modalProps.options,
          defaults: {
            folder: entity.folder
          }
        }
      })),
      multiple: true
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, "edit permissions"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(EntityRefSelect, {
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
      renderNew: modalProps => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(sharedComponents.NewUserModal, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, modalProps, {
        options: {
          ...modalProps.options,
          defaults: {
            folder: entity.folder
          }
        }
      })),
      multiple: true
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, "read permissions group"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(EntityRefSelect, {
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
      renderNew: modalProps => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(sharedComponents.NewUsersGroupModal, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, modalProps, {
        options: {
          ...modalProps.options,
          defaults: {
            folder: entity.folder
          }
        }
      })),
      multiple: true
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, "edit permissions group"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(EntityRefSelect, {
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
      renderNew: modalProps => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(sharedComponents.NewUsersGroupModal, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, modalProps, {
        options: {
          ...modalProps.options,
          defaults: {
            folder: entity.folder
          }
        }
      })),
      multiple: true
    })));
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
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _NewUsersGroupModal__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var _UsersGroupEditor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5);
/* harmony import */ var _UsersGroupProperties__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6);
/* harmony import */ var _PermissionProperties__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(7);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_4__);





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
  jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().authentication.useEditorComponents.push(user => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Authorization"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", null, "Allow read all entities"), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: user.readAllPermissions === true,
    onChange: v => jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().updateEntity({
      ...user,
      readAllPermissions: v.target.checked
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", null, "Allow edit all entities"), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: user.editAllPermissions === true,
    onChange: v => jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().updateEntity({
      ...user,
      editAllPermissions: v.target.checked
    })
  })))));
});
})();

/******/ })()
;