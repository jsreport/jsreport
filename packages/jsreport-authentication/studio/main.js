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
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


class ChangePasswordModal extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.oldPasswordRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.newPassword1Ref = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.newPassword2Ref = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.state = {};
  }
  async changePassword() {
    const {
      entity
    } = this.props.options;
    const {
      close
    } = this.props;
    try {
      const data = {
        newPassword: this.newPassword1Ref.current.value
      };
      if (this.needsOldPassword(entity)) {
        data.oldPassword = this.oldPasswordRef.current.value;
      }
      await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.post(`/api/users/${entity.shortid}/password`, {
        data: data
      });
      this.newPassword1Ref.current.value = '';
      this.newPassword2Ref.current.value = '';
      close();
    } catch (e) {
      this.setState({
        apiError: e.message
      });
    }
  }
  validatePassword() {
    this.setState({
      passwordError: this.newPassword2Ref.current.value && this.newPassword2Ref.current.value !== this.newPassword1Ref.current.value,
      apiError: null
    });
  }
  needsOldPassword(entity) {
    let needsOldPassword = true;
    if (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().authentication.isUserAdmin((jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().authentication).user)) {
      needsOldPassword = (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().authentication).user.isGroup ? false : entity.name === (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().authentication).user.name;
    }
    return needsOldPassword;
  }
  render() {
    const {
      entity
    } = this.props.options;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, this.needsOldPassword(entity) ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "old password"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "password",
      autoComplete: "off",
      ref: this.oldPasswordRef
    })) : '', /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "new password"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "password",
      autoComplete: "off",
      ref: this.newPassword1Ref
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "new password verification"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "password",
      autoComplete: "off",
      ref: this.newPassword2Ref,
      onChange: () => this.validatePassword()
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        color: 'red',
        display: this.state.passwordError ? 'block' : 'none'
      }
    }, "password doesn't match"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        color: 'red',
        display: this.state.apiError ? 'block' : 'none'
      }
    }, this.state.apiError)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button confirmation",
      onClick: () => this.changePassword()
    }, "ok")));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ChangePasswordModal);

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


function UserGroupsInfo(props) {
  const {
    user
  } = props;
  const {
    usersGroups: groups
  } = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getReferences();
  const groupsForUser = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    return groups.filter(g => {
      const users = g.users || [];
      return users.find(u => u.shortid === user.shortid) != null;
    });
  }, [groups]);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Groups"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement(GroupsDisplay, {
    groups: groupsForUser
  }))));
}
function GroupsDisplay(_ref) {
  let {
    groups
  } = _ref;
  const handleOpenGroupTab = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(function handleOpenGroupTab(groupId) {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openTab({
      _id: groupId
    });
  }, []);
  if (groups.length === 0) {
    return /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", null, "No groups assigned"));
  }
  const groupsIcon = 'fa-users';
  const lastGroupIdx = groups.length - 1;
  return /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    className: `fa ${groupsIcon}`
  }), "\xA0", groups.map((g, idx) => /*#__PURE__*/React.createElement("span", {
    key: g.name
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => handleOpenGroupTab(g._id),
    style: {
      textDecoration: 'underline',
      cursor: 'pointer'
    }
  }, g.name), idx !== lastGroupIdx ? ', ' : '')));
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (UserGroupsInfo);

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ChangePasswordModal_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



class UserEditor extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  componentDidMount() {
    if (this.props.entity.__isNew && !this.props.entity.password) {
      jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openModal(_ChangePasswordModal_js__WEBPACK_IMPORTED_MODULE_1__["default"], {
        entity: this.props.entity
      });
    }
  }
  render() {
    const {
      entity,
      onUpdate
    } = this.props;
    const userIcon = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveEntityTreeIconStyle(entity);
    const isAdmin = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().authentication.isUserAdmin(entity);
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "custom-editor"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h1", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: `fa ${userIcon}`
    }), " ", entity.name), isAdmin && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("b", null, "Admin user")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().authentication.useEditorComponents.map((c, i) => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      key: i
    }, c(entity, onUpdate)))));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (UserEditor);

/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


class LogoutSettingsButton extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.logoutRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
  }
  render() {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      onClick: () => {
        this.logoutRef.current.click();
        this.props.closeMenu();
      },
      style: {
        cursor: 'pointer'
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("form", {
      method: "POST",
      action: jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().resolveUrl('/logout')
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      ref: this.logoutRef,
      type: "submit",
      id: "logoutBtn",
      style: {
        display: 'none'
      }
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-power-off"
    }), "Logout"));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (LogoutSettingsButton);

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _ChangePasswordModal_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


const ChangePasswordSettingsButton = props => {
  if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().authentication).user.isSuperAdmin || (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().authentication).user.isGroup) {
    return /*#__PURE__*/React.createElement("span", null);
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("a", {
    id: "changePassword",
    onClick: () => {
      jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openModal(_ChangePasswordModal_js__WEBPACK_IMPORTED_MODULE_0__["default"], {
        entity: (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().authentication).user
      });
      props.closeMenu();
    },
    style: {
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa fa-key"
  }), "Change password"));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ChangePasswordSettingsButton);

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ChangePasswordModal_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



class ChangePasswordButton extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  render() {
    if (!this.props.tab || !this.props.tab.entity || this.props.tab.entity.__entitySet !== 'users' ||
    // display change password always for super admin,
    // and only if the current admin user opens its own user or a normal non-admin user

    jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().authentication.isUserAdmin(this.props.tab.entity) && ((jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().authentication).user.isGroup || this.props.tab.entity.name !== (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().authentication).user.name) && !(jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().authentication).user.isSuperAdmin) {
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null);
    }
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "toolbar-button",
      onClick: e => jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openModal(_ChangePasswordModal_js__WEBPACK_IMPORTED_MODULE_1__["default"], {
        entity: this.props.tab.entity
      })
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-key"
    }), "Change Password"));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ChangePasswordButton);

/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


class NewUserModal extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor() {
    super();
    this.usernameRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.password1Ref = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.password2Ref = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.state = {};
  }
  componentDidMount() {
    setTimeout(() => this.usernameRef.current.focus(), 0);
  }
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      this.createUser();
    }
  }
  async createUser() {
    let entity = {};
    if (this.props.options.defaults != null) {
      entity = Object.assign(entity, this.props.options.defaults);
    }
    if (!this.usernameRef.current.value) {
      return this.setState({
        userNameError: true
      });
    }
    if (!this.password1Ref.current.value) {
      return this.setState({
        passwordError: true
      });
    }
    entity.name = this.usernameRef.current.value;
    entity.password = this.password1Ref.current.value;
    try {
      const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.post('/odata/users', {
        data: entity
      });
      response.__entitySet = 'users';
      jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().addExistingEntity(response);
      if (this.props.options.onNewEntity) {
        this.props.options.onNewEntity(response);
      }
      this.props.close();
    } catch (e) {
      this.setState({
        apiError: e.message
      });
    }
  }
  validatePassword() {
    this.setState({
      passwordError: this.password2Ref.current.value && this.password2Ref.current.value !== this.password1Ref.current.value,
      apiError: null
    });
  }
  validateUsername() {
    this.setState({
      userNameError: this.usernameRef.current.value === '',
      apiError: null
    });
  }
  render() {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "New user")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "username"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      ref: this.usernameRef,
      onChange: () => this.validateUsername(),
      onKeyPress: e => this.handleKeyPress(e)
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "password"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "password",
      autoComplete: "off",
      ref: this.password1Ref
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "password verification"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "password",
      autoComplete: "off",
      ref: this.password2Ref,
      onChange: () => this.validatePassword()
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        color: 'red',
        display: this.state.passwordError ? 'block' : 'none'
      }
    }, "password doesn't match"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        color: 'red',
        display: this.state.userNameError ? 'block' : 'none'
      }
    }, "username must be filled"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        color: 'red',
        display: this.state.apiError ? 'block' : 'none'
      }
    }, this.state.apiError)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button confirmation",
      onClick: () => this.createUser()
    }, "ok")));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (NewUserModal);

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
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _UserGroupsInfo__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
/* harmony import */ var _UserEditor_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(5);
/* harmony import */ var _LogoutSettingsButton_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(6);
/* harmony import */ var _ChangePasswordSettingsButton_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(7);
/* harmony import */ var _ChangePasswordButton_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(8);
/* harmony import */ var _NewUserModal_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(9);







(jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().sharedComponents).NewUserModal = _NewUserModal_js__WEBPACK_IMPORTED_MODULE_6__["default"];

// we want to be at the front, because other extension like scheduling relies on loaded user
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().initializeListeners.unshift(async () => {
  const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().api.get('/api/settings');
  if (!response.tenant) {
    // authentication not enabled in config
    return;
  }
  const isTenantAdmin = response.isTenantAdmin === true;
  (jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication) = {
    user: response.tenant,
    useEditorComponents: [],
    isUserAdmin: userInfo => {
      if (userInfo == null) {
        return false;
      }
      if (userInfo.isSuperAdmin) {
        return true;
      }
      const isGroup = userInfo.isGroup === true || userInfo.__entitySet === 'usersGroups';
      const {
        users,
        usersGroups: groups
      } = jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().getReferences();
      const validateUserInfoProps = (data, props) => {
        let currentProp;
        for (const targetProp of props) {
          if (data[targetProp] == null || data[targetProp] === '') {
            continue;
          }
          currentProp = targetProp;
          break;
        }
        if (currentProp == null) {
          const propsLabel = props.map(p => '.' + p).join(', ');
          throw new Error(`Studio.authentication.isUserAdmin needs to have one of these ${propsLabel} properties on the user info param`);
        }
        return currentProp;
      };
      if (users == null || groups == null) {
        const targetProp = isGroup ? '_id' : 'name';
        validateUserInfoProps(userInfo, [targetProp]);

        // when we are checking the current user we return the result of isTenantAdmin
        // which comes from server, this is useful when we call this check when the entitySets
        // are not yet registered
        if (userInfo[targetProp] === (jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication).user[targetProp]) {
          return isTenantAdmin;
        } else {
          throw new Error('Could not find users or usersGroups entity sets');
        }
      }
      const targetProp = validateUserInfoProps(userInfo, isGroup ? ['_id'] : ['_id', 'shortid', 'name']);
      if (isGroup) {
        const groupInStore = groups.find(u => u[targetProp] === userInfo[targetProp]);
        if (groupInStore == null) {
          return false;
        }
        return groupInStore.isAdmin === true;
      } else {
        const userInStore = users.find(u => u[targetProp] === userInfo[targetProp]);
        if (userInStore == null) {
          return false;
        }
        if (userInStore.isAdmin) {
          return true;
        }
        const adminGroupsForUser = groups.filter(g => {
          const users = g.users || [];
          return g.isAdmin === true && users.find(u => u.shortid === userInStore.shortid) != null;
        });
        return adminGroupsForUser.length > 0;
      }
    }
  };
  if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication).user.isSuperAdmin) {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication.useEditorComponents.push(user => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Admin Management"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", null, "Give admin privileges"), /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: user.isAdmin === true,
      onChange: v => jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().updateEntity({
        ...user,
        isAdmin: v.target.checked
      })
    })))));
  }
  jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication.useEditorComponents.push(user => /*#__PURE__*/React.createElement(_UserGroupsInfo__WEBPACK_IMPORTED_MODULE_1__["default"], {
    user: user
  }));
  const userIcon = 'fa-user';
  if (jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication.isUserAdmin((jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication).user)) {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addEntitySet({
      name: 'users',
      faIcon: userIcon,
      visibleName: 'user',
      referenceAttributes: ['isAdmin'],
      onNew: options => jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().openModal(_NewUserModal_js__WEBPACK_IMPORTED_MODULE_6__["default"], options),
      entityTreePosition: 200
    });
    jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addEditorComponent('users', _UserEditor_js__WEBPACK_IMPORTED_MODULE_2__["default"]);
    jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addToolbarComponent(_ChangePasswordButton_js__WEBPACK_IMPORTED_MODULE_5__["default"]);
  }
  jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().entityTreeIconResolvers.push(entity => {
    if (entity.__entitySet === 'users') {
      return jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication.isUserAdmin(entity) === true ? 'fa-user-gear' : userIcon;
    } else if (entity.__entitySet === 'usersGroups') {
      return jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication.isUserAdmin(entity) === true ? 'fa-users-gear' : 'fa-users';
    }
  });
  jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addToolbarComponent(_ChangePasswordSettingsButton_js__WEBPACK_IMPORTED_MODULE_4__["default"], 'settings');
  jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addToolbarComponent(() => {
    let faUserIcon;
    if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication).user.isGroup) {
      faUserIcon = jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication.isUserAdmin((jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication).user) ? 'fa-users-gear' : 'fa-users';
    } else {
      faUserIcon = jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication.isUserAdmin((jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication).user) ? 'fa-user-gear' : userIcon;
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "toolbar-button"
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
      className: `fa ${faUserIcon}`
    }), (jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().authentication).user.name));
  }, 'settingsBottom');
  jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addToolbarComponent(_LogoutSettingsButton_js__WEBPACK_IMPORTED_MODULE_3__["default"], 'settingsBottom');
});
})();

/******/ })()
;