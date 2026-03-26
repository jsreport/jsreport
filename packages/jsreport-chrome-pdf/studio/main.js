/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ ((module) => {

module.exports = Studio.libraries['react'];

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

module.exports = Studio;

/***/ }),
/* 3 */,
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);



class ChromePdfProperties extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.applyDefaultsToEntity = this.applyDefaultsToEntity.bind(this);
    this.changeChrome = this.changeChrome.bind(this);
  }
  componentDidMount() {
    this.applyDefaultsToEntity(this.props);
  }
  componentDidUpdate(prevProps, prevState) {
    if (prevProps.entity._id !== this.props.entity._id) {
      this.applyDefaultsToEntity(this.props);
    }
  }
  inform() {
    if (jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getSettingValueByKey('chrome-header-informed', false) === true) {
      return;
    }
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().setSetting('chrome-header-informed', true);
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openModal(() => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      children: ["Here you can define chrome native headers/footers. Make sure \"display header/footer\" is selected and use margin to prepare the space for the header.", /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("br", {}), "Please note chrome currently prints headers with smaller font size and you need to style text explicitly to workaround it.", /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("br", {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("br", {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("b", {
        children: ["The chrome native implementation is also very limited and we recommend to use jsreport", /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("a", {
          href: "https://jsreport.net/learn/pdf-utils",
          target: "_blank",
          rel: "noreferrer",
          children: " pdf utils extension"
        }), " in more complex use cases."]
      })]
    }));
  }
  openHeaderFooter(type) {
    this.inform();
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openTab({
      _id: this.props.entity._id,
      docProp: `chrome.${type}Template`
    });
  }
  applyDefaultsToEntity(props) {
    const {
      entity
    } = props;
    let entityNeedsDefault = false;
    if (entity.__isNew && (entity.chrome == null || entity.chrome.printBackground == null)) {
      entityNeedsDefault = true;
    }
    if (entityNeedsDefault) {
      this.changeChrome(props, {
        printBackground: true
      });
    }
  }
  changeChrome(props, change) {
    const {
      entity,
      onChange
    } = props;
    const chrome = entity.chrome || {};
    onChange({
      ...entity,
      chrome: {
        ...chrome,
        ...change
      }
    });
  }
  render() {
    const {
      entity
    } = this.props;
    const chrome = entity.chrome || {};
    const changeChrome = this.changeChrome;
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      className: "properties-section",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "scale"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "text",
          placeholder: "1",
          value: chrome.scale || '',
          onChange: v => {
            let scaleValue = v.target.value;
            if (scaleValue.trim() === '') {
              scaleValue = null;
            }
            changeChrome(this.props, {
              scale: scaleValue
            });
          }
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "print background"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "checkbox",
          checked: chrome.printBackground === true,
          onChange: v => changeChrome(this.props, {
            printBackground: v.target.checked
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "landscape"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "checkbox",
          checked: chrome.landscape === true,
          onChange: v => changeChrome(this.props, {
            landscape: v.target.checked
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "pageRanges"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "text",
          placeholder: "1-5, 8, 11-13",
          value: chrome.pageRanges || '',
          onChange: v => changeChrome(this.props, {
            pageRanges: v.target.value
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "format"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "text",
          placeholder: "Letter",
          value: chrome.format || '',
          title: "Specifies a pre-defined size for the pdf",
          onChange: v => changeChrome(this.props, {
            format: v.target.value
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "pdf width"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "text",
          placeholder: "10cm",
          value: chrome.width || '',
          title: "Specifies a custom width for the pdf",
          onChange: v => changeChrome(this.props, {
            width: v.target.value
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "pdf height"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "text",
          placeholder: "10cm",
          value: chrome.height || '',
          title: "Specifies a custom height for the pdf",
          onChange: v => changeChrome(this.props, {
            height: v.target.value
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "pdf margin top"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "text",
          placeholder: "10cm",
          value: chrome.marginTop || '',
          onChange: v => changeChrome(this.props, {
            marginTop: v.target.value
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "pdf margin right"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "text",
          placeholder: "10cm",
          value: chrome.marginRight || '',
          onChange: v => changeChrome(this.props, {
            marginRight: v.target.value
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "pdf margin bottom"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "text",
          placeholder: "10cm",
          value: chrome.marginBottom || '',
          onChange: v => changeChrome(this.props, {
            marginBottom: v.target.value
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "pdf margin left"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "text",
          placeholder: "10cm",
          value: chrome.marginLeft || '',
          onChange: v => changeChrome(this.props, {
            marginLeft: v.target.value
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "viewport width"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "text",
          value: chrome.viewportWidth != null ? chrome.viewportWidth : '',
          title: "Specifies the target viewport width of the chrome page",
          placeholder: "800",
          onChange: v => {
            let viewportWidthValue = v.target.value;
            if (viewportWidthValue.trim() === '') {
              viewportWidthValue = null;
            }
            changeChrome(this.props, {
              viewportWidth: viewportWidthValue
            });
          }
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "viewport height"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "text",
          value: chrome.viewportHeight != null ? chrome.viewportHeight : '',
          title: "Specifies the target viewport height of the chrome page",
          placeholder: "600",
          onChange: v => {
            let viewportHeightValue = v.target.value;
            if (viewportHeightValue.trim() === '') {
              viewportHeightValue = null;
            }
            changeChrome(this.props, {
              viewportHeight: viewportHeightValue
            });
          }
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "display header/footer"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "checkbox",
          checked: chrome.displayHeaderFooter === true,
          onChange: v => changeChrome(this.props, {
            displayHeaderFooter: v.target.checked
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "header"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("button", {
          onClick: () => this.openHeaderFooter('header'),
          children: "open in tab..."
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "footer"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("button", {
          onClick: () => this.openHeaderFooter('footer'),
          children: "open in tab..."
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "media type"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("select", {
          value: chrome.mediaType || 'print',
          onChange: v => changeChrome(this.props, {
            mediaType: v.target.value
          }),
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("option", {
            value: "print",
            children: "print"
          }, 'print'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("option", {
            value: "screen",
            children: "screen"
          }, 'screen')]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          children: "wait for network idle"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "checkbox",
          checked: chrome.waitForNetworkIdle === true,
          onChange: v => changeChrome(this.props, {
            waitForNetworkIdle: v.target.checked
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("label", {
          title: "window.JSREPORT_READY_TO_START=true;",
          children: "wait for printing trigger"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
          type: "checkbox",
          title: "window.JSREPORT_READY_TO_START=true;",
          checked: chrome.waitForJS === true,
          onChange: v => changeChrome(this.props, {
            waitForJS: v.target.checked
          })
        })]
      })]
    });
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ChromePdfProperties);

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
/* harmony export */   "default": () => (/* binding */ ImageProperties)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);


class ImageProperties extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.changeChrome = this.changeChrome.bind(this);
  }
  changeChrome(props, change) {
    const {
      entity,
      onChange
    } = props;
    const chromeImage = entity.chromeImage || {};
    onChange({
      ...entity,
      chromeImage: {
        ...chromeImage,
        ...change
      }
    });
  }
  render() {
    const {
      entity
    } = this.props;
    const chrome = entity.chromeImage || {};
    const changeChrome = this.changeChrome;
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
      className: "properties-section",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "format"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("select", {
          value: chrome.type || 'png',
          onChange: v => changeChrome(this.props, {
            type: v.target.value
          }),
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
            value: "png",
            children: "png"
          }, 'png'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
            value: "jpeg",
            children: "jpeg"
          }, 'jpeg')]
        })]
      }), chrome.type === 'jpeg' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "quality"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "text",
          placeholder: "0 - 100",
          value: chrome.quality != null ? chrome.quality : '',
          onChange: v => {
            let qualityValue = v.target.value;
            if (qualityValue.trim() === '') {
              qualityValue = null;
            }
            changeChrome(this.props, {
              quality: qualityValue
            });
          }
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "full page"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "checkbox",
          checked: chrome.fullPage === true,
          title: "Specifies whether to take a screenshot of the full scrollable page or not",
          onChange: v => changeChrome(this.props, {
            fullPage: v.target.checked
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "viewport width"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "text",
          value: chrome.viewportWidth != null ? chrome.viewportWidth : '',
          title: "Specifies the target viewport width of the chrome page",
          placeholder: "800",
          onChange: v => {
            let viewportWidthValue = v.target.value;
            if (viewportWidthValue.trim() === '') {
              viewportWidthValue = null;
            }
            changeChrome(this.props, {
              viewportWidth: viewportWidthValue
            });
          }
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "viewport height"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "text",
          value: chrome.viewportHeight != null ? chrome.viewportHeight : '',
          title: "Specifies the target viewport height of the chrome page",
          placeholder: "600",
          onChange: v => {
            let viewportHeightValue = v.target.value;
            if (viewportHeightValue.trim() === '') {
              viewportHeightValue = null;
            }
            changeChrome(this.props, {
              viewportHeight: viewportHeightValue
            });
          }
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "clip X"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "text",
          value: chrome.clipX != null ? chrome.clipX : '',
          title: "Specifies the x-coordinate of top-left corner of clipping region of the page",
          onChange: v => {
            let clipXValue = v.target.value;
            if (clipXValue.trim() === '') {
              clipXValue = null;
            }
            changeChrome(this.props, {
              clipX: clipXValue
            });
          }
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "clip Y"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "text",
          value: chrome.clipY != null ? chrome.clipY : '',
          title: "Specifies the y-coordinate of top-left corner of clipping region of the page",
          onChange: v => {
            let clipYValue = v.target.value;
            if (clipYValue.trim() === '') {
              clipYValue = null;
            }
            changeChrome(this.props, {
              clipY: clipYValue
            });
          }
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "clip width"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "text",
          value: chrome.clipWidth != null ? chrome.clipWidth : '',
          title: "Specifies the width of clipping region of the page",
          onChange: v => {
            let clipWidthValue = v.target.value;
            if (clipWidthValue.trim() === '') {
              clipWidthValue = null;
            }
            changeChrome(this.props, {
              clipWidth: clipWidthValue
            });
          }
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "clip height"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "text",
          value: chrome.clipHeight != null ? chrome.clipHeight : '',
          title: "Specifies the height of clipping region of the page",
          onChange: v => {
            let clipHeightValue = v.target.value;
            if (clipHeightValue.trim() === '') {
              clipHeightValue = null;
            }
            changeChrome(this.props, {
              clipHeight: clipHeightValue
            });
          }
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "omit background"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "checkbox",
          checked: chrome.omitBackground === true,
          title: "Specifies if the background should be hidden, therefore allowing capturing screenshots with transparency",
          onChange: v => changeChrome(this.props, {
            omitBackground: v.target.checked
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "media type"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("select", {
          value: chrome.mediaType || 'print',
          onChange: v => changeChrome(this.props, {
            mediaType: v.target.value
          }),
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
            value: "print",
            children: "print"
          }, 'print'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
            value: "screen",
            children: "screen"
          }, 'screen')]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          children: "wait for network idle"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "checkbox",
          checked: chrome.waitForNetworkIdle === true,
          onChange: v => changeChrome(this.props, {
            waitForNetworkIdle: v.target.checked
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
          title: "window.JSREPORT_READY_TO_START=true;",
          children: "wait for printing trigger"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
          type: "checkbox",
          title: "window.JSREPORT_READY_TO_START=true;",
          checked: chrome.waitForJS === true,
          onChange: v => changeChrome(this.props, {
            waitForJS: v.target.checked
          })
        })]
      })]
    });
  }
}

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);



class ChromeEditor extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  render() {
    const {
      entity,
      onUpdate,
      headerOrFooter,
      tab
    } = this.props;
    const editorName = `${entity._id}_${tab.docProp.replace(/\./g, '_')}`;
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__.TextEditor, {
      name: editorName,
      mode: "handlebars",
      value: entity.chrome ? entity.chrome[headerOrFooter + 'Template'] : '',
      onUpdate: v => onUpdate(Object.assign({}, entity, {
        chrome: Object.assign({}, entity.chrome, {
          [headerOrFooter + 'Template']: v
        })
      }))
    });
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ChromeEditor);

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CHROME_TAB_EDITOR: () => (/* binding */ CHROME_TAB_EDITOR),
/* harmony export */   CHROME_TAB_TITLE: () => (/* binding */ CHROME_TAB_TITLE)
/* harmony export */ });
const CHROME_TAB_TITLE = 'CHROME_TAB_TITLE';
const CHROME_TAB_EDITOR = 'CHROME_TAB_EDITOR';

/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (props => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
  children: props.entity.name + ' ' + props.headerOrFooter + (props.entity.__isDirty ? '*' : '')
}));

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
/* harmony import */ var _ChromePdfProperties_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var _ChromeImageProperties_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _ChromeEditor_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(7);
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(8);
/* harmony import */ var _ChromeTitle_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(9);






jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().addPropertiesComponent('chrome pdf', _ChromePdfProperties_js__WEBPACK_IMPORTED_MODULE_0__["default"], entity => entity.__entitySet === 'templates' && entity.recipe === 'chrome-pdf');
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().addPropertiesComponent('chrome image', _ChromeImageProperties_js__WEBPACK_IMPORTED_MODULE_1__["default"], entity => entity.__entitySet === 'templates' && entity.recipe === 'chrome-image');
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().addEditorComponent(_constants_js__WEBPACK_IMPORTED_MODULE_4__.CHROME_TAB_EDITOR, _ChromeEditor_js__WEBPACK_IMPORTED_MODULE_3__["default"]);
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().addTabTitleComponent(_constants_js__WEBPACK_IMPORTED_MODULE_4__.CHROME_TAB_TITLE, _ChromeTitle_js__WEBPACK_IMPORTED_MODULE_5__["default"]);
const supportedDocProps = ['chrome.headerTemplate', 'chrome.footerTemplate'];
function componentKeyResolver(entity, docProp, key) {
  if (docProp == null) {
    return;
  }
  const shortNameMap = {
    'chrome.headerTemplate': 'header',
    'chrome.footerTemplate': 'footer'
  };
  if (entity.__entitySet === 'templates' && supportedDocProps.includes(docProp)) {
    return {
      key,
      props: {
        headerOrFooter: shortNameMap[docProp]
      }
    };
  }
}
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().entityEditorComponentKeyResolvers.push((entity, docProp) => componentKeyResolver(entity, docProp, _constants_js__WEBPACK_IMPORTED_MODULE_4__.CHROME_TAB_EDITOR));
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().tabTitleComponentKeyResolvers.push((entity, docProp) => componentKeyResolver(entity, docProp, _constants_js__WEBPACK_IMPORTED_MODULE_4__.CHROME_TAB_TITLE));
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().entityTreeIconResolvers.push(entity => entity.__entitySet === 'templates' && entity.recipe === 'chrome-pdf' ? 'fa-file-pdf-o' : null);
jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().entityTreeIconResolvers.push(entity => entity.__entitySet === 'templates' && entity.recipe === 'chrome-image' ? 'fa-file-image-o' : null);
})();

/******/ })()
;