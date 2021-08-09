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
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _style = __webpack_require__(2);

var _style2 = _interopRequireDefault(_style);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function renderLicenseType(licensingInfo) {
  if (licensingInfo.unreachable) {
    return React.createElement(
      'p',
      null,
      'The licensing server was not reachable during the instance startup. The instance now runs in the enterprise mode and the license validation will be performed again during the next restart.'
    );
  }

  if (licensingInfo.type === 'subscription') {
    if (licensingInfo.pendingExpiration === true) {
      return React.createElement(
        'div',
        null,
        React.createElement(
          'p',
          null,
          'The subscription is no longer active probably due to failed payment or cancellation. The subscription can be used for maximum one month in inactive state.'
        ),
        React.createElement(PaymentNote, { paymentType: licensingInfo.paymentType })
      );
    }

    return React.createElement(
      'div',
      null,
      React.createElement(
        'p',
        null,
        'The subscription renewal is planned on ',
        licensingInfo.expiresOn.toLocaleDateString(),
        ' and the license will be again validated afterwards.'
      ),
      React.createElement(PaymentNote, { paymentType: licensingInfo.paymentType })
    );
  }

  if (licensingInfo.type === 'perpetual') {
    return React.createElement(
      'p',
      null,
      'Perpetual license is validated for the version ',
      licensingInfo.validatedForVersion,
      ' with free upgrades to the versions released before ',
      licensingInfo.expiresOn.toLocaleDateString(),
      '. The license will be remotely validated again if the instance is upgraded to a different version.'
    );
  }

  if (licensingInfo.type === 'trial') {
    return React.createElement(
      'p',
      null,
      'The trial license expires on ',
      licensingInfo.expiresOn.toLocaleDateString(),
      '. You will need to purchase enterprise license to be able to store more than 5 templates afterwards.'
    );
  }

  if (licensingInfo.type === 'free') {
    return React.createElement(
      'p',
      null,
      'You can use up to 5 templates for free.'
    );
  }
}

function PaymentNote(_ref) {
  var paymentType = _ref.paymentType;

  if (paymentType === 'gumroad') {
    return React.createElement(
      'p',
      null,
      'You can find further information about payments in the ',
      React.createElement(
        'a',
        { href: 'https://gumroad.com/library', target: '_blank', rel: 'noreferrer' },
        'gumroad library'
      ),
      '.`'
    );
  }

  if (paymentType === 'manual') {
    return React.createElement(
      'p',
      null,
      'The license is payed through manual invoices and bank transfers. Please contact ',
      React.createElement(
        'a',
        { href: 'mailto: support@jsreport.net' },
        'support@jsreport.net'
      ),
      ' to get further information.'
    );
  }

  if (paymentType === 'braintree') {
    return React.createElement(
      'p',
      null,
      'You can find further information about payments in the ',
      React.createElement(
        'a',
        { href: 'https://jsreport.net/payments/customer', target: '_blank', rel: 'noreferrer' },
        'customer portal'
      ),
      '.'
    );
  }

  return React.createElement('span', null);
}

_jsreportStudio2.default.readyListeners.push(_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
  var licensingInfo, trialModal, licenseInfoModal, pendingExpirationModal, interval;
  return regeneratorRuntime.wrap(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          licensingInfo = _jsreportStudio2.default.extensions.licensing.options;

          if (licensingInfo.development) {
            _jsreportStudio2.default.addStartupComponent(function (props) {
              return React.createElement(
                'div',
                { className: _style2.default.developmentLicense },
                'Development only license applied'
              );
            });
          }

          if (licensingInfo.usageCheckFailureInfo) {
            _jsreportStudio2.default.openModal(function () {
              return React.createElement(
                'div',
                null,
                React.createElement(
                  'p',
                  null,
                  licensingInfo.usageCheckFailureInfo.message
                ),
                React.createElement(
                  'p',
                  null,
                  'The development instances should use config license.development=true and every production instance should have its own enterprise license key. The deployment with several production jsreport instances should use enterprise scale license which doesn\'t limit the license key usage.'
                )
              );
            });
          }

          trialModal = function trialModal() {
            return _jsreportStudio2.default.openModal(function () {
              return React.createElement(
                'div',
                null,
                React.createElement(
                  'p',
                  null,
                  'Free license is limited to maximum 5 templates. Your jsreport instance is now running in one month trial. Please buy the enterprise license if you want to continue using jsreport after the trial expires.'
                ),
                React.createElement(
                  'p',
                  null,
                  'The instructions for buying enterprise license can be found ',
                  React.createElement(
                    'a',
                    { href: 'http://jsreport.net/buy', target: '_blank', rel: 'noreferrer' },
                    'here'
                  ),
                  '.'
                )
              );
            });
          };

          licenseInfoModal = function licenseInfoModal() {
            return _jsreportStudio2.default.openModal(function () {
              return React.createElement(
                'div',
                null,
                React.createElement(
                  'h2',
                  null,
                  licensingInfo.license,
                  ' license',
                  licensingInfo.development ? ' (development)' : ''
                ),
                renderLicenseType(licensingInfo),
                React.createElement(
                  'p',
                  null,
                  'More information about licensing and pricing can be found ',
                  React.createElement(
                    'a',
                    { href: 'http://jsreport.net/buy', target: '_blank', rel: 'noreferrer' },
                    'here'
                  ),
                  '.'
                )
              );
            });
          };

          pendingExpirationModal = function pendingExpirationModal() {
            return _jsreportStudio2.default.openModal(function () {
              return React.createElement(
                'div',
                null,
                React.createElement(
                  'h2',
                  null,
                  'subscription has expired'
                ),
                React.createElement(
                  'p',
                  null,
                  'The subscription is no longer active probably due to failed payment or cancellation. The subscription can be used for maximum one month in inactive state.'
                ),
                React.createElement(PaymentNote, { paymentType: licensingInfo.paymentType })
              );
            });
          };

          if (licensingInfo.type === 'trial' && _jsreportStudio2.default.getAllEntities().filter(function (e) {
            return e.__entitySet === 'templates' && !e.__isNew;
          }).length > 5) {
            trialModal();
          }

          if (licensingInfo.type === 'subscription' && licensingInfo.pendingExpiration === true) {
            pendingExpirationModal();
          }

          if (licensingInfo.license === 'free') {
            interval = setInterval(function () {
              if (_jsreportStudio2.default.getAllEntities().filter(function (e) {
                return e.__entitySet === 'templates' && !e.__isNew;
              }).length > 5) {
                clearInterval(interval);
                trialModal();
                licensingInfo.type = licensingInfo.license = 'trial';
                var now = new Date();
                now.setDate(now.getDate() + 30);
                licensingInfo.expiresOn = now;
                _jsreportStudio2.default.api.post('/api/licensing/trial', {}).then(function (m) {
                  if (m.status === 1) {
                    setTimeout(function () {
                      return _jsreportStudio2.default.openModal(function () {
                        return React.createElement(
                          'div',
                          null,
                          m.message
                        );
                      });
                    }, 5000);
                  }
                });
              }
            }, 10000);
          }

          _jsreportStudio2.default.addToolbarComponent(function (props) {
            return React.createElement(
              'div',
              {
                className: 'toolbar-button',
                onClick: function onClick() {
                  licenseInfoModal();
                  props.closeMenu();
                }
              },
              React.createElement(
                'div',
                { style: { textTransform: 'capitalize' } },
                React.createElement('i', { className: 'fa fa-gavel' }),
                licensingInfo.license,
                ' ',
                React.createElement('i', { className: 'fa fa-info-circle', style: { marginRight: 0 } })
              )
            );
          }, 'settings');

        case 10:
        case 'end':
          return _context.stop();
      }
    }
  }, _callee, undefined);
})));

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = Studio;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"developmentLicense":"x-licensing-style-developmentLicense"};

/***/ })
/******/ ]);