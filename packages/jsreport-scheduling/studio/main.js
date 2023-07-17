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
/***/ ((module) => {

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
  return value != null && (type == 'object' || type == 'function');
}

module.exports = isObject;


/***/ }),
/* 3 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var freeGlobal = __webpack_require__(10);

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

module.exports = root;


/***/ }),
/* 4 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var root = __webpack_require__(3);

/** Built-in value references. */
var Symbol = root.Symbol;

module.exports = Symbol;


/***/ }),
/* 5 */
/***/ ((module, exports) => {


/**
 * Get the ordinal number with suffix from `n`
 *
 * @api public
 * @param {Number} n
 * @return {String}
 */
exports = module.exports = function (n) {
  return n + exports.suffix(+n);
};

/**
 * Get the suffix for the given `n`
 *
 * @api private
 * @param {Number} n
 * @return {String}
 */
exports.suffix = function (n) {
  n %= 100
  return Math.floor(n / 10) === 1
      ? 'th'
      : (n % 10 === 1
        ? 'st'
        : (n % 10 === 2
          ? 'nd'
          : (n % 10 === 3
            ? 'rd'
            : 'th')));
};


/***/ }),
/* 6 */
/***/ (function(module) {

!function(e,t){ true?module.exports=t():0}("undefined"!=typeof self?self:this,function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=4)}([function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=n(1),o=n(2),i=function(){function e(t,n){this.expression=t,this.options=n,this.expressionParts=new Array(5),e.locales[n.locale]?this.i18n=e.locales[n.locale]:(console.warn("Locale '"+n.locale+"' could not be found; falling back to 'en'."),this.i18n=e.locales.en),void 0===n.use24HourTimeFormat&&(n.use24HourTimeFormat=this.i18n.use24HourTimeFormatByDefault())}return e.toString=function(t,n){var r=void 0===n?{}:n,o=r.throwExceptionOnParseError,i=void 0===o||o,s=r.verbose,a=void 0!==s&&s,u=r.dayOfWeekStartIndexZero,c=void 0===u||u,f=r.use24HourTimeFormat,p=r.locale;return new e(t,{throwExceptionOnParseError:i,verbose:a,dayOfWeekStartIndexZero:c,use24HourTimeFormat:f,locale:void 0===p?"en":p}).getFullDescription()},e.initialize=function(t){e.specialCharacters=["/","-",",","*"],t.load(e.locales)},e.prototype.getFullDescription=function(){var e="";try{var t=new o.CronParser(this.expression,this.options.dayOfWeekStartIndexZero);this.expressionParts=t.parse();var n=this.getTimeOfDayDescription(),r=this.getDayOfMonthDescription(),i=this.getMonthDescription();e+=n+r+this.getDayOfWeekDescription()+i+this.getYearDescription(),e=(e=this.transformVerbosity(e,this.options.verbose)).charAt(0).toLocaleUpperCase()+e.substr(1)}catch(t){if(this.options.throwExceptionOnParseError)throw""+t;e=this.i18n.anErrorOccuredWhenGeneratingTheExpressionD()}return e},e.prototype.getTimeOfDayDescription=function(){var t=this.expressionParts[0],n=this.expressionParts[1],o=this.expressionParts[2],i="";if(r.StringUtilities.containsAny(n,e.specialCharacters)||r.StringUtilities.containsAny(o,e.specialCharacters)||r.StringUtilities.containsAny(t,e.specialCharacters))if(t||!(n.indexOf("-")>-1)||n.indexOf(",")>-1||n.indexOf("/")>-1||r.StringUtilities.containsAny(o,e.specialCharacters))if(!t&&o.indexOf(",")>-1&&-1==o.indexOf("-")&&-1==o.indexOf("/")&&!r.StringUtilities.containsAny(n,e.specialCharacters)){var s=o.split(",");i+=this.i18n.at();for(var a=0;a<s.length;a++)i+=" ",i+=this.formatTime(s[a],n,""),a<s.length-2&&(i+=","),a==s.length-2&&(i+=this.i18n.spaceAnd())}else{var u=this.getSecondsDescription(),c=this.getMinutesDescription(),f=this.getHoursDescription();(i+=u).length>0&&c.length>0&&(i+=", "),(i+=c).length>0&&f.length>0&&(i+=", "),i+=f}else{var p=n.split("-");i+=r.StringUtilities.format(this.i18n.everyMinuteBetweenX0AndX1(),this.formatTime(o,p[0],""),this.formatTime(o,p[1],""))}else i+=this.i18n.atSpace()+this.formatTime(o,n,t);return i},e.prototype.getSecondsDescription=function(){var e=this;return this.getSegmentDescription(this.expressionParts[0],this.i18n.everySecond(),function(e){return e},function(t){return r.StringUtilities.format(e.i18n.everyX0Seconds(),t)},function(t){return e.i18n.secondsX0ThroughX1PastTheMinute()},function(t){return"0"==t?"":parseInt(t)<20?e.i18n.atX0SecondsPastTheMinute():e.i18n.atX0SecondsPastTheMinuteGt20()||e.i18n.atX0SecondsPastTheMinute()})},e.prototype.getMinutesDescription=function(){var e=this,t=this.expressionParts[0];return this.getSegmentDescription(this.expressionParts[1],this.i18n.everyMinute(),function(e){return e},function(t){return r.StringUtilities.format(e.i18n.everyX0Minutes(),t)},function(t){return e.i18n.minutesX0ThroughX1PastTheHour()},function(n){try{return"0"==n&&""==t?"":parseInt(n)<20?e.i18n.atX0MinutesPastTheHour():e.i18n.atX0MinutesPastTheHourGt20()||e.i18n.atX0MinutesPastTheHour()}catch(t){return e.i18n.atX0MinutesPastTheHour()}})},e.prototype.getHoursDescription=function(){var e=this,t=this.expressionParts[2];return this.getSegmentDescription(t,this.i18n.everyHour(),function(t){return e.formatTime(t,"0","")},function(t){return r.StringUtilities.format(e.i18n.everyX0Hours(),t)},function(t){return e.i18n.betweenX0AndX1()},function(t){return e.i18n.atX0()})},e.prototype.getDayOfWeekDescription=function(){var e=this,t=this.i18n.daysOfTheWeek();return"*"==this.expressionParts[5]?"":this.getSegmentDescription(this.expressionParts[5],this.i18n.commaEveryDay(),function(e){var n=e;return e.indexOf("#")>-1?n=e.substr(0,e.indexOf("#")):e.indexOf("L")>-1&&(n=n.replace("L","")),t[parseInt(n)]},function(t){return r.StringUtilities.format(e.i18n.commaEveryX0DaysOfTheWeek(),t)},function(t){return e.i18n.commaX0ThroughX1()},function(t){var n=null;if(t.indexOf("#")>-1){var r=null;switch(t.substring(t.indexOf("#")+1)){case"1":r=e.i18n.first();break;case"2":r=e.i18n.second();break;case"3":r=e.i18n.third();break;case"4":r=e.i18n.fourth();break;case"5":r=e.i18n.fifth()}n=e.i18n.commaOnThe()+r+e.i18n.spaceX0OfTheMonth()}else if(t.indexOf("L")>-1)n=e.i18n.commaOnTheLastX0OfTheMonth();else{n="*"!=e.expressionParts[3]?e.i18n.commaAndOnX0():e.i18n.commaOnlyOnX0()}return n})},e.prototype.getMonthDescription=function(){var e=this,t=this.i18n.monthsOfTheYear();return this.getSegmentDescription(this.expressionParts[4],"",function(e){return t[parseInt(e)-1]},function(t){return r.StringUtilities.format(e.i18n.commaEveryX0Months(),t)},function(t){return e.i18n.commaMonthX0ThroughMonthX1()||e.i18n.commaX0ThroughX1()},function(t){return e.i18n.commaOnlyInX0()})},e.prototype.getDayOfMonthDescription=function(){var e=this,t=null,n=this.expressionParts[3];switch(n){case"L":t=this.i18n.commaOnTheLastDayOfTheMonth();break;case"WL":case"LW":t=this.i18n.commaOnTheLastWeekdayOfTheMonth();break;default:var o=n.match(/(\d{1,2}W)|(W\d{1,2})/);if(o){var i=parseInt(o[0].replace("W","")),s=1==i?this.i18n.firstWeekday():r.StringUtilities.format(this.i18n.weekdayNearestDayX0(),i.toString());t=r.StringUtilities.format(this.i18n.commaOnTheX0OfTheMonth(),s);break}var a=n.match(/L-(\d{1,2})/);if(a){var u=a[1];t=r.StringUtilities.format(this.i18n.commaDaysBeforeTheLastDayOfTheMonth(),u);break}t=this.getSegmentDescription(n,this.i18n.commaEveryDay(),function(t){return"L"==t?e.i18n.lastDay():t},function(t){return"1"==t?e.i18n.commaEveryDay():e.i18n.commaEveryX0Days()},function(t){return e.i18n.commaBetweenDayX0AndX1OfTheMonth()},function(t){return e.i18n.commaOnDayX0OfTheMonth()})}return t},e.prototype.getYearDescription=function(){var e=this;return this.getSegmentDescription(this.expressionParts[6],"",function(e){return/^\d+$/.test(e)?new Date(parseInt(e),1).getFullYear().toString():e},function(t){return r.StringUtilities.format(e.i18n.commaEveryX0Years(),t)},function(t){return e.i18n.commaYearX0ThroughYearX1()||e.i18n.commaX0ThroughX1()},function(t){return e.i18n.commaOnlyInX0()})},e.prototype.getSegmentDescription=function(e,t,n,o,i,s){var a=this,u=null;if(e)if("*"===e)u=t;else if(r.StringUtilities.containsAny(e,["/","-",","]))if(e.indexOf("/")>-1){var c=e.split("/");if(u=r.StringUtilities.format(o(c[1]),n(c[1])),c[0].indexOf("-")>-1)0!=(y=this.generateBetweenSegmentDescription(c[0],i,n)).indexOf(", ")&&(u+=", "),u+=y;else if(!r.StringUtilities.containsAny(c[0],["*",","])){var f=r.StringUtilities.format(s(c[0]),n(c[0]));f=f.replace(", ",""),u+=r.StringUtilities.format(this.i18n.commaStartingX0(),f)}}else if(e.indexOf(",")>-1){c=e.split(",");for(var p="",h=0;h<c.length;h++){var y;if(h>0&&c.length>2&&(p+=",",h<c.length-1&&(p+=" ")),h>0&&c.length>1&&(h==c.length-1||2==c.length)&&(p+=this.i18n.spaceAnd()+" "),c[h].indexOf("-")>-1)p+=y=(y=this.generateBetweenSegmentDescription(c[h],function(e){return a.i18n.commaX0ThroughX1()},n)).replace(", ","");else p+=n(c[h])}u=r.StringUtilities.format(s(e),p)}else e.indexOf("-")>-1&&(u=this.generateBetweenSegmentDescription(e,i,n));else u=r.StringUtilities.format(s(e),n(e));else u="";return u},e.prototype.generateBetweenSegmentDescription=function(e,t,n){var o="",i=e.split("-"),s=n(i[0]),a=n(i[1]);a=a.replace(":00",":59");var u=t(e);return o+=r.StringUtilities.format(u,s,a)},e.prototype.formatTime=function(e,t,n){var r=parseInt(e),o="";this.options.use24HourTimeFormat||(o=r>=12?" PM":" AM",r>12&&(r-=12),0===r&&(r=12));var i=t,s="";return n&&(s=":"+("00"+n).substring(n.length)),("00"+r.toString()).substring(r.toString().length)+":"+("00"+i.toString()).substring(i.toString().length)+s+o},e.prototype.transformVerbosity=function(e,t){return t||(e=(e=(e=(e=e.replace(new RegExp(this.i18n.commaEveryMinute(),"g"),"")).replace(new RegExp(this.i18n.commaEveryHour(),"g"),"")).replace(new RegExp(this.i18n.commaEveryDay(),"g"),"")).replace(/\, ?$/,"")),e},e.locales={},e}();t.ExpressionDescriptor=i},function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=function(){function e(){}return e.format=function(e){for(var t=[],n=1;n<arguments.length;n++)t[n-1]=arguments[n];return e.replace(/%s/g,function(){return t.shift()})},e.containsAny=function(e,t){return t.some(function(t){return e.indexOf(t)>-1})},e}();t.StringUtilities=r},function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=function(){function e(e,t){void 0===t&&(t=!0),this.expression=e,this.dayOfWeekStartIndexZero=t}return e.prototype.parse=function(){var e=this.extractParts(this.expression);return this.normalize(e),this.validate(e),e},e.prototype.extractParts=function(e){if(!this.expression)throw new Error("Expression is empty");var t=e.trim().split(" ");if(t.length<5)throw new Error("Expression has only "+t.length+" part"+(1==t.length?"":"s")+". At least 5 parts are required.");if(5==t.length)t.unshift(""),t.push("");else if(6==t.length)/\d{4}$/.test(t[5])?t.unshift(""):t.push("");else if(t.length>7)throw new Error("Expression has "+t.length+" parts; too many!");return t},e.prototype.normalize=function(e){var t=this;if(e[3]=e[3].replace("?","*"),e[5]=e[5].replace("?","*"),0==e[0].indexOf("0/")&&(e[0]=e[0].replace("0/","*/")),0==e[1].indexOf("0/")&&(e[1]=e[1].replace("0/","*/")),0==e[2].indexOf("0/")&&(e[2]=e[2].replace("0/","*/")),0==e[3].indexOf("1/")&&(e[3]=e[3].replace("1/","*/")),0==e[4].indexOf("1/")&&(e[4]=e[4].replace("1/","*/")),0==e[5].indexOf("1/")&&(e[5]=e[5].replace("1/","*/")),0==e[6].indexOf("1/")&&(e[6]=e[6].replace("1/","*/")),e[5]=e[5].replace(/(^\d)|([^#/\s]\d)/g,function(e){var n=e.replace(/\D/,""),r=n;return t.dayOfWeekStartIndexZero?"7"==n&&(r="0"):r=(parseInt(n)-1).toString(),e.replace(n,r)}),"L"==e[5]&&(e[5]="6"),"?"==e[3]&&(e[3]="*"),e[3].indexOf("W")>-1&&(e[3].indexOf(",")>-1||e[3].indexOf("-")>-1))throw new Error("The 'W' character can be specified only when the day-of-month is a single day, not a range or list of days.");var n={SUN:0,MON:1,TUE:2,WED:3,THU:4,FRI:5,SAT:6};for(var r in n)e[5]=e[5].replace(new RegExp(r,"gi"),n[r].toString());var o={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};for(var i in o)e[4]=e[4].replace(new RegExp(i,"gi"),o[i].toString());"0"==e[0]&&(e[0]=""),/\*|\-|\,|\//.test(e[2])||!/\*|\//.test(e[1])&&!/\*|\//.test(e[0])||(e[2]+="-"+e[2]);for(var s=0;s<e.length;s++)if("*/1"==e[s]&&(e[s]="*"),e[s].indexOf("/")>-1&&!/^\*|\-|\,/.test(e[s])){var a=null;switch(s){case 4:a="12";break;case 5:a="6";break;case 6:a="9999";break;default:a=null}if(null!=a){var u=e[s].split("/");e[s]=u[0]+"-"+a+"/"+u[1]}}},e.prototype.validate=function(e){this.assertNoInvalidCharacters("DOW",e[5]),this.assertNoInvalidCharacters("DOM",e[3])},e.prototype.assertNoInvalidCharacters=function(e,t){var n=t.match(/[A-KM-VX-Z]+/gi);if(n&&n.length)throw new Error(e+" part contains invalid values: '"+n.toString()+"'")},e}();t.CronParser=r},function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=function(){function e(){}return e.prototype.atX0SecondsPastTheMinuteGt20=function(){return null},e.prototype.atX0MinutesPastTheHourGt20=function(){return null},e.prototype.commaMonthX0ThroughMonthX1=function(){return null},e.prototype.commaYearX0ThroughYearX1=function(){return null},e.prototype.use24HourTimeFormatByDefault=function(){return!1},e.prototype.anErrorOccuredWhenGeneratingTheExpressionD=function(){return"An error occured when generating the expression description.  Check the cron expression syntax."},e.prototype.everyMinute=function(){return"every minute"},e.prototype.everyHour=function(){return"every hour"},e.prototype.atSpace=function(){return"At "},e.prototype.everyMinuteBetweenX0AndX1=function(){return"Every minute between %s and %s"},e.prototype.at=function(){return"At"},e.prototype.spaceAnd=function(){return" and"},e.prototype.everySecond=function(){return"every second"},e.prototype.everyX0Seconds=function(){return"every %s seconds"},e.prototype.secondsX0ThroughX1PastTheMinute=function(){return"seconds %s through %s past the minute"},e.prototype.atX0SecondsPastTheMinute=function(){return"at %s seconds past the minute"},e.prototype.everyX0Minutes=function(){return"every %s minutes"},e.prototype.minutesX0ThroughX1PastTheHour=function(){return"minutes %s through %s past the hour"},e.prototype.atX0MinutesPastTheHour=function(){return"at %s minutes past the hour"},e.prototype.everyX0Hours=function(){return"every %s hours"},e.prototype.betweenX0AndX1=function(){return"between %s and %s"},e.prototype.atX0=function(){return"at %s"},e.prototype.commaEveryDay=function(){return", every day"},e.prototype.commaEveryX0DaysOfTheWeek=function(){return", every %s days of the week"},e.prototype.commaX0ThroughX1=function(){return", %s through %s"},e.prototype.first=function(){return"first"},e.prototype.second=function(){return"second"},e.prototype.third=function(){return"third"},e.prototype.fourth=function(){return"fourth"},e.prototype.fifth=function(){return"fifth"},e.prototype.commaOnThe=function(){return", on the "},e.prototype.spaceX0OfTheMonth=function(){return" %s of the month"},e.prototype.lastDay=function(){return"the last day"},e.prototype.commaOnTheLastX0OfTheMonth=function(){return", on the last %s of the month"},e.prototype.commaOnlyOnX0=function(){return", only on %s"},e.prototype.commaAndOnX0=function(){return", and on %s"},e.prototype.commaEveryX0Months=function(){return", every %s months"},e.prototype.commaOnlyInX0=function(){return", only in %s"},e.prototype.commaOnTheLastDayOfTheMonth=function(){return", on the last day of the month"},e.prototype.commaOnTheLastWeekdayOfTheMonth=function(){return", on the last weekday of the month"},e.prototype.commaDaysBeforeTheLastDayOfTheMonth=function(){return", %s days before the last day of the month"},e.prototype.firstWeekday=function(){return"first weekday"},e.prototype.weekdayNearestDayX0=function(){return"weekday nearest day %s"},e.prototype.commaOnTheX0OfTheMonth=function(){return", on the %s of the month"},e.prototype.commaEveryX0Days=function(){return", every %s days"},e.prototype.commaBetweenDayX0AndX1OfTheMonth=function(){return", between day %s and %s of the month"},e.prototype.commaOnDayX0OfTheMonth=function(){return", on day %s of the month"},e.prototype.commaEveryMinute=function(){return", every minute"},e.prototype.commaEveryHour=function(){return", every hour"},e.prototype.commaEveryX0Years=function(){return", every %s years"},e.prototype.commaStartingX0=function(){return", starting %s"},e.prototype.daysOfTheWeek=function(){return["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},e.prototype.monthsOfTheYear=function(){return["January","February","March","April","May","June","July","August","September","October","November","December"]},e}();t.en=r},function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=n(0),o=n(5);r.ExpressionDescriptor.initialize(new o.enLocaleLoader),t.default=r.ExpressionDescriptor;var i=r.ExpressionDescriptor.toString;t.toString=i},function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=n(3),o=function(){function e(){}return e.prototype.load=function(e){e.en=new r.en},e}();t.enLocaleLoader=o}])});

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_list__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(19);
/* harmony import */ var react_list__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_list__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var lodash_debounce__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(8);
/* harmony import */ var lodash_debounce__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(lodash_debounce__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _ScheduleEditor_css__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(20);





let _activeReport;
class ScheduleEditor extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor() {
    super();
    this.state = {
      tasks: [],
      active: null,
      running: false
    };
    this.skip = 0;
    this.top = 50;
    this.pending = 0;
    this.updateNextRun = lodash_debounce__WEBPACK_IMPORTED_MODULE_3___default()(async () => {
      if (this.props.entity.cron) {
        const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().api.get(`/api/scheduling/nextRun/${encodeURIComponent(this.props.entity.cron)}`);
        this.setState({
          nextRun: response
        });
      }
    }, 500);
  }
  static get ActiveReport() {
    return _activeReport;
  }
  onTabActive() {
    this.updateNextRun();
    this.reloadTasks();
  }
  componentWillUnmount() {
    this.updateNextRun.cancel();
  }
  componentDidMount() {
    this.updateNextRun();
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.props.entity.cron !== prevProps.entity.cron) {
      this.updateNextRun();
    }
  }
  async openReport(t) {
    if (t.state === 'success') {
      const reports = await jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().api.get(`/odata/reports?$filter=taskId eq '${t._id}'`);
      const report = reports.value[0];
      if (report.contentType === 'text/html' || report.contentType === 'text/plain' || report.contentType === 'application/pdf' || report.contentType && report.contentType.indexOf('image') !== -1) {
        jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().preview({
          type: 'rawContent',
          data: {
            type: 'url',
            content: `${(jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().rootUrl)}/reports/${report._id}/content`
          },
          completed: true
        });
      } else {
        window.open(`${(jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().rootUrl)}/reports/${report._id}/attachment`, '_self');
      }
      this.setState({
        active: t._id
      });
      _activeReport = report;
    } else {
      _activeReport = null;
      jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().preview({
        type: 'rawContent',
        data: {
          type: 'text/html',
          content: t.error || t.state
        },
        completed: true
      });
      this.setState({
        active: null
      });
    }
  }
  async reloadTasks() {
    this.skip = 0;
    this.top = 50;
    this.pending = 0;
    this.lazyFetch(true);
  }
  async lazyFetch(replace) {
    if (this.loading) {
      return;
    }
    this.loading = true;
    const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().api.get(`/odata/tasks?$orderby=finishDate desc&$count=true&$top=${this.top}&$skip=${this.skip}&$filter=scheduleShortid eq '${this.props.entity.shortid}'`);
    this.skip += this.top;
    this.loading = false;
    let tasks;
    if (replace) {
      tasks = [];
    } else {
      tasks = this.state.tasks;
    }
    this.setState({
      tasks: tasks.concat(response.value),
      count: response['@odata.count']
    });
    if (this.state.tasks.length <= this.pending && response.value.length) {
      this.lazyFetch();
    }
  }
  async runNow() {
    this.setState({
      running: true
    });
    try {
      await jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().api.post('/api/scheduling/runNow', {
        data: {
          scheduleId: this.props.entity._id
        }
      });
      this.updateNextRun();
      this.reloadTasks();
    } finally {
      this.setState({
        running: false
      });
    }
  }
  tryRenderItem(index) {
    const task = this.state.tasks[index];
    if (!task) {
      this.pending = Math.max(this.pending, index);
      this.lazyFetch();
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("tr", {
        key: index
      }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("td", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
        className: "fa fa-spinner fa-spin fa-fw"
      })));
    }
    return this.renderItem(task, index);
  }
  renderItem(task, index) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("tr", {
      key: index,
      className: this.state.active === task._id ? 'active' : '',
      onClick: () => this.openReport(task)
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("td", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      className: _ScheduleEditor_css__WEBPACK_IMPORTED_MODULE_4__["default"].state + ' ' + (task.state === 'error' ? _ScheduleEditor_css__WEBPACK_IMPORTED_MODULE_4__["default"].error : task.state === 'success' ? _ScheduleEditor_css__WEBPACK_IMPORTED_MODULE_4__["default"].success : _ScheduleEditor_css__WEBPACK_IMPORTED_MODULE_4__["default"].canceled)
    }, task.state)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("td", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", {
      className: _ScheduleEditor_css__WEBPACK_IMPORTED_MODULE_4__["default"].value
    }, task.creationDate ? task.creationDate.toLocaleString() : '')), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("td", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _ScheduleEditor_css__WEBPACK_IMPORTED_MODULE_4__["default"].value
    }, task.finishDate ? task.finishDate.toLocaleString() : '')));
  }
  renderItems(items, ref) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("table", {
      className: "table",
      ref: ref
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("thead", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("tr", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("th", null, "state"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("th", null, "start"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("th", null, "finish"))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("tbody", null, items));
  }
  render() {
    const {
      entity
    } = this.props;
    let {
      count,
      nextRun
    } = this.state;
    nextRun = nextRun || entity.nextRun;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "block custom-editor"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h1", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-calendar"
    }), " ", entity.name), nextRun ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, "next run\xA0\xA0"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("small", null, nextRun.toLocaleString()), !this.props.entity.__isNew && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      disabled: this.state.running,
      style: this.state.running ? {
        color: '#c6c6c6'
      } : {},
      className: "button confirmation",
      onClick: () => this.runNow()
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-play"
    }), ' ', /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, this.state.running ? 'Running..' : 'Run now'))) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "Not planned yet. Fill CRON expression and report template in the properties.")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _ScheduleEditor_css__WEBPACK_IMPORTED_MODULE_4__["default"].listContainer + ' block-item'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react_list__WEBPACK_IMPORTED_MODULE_1___default()), {
      type: "uniform",
      itemsRenderer: this.renderItems,
      itemRenderer: index => this.tryRenderItem(index),
      length: count
    })));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ScheduleEditor);

/***/ }),
/* 8 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isObject = __webpack_require__(2),
    now = __webpack_require__(9),
    toNumber = __webpack_require__(11);

/** Error message constants. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

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
        timeWaiting = wait - timeSinceLastCall;

    return maxing
      ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
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
        clearTimeout(timerId);
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

module.exports = debounce;


/***/ }),
/* 9 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var root = __webpack_require__(3);

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

module.exports = now;


/***/ }),
/* 10 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof __webpack_require__.g == 'object' && __webpack_require__.g && __webpack_require__.g.Object === Object && __webpack_require__.g;

module.exports = freeGlobal;


/***/ }),
/* 11 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isObject = __webpack_require__(2),
    isSymbol = __webpack_require__(12);

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

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

module.exports = toNumber;


/***/ }),
/* 12 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseGetTag = __webpack_require__(13),
    isObjectLike = __webpack_require__(16);

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

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
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

module.exports = isSymbol;


/***/ }),
/* 13 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Symbol = __webpack_require__(4),
    getRawTag = __webpack_require__(14),
    objectToString = __webpack_require__(15);

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

module.exports = baseGetTag;


/***/ }),
/* 14 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Symbol = __webpack_require__(4);

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

module.exports = getRawTag;


/***/ }),
/* 15 */
/***/ ((module) => {

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

module.exports = objectToString;


/***/ }),
/* 16 */
/***/ ((module) => {

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
  return value != null && typeof value == 'object';
}

module.exports = isObjectLike;


/***/ }),
/* 17 */
/***/ ((module) => {

var DEFAULT_INTERVAL = ['*'];

var CronValidator = (function() {
    /**
     * Contains the position-to-name mapping of the cron expression
     * @type {Object}
     * @const
     */
    var MeasureOfTimeMap = {
            0: 'minute',
            1: 'hour',
            2: 'dayOfTheMonth',
            3: 'month',
            4: 'dayOfTheWeek'
        },
        /**
         * contains every permissible 'measureOfTime' string constant
         * @const
         * @type {Array}
         */
        MeasureOfTimeValues = Object.keys(MeasureOfTimeMap).map(function (key) {
            return MeasureOfTimeMap[key];
        });

    /**
     * validates a given cron expression (object) for length, then calls validateValue on each value
     * @param {!{
        minute: Array.string,
        hour: Array.string,
        dayOfTheMonth: Array.string,
        month: Array.string,
        dayOfTheWeek: Array.string,
     * }} expression - rich object containing the state of the cron expression
     * @throws {Error} if expression contains more than 5 keys
     */
    var validateExpression = function(expression) {
        // don't care if it's less than 5, we'll just set those to the default '*'
        if (Object.keys(expression).length > 5) {
            throw new Error('Invalid cron expression; limited to 5 values.');
        }

        for (var measureOfTime in expression) {
            if (expression.hasOwnProperty(measureOfTime)) {
                this.validateValue(measureOfTime, expression[measureOfTime]);
            }
        }
    },

    /**
     * validates a given cron expression (string) for length, then calls validateValue on each value
     * @param {!String} expression - an optionally empty string containing at most 5 space delimited expressions.
     * @throws {Error} if the string contains more than 5 space delimited parts.
     */
    validateString = function(expression) {
        var splitExpression = expression.split(' ');

        if (splitExpression.length > 5) {
            throw new Error('Invalid cron expression; limited to 5 values.');
        }

        for (var i = 0; i < splitExpression.length; i++) {
            this.validateValue(MeasureOfTimeMap[i], splitExpression[i]);
        }
    },

    /**
     * validates any given measureOfTime and corresponding value
     * @param {!String} measureOfTime - as expected
     * @param {!String} value - the cron-ish interval specifier
     * @throws {Error} if measureOfTime is bogus
     * @throws {Error} if value contains an unsupported character
     */
    validateValue = function(measureOfTime, value) {
        var validatorObj = {
                minute:        {min: 0, max: 59},
                hour:          {min: 0, max: 23},
                dayOfTheMonth: {min: 1, max: 31},
                month:         {min: 1, max: 12},
                dayOfTheWeek:  {min: 1, max: 7}
            },
            range,
            validChars = /^[0-9*-]/;

        if (!validatorObj[measureOfTime]) {
            throw new Error('Invalid measureOfTime; Valid options are: ' + MeasureOfTimeValues.join(', '));
        }

        if (!validChars.test(value)) {
            throw new Error('Invalid value; Only numbers 0-9, "-", and "*" chars are allowed');
        }

        if (value !== '*') {
            // check to see if value is within range if value is not '*'
            if (value.indexOf('-') >= 0) {
                // value is a range and must be split into high and low
                range = value.split('-');
                if (!range[0] || range[0] < validatorObj[measureOfTime].min) {
                    throw new Error('Invalid value; bottom of range is not valid for "' + measureOfTime + '". Limit is ' + validatorObj[measureOfTime].min + '.');
                }

                if (!range[1] || range[1] > validatorObj[measureOfTime].max) {
                    throw new Error('Invalid value; top of range is not valid for "' + measureOfTime + '". Limit is ' + validatorObj[measureOfTime].max + '.');
                }
            } else {

                if (parseInt(value) < validatorObj[measureOfTime].min) {
                    throw new Error('Invalid value; given value is not valid for "' + measureOfTime + '". Minimum value is "' + validatorObj[measureOfTime].min + '".');
                }
                if (parseInt(value) > validatorObj[measureOfTime].max) {
                    throw new Error('Invalid value; given value is not valid for "' + measureOfTime + '". Maximum value is "' + validatorObj[measureOfTime].max + '".');
                }
            }
        }
    };


    return {
        measureOfTimeValues: MeasureOfTimeValues,
        validateExpression: validateExpression,
        validateString: validateString,
        validateValue: validateValue
    }
}());


/**
 * Initializes a CronBuilder with an optional initial cron expression.
 * @param {String=} initialExpression - if provided, it must be up to 5 space delimited parts
 * @throws {Error} if the initialExpression is bogus
 * @constructor
 */
var CronBuilder = (function() {
    function CronBuilder(initialExpression) {
        var splitExpression,
            expression;

        if (initialExpression) {
            CronValidator.validateString(initialExpression);

            splitExpression = initialExpression.split(' ');
            // check to see if initial expression is valid

            expression = {
                minute:        splitExpression[0] ? [splitExpression[0]] : DEFAULT_INTERVAL,
                hour:          splitExpression[1] ? [splitExpression[1]] : DEFAULT_INTERVAL,
                dayOfTheMonth: splitExpression[2] ? [splitExpression[2]] : DEFAULT_INTERVAL,
                month:         splitExpression[3] ? [splitExpression[3]] : DEFAULT_INTERVAL,
                dayOfTheWeek:  splitExpression[4] ? [splitExpression[4]] : DEFAULT_INTERVAL,
            };
        } else {
            expression = {
                minute: DEFAULT_INTERVAL,
                hour: DEFAULT_INTERVAL,
                dayOfTheMonth: DEFAULT_INTERVAL,
                month: DEFAULT_INTERVAL,
                dayOfTheWeek: DEFAULT_INTERVAL,
            };
        }

        /**
         * builds a working cron expression based on the state of the cron object
         * @returns {string} - working cron expression
         */
        this.build = function () {
            return [
                expression.minute.join(','),
                expression.hour.join(','),
                expression.dayOfTheMonth.join(','),
                expression.month.join(','),
                expression.dayOfTheWeek.join(','),
            ].join(' ');
        };

        /**
         * adds a value to what exists currently (builds)
         * @param {!String} measureOfTime
         * @param {!Number} value
         * @throws {Error} if measureOfTime or value fail validation
         */
        this.addValue = function (measureOfTime, value) {
            CronValidator.validateValue(measureOfTime, value);

            if (expression[measureOfTime].length === 1 && expression[measureOfTime][0] === '*') {
                expression[measureOfTime] = [value];
            } else {
                if (expression[measureOfTime].indexOf(value) < 0) {
                    expression[measureOfTime].push(value);
                }
            }
        };

        /**
         * removes a single explicit value (subtracts)
         * @param {!String} measureOfTime - as you might guess
         * @param {!String} value - the offensive value
         * @throws {Error} if measureOfTime is bogus.
         */
        this.removeValue = function (measureOfTime, value) {
            if (!expression[measureOfTime]) {
                throw new Error('Invalid measureOfTime: Valid options are: ' + CronValidator.measureOfTimeValues.join(', '));
            }

            if (expression[measureOfTime].length === 1 && expression[measureOfTime][0] === '*') {
                return 'The value for "' + measureOfTime + '" is already at the default value of "*" - this is a no-op.';
            }

            expression[measureOfTime] = expression[measureOfTime].filter(function (timeValue) {
               return value !== timeValue;
            });

            if (!expression[measureOfTime].length) {
                expression[measureOfTime] = DEFAULT_INTERVAL;
            }
        };

        /**
         * returns the current state of a given measureOfTime
         * @param {!String} measureOfTime one of "minute", "hour", etc
         * @returns {!String} comma separated blah blah
         * @throws {Error} if the measureOfTime is not one of the permitted values.
         */
        this.get = function (measureOfTime) {
            if (!expression[measureOfTime]) {
                throw new Error('Invalid measureOfTime: Valid options are: ' + CronValidator.measureOfTimeValues.join(', '));
            }

            return expression[measureOfTime].join(',');
        };

        /**
         * sets the state of a given measureOfTime
         * @param {!String} measureOfTime - yup
         * @param {!Array.<String>} value - the 5 tuple array of values to set
         * @returns {!String} the comma separated version of the value that you passed in
         * @throws {Error} if your "value" is not an Array&lt;String&gt;
         * @throws {Error} when any item in your value isn't a legal cron-ish descriptor
         */
        this.set = function (measureOfTime, value) {
            if (!Array.isArray(value)) {
                throw new Error('Invalid value; Value must be in the form of an Array.');
            }

            for(var i = 0; i < value.length; i++) {
                CronValidator.validateValue(measureOfTime, value[i]);
            }

            expression[measureOfTime] = value;

            return expression[measureOfTime].join(',');
        };

        /**
         * Returns a rich object that describes the current state of the cron expression.
         * @returns {!{
            minute: Array.string,
            hour: Array.string,
            dayOfTheMonth: Array.string,
            month: Array.string,
            dayOfTheWeek: Array.string,
         * }}
         */
        this.getAll = function () {
            return expression;
        };

        /**
         * sets the state for the entire cron expression
         * @param {!{
            minute: Array.string,
            hour: Array.string,
            dayOfTheMonth: Array.string,
            month: Array.string,
            dayOfTheWeek: Array.string,
         * }} expToSet - the entirety of the cron expression.
         * @throws {Error} as usual
         */
        this.setAll = function (expToSet) {
            CronValidator.validateExpression(expToSet);

            expression = expToSet;
        };
    }

    return CronBuilder;
}());

module.exports = CronBuilder;

/***/ }),
/* 18 */,
/* 19 */
/***/ ((module) => {

"use strict";
module.exports = Studio.libraries['react-list'];

/***/ }),
/* 20 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// extracted by mini-css-extract-plugin
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({"listContainer":"x-scheduling-ScheduleEditor-listContainer","state":"x-scheduling-ScheduleEditor-state","error":"x-scheduling-ScheduleEditor-error","cancelled":"x-scheduling-ScheduleEditor-cancelled","success":"x-scheduling-ScheduleEditor-success"});

/***/ }),
/* 21 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(22);
/* harmony import */ var _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var ordinal_number_suffix__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(5);
/* harmony import */ var ordinal_number_suffix__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(ordinal_number_suffix__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var cron_builder__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(17);
/* harmony import */ var cron_builder__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(cron_builder__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var cronstrue__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(6);
/* harmony import */ var cronstrue__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(cronstrue__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _HourTimePicker__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(23);







const EntityRefSelect = (jsreport_studio__WEBPACK_IMPORTED_MODULE_5___default().EntityRefSelect);
const sharedComponents = (jsreport_studio__WEBPACK_IMPORTED_MODULE_5___default().sharedComponents);
class ScheduleProperties extends react__WEBPACK_IMPORTED_MODULE_1__.Component {
  constructor(props) {
    super(props);
    this.state = {
      useExpression: true,
      showHour: false,
      showMinute: false,
      showDay: false,
      showMonth: false,
      selectedPeriod: '',
      selectedHour: null,
      selectedMinute: null,
      selectedDay: null,
      selectedMonth: null,
      days: []
    };
  }
  static title(entity, entities) {
    const templates = Object.keys(entities).map(k => entities[k]).filter(t => t.__entitySet === 'templates' && t.shortid === entity.templateShortid);
    if (!templates.length) {
      return 'schedule (select template...)';
    }
    return `schedule (${templates[0].name}) ${entity.enabled !== true && entity.enabled != null ? '(disabled)' : ''}`;
  }
  componentDidMount() {
    this.normalizeUIState(this.props.entity);
    this.removeInvalidTemplateReferences();
  }
  componentDidUpdate(prevProps) {
    // when component changes because another schedule is selected
    // or when saving a new schedule
    if (prevProps.entity._id !== this.props.entity._id) {
      this.normalizeUIState(this.props.entity);
    }
    this.removeInvalidTemplateReferences();
  }
  normalizeUIState(entity) {
    let cronInfo;
    if (entity.__isNew && !entity.cron || !entity.cron) {
      cronInfo = this.onPeriodChange('', true);
    } else {
      cronInfo = this.getCronInformation(entity.cron);
    }
    if (cronInfo) {
      cronInfo.useExpression = false;
    } else {
      // if we couldn't parse the cron for the UI
      // reset values and enable the raw expression input.
      // false is returned when we want to still show the value in the UI editor
      if (cronInfo === false) {
        cronInfo = this.onPeriodChange('', true);
        cronInfo.useExpression = false;
      } else {
        cronInfo = this.onPeriodChange('', true);
        cronInfo.useExpression = true;
      }
    }
    this.setState(cronInfo);
  }
  getCronInformation(cron) {
    if (cron == null || cron === '') {
      return false;
    }
    try {
      const cronExp = new (cron_builder__WEBPACK_IMPORTED_MODULE_3___default())(cron);
      const parsedCron = cronExp.getAll();
      let cronInfo;
      let selectedPeriod;
      let selectedHour;
      let selectedMinute;
      let selectedDay;
      let selectedMonth;
      let selectedDayOfTheMonth;
      let selectedDayOfTheWeek;

      // our cron editor doesn't support complex values
      if (parsedCron.dayOfTheMonth.length !== 1 || parsedCron.dayOfTheWeek.length !== 1 || parsedCron.hour.length !== 1 || parsedCron.minute.length !== 1 || parsedCron.month.length !== 1) {
        return null;
      }
      if (parsedCron.dayOfTheMonth[0] === '*' || !isNaN(parseInt(parsedCron.dayOfTheMonth[0], 10))) {
        selectedDayOfTheMonth = parsedCron.dayOfTheMonth[0] !== '*' ? parseInt(parsedCron.dayOfTheMonth[0], 10) : parsedCron.dayOfTheMonth[0];
      }
      if (parsedCron.dayOfTheWeek[0] === '*' || !isNaN(parseInt(parsedCron.dayOfTheWeek[0], 10))) {
        selectedDayOfTheWeek = parsedCron.dayOfTheWeek[0] !== '*' ? parseInt(parsedCron.dayOfTheWeek[0], 10) : parsedCron.dayOfTheWeek[0];
      }
      if (parsedCron.hour[0] === '*' || !isNaN(parseInt(parsedCron.hour[0], 10))) {
        selectedHour = parsedCron.hour[0] !== '*' ? ('0' + parsedCron.hour[0]).slice(-2) : parsedCron.hour[0];
      }
      if (parsedCron.minute[0] === '*' || !isNaN(parseInt(parsedCron.minute[0], 10))) {
        selectedMinute = parsedCron.minute[0] !== '*' ? ('0' + parsedCron.minute[0]).slice(-2) : parsedCron.minute[0];
      }
      if (parsedCron.month[0] === '*' || !isNaN(parseInt(parsedCron.month[0], 10))) {
        selectedMonth = parsedCron.month[0] !== '*' ? ('0' + parsedCron.month[0]).slice(-2) : parsedCron.month[0];
      }

      // return early if we don't have any value
      if (!selectedDayOfTheMonth && !selectedDayOfTheWeek && !selectedHour && !selectedMinute && !selectedMonth) {
        return null;
      }
      if (selectedDayOfTheWeek !== '*') {
        selectedDay = selectedDayOfTheWeek;
      } else {
        selectedDay = selectedDayOfTheMonth;
      }
      if (selectedDayOfTheMonth === '*' && selectedDayOfTheWeek === '*' && selectedHour === '*' && selectedMinute === '*' && selectedMonth === '*') {
        selectedPeriod = 'mn';
        cronInfo = {};
      } else if (selectedDayOfTheMonth === '*' && selectedDayOfTheWeek === '*' && selectedHour === '*' && selectedMonth === '*' && selectedMinute !== '*') {
        selectedPeriod = 'h';
        cronInfo = {
          selectedMinute: selectedMinute
        };
      } else if (selectedDayOfTheMonth === '*' && selectedDayOfTheWeek === '*' && selectedMonth === '*' && selectedHour !== '*' && selectedMinute !== '*') {
        selectedPeriod = 'd';
        cronInfo = {
          selectedHour: selectedHour,
          selectedMinute: selectedMinute
        };
      } else if (selectedDayOfTheMonth === '*' && selectedMonth === '*' && selectedDayOfTheWeek !== '*' && selectedHour !== '*' && selectedMinute !== '*') {
        selectedPeriod = 'w';
        cronInfo = {
          selectedDay: selectedDay,
          selectedHour: selectedHour,
          selectedMinute: selectedMinute
        };
      } else if (selectedDayOfTheWeek === '*' && selectedMonth === '*' && selectedDayOfTheMonth !== '*' && selectedHour !== '*' && selectedMinute !== '*') {
        selectedPeriod = 'm';
        cronInfo = {
          selectedDay: selectedDay,
          selectedHour: selectedHour,
          selectedMinute: selectedMinute
        };
      } else if (selectedDayOfTheWeek === '*' && selectedDayOfTheMonth !== '*' && selectedMonth !== '*' && selectedHour !== '*' && selectedMinute !== '*') {
        selectedPeriod = 'y';
        cronInfo = {
          selectedDay: selectedDay,
          selectedMonth: selectedMonth,
          selectedHour: selectedHour,
          selectedMinute: selectedMinute
        };
      }

      // if the period can't be detected just return
      if (!selectedPeriod) {
        return null;
      }
      cronInfo = {
        ...this.onPeriodChange(selectedPeriod, true),
        ...cronInfo
      };
      return cronInfo;
    } catch (e) {
      return null;
    }
  }
  removeInvalidTemplateReferences() {
    const {
      entity,
      entities,
      onChange
    } = this.props;
    if (!entity.templateShortid) {
      return;
    }
    const updatedTemplates = Object.keys(entities).filter(k => entities[k].__entitySet === 'templates' && entities[k].shortid === entity.templateShortid);
    if (updatedTemplates.length === 0) {
      onChange({
        _id: entity._id,
        templateShortid: null
      });
    }
  }
  onUseExpressionChange(checked) {
    const {
      entity
    } = this.props;
    let resetCron = false;
    let uiCronInfo;
    if (!checked) {
      uiCronInfo = this.getCronInformation(entity.cron);
      if (!uiCronInfo) {
        uiCronInfo = this.onPeriodChange('', true);
        resetCron = true;
      }
    } else {
      uiCronInfo = this.onPeriodChange('', true);
    }
    this.onCronBuilderChange({
      useExpression: checked,
      ...uiCronInfo
    }, resetCron);
  }
  onCronBuilderChange(stateToSet, resetCron) {
    const cronExp = new (cron_builder__WEBPACK_IMPORTED_MODULE_3___default())();
    const {
      onChange,
      entity
    } = this.props;
    let {
      selectedPeriod,
      selectedHour,
      selectedMinute,
      selectedDay,
      selectedMonth
    } = this.state;
    let cron = false;
    if (stateToSet && stateToSet.selectedPeriod !== undefined) {
      selectedPeriod = stateToSet.selectedPeriod;
    }
    if (stateToSet && stateToSet.selectedHour !== undefined) {
      selectedHour = stateToSet.selectedHour;
    }
    if (stateToSet && stateToSet.selectedMinute !== undefined) {
      selectedMinute = stateToSet.selectedMinute;
    }
    if (stateToSet && stateToSet.selectedDay !== undefined) {
      selectedDay = stateToSet.selectedDay;
    }
    if (stateToSet && stateToSet.selectedMonth !== undefined) {
      selectedMonth = stateToSet.selectedMonth;
    }
    if (selectedPeriod === 'mn') {
      cron = '* * * * *';
    } else if (selectedPeriod === 'h') {
      cronExp.addValue('minute', String(parseInt(selectedMinute, 10)));
    } else if (selectedPeriod === 'd') {
      cronExp.addValue('hour', String(parseInt(selectedHour, 10)));
      cronExp.addValue('minute', String(parseInt(selectedMinute, 10)));
    } else if (selectedPeriod === 'w') {
      cronExp.addValue('dayOfTheWeek', String(parseInt(selectedDay, 10)));
      cronExp.addValue('hour', String(parseInt(selectedHour, 10)));
      cronExp.addValue('minute', String(parseInt(selectedMinute, 10)));
    } else if (selectedPeriod === 'm') {
      cronExp.addValue('dayOfTheMonth', String(parseInt(selectedDay, 10)));
      cronExp.addValue('hour', String(parseInt(selectedHour, 10)));
      cronExp.addValue('minute', String(parseInt(selectedMinute, 10)));
    } else if (selectedPeriod === 'y') {
      cronExp.addValue('dayOfTheMonth', String(parseInt(selectedDay, 10)));
      cronExp.addValue('hour', String(parseInt(selectedHour, 10)));
      cronExp.addValue('minute', String(parseInt(selectedMinute, 10)));
      cronExp.addValue('month', String(parseInt(selectedMonth, 10)));
    } else {
      cron = resetCron ? '' : this.props.entity.cron;
    }
    if (cron === false) {
      cron = cronExp.build();
    }
    if (cron !== this.props.entity.cron) {
      onChange({
        _id: entity._id,
        cron: cron
      });
    }
    if (stateToSet) {
      this.setState(stateToSet);
    }
  }
  onPeriodChange(period, returnState) {
    const newState = {
      selectedPeriod: period
    };
    newState.days = [];
    if (period === 'm' || period === 'y') {
      for (let i = 1; i <= 31; i++) {
        newState.days.push({
          name: ordinal_number_suffix__WEBPACK_IMPORTED_MODULE_2___default()(i),
          value: i
        });
      }
    }
    if (period === 'mn') {
      newState.showHour = false;
      newState.showMinute = false;
      newState.showDay = false;
      newState.showMonth = false;
      newState.selectedHour = null;
      newState.selectedMinute = null;
      newState.selectedDay = null;
      newState.selectedMonth = null;
    } else if (period === 'h') {
      newState.showHour = false;
      newState.showMinute = true;
      newState.showDay = false;
      newState.showMonth = false;
      newState.selectedHour = null;
      newState.selectedMinute = '00';
      newState.selectedDay = null;
      newState.selectedMonth = null;
    } else if (period === 'd') {
      newState.showHour = true;
      newState.showMinute = true;
      newState.showDay = false;
      newState.showMonth = false;
      newState.selectedHour = '12';
      newState.selectedMinute = '00';
      newState.selectedDay = null;
      newState.selectedMonth = null;
    } else if (period === 'w') {
      newState.showHour = true;
      newState.showMinute = true;
      newState.showDay = true;
      newState.showMonth = false;
      newState.selectedHour = '12';
      newState.selectedMinute = '00';
      newState.selectedDay = 1;
      newState.selectedMonth = null;
      newState.days = [{
        name: 'Monday',
        value: 1
      }, {
        name: 'Tuesday',
        value: 2
      }, {
        name: 'Wednesday',
        value: 3
      }, {
        name: 'Thursday',
        value: 4
      }, {
        name: 'Friday',
        value: 5
      }, {
        name: 'Saturday',
        value: 6
      }, {
        name: 'Sunday',
        value: 0
      }];
    } else if (period === 'm') {
      newState.showHour = true;
      newState.showMinute = true;
      newState.showDay = true;
      newState.showMonth = false;
      newState.selectedHour = '12';
      newState.selectedMinute = '00';
      newState.selectedDay = 1;
      newState.selectedMonth = null;
    } else if (period === 'y') {
      newState.showHour = true;
      newState.showMinute = true;
      newState.showDay = true;
      newState.showMonth = true;
      newState.selectedHour = '12';
      newState.selectedMinute = '00';
      newState.selectedDay = 1;
      newState.selectedMonth = '01';
    } else {
      newState.showHour = false;
      newState.showMinute = false;
      newState.showDay = false;
      newState.showMonth = false;
      newState.selectedHour = null;
      newState.selectedMinute = null;
      newState.selectedDay = null;
      newState.selectedMonth = null;
    }
    if (returnState) {
      return newState;
    }
    this.setState(newState);
  }
  render() {
    const {
      useExpression,
      showHour,
      showMinute,
      showDay,
      showMonth,
      selectedPeriod,
      selectedHour,
      selectedMinute,
      selectedDay,
      selectedMonth,
      days
    } = this.state;
    const {
      entity,
      onChange
    } = this.props;
    let cronDescription = '';
    if (entity.cron) {
      try {
        cronDescription = cronstrue__WEBPACK_IMPORTED_MODULE_4___default().toString(entity.cron);
      } catch (e) {
        cronDescription = 'Invalid cron expression';
      }
    }
    if (!entity || entity.__entitySet !== 'schedules') {
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", null);
    }
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, "Template"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(EntityRefSelect, {
      headingLabel: "Select template",
      newLabel: "New template for schedule",
      filter: references => ({
        templates: references.templates
      }),
      value: entity.templateShortid ? entity.templateShortid : null,
      onChange: selected => onChange({
        _id: entity._id,
        templateShortid: selected != null && selected.length > 0 ? selected[0].shortid : null
      }),
      renderNew: modalProps => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(sharedComponents.NewTemplateModal, _babel_runtime_helpers_extends__WEBPACK_IMPORTED_MODULE_0___default()({}, modalProps, {
        options: {
          ...modalProps.options,
          defaults: {
            folder: entity.folder
          },
          activateNewTab: false
        }
      }))
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, "CRON"), !useExpression && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", null, "Expression: ", entity.cron)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("span", null, "Description: ", cronDescription)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("input", {
      type: "checkbox",
      checked: useExpression,
      onChange: v => this.onUseExpressionChange(v.target.checked)
    }), "Use expression"), useExpression && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("input", {
      type: "text",
      value: entity.cron || '',
      onChange: v => onChange({
        _id: entity._id,
        cron: v.target.value
      })
    })), !useExpression && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, "Every", ' ', /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("select", {
      value: selectedPeriod,
      onChange: ev => this.onCronBuilderChange(this.onPeriodChange(ev.target.value, true))
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "-",
      value: ""
    }, "- not selected -"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "mn",
      value: "mn"
    }, "minute"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "h",
      value: "h"
    }, "hour"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "d",
      value: "d"
    }, "day"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "w",
      value: "w"
    }, "week"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "m",
      value: "m"
    }, "month"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "y",
      value: "y"
    }, "year")))), !useExpression && showDay && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, `on${showMonth ? ' the' : ''}`, ' ', /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("select", {
      value: selectedDay,
      onChange: ev => this.onCronBuilderChange({
        selectedDay: ev.target.value
      })
    }, days.map(day => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: day.value,
      value: day.value
    }, day.name))))), !useExpression && showMonth && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, "of", ' ', /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("select", {
      value: selectedMonth,
      onChange: ev => this.onCronBuilderChange({
        selectedMonth: ev.target.value
      })
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "01",
      value: "01"
    }, "January"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "02",
      value: "02"
    }, "February"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "03",
      value: "03"
    }, "March"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "04",
      value: "04"
    }, "April"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "05",
      value: "05"
    }, "May"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "06",
      value: "06"
    }, "June"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "07",
      value: "07"
    }, "July"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "08",
      value: "08"
    }, "August"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "09",
      value: "09"
    }, "September"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "10",
      value: "10"
    }, "October"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "11",
      value: "11"
    }, "November"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("option", {
      key: "12",
      value: "12"
    }, "December")))), !useExpression && (showHour || showMinute) && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", null, "at", ' ', /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      style: {
        display: 'inline-block'
      }
    }, showHour && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_HourTimePicker__WEBPACK_IMPORTED_MODULE_6__["default"], {
      type: "hour",
      value: selectedHour,
      onChange: val => this.onCronBuilderChange({
        selectedHour: val
      })
    }), showHour && showMinute && ' : ', showMinute && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_HourTimePicker__WEBPACK_IMPORTED_MODULE_6__["default"], {
      type: "minute",
      value: selectedMinute,
      onChange: val => this.onCronBuilderChange({
        selectedMinute: val
      })
    }))))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("label", null, "Enabled"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_1___default().createElement("input", {
      type: "checkbox",
      checked: entity.enabled !== false,
      onChange: v => onChange({
        _id: entity._id,
        enabled: v.target.checked
      })
    })));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ScheduleProperties);

/***/ }),
/* 22 */
/***/ ((module) => {

"use strict";
module.exports = Studio.runtime['helpers/extends'];

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
/* harmony import */ var _HourTimeSelect__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(24);



class HourTimePicker extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.state = {
      editing: false
    };
    this.handleSelect = this.handleSelect.bind(this);
  }
  handleSelect(val) {
    this.setState({
      editing: false
    });
    this.props.onChange(val);
  }
  render() {
    const {
      editing
    } = this.state;
    const {
      type,
      value
    } = this.props;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      style: {
        display: 'inline-block'
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      readOnly: true,
      style: {
        width: '30px',
        cursor: 'pointer'
      },
      value: value,
      onClick: () => this.setState({
        editing: true
      })
    }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__.Popover, {
      wrapper: false,
      open: editing,
      onClose: () => this.setState({
        editing: false
      })
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_HourTimeSelect__WEBPACK_IMPORTED_MODULE_2__["default"], {
      type: type,
      value: value,
      onSelect: this.handleSelect
    })));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (HourTimePicker);

/***/ }),
/* 24 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _HourTimeSelect_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(25);


class HourTimeSelectItem extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }
  handleClick() {
    this.props.onClick(this.props.value);
  }
  render() {
    const {
      value,
      active
    } = this.props;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _HourTimeSelect_css__WEBPACK_IMPORTED_MODULE_1__["default"].item + ' ' + (active ? _HourTimeSelect_css__WEBPACK_IMPORTED_MODULE_1__["default"].itemSelected : ''),
      onClick: this.handleClick
    }, value);
  }
}
class HourTimeSelect extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.handleItemClick = this.handleItemClick.bind(this);
  }
  componentDidMount() {
    this.itemsContainer.focus();
  }
  handleItemClick(value) {
    this.props.onSelect(value);
  }
  render() {
    const {
      type = 'hour'
    } = this.props;
    const title = `Time: ${type[0].toUpperCase() + type.slice(1)}`;
    let maxItems;
    const columnLimit = 6;
    let rowCount = 0;
    let items = [];
    if (type === 'hour') {
      maxItems = 24;
    } else if (type === 'minute') {
      maxItems = 60;
    }
    const maxRowCount = maxItems / columnLimit;
    while (rowCount < maxRowCount) {
      const value = rowCount;
      const cols = [];
      for (let i = 0; i < columnLimit; i++) {
        cols.push(value + maxRowCount * i);
      }
      items = items.concat(cols.map(colValue => {
        const valueItem = String(colValue).length === 1 ? `0${colValue}` : String(colValue);
        return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(HourTimeSelectItem, {
          key: colValue,
          active: this.props.value === valueItem,
          value: valueItem,
          onClick: this.handleItemClick
        });
      }));
      rowCount++;
    }
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _HourTimeSelect_css__WEBPACK_IMPORTED_MODULE_1__["default"].container,
      style: {
        width: '150px'
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _HourTimeSelect_css__WEBPACK_IMPORTED_MODULE_1__["default"].title
    }, title), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _HourTimeSelect_css__WEBPACK_IMPORTED_MODULE_1__["default"].list,
      ref: itemsContainer => {
        this.itemsContainer = itemsContainer;
      },
      tabIndex: "-1"
    }, items));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (HourTimeSelect);

/***/ }),
/* 25 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// extracted by mini-css-extract-plugin
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({"container":"x-scheduling-HourTimeSelect-container","title":"x-scheduling-HourTimeSelect-title","list":"x-scheduling-HourTimeSelect-list","item":"x-scheduling-HourTimeSelect-item","itemSelected":"x-scheduling-HourTimeSelect-itemSelected"});

/***/ }),
/* 26 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ScheduleEditor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



class DownloadButton extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  download() {
    if (_ScheduleEditor__WEBPACK_IMPORTED_MODULE_1__["default"].ActiveReport) {
      window.open(`${(jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().rootUrl)}/reports/${_ScheduleEditor__WEBPACK_IMPORTED_MODULE_1__["default"].ActiveReport._id}/attachment`, '_self');
    }
  }
  render() {
    if (!this.props.tab || !this.props.tab.entity || this.props.tab.entity.__entitySet !== 'schedules' || !_ScheduleEditor__WEBPACK_IMPORTED_MODULE_1__["default"].ActiveReport) {
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null);
    }
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "toolbar-button",
      onClick: () => this.download()
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-download"
    }), "Download");
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (DownloadButton);

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
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
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
/* harmony import */ var _ScheduleEditor_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(7);
/* harmony import */ var _ScheduleProperties_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(21);
/* harmony import */ var _DownloadButton_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(26);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_3__);




jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().initializeListeners.push(async () => {
  if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().authentication) && !jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().authentication.isUserAdmin((jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().authentication).user)) {
    return;
  }
  jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().addEntitySet({
    name: 'schedules',
    faIcon: 'fa-calendar',
    visibleName: 'schedule',
    entityTreePosition: 400
  });
  jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().addEditorComponent('schedules', _ScheduleEditor_js__WEBPACK_IMPORTED_MODULE_0__["default"]);
  jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().addPropertiesComponent(_ScheduleProperties_js__WEBPACK_IMPORTED_MODULE_1__["default"].title, _ScheduleProperties_js__WEBPACK_IMPORTED_MODULE_1__["default"], entity => entity.__entitySet === 'schedules');
  jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().addToolbarComponent(_DownloadButton_js__WEBPACK_IMPORTED_MODULE_2__["default"]);
});
})();

/******/ })()
;