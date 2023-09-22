/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ ((module) => {

"use strict";
module.exports = Studio.libraries['react'];

/***/ }),
/* 1 */
/***/ ((module) => {

"use strict";
module.exports = Studio;

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _simpleCheckForValidColor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5);
/* harmony import */ var _colorLuminance__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6);



const ShowColor = props => {
  const {
    color,
    height = 15,
    width = 20
  } = props;
  let borderColor = props.borderColor;
  let currentColor = 'inherit';
  if ((0,_simpleCheckForValidColor__WEBPACK_IMPORTED_MODULE_1__["default"])(color)) {
    currentColor = color;
  }
  if (!borderColor) {
    borderColor = (0,_colorLuminance__WEBPACK_IMPORTED_MODULE_2__["default"])(currentColor, -0.35);
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
    style: {
      backgroundColor: currentColor,
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: borderColor,
      display: 'inline-block',
      height: height,
      verticalAlign: 'middle',
      width: width
    }
  });
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ShowColor);

/***/ }),
/* 3 */
/***/ ((module) => {

"use strict";
module.exports = Studio.runtime['helpers/extends'];

/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _ShowColor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);
/* harmony import */ var _ColorPicker__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(14);




const ColorPicketTrigger = props => {
  const {
    displayColorPicker,
    color,
    containerStyles,
    onClickColorTrigger,
    onInputChange,
    onChangeSelectionColor,
    onCloseColorPicker,
    translateXColorPickerFromTrigger,
    translateYColorPickerFromTrigger
  } = props;
  const containerTriggerPickerStyles = {
    display: 'inline-block',
    height: '32px',
    padding: '5px'
  };
  const defaultContainerStyles = {
    display: 'inline-block'
  };
  const currentColor = color || '';
  const currentContainerStyles = Object.assign({}, defaultContainerStyles, containerStyles);
  const colorPickerContainerStyles = {};
  if (translateXColorPickerFromTrigger || translateYColorPickerFromTrigger) {
    let transformValue = '';
    if (translateXColorPickerFromTrigger) {
      transformValue += `translateX(${translateXColorPickerFromTrigger}) `;
    }
    if (translateYColorPickerFromTrigger) {
      transformValue += `translateY(${translateYColorPickerFromTrigger}) `;
    }
    colorPickerContainerStyles.transform = transformValue;
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
    style: currentContainerStyles
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
    style: containerTriggerPickerStyles
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
    style: {
      display: 'inline-block'
    }
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_ShowColor__WEBPACK_IMPORTED_MODULE_2__["default"], {
    color: currentColor
  }), "\xA0", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
    type: "text",
    value: currentColor,
    style: {
      width: '90px'
    },
    maxLength: 7,
    placeholder: "#006600",
    onFocus: onClickColorTrigger,
    onChange: ev => typeof onInputChange === 'function' && onInputChange(ev.target.value)
  }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__.Popover, {
    wrapper: false,
    open: displayColorPicker,
    onClose: onCloseColorPicker
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
    style: colorPickerContainerStyles
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_ColorPicker__WEBPACK_IMPORTED_MODULE_3__["default"], {
    color: currentColor,
    onChangeComplete: color => typeof onChangeSelectionColor === 'function' && onChangeSelectionColor(color.hex)
  }))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ColorPicketTrigger);

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const HEX_COLOR_REGEXP = /^#[0-9A-F]{6}$/i;
const simpleCheckForValidColor = color => {
  return HEX_COLOR_REGEXP.test(color);
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (simpleCheckForValidColor);

/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((hex, lum) => {
  const selectedLum = lum || 0;
  let selectedHex;
  selectedHex = String(hex).replace(/[^0-9a-f]/gi, '');
  if (selectedHex.length < 6) {
    selectedHex = selectedHex[0] + selectedHex[0] + selectedHex[1] + selectedHex[1] + selectedHex[2] + selectedHex[2];
  }

  // convert to decimal and change luminosity
  let rgb = '#';
  let c;
  let i;
  for (i = 0; i < 3; i++) {
    c = parseInt(selectedHex.substr(i * 2, 2), 16);
    c = Math.round(Math.min(Math.max(0, c + c * selectedLum), 255)).toString(16);
    rgb += ('00' + c).substr(c.length);
  }
  return rgb;
});

/***/ }),
/* 7 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof __webpack_require__.g == 'object' && __webpack_require__.g && __webpack_require__.g.Object === Object && __webpack_require__.g;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        result = wait - timeSinceLastCall;

    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = debounce;


/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// extracted by mini-css-extract-plugin
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({"active":"x-tags-TagEntityTreeButtonToolbar-active"});

/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   values: () => (/* binding */ values)
/* harmony export */ });
const values = {
  filterTags: undefined
};


/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var mitt__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(24);

const emitter = (0,mitt__WEBPACK_IMPORTED_MODULE_0__["default"])();
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (emitter);

/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((tagSet, tagShortId) => {
  if (typeof tagSet.has === 'function') {
    return tagSet.get(tagShortId);
  }
  const found = tagSet.find(tagInSet => {
    return tagInSet.shortid === tagShortId;
  });
  return found;
});

/***/ }),
/* 12 */,
/* 13 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _ColorPickerTrigger__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4);



class NewTagModal extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.nameRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.descriptionRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.state = {
      displayColorPicker: false,
      selectedColor: '',
      error: null
    };
  }

  // the modal component for some reason after open focuses the panel itself
  componentDidMount() {
    setTimeout(() => this.nameRef.current.focus(), 0);
  }
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      this.createTag();
    }
  }
  async createTag() {
    let entity = {};
    if (!this.nameRef.current.value) {
      return this.setState({
        error: 'name field cannot be empty'
      });
    }
    if (!this.state.selectedColor) {
      return this.setState({
        error: 'color field cannot be empty'
      });
    }
    if (this.props.options.defaults != null) {
      entity = Object.assign(entity, this.props.options.defaults);
    }
    entity.name = this.nameRef.current.value;
    entity.color = this.state.selectedColor;
    entity.description = this.descriptionRef.current.value;
    try {
      const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.post('/odata/tags', {
        data: entity
      });
      response.__entitySet = 'tags';
      jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().addExistingEntity(response);
      jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openTab(response, this.props.options.activateNewTab);
      if (this.props.options.onNewEntity) {
        this.props.options.onNewEntity(response);
      }
      this.props.close();
    } catch (e) {
      this.setState({
        error: e.message
      });
    }
  }
  render() {
    const {
      displayColorPicker,
      selectedColor,
      error
    } = this.state;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "New tag")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "name"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      name: "name",
      ref: this.nameRef,
      placeholder: "tag name...",
      onKeyPress: e => this.handleKeyPress(e)
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "color"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_ColorPickerTrigger__WEBPACK_IMPORTED_MODULE_2__["default"], {
      displayColorPicker: displayColorPicker,
      containerStyles: {
        border: '1px dashed #000'
      },
      color: selectedColor,
      onClickColorTrigger: () => this.setState({
        displayColorPicker: true
      }),
      onCloseColorPicker: () => this.setState({
        displayColorPicker: false
      }),
      onInputChange: colorInputValue => colorInputValue !== selectedColor && this.setState({
        selectedColor: colorInputValue
      }),
      onChangeSelectionColor: colorHex => this.setState({
        selectedColor: colorHex
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Description"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("textarea", {
      name: "description",
      ref: this.descriptionRef,
      placeholder: "You can add more details about this tag here...",
      rows: "4",
      style: {
        resize: 'vertical'
      }
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        color: 'red',
        display: error ? 'block' : 'none'
      }
    }, error)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group",
      style: {
        opacity: 0.8
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("hr", null), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, "You can use tags to organize jsreport objects.", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("br", null), "This can be for example a tag to organize and group related templates, images, data, scripts, assets, etc. ", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("br", null), "See the ", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("a", {
      target: "_blank",
      rel: "noreferrer",
      title: "Help",
      href: "http://jsreport.net/learn/tags"
    }, "documentation"), " for details.")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      onClick: () => this.createTag(),
      className: "button confirmation"
    }, "Ok")));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (NewTagModal);

/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _ColorWrap__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(15);
/* harmony import */ var _Picker__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(16);


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((0,_ColorWrap__WEBPACK_IMPORTED_MODULE_0__["default"])(_Picker__WEBPACK_IMPORTED_MODULE_1__["default"]));

/***/ }),
/* 15 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var lodash_debounce__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7);
/* harmony import */ var lodash_debounce__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(lodash_debounce__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _simpleCheckForValidColor__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(5);




const colorToState = data => {
  const color = data.hex ? data.hex : data;
  return {
    hex: `${color}`
  };
};
const ColorWrap = Picker => {
  class ColorPicker extends (react__WEBPACK_IMPORTED_MODULE_1__.PureComponent || react__WEBPACK_IMPORTED_MODULE_1__.Component) {
    constructor(props) {
      super(props);
      this.state = {
        ...colorToState(props.color),
        visible: props.display
      };
      this.debounce = lodash_debounce__WEBPACK_IMPORTED_MODULE_2___default()((fn, data, event) => {
        fn(data, event);
      }, 100);
      this.handleChange = this.handleChange.bind(this);
    }
    static getDerivedStateFromProps(props) {
      return {
        ...colorToState(props.color),
        visible: props.display
      };
    }
    handleChange(data, event) {
      const isValidColor = (0,_simpleCheckForValidColor__WEBPACK_IMPORTED_MODULE_3__["default"])(data.hex);
      if (isValidColor) {
        const colors = colorToState(data);
        this.setState(colors);
        this.props.onChangeComplete && this.debounce(this.props.onChangeComplete, colors, event);
        this.props.onChange && this.props.onChange(colors, event);
      }
    }
    render() {
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(Picker, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, this.props, this.state, {
        onChange: this.handleChange
      }));
    }
  }
  ColorPicker.defaultProps = {
    color: ''
  };
  return ColorPicker;
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ColorWrap);

/***/ }),
/* 16 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _utils_handleHover__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(17);
/* harmony import */ var _Swatch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(18);


const PickerSwatch = (0,_utils_handleHover__WEBPACK_IMPORTED_MODULE_0__["default"])(_ref => {
  let {
    hover,
    color,
    onClick
  } = _ref;
  const styles = {
    swatch: {
      width: '25px',
      height: '25px'
    }
  };
  if (hover) {
    styles.swatch = {
      ...styles.swatch,
      position: 'relative',
      zIndex: '2',
      outline: '2px solid #fff',
      boxShadow: '0 0 5px 2px rgba(0,0,0,0.25)'
    };
  }
  return /*#__PURE__*/React.createElement("div", {
    style: styles.swatch
  }, /*#__PURE__*/React.createElement(_Swatch__WEBPACK_IMPORTED_MODULE_1__["default"], {
    color: color,
    onClick: onClick
  }));
});
const Picker = _ref2 => {
  let {
    width,
    colors,
    onChange,
    triangle
  } = _ref2;
  const styles = {
    card: {
      width,
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.2)',
      boxShadow: '0 3px 12px rgba(0,0,0,0.15)',
      borderRadius: '4px',
      position: 'relative',
      padding: '5px',
      display: 'flex',
      flexWrap: 'wrap'
    }
  };
  const handleChange = (hex, e) => onChange({
    hex,
    source: 'hex'
  }, e);
  return /*#__PURE__*/React.createElement("div", {
    style: styles.card
  }, colors.map(c => /*#__PURE__*/React.createElement(PickerSwatch, {
    color: c,
    key: c,
    onClick: handleChange
  })));
};
Picker.defaultProps = {
  width: '200px',
  colors: ['#B80000', '#DB3E00', '#FCCB00', '#008B02', '#006B76', '#1273DE', '#004DCF', '#5300EB', '#EB9694', '#FAD0C3', '#FEF3BD', '#C1E1C5', '#BEDADC', '#C4DEF6']
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Picker);

/***/ }),
/* 17 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);


const handleHover = function (Component) {
  let Span = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'span';
  return class Hover extends (react__WEBPACK_IMPORTED_MODULE_1___default().Component) {
    constructor(props) {
      super(props);
      this.state = {
        hover: false
      };
      this.handleMouseOver = this.handleMouseOver.bind(this);
      this.handleMouseOut = this.handleMouseOut.bind(this);
    }
    handleMouseOver() {
      this.setState({
        hover: true
      });
    }
    handleMouseOut() {
      this.setState({
        hover: false
      });
    }
    render() {
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(Span, {
        onMouseOver: this.handleMouseOver,
        onMouseOut: this.handleMouseOut
      }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(Component, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, this.props, this.state)));
    }
  };
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (handleHover);

/***/ }),
/* 18 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const Swatch = _ref => {
  let {
    color,
    style,
    onClick,
    title = color
  } = _ref;
  const styles = {
    swatch: {
      background: color,
      height: '100%',
      width: '100%',
      cursor: 'pointer'
    }
  };
  const handleClick = e => onClick(color, e);
  return /*#__PURE__*/React.createElement("div", {
    style: styles.swatch,
    onClick: handleClick,
    title: title
  });
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Swatch);

/***/ }),
/* 19 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ShowColor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);


class TagEditor extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  render() {
    const {
      entity
    } = this.props;
    let description;
    if (entity.description) {
      description = entity.description;
    } else {
      description = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", null, "(no description for this tag)");
    }
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "custom-editor"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h1", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-tag"
    }), " ", entity.name)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "Description: ", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("br", null), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", null, description)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "Color: ", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_ShowColor__WEBPACK_IMPORTED_MODULE_1__["default"], {
      color: entity.color
    })));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TagEditor);

/***/ }),
/* 20 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ TagProperties)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ShowColor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var _ColorPickerTrigger__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4);



class TagProperties extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  static title(entity, entities) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, "tag (color: ", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_ShowColor__WEBPACK_IMPORTED_MODULE_1__["default"], {
      color: entity.color,
      width: 15,
      height: 15
    }), ")"));
  }
  constructor(props) {
    super(props);
    this.state = {
      displayColorPicker: false
    };
  }
  render() {
    const {
      displayColorPicker
    } = this.state;
    const {
      entity,
      onChange
    } = this.props;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "properties-section"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Color"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_ColorPickerTrigger__WEBPACK_IMPORTED_MODULE_2__["default"], {
      displayColorPicker: displayColorPicker,
      containerStyles: {
        border: '1px dashed #000'
      },
      color: entity.color,
      onClickColorTrigger: () => this.setState({
        displayColorPicker: true
      }),
      onCloseColorPicker: () => this.setState({
        displayColorPicker: false
      }),
      onInputChange: colorInputValue => colorInputValue !== entity.color && onChange({
        _id: entity._id,
        color: colorInputValue
      }),
      onChangeSelectionColor: colorHex => onChange({
        _id: entity._id,
        color: colorHex
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Description"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("textarea", {
      rows: "4",
      style: {
        resize: 'vertical'
      },
      value: entity.description || '',
      onChange: v => onChange({
        _id: entity._id,
        description: v.target.value
      })
    })));
  }
}

/***/ }),
/* 21 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _ShowColor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_3__);




const EntityRefSelect = (jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().EntityRefSelect);
const sharedComponents = (jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().sharedComponents);
const selectValues = selected => {
  const tags = selected.map(v => {
    return {
      shortid: v.shortid
    };
  });
  return tags;
};
class EntityTagProperties extends react__WEBPACK_IMPORTED_MODULE_1__.Component {
  static getSelectedTags(entity, entities) {
    const getNameAndColor = t => {
      const foundTags = Object.keys(entities).map(k => entities[k]).filter(tg => tg.shortid === t.shortid);
      return foundTags.length ? {
        name: foundTags[0].name,
        color: foundTags[0].color
      } : {
        name: '',
        color: undefined
      };
    };
    return (entity.tags || []).map(t => ({
      ...t,
      ...getNameAndColor(t)
    }));
  }
  static title(entity, entities) {
    if (!entity.tags || !entity.tags.length) {
      return 'tags';
    }
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", null, "tags:\xA0", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", null, EntityTagProperties.getSelectedTags(entity, entities).map((t, tIndex, allSelectTags) => {
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", {
        key: t.shortid,
        style: {
          display: 'inline-block',
          marginRight: '2px'
        }
      }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_ShowColor__WEBPACK_IMPORTED_MODULE_2__["default"], {
        color: t.color,
        width: 12,
        height: 15
      }), "\xA0", t.name, tIndex === allSelectTags.length - 1 ? '' : ',');
    })));
  }
  componentDidMount() {
    this.removeInvalidTagReferences();
  }
  componentDidUpdate() {
    this.removeInvalidTagReferences();
  }
  removeInvalidTagReferences() {
    const {
      entity,
      entities,
      onChange
    } = this.props;
    if (!entity.tags) {
      return;
    }
    const updatedTags = entity.tags.filter(t => Object.keys(entities).filter(k => entities[k].__entitySet === 'tags' && entities[k].shortid === t.shortid).length);
    if (updatedTags.length !== entity.tags.length) {
      onChange({
        _id: entity._id,
        tags: updatedTags
      });
    }
  }
  render() {
    const {
      entity,
      onChange
    } = this.props;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "properties-section"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(EntityRefSelect, {
      headingLabel: "Select tags",
      newLabel: "New tag for template",
      filter: references => ({
        tags: references.tags
      }),
      value: entity.tags ? entity.tags.map(t => t.shortid) : [],
      onChange: selected => onChange({
        _id: entity._id,
        tags: selectValues(selected)
      }),
      renderNew: modalProps => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(sharedComponents.NewTagModal, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, modalProps, {
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
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (EntityTagProperties);

/***/ }),
/* 22 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _TagEntityTreeButtonToolbar_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(8);


class TagEntityTreeOrganizeButtonToolbar extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.handleOrganizationModeChange = this.handleOrganizationModeChange.bind(this);
  }
  handleOrganizationModeChange(ev) {
    ev.stopPropagation();
    const {
      setGroupMode
    } = this.props;
    setGroupMode(currentGroupMode => {
      return currentGroupMode === 'tags' ? null : 'tags';
    });
    this.props.closeMenu();
  }
  render() {
    const {
      groupMode
    } = this.props;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      title: "Group and organize entities tree by tag",
      style: {
        display: 'inline-block'
      },
      onClick: this.handleOrganizationModeChange
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        display: 'inline-block',
        marginRight: '0.3rem'
      },
      className: groupMode === 'tags' ? _TagEntityTreeButtonToolbar_css__WEBPACK_IMPORTED_MODULE_1__["default"].active : ''
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      className: "fa fa-tags"
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        display: 'inline-block'
      }
    }, "Group by tag"));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TagEntityTreeOrganizeButtonToolbar);

/***/ }),
/* 23 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _organizeState__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(9);
/* harmony import */ var _emitter__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(10);
/* harmony import */ var _TagEntityTreeFilterByTags__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(25);
/* harmony import */ var _TagEntityTreeButtonToolbar_css__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(8);






class TagEntityTreeFilterButtonToolbar extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.state = {
      showFilter: false,
      selectedTags: _organizeState__WEBPACK_IMPORTED_MODULE_2__.values.filterTags || []
    };
    this.handleFilterClick = this.handleFilterClick.bind(this);
    this.handleCloseFilter = this.handleCloseFilter.bind(this);
    this.handleTagSelectChange = this.handleTagSelectChange.bind(this);
  }
  handleFilterClick(ev) {
    ev.stopPropagation();
    this.setState({
      showFilter: true
    });
  }
  handleCloseFilter() {
    this.setState({
      showFilter: false
    });
    this.props.closeMenu();
  }
  handleTagSelectChange(selectedTags) {
    const {
      setFilter
    } = this.props;
    setFilter({
      tags: selectedTags
    });
    this.setState({
      selectedTags
    }, () => {
      _emitter__WEBPACK_IMPORTED_MODULE_3__["default"].emit('filterByTagsChanged', selectedTags);
    });
  }
  render() {
    const {
      showFilter,
      selectedTags
    } = this.state;
    const allTags = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getReferences().tags;
    const isActive = selectedTags.length > 0;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      title: "Filter entities tree by tag",
      style: {
        display: 'inline-block'
      },
      onClick: this.handleFilterClick
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        display: 'inline-block'
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        display: 'inline-block',
        marginRight: '0.3rem'
      },
      className: isActive ? _TagEntityTreeButtonToolbar_css__WEBPACK_IMPORTED_MODULE_5__["default"].active : ''
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      className: "fa fa-filter"
    }), "\xA0", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      className: "fa fa-tag"
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      style: {
        display: 'inline-block'
      }
    }, "Filter by tag")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__.Popover, {
      open: showFilter,
      onClose: this.handleCloseFilter
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_TagEntityTreeFilterByTags__WEBPACK_IMPORTED_MODULE_4__["default"], {
      tags: allTags,
      selectedTags: selectedTags,
      onTagSelectChange: this.handleTagSelectChange,
      onFilterClose: this.handleCloseFilter
    })));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TagEntityTreeFilterButtonToolbar);

/***/ }),
/* 24 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
//      
// An event handler can take an optional event argument
// and should not return a value
                                          
                                                               

// An array of all currently registered event handlers for a type
                                            
                                                            
// A map of event types and their corresponding event handlers.
                        
                                 
                                   
  

/** Mitt: Tiny (~200b) functional event emitter / pubsub.
 *  @name mitt
 *  @returns {Mitt}
 */
function mitt(all                 ) {
	all = all || Object.create(null);

	return {
		/**
		 * Register an event handler for the given type.
		 *
		 * @param  {String} type	Type of event to listen for, or `"*"` for all events
		 * @param  {Function} handler Function to call in response to given event
		 * @memberOf mitt
		 */
		on: function on(type        , handler              ) {
			(all[type] || (all[type] = [])).push(handler);
		},

		/**
		 * Remove an event handler for the given type.
		 *
		 * @param  {String} type	Type of event to unregister `handler` from, or `"*"`
		 * @param  {Function} handler Handler function to remove
		 * @memberOf mitt
		 */
		off: function off(type        , handler              ) {
			if (all[type]) {
				all[type].splice(all[type].indexOf(handler) >>> 0, 1);
			}
		},

		/**
		 * Invoke all handlers for the given type.
		 * If present, `"*"` handlers are invoked after type-matched handlers.
		 *
		 * @param {String} type  The event type to invoke
		 * @param {Any} [evt]  Any value (object is recommended and powerful), passed to each handler
		 * @memberOf mitt
		 */
		emit: function emit(type        , evt     ) {
			(all[type] || []).slice().map(function (handler) { handler(evt); });
			(all['*'] || []).slice().map(function (handler) { handler(type, evt); });
		}
	};
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (mitt);
//# mitt.es.js.map


/***/ }),
/* 25 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_list__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(26);
/* harmony import */ var react_list__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_list__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _colorLuminance__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6);
/* harmony import */ var _getColorLuminance__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(27);
/* harmony import */ var _ShowColor__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2);
/* harmony import */ var _TagEntityTreeFilterByTags_css__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(29);






class TagEntityTreeFilterByTags extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.tagSelectionRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.tagSelectionInputRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.tagListRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.state = {
      showTagsList: true,
      filterText: ''
    };
    this.createRenderer = this.createRenderer.bind(this);
    this.addSelectedTag = this.addSelectedTag.bind(this);
    this.handleTagSelectionClick = this.handleTagSelectionClick.bind(this);
    this.handleChangeInputTag = this.handleChangeInputTag.bind(this);
    this.handleKeyDownInputTag = this.handleKeyDownInputTag.bind(this);
    this.onRemoveTagItem = this.onRemoveTagItem.bind(this);
  }
  componentDidMount() {
    this.focus();
  }
  createRenderer(tags) {
    return (index, key) => this.renderTagItem(tags[index]);
  }
  addSelectedTag(tag) {
    const previousSelectedTags = this.props.selectedTags;
    const selectedTags = [...previousSelectedTags, tag];
    this.props.onTagSelectChange(selectedTags);
    this.focus();
  }
  focus() {
    if (this.tagSelectionInputRef.current && typeof this.tagSelectionInputRef.current.focus === 'function') {
      this.tagSelectionInputRef.current.focus();
    }
  }
  getTagsToShow(allTags, selectedTags, filterText) {
    if (selectedTags.length === 0 && filterText === '') {
      return allTags;
    }
    return allTags.filter(tag => {
      let filterPass = true;
      if (filterText !== '') {
        filterPass = tag.name.indexOf(filterText) !== -1;
      }
      if (!filterPass) {
        return false;
      }
      const foundInSelectedTags = selectedTags.some(selectTag => {
        return selectTag.shortid === tag.shortid;
      });
      return !foundInSelectedTags;
    });
  }
  handleTagSelectionClick(ev) {
    // if the tag selection area is directly clicked
    // focus the input
    if (ev.target === this.tagSelectionRef.current) {
      this.focus();
    }
  }
  handleChangeInputTag(ev) {
    this.setState({
      filterText: ev.target.value
    });
  }
  handleKeyDownInputTag(ev) {
    if (ev.defaultPrevented) {
      return;
    }
    const keyCode = ev.keyCode;
    const inputTag = ev.target;
    let remove = false;
    const enterKey = 13;
    const removeKey = 8;
    if (keyCode === enterKey) {
      ev.preventDefault();
      return this.props.onFilterClose();
    }
    if (keyCode === removeKey) {
      remove = true;
    }
    if (remove && inputTag.value === '') {
      const selectedTags = this.props.selectedTags;
      const selectedTagsLastIndex = selectedTags.length - 1;
      ev.preventDefault();
      if (selectedTagsLastIndex >= 0) {
        this.onRemoveTagItem(selectedTags[selectedTagsLastIndex], selectedTagsLastIndex);
      }
    }
  }
  onRemoveTagItem(tag, tagIndex) {
    const originalSelectedTags = this.props.selectedTags;
    const selectedTags = [...originalSelectedTags.slice(0, tagIndex), ...originalSelectedTags.slice(tagIndex + 1)];
    this.props.onTagSelectChange(selectedTags);
  }
  renderTagItem(tag) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      key: tag.shortid,
      className: _TagEntityTreeFilterByTags_css__WEBPACK_IMPORTED_MODULE_5__["default"].tagsListItem,
      onClick: () => this.addSelectedTag(tag)
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_ShowColor__WEBPACK_IMPORTED_MODULE_4__["default"], {
      color: tag.color
    }), "\xA0", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, tag.name));
  }
  render() {
    const {
      showTagsList,
      filterText
    } = this.state;
    const {
      tags,
      selectedTags
    } = this.props;
    const tagsToShowInList = this.getTagsToShow(tags, selectedTags, filterText);
    const stylesForTagsList = {};
    const stylesForInputTag = {};
    if (showTagsList) {
      stylesForTagsList.display = 'block';
    } else {
      stylesForTagsList.display = 'none';
    }
    if (selectedTags.length === 0) {
      stylesForInputTag.width = '100%';
    }
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _TagEntityTreeFilterByTags_css__WEBPACK_IMPORTED_MODULE_5__["default"].searchTagsContainer
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _TagEntityTreeFilterByTags_css__WEBPACK_IMPORTED_MODULE_5__["default"].searchTagsInputBox
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: _TagEntityTreeFilterByTags_css__WEBPACK_IMPORTED_MODULE_5__["default"].searchTagsInputBoxIcon
    }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      ref: this.tagSelectionRef,
      className: _TagEntityTreeFilterByTags_css__WEBPACK_IMPORTED_MODULE_5__["default"].tagsSelect,
      onClick: this.handleTagSelectionClick
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, selectedTags.map((tag, tagIndex) => {
      const tagStyles = {
        backgroundColor: tag.color,
        borderColor: (0,_colorLuminance__WEBPACK_IMPORTED_MODULE_2__["default"])(tag.color, -0.35),
        color: (0,_getColorLuminance__WEBPACK_IMPORTED_MODULE_3__["default"])(tag.color) >= 0.5 ? '#000' : '#fff'
      };
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
        key: tag.shortid,
        className: _TagEntityTreeFilterByTags_css__WEBPACK_IMPORTED_MODULE_5__["default"].tagsSelectItem,
        style: tagStyles
      }, tag.name, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("a", {
        className: _TagEntityTreeFilterByTags_css__WEBPACK_IMPORTED_MODULE_5__["default"].tagsSelectItemRemove,
        onClick: () => this.onRemoveTagItem(tag, tagIndex)
      }));
    }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      ref: this.tagSelectionInputRef,
      type: "text",
      placeholder: selectedTags.length === 0 ? 'select a tag' : '',
      className: _TagEntityTreeFilterByTags_css__WEBPACK_IMPORTED_MODULE_5__["default"].searchTags,
      style: stylesForInputTag,
      onChange: this.handleChangeInputTag,
      onKeyDown: this.handleKeyDownInputTag
    })))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      ref: this.tagListRef,
      className: _TagEntityTreeFilterByTags_css__WEBPACK_IMPORTED_MODULE_5__["default"].tagsListContainer,
      style: stylesForTagsList
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _TagEntityTreeFilterByTags_css__WEBPACK_IMPORTED_MODULE_5__["default"].tagsList
    }, tags.length === 0 ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _TagEntityTreeFilterByTags_css__WEBPACK_IMPORTED_MODULE_5__["default"].tagsListEmpty
    }, "No tags registered") : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react_list__WEBPACK_IMPORTED_MODULE_1___default()), {
      itemRenderer: this.createRenderer(tagsToShowInList),
      length: tagsToShowInList.length
    }))));
  }
}
TagEntityTreeFilterByTags.defaultProps = {
  onTagSelectChange: () => {}
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TagEntityTreeFilterByTags);

/***/ }),
/* 26 */
/***/ ((module) => {

"use strict";
module.exports = Studio.libraries['react-list'];

/***/ }),
/* 27 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _hexToRgb__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(28);

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (hex => {
  const rgb = (0,_hexToRgb__WEBPACK_IMPORTED_MODULE_0__["default"])(hex);
  let R, G, B;
  const RsRGB = rgb.r / 255;
  const GsRGB = rgb.g / 255;
  const BsRGB = rgb.b / 255;
  if (RsRGB <= 0.03928) {
    R = RsRGB / 12.92;
  } else {
    R = Math.pow((RsRGB + 0.055) / 1.055, 2.4);
  }
  if (GsRGB <= 0.03928) {
    G = GsRGB / 12.92;
  } else {
    G = Math.pow((GsRGB + 0.055) / 1.055, 2.4);
  }
  if (BsRGB <= 0.03928) {
    B = BsRGB / 12.92;
  } else {
    B = Math.pow((BsRGB + 0.055) / 1.055, 2.4);
  }
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
});

/***/ }),
/* 28 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (hex => {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const fullHex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
});

/***/ }),
/* 29 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// extracted by mini-css-extract-plugin
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({"searchTagsContainer":"x-tags-TagEntityTreeFilterByTags-searchTagsContainer","searchTagsInputBox":"x-tags-TagEntityTreeFilterByTags-searchTagsInputBox","searchTagsInputBoxIcon":"x-tags-TagEntityTreeFilterByTags-searchTagsInputBoxIcon fa fa-tag","searchTags":"x-tags-TagEntityTreeFilterByTags-searchTags","tagsListContainer":"x-tags-TagEntityTreeFilterByTags-tagsListContainer","tagsList":"x-tags-TagEntityTreeFilterByTags-tagsList","tagsListEmpty":"x-tags-TagEntityTreeFilterByTags-tagsListEmpty","tagsListItem":"x-tags-TagEntityTreeFilterByTags-tagsListItem","tagsSelect":"x-tags-TagEntityTreeFilterByTags-tagsSelect","tagsSelectItem":"x-tags-TagEntityTreeFilterByTags-tagsSelectItem","tagsSelectItemRemove":"x-tags-TagEntityTreeFilterByTags-tagsSelectItemRemove"});

/***/ }),
/* 30 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _ShowColor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);



const useEntitiesSelector = jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().createUseEntitiesSelector();
class TagEntityTreeItem extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  render() {
    const {
      entity
    } = this.props;
    let entityTags = entity.tags || [];

    // for tags, display the color right in the entity tree
    if (entity.__entitySet === 'tags') {
      entityTags = [entity];
    }
    const tagsLength = entityTags.length;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      style: {
        display: 'inline-block',
        marginLeft: '0.2rem',
        marginRight: '0.2rem'
      }
    }, entityTags.map((entityTag, tagIndex) => {
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(TagInfo, {
        key: entityTag.shortid,
        shortid: entityTag.shortid
      }, tagIndex !== tagsLength - 1 ? ' ' : null);
    }));
  }
}
const TagInfo = _ref => {
  let {
    shortid,
    children
  } = _ref;
  const tag = useEntitiesSelector(entities => entities.tags.find(t => t.shortid === shortid));
  if (tag == null) {
    return null;
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
    title: tag.name
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_ShowColor__WEBPACK_IMPORTED_MODULE_2__["default"], {
    color: tag.color,
    width: 8,
    height: 15
  }), children);
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TagEntityTreeItem);

/***/ }),
/* 31 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _ShowColor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);
/* harmony import */ var _findTagInSet__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(11);




class TagEntityTreeTagGroupItem extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  render() {
    const {
      __entitySet
    } = this.props;
    if (__entitySet !== 'tags' && __entitySet !== 'folders') {
      return null;
    }
    let tags = [];
    if (__entitySet === 'tags') {
      tags.push({
        name: this.props.name,
        shortid: this.props.shortid,
        color: this.props.color
      });
    } else {
      tags = this.props.tags || [];
      tags = tags.map(t => {
        return (0,_findTagInSet__WEBPACK_IMPORTED_MODULE_3__["default"])(jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().getReferences().tags, t.shortid);
      });
    }
    const tagsLength = tags.length;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      style: {
        display: 'inline-block',
        marginLeft: '0.2rem',
        marginRight: '0.2rem'
      }
    }, tags.map((tag, tagIndex) => {
      if (!tag) {
        return null;
      }
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
        key: tag.shortid,
        title: tag.name
      }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_ShowColor__WEBPACK_IMPORTED_MODULE_2__["default"], {
        color: tag.color,
        width: 8,
        height: 15
      }), tagIndex !== tagsLength - 1 ? ' ' : null);
    }));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TagEntityTreeTagGroupItem);

/***/ }),
/* 32 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((entity, entitySets, filterInfo) => {
  const {
    tags
  } = filterInfo;
  const allTagsInEntity = entity.tags || [];
  if (tags == null) {
    return true;
  }
  if (tags.length > 0) {
    return tags.every(tag => {
      return allTagsInEntity.some(tagInEntity => tagInEntity.shortid === tag.shortid);
    });
  }
  return true;
});

/***/ }),
/* 33 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ createGroupEntitiesByTags)
/* harmony export */ });
/* harmony import */ var _findTagInSet__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(11);

const {
  noTagGroupName,
  tagsGroupName
} = __webpack_require__(34);
function createGroupEntitiesByTags() {
  const tagsCache = new WeakMap();
  return (entitySets, entities, helpers) => {
    const entitySetsNames = helpers.getSetsToRender(entitySets);
    const result = groupEntitiesByTags(entitySetsNames, entities, helpers, {
      tagsCache
    });
    return result;
  };
}
function groupEntitiesByTags(entitySetsNames, entities, helpers, _ref) {
  let {
    tagsCache
  } = _ref;
  const newItems = [];
  // eslint-disable-next-line
  const allTagsEntities = [...(Studio.getReferences().tags || [])];
  const tagsByShortidMap = new Map();
  if (entities.tags != null) {
    for (const currentTagFromAll of allTagsEntities) {
      const foundIndex = entities.tags.findIndex(f => f._id === currentTagFromAll._id);
      const foundEntity = foundIndex !== -1 ? entities.tags[foundIndex] : undefined;
      let tagEntity = foundEntity;
      if (currentTagFromAll !== foundEntity) {
        tagEntity = setOrGetFromCache(tagsCache, [currentTagFromAll, foundEntity], (t1, t2) => {
          console.log('creating new tag entity');
          return {
            ...t1,
            ...t2
          };
        });
      }
      if (tagEntity != null) {
        tagsByShortidMap.set(tagEntity.shortid, tagEntity);
      }
    }
  }
  const entitiesByTagAndType = {};
  const entitiesByTypeWithoutTag = {};

  // initialize all tag groups based on all tag entities
  for (const entityTag of allTagsEntities) {
    groupEntityByTagAndType(entitiesByTagAndType, tagsByShortidMap, entityTag);
  }
  for (const entitySetName of entitySetsNames) {
    if (entitySetName === 'tags') {
      continue;
    }
    const entitiesInSet = entities[entitySetName];
    if (!entitiesInSet) {
      continue;
    }
    const entitiesInSetCount = entitiesInSet.length;
    for (let j = 0; j < entitiesInSetCount; j++) {
      const entity = entitiesInSet[j];
      if (entity.tags != null) {
        groupEntityByTagAndType(entitiesByTagAndType, tagsByShortidMap, entity);
      } else {
        entitiesByTypeWithoutTag[entity.__entitySet] = entitiesByTypeWithoutTag[entity.__entitySet] || [];
        entitiesByTypeWithoutTag[entity.__entitySet].push(entity);
      }
    }
  }
  const context = {
    tagsByShortidMap,
    helpers
  };
  addItemsByTag(newItems, entitySetsNames, allTagsEntities, entities.tags, entitiesByTagAndType, entitiesByTypeWithoutTag, context);
  return newItems;
}
function setOrGetFromCache(cache, _keys, initFn, cacheCheck) {
  const keys = (Array.isArray(_keys) ? _keys : [_keys]).filter(_key => _key != null);
  const matchedIndex = keys.findIndex(k => cache.has(k));
  const shouldInit = cacheCheck == null ? matchedIndex === -1 : cacheCheck(...keys);
  if (shouldInit) {
    const newItem = initFn(...keys);
    for (const key of keys) {
      cache.set(key, newItem);
    }
    return newItem;
  }
  return cache.get(keys[matchedIndex]);
}
function groupEntityByTagAndType(collection, tagsByShortidMap, entity) {
  if (entity.__entitySet === 'tags') {
    collection[entity.shortid] = collection[entity.shortid] || {};
  } else if (entity.tags != null) {
    for (const tag of entity.tags) {
      const tagFound = (0,_findTagInSet__WEBPACK_IMPORTED_MODULE_0__["default"])(tagsByShortidMap, tag.shortid);
      if (tagFound) {
        const shortid = tagFound.shortid;
        collection[shortid] = collection[shortid] || {};
        collection[shortid][entity.__entitySet] = collection[shortid][entity.__entitySet] || [];
        collection[shortid][entity.__entitySet].push(entity);
      }
    }
  }
}
function addItemsByTag(newItems, entitySetsNames, allTagEntities, currentTagEntities, entitiesByTagAndType, entitiesByTypeWithoutTag, context) {
  const tagsWithNoEntities = [];
  const {
    tagsByShortidMap
  } = context;
  const {
    getNodeId,
    checkIsGroupNode,
    checkIsGroupEntityNode
  } = context.helpers;
  for (const t of allTagEntities) {
    const tag = tagsByShortidMap.get(t.shortid);
    const tagName = tag.name;
    const entitiesByType = entitiesByTagAndType[tag.shortid];
    const typesInTag = Object.keys(entitiesByType);
    if (typesInTag.length === 0 || typesInTag.every(type => entitiesByType[type].length > 0) === false) {
      tagsWithNoEntities.push(tag);
      continue;
    }
    let tagItem;
    for (const type of entitySetsNames) {
      if (type === 'tags') {
        continue;
      }
      const entities = entitiesByType[type];
      if (!tagItem) {
        tagItem = {
          name: tagName,
          isGroup: true,
          data: tag,
          items: []
        };
        newItems.push(tagItem);
      }
      if (!entities || entities.length === 0) {
        tagItem.items.push({
          name: type,
          isEntitySet: true,
          items: []
        });
        continue;
      }
      const typeItem = {
        name: type,
        isEntitySet: true,
        items: []
      };
      for (const entity of entities) {
        typeItem.items.push({
          name: entity.name,
          data: entity
        });
      }
      tagItem.items.push(typeItem);
    }
  }
  for (const t of tagsWithNoEntities) {
    const tag = tagsByShortidMap.get(t.shortid);
    const tagItem = {
      name: tag.name,
      isGroup: true,
      data: tag,
      items: []
    };
    for (const type of entitySetsNames) {
      if (type === 'tags') {
        continue;
      }
      tagItem.items.push({
        name: type,
        isEntitySet: true,
        items: []
      });
    }
    newItems.push(tagItem);
  }
  const noTagsItem = {
    name: noTagGroupName,
    isGroup: true,
    items: []
  };
  for (const type of entitySetsNames) {
    if (type === 'tags') {
      continue;
    }
    const item = {
      name: type,
      isEntitySet: true,
      items: []
    };
    const entities = entitiesByTypeWithoutTag[type];
    if (entities) {
      for (const entity of entities) {
        item.items.push({
          name: entity.name,
          data: entity
        });
      }
    }
    noTagsItem.items.push(item);
  }
  newItems.push(noTagsItem);
  const tagsItem = {
    name: tagsGroupName,
    isEntitySet: true,
    items: []
  };
  if (currentTagEntities) {
    for (const t of currentTagEntities) {
      const tag = tagsByShortidMap.get(t.shortid);
      tagsItem.items.push({
        name: tag.name,
        data: tag
      });
    }
  }
  newItems.push(tagsItem);
  const toProcess = [{
    parentId: null,
    items: newItems,
    depth: 0
  }];
  while (toProcess.length > 0) {
    const {
      parentId,
      depth,
      items
    } = toProcess.shift();
    for (const item of items) {
      var _item$data;
      const isGroupEntityNode = checkIsGroupEntityNode(item);
      const isGroupNode = checkIsGroupNode(item);
      const isOnlyGroupNode = isGroupNode && !isGroupEntityNode;

      // this will make tag groups with same name different
      item.id = getNodeId(item.name, isOnlyGroupNode && ((_item$data = item.data) === null || _item$data === void 0 ? void 0 : _item$data.shortid) == null ? null : item.data, parentId, depth);
      if (item.items != null && item.items.length > 0) {
        toProcess.push({
          parentId: item.id,
          items: item.items,
          depth: depth + 1
        });
      }
    }
  }
}

/***/ }),
/* 34 */
/***/ ((module) => {

const noTagGroupName = '(objects without tag)';
const tagsGroupName = 'tags';
const reservedTagNames = [noTagGroupName, tagsGroupName];
module.exports["default"] = reservedTagNames;
module.exports.noTagGroupName = noTagGroupName;
module.exports.tagsGroupName = tagsGroupName;

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
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
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
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _NewTagModal__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(13);
/* harmony import */ var _TagEditor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(19);
/* harmony import */ var _TagProperties__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(20);
/* harmony import */ var _EntityTagProperties__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(21);
/* harmony import */ var _TagEntityTreeOrganizeButtonToolbar__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(22);
/* harmony import */ var _TagEntityTreeFilterButtonToolbar__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(23);
/* harmony import */ var _TagEntityTreeItem__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(30);
/* harmony import */ var _TagEntityTreeTagGroupItem__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(31);
/* harmony import */ var _emitter__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(10);
/* harmony import */ var _organizeState__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(9);
/* harmony import */ var _filterItemWithTagsStrategy__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(32);
/* harmony import */ var _groupEntitiesByTags__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(33);













jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addEntitySet({
  name: 'tags',
  faIcon: 'fa-tag',
  visibleName: 'tag',
  onNew: options => jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().openModal(_NewTagModal__WEBPACK_IMPORTED_MODULE_1__["default"], options),
  helpUrl: 'http://jsreport.net/learn/tags',
  referenceAttributes: ['color'],
  entityTreePosition: 300
});
(jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().sharedComponents).NewTagModal = _NewTagModal__WEBPACK_IMPORTED_MODULE_1__["default"];

// wait for all extensions to be loaded
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().initializeListeners.push(() => {
  // add tags to referenceAttributes in all entities
  Object.keys((jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().entitySets)).forEach(entitySetName => {
    const entitySet = (jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().entitySets)[entitySetName];

    // ignore tags entity set
    if (entitySet.name === 'tags') {
      return;
    }
    if (entitySet.referenceAttributes.indexOf('tags') === -1) {
      entitySet.referenceAttributes.push('tags');
    }
  });
});

// eslint-disable-next-line no-import-assign
_emitter__WEBPACK_IMPORTED_MODULE_9__["default"].on('filterByTagsChanged', selectedTags => {
  _organizeState__WEBPACK_IMPORTED_MODULE_10__.values.filterTags = selectedTags;
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addEntityTreeGroupMode('tags', {
  createGrouper: _groupEntitiesByTags__WEBPACK_IMPORTED_MODULE_12__["default"]
});
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addEditorComponent('tags', _TagEditor__WEBPACK_IMPORTED_MODULE_2__["default"]);
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addPropertiesComponent(_TagProperties__WEBPACK_IMPORTED_MODULE_3__["default"].title, _TagProperties__WEBPACK_IMPORTED_MODULE_3__["default"], entity => entity.__entitySet === 'tags');
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addPropertiesComponent(_EntityTagProperties__WEBPACK_IMPORTED_MODULE_4__["default"].title, _EntityTagProperties__WEBPACK_IMPORTED_MODULE_4__["default"], entity => entity.__entitySet !== 'tags');
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addEntityTreeToolbarComponent(_TagEntityTreeFilterButtonToolbar__WEBPACK_IMPORTED_MODULE_6__["default"], 'group');
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addEntityTreeToolbarComponent(_TagEntityTreeOrganizeButtonToolbar__WEBPACK_IMPORTED_MODULE_5__["default"], 'group');
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addEntityTreeItemComponent(_TagEntityTreeItem__WEBPACK_IMPORTED_MODULE_7__["default"]);
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().addEntityTreeItemComponent(_TagEntityTreeTagGroupItem__WEBPACK_IMPORTED_MODULE_8__["default"], 'groupRight');
jsreport_studio__WEBPACK_IMPORTED_MODULE_0___default().entityTreeFilterItemResolvers.push(_filterItemWithTagsStrategy__WEBPACK_IMPORTED_MODULE_11__["default"]);
})();

/******/ })()
;