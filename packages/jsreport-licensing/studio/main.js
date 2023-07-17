/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = Studio;

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// extracted by mini-css-extract-plugin
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({"developmentLicense":"x-licensing-style-developmentLicense"});

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
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _style_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);


function renderLicenseType(licensingInfo) {
  if (licensingInfo.unreachable) {
    return /*#__PURE__*/React.createElement("p", null, "The licensing server was not reachable during the instance startup. The instance now runs in the enterprise mode and the license validation will be performed again during the next restart.");
  }
  if (licensingInfo.type === 'subscription') {
    if (licensingInfo.pendingExpiration === true) {
      return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, "The subscription is no longer active probably due to failed payment or cancellation. The subscription can be used for maximum one month in inactive state."), /*#__PURE__*/React.createElement(PaymentNote, {
        paymentType: licensingInfo.paymentType
      }));
    }
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, "The subscription renewal is planned on ", licensingInfo.expiresOn.toLocaleDateString(), " and the license will be again validated afterwards."), /*#__PURE__*/React.createElement(PaymentNote, {
      paymentType: licensingInfo.paymentType
    }));
  }
  if (licensingInfo.type === 'perpetual') {
    return /*#__PURE__*/React.createElement("p", null, "Perpetual license is validated for the version ", licensingInfo.validatedForVersion, " with free upgrades to the versions released before ", licensingInfo.expiresOn.toLocaleDateString(), ". The license will be remotely validated again if the instance is upgraded to a different version.");
  }
  if (licensingInfo.type === 'trial') {
    return /*#__PURE__*/React.createElement("p", null, "The trial license expires on ", licensingInfo.expiresOn.toLocaleDateString(), ". You will need to purchase enterprise license to be able to store more than 5 templates afterwards.");
  }
  if (licensingInfo.type === 'free') {
    return /*#__PURE__*/React.createElement("p", null, "You can use up to 5 templates for free.");
  }
}
function PaymentNote(_ref) {
  let {
    paymentType
  } = _ref;
  if (paymentType === 'gumroad') {
    return /*#__PURE__*/React.createElement("p", null, "You can find further information about payments in the ", /*#__PURE__*/React.createElement("a", {
      href: "https://gumroad.com/library",
      target: "_blank",
      rel: "noreferrer"
    }, "gumroad library"), ".`");
  }
  if (paymentType === 'manual') {
    return /*#__PURE__*/React.createElement("p", null, "The license is payed through manual invoices and bank transfers. Please contact ", /*#__PURE__*/React.createElement("a", {
      href: "mailto: support@jsreport.net"
    }, "support@jsreport.net"), " to get further information.");
  }
  if (paymentType === 'braintree') {
    return /*#__PURE__*/React.createElement("p", null, "You can find further information about payments in the ", /*#__PURE__*/React.createElement("a", {
      href: "https://jsreport.net/payments/customer",
      target: "_blank",
      rel: "noreferrer"
    }, "customer portal"), ".");
  }
  return /*#__PURE__*/React.createElement("span", null);
}
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().readyListeners.push(async () => {
  const licensingInfo = (jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().extensions).licensing.options;
  if (licensingInfo.development) {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addStartupComponent(props => /*#__PURE__*/React.createElement("div", {
      className: _style_css__WEBPACK_IMPORTED_MODULE_1__["default"].developmentLicense
    }, "Development only license applied"));
  }
  if (licensingInfo.usageCheckFailureInfo) {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().openModal(() => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, licensingInfo.usageCheckFailureInfo.message), /*#__PURE__*/React.createElement("p", null, "The development instances should use config license.development=true and every production instance should have its own enterprise license key. The deployment with several production jsreport instances should use enterprise scale license which doesn't limit the license key usage.")));
  }
  const trialModal = () => jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().openModal(() => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, "Free license is limited to maximum 5 templates. Your jsreport instance is now running in one month trial. Please buy the enterprise license if you want to continue using jsreport after the trial expires."), /*#__PURE__*/React.createElement("p", null, "The instructions for buying enterprise license can be found ", /*#__PURE__*/React.createElement("a", {
    href: "http://jsreport.net/buy",
    target: "_blank",
    rel: "noreferrer"
  }, "here"), ".")));
  const licenseInfoModal = () => jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().openModal(() => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, licensingInfo.license, " license", licensingInfo.development ? ' (development)' : ''), renderLicenseType(licensingInfo), /*#__PURE__*/React.createElement("p", null, "More information about licensing and pricing can be found ", /*#__PURE__*/React.createElement("a", {
    href: "http://jsreport.net/buy",
    target: "_blank",
    rel: "noreferrer"
  }, "here"), ".")));
  const pendingExpirationModal = () => jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().openModal(() => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "subscription has expired"), /*#__PURE__*/React.createElement("p", null, "The subscription is no longer active probably due to failed payment or cancellation. The subscription can be used for maximum one month in inactive state."), /*#__PURE__*/React.createElement(PaymentNote, {
    paymentType: licensingInfo.paymentType
  })));
  if (licensingInfo.type === 'trial' && jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().getAllEntities().filter(e => e.__entitySet === 'templates' && !e.__isNew).length > 5) {
    trialModal();
  }
  if (licensingInfo.type === 'subscription' && licensingInfo.pendingExpiration === true) {
    pendingExpirationModal();
  }
  if (licensingInfo.license === 'free') {
    const interval = setInterval(() => {
      if (jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().getAllEntities().filter(e => e.__entitySet === 'templates' && !e.__isNew).length > 5) {
        clearInterval(interval);
        trialModal();
        licensingInfo.type = licensingInfo.license = 'trial';
        const now = new Date();
        now.setDate(now.getDate() + 30);
        licensingInfo.expiresOn = now;
        jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().api.post('/api/licensing/trial', {}).then(m => {
          if (m.status === 1) {
            setTimeout(() => jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().openModal(() => /*#__PURE__*/React.createElement("div", null, m.message)), 5000);
          }
        });
      }
    }, 10000);
  }
  jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addToolbarComponent(props => /*#__PURE__*/React.createElement("div", {
    className: "toolbar-button",
    onClick: () => {
      licenseInfoModal();
      props.closeMenu();
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textTransform: 'capitalize'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa fa-gavel"
  }), licensingInfo.license, " ", /*#__PURE__*/React.createElement("i", {
    className: "fa fa-info-circle",
    style: {
      marginRight: 0
    }
  }))), 'settings');
});
})();

/******/ })()
;