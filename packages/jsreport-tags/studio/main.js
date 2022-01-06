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
/******/ 	return __webpack_require__(__webpack_require__.s = 10);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react'];

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = Studio;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _simpleCheckForValidColor = __webpack_require__(7);

var _simpleCheckForValidColor2 = _interopRequireDefault(_simpleCheckForValidColor);

var _colorLuminance = __webpack_require__(8);

var _colorLuminance2 = _interopRequireDefault(_colorLuminance);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ShowColor = function ShowColor(props) {
  var color = props.color,
      _props$height = props.height,
      height = _props$height === undefined ? 15 : _props$height,
      _props$width = props.width,
      width = _props$width === undefined ? 20 : _props$width;


  var borderColor = props.borderColor;
  var currentColor = 'inherit';

  if ((0, _simpleCheckForValidColor2.default)(color)) {
    currentColor = color;
  }

  if (!borderColor) {
    borderColor = (0, _colorLuminance2.default)(currentColor, -0.35);
  }

  return _react2.default.createElement('span', {
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

exports.default = ShowColor;

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _mitt = __webpack_require__(23);

var _mitt2 = _interopRequireDefault(_mitt);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var emitter = (0, _mitt2.default)();

exports.default = emitter;

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (tagSet, tagShortId) {
  var tag = void 0;

  var found = tagSet.some(function (tagInSet) {
    tag = tagInSet;
    return tagInSet.shortid === tagShortId;
  });

  if (found) {
    return tag;
  }

  return undefined;
};

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var current = exports.current = void 0;
var filterTags = exports.filterTags = void 0;

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(1);

var _ShowColor = __webpack_require__(2);

var _ShowColor2 = _interopRequireDefault(_ShowColor);

var _ColorPicker = __webpack_require__(12);

var _ColorPicker2 = _interopRequireDefault(_ColorPicker);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ColorPicketTrigger = function ColorPicketTrigger(props) {
  var displayColorPicker = props.displayColorPicker,
      color = props.color,
      containerStyles = props.containerStyles,
      onClickColorTrigger = props.onClickColorTrigger,
      onInputChange = props.onInputChange,
      onChangeSelectionColor = props.onChangeSelectionColor,
      onCloseColorPicker = props.onCloseColorPicker,
      translateXColorPickerFromTrigger = props.translateXColorPickerFromTrigger,
      translateYColorPickerFromTrigger = props.translateYColorPickerFromTrigger;


  var containerTriggerPickerStyles = {
    display: 'inline-block',
    height: '32px',
    padding: '5px'
  };

  var defaultContainerStyles = {
    display: 'inline-block'
  };

  var currentColor = color || '';
  var currentContainerStyles = Object.assign({}, defaultContainerStyles, containerStyles);

  var colorPickerContainerStyles = {};

  if (translateXColorPickerFromTrigger || translateYColorPickerFromTrigger) {
    var transformValue = '';

    if (translateXColorPickerFromTrigger) {
      transformValue += 'translateX(' + translateXColorPickerFromTrigger + ') ';
    }

    if (translateYColorPickerFromTrigger) {
      transformValue += 'translateY(' + translateYColorPickerFromTrigger + ') ';
    }

    colorPickerContainerStyles.transform = transformValue;
  }

  return _react2.default.createElement(
    'div',
    { style: currentContainerStyles },
    _react2.default.createElement(
      'span',
      { style: containerTriggerPickerStyles },
      _react2.default.createElement(
        'span',
        { style: { display: 'inline-block' } },
        _react2.default.createElement(_ShowColor2.default, { color: currentColor }),
        '\xA0',
        _react2.default.createElement('input', {
          type: 'text',
          value: currentColor,
          style: { width: '90px' },
          maxLength: 7,
          placeholder: '#006600',
          onFocus: onClickColorTrigger,
          onChange: function onChange(ev) {
            return typeof onInputChange === 'function' && onInputChange(ev.target.value);
          }
        })
      )
    ),
    _react2.default.createElement(
      _jsreportStudio.Popover,
      {
        wrapper: false,
        open: displayColorPicker,
        onClose: onCloseColorPicker
      },
      _react2.default.createElement(
        'div',
        { style: colorPickerContainerStyles },
        _react2.default.createElement(_ColorPicker2.default, {
          color: currentColor,
          onChangeComplete: function onChangeComplete(color) {
            return typeof onChangeSelectionColor === 'function' && onChangeSelectionColor(color.hex);
          }
        })
      )
    )
  );
};

exports.default = ColorPicketTrigger;

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var HEX_COLOR_REGEXP = /^#[0-9A-F]{6}$/i;

var simpleCheckForValidColor = function simpleCheckForValidColor(color) {
  return HEX_COLOR_REGEXP.test(color);
};

exports.default = simpleCheckForValidColor;

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (hex, lum) {
  var selectedLum = lum || 0;
  var selectedHex = void 0;

  selectedHex = String(hex).replace(/[^0-9a-f]/gi, '');

  if (selectedHex.length < 6) {
    selectedHex = selectedHex[0] + selectedHex[0] + selectedHex[1] + selectedHex[1] + selectedHex[2] + selectedHex[2];
  }

  // convert to decimal and change luminosity
  var rgb = '#';
  var c = void 0;
  var i = void 0;

  for (i = 0; i < 3; i++) {
    c = parseInt(selectedHex.substr(i * 2, 2), 16);
    c = Math.round(Math.min(Math.max(0, c + c * selectedLum), 255)).toString(16);
    rgb += ('00' + c).substr(c.length);
  }

  return rgb;
};

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"active":"x-tags-TagEntityTreeButtonToolbar-active"};

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _NewTagModal = __webpack_require__(11);

var _NewTagModal2 = _interopRequireDefault(_NewTagModal);

var _TagEditor = __webpack_require__(19);

var _TagEditor2 = _interopRequireDefault(_TagEditor);

var _TagProperties = __webpack_require__(20);

var _TagProperties2 = _interopRequireDefault(_TagProperties);

var _EntityTagProperties = __webpack_require__(21);

var _EntityTagProperties2 = _interopRequireDefault(_EntityTagProperties);

var _EntityTreeTagOrganizer = __webpack_require__(22);

var _EntityTreeTagOrganizer2 = _interopRequireDefault(_EntityTreeTagOrganizer);

var _TagEntityTreeOrganizeButtonToolbar = __webpack_require__(25);

var _TagEntityTreeOrganizeButtonToolbar2 = _interopRequireDefault(_TagEntityTreeOrganizeButtonToolbar);

var _TagEntityTreeFilterButtonToolbar = __webpack_require__(26);

var _TagEntityTreeFilterButtonToolbar2 = _interopRequireDefault(_TagEntityTreeFilterButtonToolbar);

var _TagEntityTreeItem = __webpack_require__(32);

var _TagEntityTreeItem2 = _interopRequireDefault(_TagEntityTreeItem);

var _TagEntityTreeTagGroupItem = __webpack_require__(33);

var _TagEntityTreeTagGroupItem2 = _interopRequireDefault(_TagEntityTreeTagGroupItem);

var _emitter = __webpack_require__(3);

var _emitter2 = _interopRequireDefault(_emitter);

var _organizeState = __webpack_require__(5);

var organizeState = _interopRequireWildcard(_organizeState);

var _filterItemWithTagsStrategy = __webpack_require__(34);

var _filterItemWithTagsStrategy2 = _interopRequireDefault(_filterItemWithTagsStrategy);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addEntitySet({
  name: 'tags',
  faIcon: 'fa-tag',
  visibleName: 'tag',
  onNew: function onNew(options) {
    return _jsreportStudio2.default.openModal(_NewTagModal2.default, options);
  },
  helpUrl: 'http://jsreport.net/learn/tags',
  referenceAttributes: ['color'],
  entityTreePosition: 300
});

_jsreportStudio2.default.sharedComponents.NewTagModal = _NewTagModal2.default;

// wait for all extensions to be loaded
_jsreportStudio2.default.initializeListeners.push(function () {
  // add tags to referenceAttributes in all entities
  Object.keys(_jsreportStudio2.default.entitySets).forEach(function (entitySetName) {
    var entitySet = _jsreportStudio2.default.entitySets[entitySetName];

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
_emitter2.default.on('organizationModeByTagsChanged', function (organizationMode) {
  organizeState.current = organizationMode;
});
// eslint-disable-next-line no-import-assign
_emitter2.default.on('filterByTagsChanged', function (selectedTags) {
  organizeState.filterTags = selectedTags;
});

_jsreportStudio2.default.addEditorComponent('tags', _TagEditor2.default);
_jsreportStudio2.default.addPropertiesComponent(_TagProperties2.default.title, _TagProperties2.default, function (entity) {
  return entity.__entitySet === 'tags';
});
_jsreportStudio2.default.addPropertiesComponent(_EntityTagProperties2.default.title, _EntityTagProperties2.default, function (entity) {
  return entity.__entitySet !== 'tags';
});

_jsreportStudio2.default.addEntityTreeWrapperComponent(_EntityTreeTagOrganizer2.default);

_jsreportStudio2.default.addEntityTreeToolbarComponent(_TagEntityTreeFilterButtonToolbar2.default, 'group');
_jsreportStudio2.default.addEntityTreeToolbarComponent(_TagEntityTreeOrganizeButtonToolbar2.default, 'group');

_jsreportStudio2.default.addEntityTreeItemComponent(_TagEntityTreeItem2.default);
_jsreportStudio2.default.addEntityTreeItemComponent(_TagEntityTreeTagGroupItem2.default, 'groupRight');

_jsreportStudio2.default.entityTreeFilterItemResolvers.push(_filterItemWithTagsStrategy2.default);

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _ColorPickerTrigger = __webpack_require__(6);

var _ColorPickerTrigger2 = _interopRequireDefault(_ColorPickerTrigger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var NewTagModal = function (_Component) {
  _inherits(NewTagModal, _Component);

  function NewTagModal(props) {
    _classCallCheck(this, NewTagModal);

    var _this = _possibleConstructorReturn(this, (NewTagModal.__proto__ || Object.getPrototypeOf(NewTagModal)).call(this, props));

    _this.nameRef = _react2.default.createRef();
    _this.descriptionRef = _react2.default.createRef();

    _this.state = {
      displayColorPicker: false,
      selectedColor: '',
      error: null
    };
    return _this;
  }

  // the modal component for some reason after open focuses the panel itself


  _createClass(NewTagModal, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this2 = this;

      setTimeout(function () {
        return _this2.nameRef.current.focus();
      }, 0);
    }
  }, {
    key: 'handleKeyPress',
    value: function handleKeyPress(e) {
      if (e.key === 'Enter') {
        this.createTag();
      }
    }
  }, {
    key: 'createTag',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var entity, response;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                entity = {};

                if (this.nameRef.current.value) {
                  _context.next = 3;
                  break;
                }

                return _context.abrupt('return', this.setState({
                  error: 'name field cannot be empty'
                }));

              case 3:
                if (this.state.selectedColor) {
                  _context.next = 5;
                  break;
                }

                return _context.abrupt('return', this.setState({
                  error: 'color field cannot be empty'
                }));

              case 5:

                if (this.props.options.defaults != null) {
                  entity = Object.assign(entity, this.props.options.defaults);
                }

                entity.name = this.nameRef.current.value;
                entity.color = this.state.selectedColor;
                entity.description = this.descriptionRef.current.value;

                _context.prev = 9;
                _context.next = 12;
                return _jsreportStudio2.default.api.post('/odata/tags', {
                  data: entity
                });

              case 12:
                response = _context.sent;


                response.__entitySet = 'tags';

                _jsreportStudio2.default.addExistingEntity(response);
                _jsreportStudio2.default.openTab(response, this.props.options.activateNewTab);

                if (this.props.options.onNewEntity) {
                  this.props.options.onNewEntity(response);
                }

                this.props.close();
                _context.next = 23;
                break;

              case 20:
                _context.prev = 20;
                _context.t0 = _context['catch'](9);

                this.setState({
                  error: _context.t0.message
                });

              case 23:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[9, 20]]);
      }));

      function createTag() {
        return _ref.apply(this, arguments);
      }

      return createTag;
    }()
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var _state = this.state,
          displayColorPicker = _state.displayColorPicker,
          selectedColor = _state.selectedColor,
          error = _state.error;


      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'New tag'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'name'
          ),
          _react2.default.createElement('input', { type: 'text', name: 'name', ref: this.nameRef, placeholder: 'tag name...', onKeyPress: function onKeyPress(e) {
              return _this3.handleKeyPress(e);
            } })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'color'
          ),
          _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(_ColorPickerTrigger2.default, {
              displayColorPicker: displayColorPicker,
              containerStyles: { border: '1px dashed #000' },
              color: selectedColor,
              onClickColorTrigger: function onClickColorTrigger() {
                return _this3.setState({ displayColorPicker: true });
              },
              onCloseColorPicker: function onCloseColorPicker() {
                return _this3.setState({ displayColorPicker: false });
              },
              onInputChange: function onInputChange(colorInputValue) {
                return colorInputValue !== selectedColor && _this3.setState({ selectedColor: colorInputValue });
              },
              onChangeSelectionColor: function onChangeSelectionColor(colorHex) {
                return _this3.setState({ selectedColor: colorHex });
              }
            })
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Description'
          ),
          _react2.default.createElement('textarea', {
            name: 'description',
            ref: this.descriptionRef,
            placeholder: 'You can add more details about this tag here...',
            rows: '4',
            style: { resize: 'vertical' }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'span',
            {
              style: { color: 'red', display: error ? 'block' : 'none' }
            },
            error
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group', style: { opacity: 0.8 } },
          _react2.default.createElement('hr', null),
          _react2.default.createElement(
            'span',
            null,
            'You can use tags to organize jsreport objects.',
            _react2.default.createElement('br', null),
            'This can be for example a tag to organize and group related templates, images, data, scripts, assets, etc. ',
            _react2.default.createElement('br', null),
            'See the ',
            _react2.default.createElement(
              'a',
              { target: '_blank', rel: 'noreferrer', title: 'Help', href: 'http://jsreport.net/learn/tags' },
              'documentation'
            ),
            ' for details.'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'button-bar' },
          _react2.default.createElement(
            'button',
            { onClick: function onClick() {
                return _this3.createTag();
              }, className: 'button confirmation' },
            'Ok'
          )
        )
      );
    }
  }]);

  return NewTagModal;
}(_react.Component);

exports.default = NewTagModal;

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ColorWrap = __webpack_require__(13);

var _ColorWrap2 = _interopRequireDefault(_ColorWrap);

var _Picker = __webpack_require__(16);

var _Picker2 = _interopRequireDefault(_Picker);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (0, _ColorWrap2.default)(_Picker2.default);

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _lodash = __webpack_require__(14);

var _lodash2 = _interopRequireDefault(_lodash);

var _simpleCheckForValidColor = __webpack_require__(7);

var _simpleCheckForValidColor2 = _interopRequireDefault(_simpleCheckForValidColor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var colorToState = function colorToState(data) {
  var color = data.hex ? data.hex : data;

  return {
    hex: '' + color
  };
};

var ColorWrap = function ColorWrap(Picker) {
  var ColorPicker = function (_ref) {
    _inherits(ColorPicker, _ref);

    function ColorPicker(props) {
      _classCallCheck(this, ColorPicker);

      var _this = _possibleConstructorReturn(this, (ColorPicker.__proto__ || Object.getPrototypeOf(ColorPicker)).call(this, props));

      _this.state = _extends({}, colorToState(props.color), {
        visible: props.display
      });

      _this.debounce = (0, _lodash2.default)(function (fn, data, event) {
        fn(data, event);
      }, 100);

      _this.handleChange = _this.handleChange.bind(_this);
      return _this;
    }

    _createClass(ColorPicker, [{
      key: 'handleChange',
      value: function handleChange(data, event) {
        var isValidColor = (0, _simpleCheckForValidColor2.default)(data.hex);

        if (isValidColor) {
          var colors = colorToState(data);
          this.setState(colors);
          this.props.onChangeComplete && this.debounce(this.props.onChangeComplete, colors, event);
          this.props.onChange && this.props.onChange(colors, event);
        }
      }
    }, {
      key: 'render',
      value: function render() {
        return _react2.default.createElement(Picker, _extends({}, this.props, this.state, {
          onChange: this.handleChange
        }));
      }
    }], [{
      key: 'getDerivedStateFromProps',
      value: function getDerivedStateFromProps(props) {
        return _extends({}, colorToState(props.color), {
          visible: props.display
        });
      }
    }]);

    return ColorPicker;
  }(_react.PureComponent || _react.Component);

  ColorPicker.defaultProps = {
    color: ''
  };

  return ColorPicker;
};

exports.default = ColorWrap;

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
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
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

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

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(15)))

/***/ }),
/* 15 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _handleHover = __webpack_require__(17);

var _handleHover2 = _interopRequireDefault(_handleHover);

var _Swatch = __webpack_require__(18);

var _Swatch2 = _interopRequireDefault(_Swatch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PickerSwatch = (0, _handleHover2.default)(function (_ref) {
  var hover = _ref.hover,
      color = _ref.color,
      onClick = _ref.onClick;

  var styles = {
    swatch: {
      width: '25px',
      height: '25px'
    }
  };

  if (hover) {
    styles.swatch = _extends({}, styles.swatch, {
      position: 'relative',
      zIndex: '2',
      outline: '2px solid #fff',
      boxShadow: '0 0 5px 2px rgba(0,0,0,0.25)'
    });
  }

  return React.createElement(
    'div',
    { style: styles.swatch },
    React.createElement(_Swatch2.default, { color: color, onClick: onClick })
  );
});

var Picker = function Picker(_ref2) {
  var width = _ref2.width,
      colors = _ref2.colors,
      onChange = _ref2.onChange,
      triangle = _ref2.triangle;

  var styles = {
    card: {
      width: width,
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
  var handleChange = function handleChange(hex, e) {
    return onChange({ hex: hex, source: 'hex' }, e);
  };

  return React.createElement(
    'div',
    { style: styles.card },
    colors.map(function (c) {
      return React.createElement(PickerSwatch, { color: c, key: c, onClick: handleChange });
    })
  );
};

Picker.defaultProps = {
  width: '200px',
  colors: ['#B80000', '#DB3E00', '#FCCB00', '#008B02', '#006B76', '#1273DE', '#004DCF', '#5300EB', '#EB9694', '#FAD0C3', '#FEF3BD', '#C1E1C5', '#BEDADC', '#C4DEF6']
};

exports.default = Picker;

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var handleHover = function handleHover(Component) {
  var Span = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'span';

  return function (_React$Component) {
    _inherits(Hover, _React$Component);

    function Hover(props) {
      _classCallCheck(this, Hover);

      var _this = _possibleConstructorReturn(this, (Hover.__proto__ || Object.getPrototypeOf(Hover)).call(this, props));

      _this.state = { hover: false };

      _this.handleMouseOver = _this.handleMouseOver.bind(_this);
      _this.handleMouseOut = _this.handleMouseOut.bind(_this);
      return _this;
    }

    _createClass(Hover, [{
      key: 'handleMouseOver',
      value: function handleMouseOver() {
        this.setState({ hover: true });
      }
    }, {
      key: 'handleMouseOut',
      value: function handleMouseOut() {
        this.setState({ hover: false });
      }
    }, {
      key: 'render',
      value: function render() {
        return _react2.default.createElement(
          Span,
          { onMouseOver: this.handleMouseOver, onMouseOut: this.handleMouseOut },
          _react2.default.createElement(Component, _extends({}, this.props, this.state))
        );
      }
    }]);

    return Hover;
  }(_react2.default.Component);
};

exports.default = handleHover;

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var Swatch = function Swatch(_ref) {
  var color = _ref.color,
      style = _ref.style,
      onClick = _ref.onClick,
      _ref$title = _ref.title,
      title = _ref$title === undefined ? color : _ref$title;

  var styles = {
    swatch: {
      background: color,
      height: '100%',
      width: '100%',
      cursor: 'pointer'
    }
  };

  var handleClick = function handleClick(e) {
    return onClick(color, e);
  };

  return React.createElement('div', { style: styles.swatch, onClick: handleClick, title: title });
};

exports.default = Swatch;

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _ShowColor = __webpack_require__(2);

var _ShowColor2 = _interopRequireDefault(_ShowColor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TagEditor = function (_Component) {
  _inherits(TagEditor, _Component);

  function TagEditor() {
    _classCallCheck(this, TagEditor);

    return _possibleConstructorReturn(this, (TagEditor.__proto__ || Object.getPrototypeOf(TagEditor)).apply(this, arguments));
  }

  _createClass(TagEditor, [{
    key: 'render',
    value: function render() {
      var entity = this.props.entity;


      var description = void 0;

      if (entity.description) {
        description = entity.description;
      } else {
        description = _react2.default.createElement(
          'i',
          null,
          '(no description for this tag)'
        );
      }

      return _react2.default.createElement(
        'div',
        { className: 'custom-editor' },
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'h1',
            null,
            _react2.default.createElement('i', { className: 'fa fa-tag' }),
            ' ',
            entity.name
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          'Description: ',
          _react2.default.createElement('br', null),
          _react2.default.createElement(
            'p',
            null,
            description
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          'Color: ',
          _react2.default.createElement(_ShowColor2.default, { color: entity.color })
        )
      );
    }
  }]);

  return TagEditor;
}(_react.Component);

exports.default = TagEditor;

/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _ShowColor = __webpack_require__(2);

var _ShowColor2 = _interopRequireDefault(_ShowColor);

var _ColorPickerTrigger = __webpack_require__(6);

var _ColorPickerTrigger2 = _interopRequireDefault(_ColorPickerTrigger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TagProperties = function (_Component) {
  _inherits(TagProperties, _Component);

  _createClass(TagProperties, null, [{
    key: 'title',
    value: function title(entity, entities) {
      return _react2.default.createElement(
        'span',
        null,
        _react2.default.createElement(
          'span',
          null,
          'tag (color: ',
          _react2.default.createElement(_ShowColor2.default, { color: entity.color, width: 15, height: 15 }),
          ')'
        )
      );
    }
  }]);

  function TagProperties(props) {
    _classCallCheck(this, TagProperties);

    var _this = _possibleConstructorReturn(this, (TagProperties.__proto__ || Object.getPrototypeOf(TagProperties)).call(this, props));

    _this.state = {
      displayColorPicker: false
    };
    return _this;
  }

  _createClass(TagProperties, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var displayColorPicker = this.state.displayColorPicker;
      var _props = this.props,
          entity = _props.entity,
          _onChange = _props.onChange;


      return _react2.default.createElement(
        'div',
        { className: 'properties-section' },
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Color'
          ),
          _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(_ColorPickerTrigger2.default, {
              displayColorPicker: displayColorPicker,
              containerStyles: { border: '1px dashed #000' },
              color: entity.color,
              onClickColorTrigger: function onClickColorTrigger() {
                return _this2.setState({ displayColorPicker: true });
              },
              onCloseColorPicker: function onCloseColorPicker() {
                return _this2.setState({ displayColorPicker: false });
              },
              onInputChange: function onInputChange(colorInputValue) {
                return colorInputValue !== entity.color && _onChange({ _id: entity._id, color: colorInputValue });
              },
              onChangeSelectionColor: function onChangeSelectionColor(colorHex) {
                return _onChange({ _id: entity._id, color: colorHex });
              }
            })
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'Description'
          ),
          _react2.default.createElement('textarea', {
            rows: '4',
            style: { resize: 'vertical' },
            value: entity.description || '',
            onChange: function onChange(v) {
              return _onChange({ _id: entity._id, description: v.target.value });
            }
          })
        )
      );
    }
  }]);

  return TagProperties;
}(_react.Component);

exports.default = TagProperties;

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _ShowColor = __webpack_require__(2);

var _ShowColor2 = _interopRequireDefault(_ShowColor);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EntityRefSelect = _jsreportStudio2.default.EntityRefSelect;
var sharedComponents = _jsreportStudio2.default.sharedComponents;

var selectValues = function selectValues(selected) {
  var tags = selected.map(function (v) {
    return { shortid: v.shortid };
  });

  return tags;
};

var EntityTagProperties = function (_Component) {
  _inherits(EntityTagProperties, _Component);

  function EntityTagProperties() {
    _classCallCheck(this, EntityTagProperties);

    return _possibleConstructorReturn(this, (EntityTagProperties.__proto__ || Object.getPrototypeOf(EntityTagProperties)).apply(this, arguments));
  }

  _createClass(EntityTagProperties, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.removeInvalidTagReferences();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      this.removeInvalidTagReferences();
    }
  }, {
    key: 'removeInvalidTagReferences',
    value: function removeInvalidTagReferences() {
      var _props = this.props,
          entity = _props.entity,
          entities = _props.entities,
          onChange = _props.onChange;


      if (!entity.tags) {
        return;
      }

      var updatedTags = entity.tags.filter(function (t) {
        return Object.keys(entities).filter(function (k) {
          return entities[k].__entitySet === 'tags' && entities[k].shortid === t.shortid;
        }).length;
      });

      if (updatedTags.length !== entity.tags.length) {
        onChange({ _id: entity._id, tags: updatedTags });
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _props2 = this.props,
          entity = _props2.entity,
          _onChange = _props2.onChange;


      return _react2.default.createElement(
        'div',
        { className: 'properties-section' },
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(EntityRefSelect, {
            headingLabel: 'Select tags',
            newLabel: 'New tag for template',
            filter: function filter(references) {
              return { tags: references.tags };
            },
            value: entity.tags ? entity.tags.map(function (t) {
              return t.shortid;
            }) : [],
            onChange: function onChange(selected) {
              return _onChange({ _id: entity._id, tags: selectValues(selected) });
            },
            renderNew: function renderNew(modalProps) {
              return _react2.default.createElement(sharedComponents.NewTagModal, _extends({}, modalProps, { options: _extends({}, modalProps.options, { defaults: { folder: entity.folder }, activateNewTab: false }) }));
            },
            multiple: true
          })
        )
      );
    }
  }], [{
    key: 'getSelectedTags',
    value: function getSelectedTags(entity, entities) {
      var getNameAndColor = function getNameAndColor(t) {
        var foundTags = Object.keys(entities).map(function (k) {
          return entities[k];
        }).filter(function (tg) {
          return tg.shortid === t.shortid;
        });

        return foundTags.length ? { name: foundTags[0].name, color: foundTags[0].color } : { name: '', color: undefined };
      };

      return (entity.tags || []).map(function (t) {
        return _extends({}, t, getNameAndColor(t));
      });
    }
  }, {
    key: 'title',
    value: function title(entity, entities) {
      if (!entity.tags || !entity.tags.length) {
        return 'tags';
      }

      return _react2.default.createElement(
        'span',
        null,
        'tags:\xA0',
        _react2.default.createElement(
          'span',
          null,
          EntityTagProperties.getSelectedTags(entity, entities).map(function (t, tIndex, allSelectTags) {
            return _react2.default.createElement(
              'span',
              { key: t.name, style: { display: 'inline-block', marginRight: '2px' } },
              _react2.default.createElement(_ShowColor2.default, { color: t.color, width: 12, height: 15 }),
              '\xA0',
              t.name,
              tIndex === allSelectTags.length - 1 ? '' : ','
            );
          })
        )
      );
    }
  }]);

  return EntityTagProperties;
}(_react.Component);

exports.default = EntityTagProperties;

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _emitter = __webpack_require__(3);

var _emitter2 = _interopRequireDefault(_emitter);

var _findTagInSet = __webpack_require__(4);

var _findTagInSet2 = _interopRequireDefault(_findTagInSet);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = __webpack_require__(24),
    noTagGroupName = _require.noTagGroupName,
    tagsGroupName = _require.tagsGroupName;

var EntityTreeTagOrganizer = function (_Component) {
  _inherits(EntityTreeTagOrganizer, _Component);

  function EntityTreeTagOrganizer() {
    _classCallCheck(this, EntityTreeTagOrganizer);

    var _this = _possibleConstructorReturn(this, (EntityTreeTagOrganizer.__proto__ || Object.getPrototypeOf(EntityTreeTagOrganizer)).call(this));

    var organizeByDefault = _jsreportStudio2.default.extensions.tags.options.organizeByDefault;

    if (organizeByDefault == null) {
      organizeByDefault = false;
    }

    _this.state = {
      organizeByTags: organizeByDefault
    };

    _this.onOrganizationModeChange = _this.onOrganizationModeChange.bind(_this);
    return _this;
  }

  _createClass(EntityTreeTagOrganizer, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      _emitter2.default.on('organizationModeByTagsChanged', this.onOrganizationModeChange);
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      _emitter2.default.off('organizationModeByTagsChanged', this.onOrganizationModeChange);
    }
  }, {
    key: 'onOrganizationModeChange',
    value: function onOrganizationModeChange(organizeByTag) {
      this.setState({
        organizeByTags: organizeByTag
      });
    }
  }, {
    key: 'addItemsByTag',
    value: function addItemsByTag(newItems, entitySetsNames, allTagEntities, currentTagEntities, entitiesByTagAndType, entitiesByTypeWithoutTag) {
      var tagsWithNoEntities = [];

      allTagEntities.forEach(function (tag) {
        var tagName = tag.name;
        var entitiesByType = entitiesByTagAndType[tagName];
        var typesInTag = Object.keys(entitiesByType);

        if (typesInTag.length === 0 || typesInTag.every(function (type) {
          return entitiesByType[type].length > 0;
        }) === false) {
          tagsWithNoEntities.push(tag);
          return;
        }

        var tagItem = void 0;

        entitySetsNames.forEach(function (type) {
          if (type === 'tags') {
            return;
          }

          var entities = entitiesByType[type];

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

            return;
          }

          var typeItem = {
            name: type,
            isEntitySet: true,
            items: []
          };

          entities.forEach(function (entity) {
            typeItem.items.push({
              name: entity.name,
              data: entity
            });
          });

          tagItem.items.push(typeItem);
        });
      });

      tagsWithNoEntities.forEach(function (tag) {
        var tagItem = {
          name: tag.name,
          isGroup: true,
          data: tag,
          items: []
        };

        entitySetsNames.forEach(function (type) {
          if (type === 'tags') {
            return;
          }

          tagItem.items.push({
            name: type,
            isEntitySet: true,
            items: []
          });
        });

        newItems.push(tagItem);
      });

      var noTagsItem = {
        name: noTagGroupName,
        isGroup: true,
        items: []
      };

      entitySetsNames.forEach(function (type) {
        if (type === 'tags') {
          return;
        }

        var item = {
          name: type,
          isEntitySet: true,
          items: []
        };

        var entities = entitiesByTypeWithoutTag[type];

        if (entities) {
          entities.forEach(function (entity) {
            item.items.push({
              name: entity.name,
              data: entity
            });
          });
        }

        noTagsItem.items.push(item);
      });

      newItems.push(noTagsItem);

      var tagsItem = {
        name: tagsGroupName,
        isEntitySet: true,
        items: []
      };

      if (currentTagEntities) {
        currentTagEntities.forEach(function (tag) {
          tagsItem.items.push({
            name: tag.name,
            data: tag
          });
        });
      }

      newItems.push(tagsItem);
    }
  }, {
    key: 'groupEntityByTagAndType',
    value: function groupEntityByTagAndType(collection, allTagEntities, entity) {
      if (entity.__entitySet === 'tags') {
        var name = entity.name;
        collection[name] = collection[name] || {};
      } else if (entity.tags != null) {
        entity.tags.forEach(function (tag) {
          var tagFound = (0, _findTagInSet2.default)(allTagEntities, tag.shortid);

          if (tagFound) {
            var _name = tagFound.name;
            collection[_name] = collection[_name] || [];
            collection[_name][entity.__entitySet] = collection[_name][entity.__entitySet] || [];
            collection[_name][entity.__entitySet].push(entity);
          }
        });
      }
    }
  }, {
    key: 'groupEntitiesByTag',
    value: function groupEntitiesByTag(entitySetsNames, entities) {
      var _this2 = this;

      var newItems = [];
      var allTagEntities = _jsreportStudio2.default.getReferences().tags || [];
      var entitiesByTagAndType = {};
      var entitiesByTypeWithoutTag = {};

      // initialize all tag groups based on all tag entities
      allTagEntities.forEach(function (entityTag) {
        _this2.groupEntityByTagAndType(entitiesByTagAndType, allTagEntities, entityTag);
      });

      entitySetsNames.forEach(function (entitySetName) {
        if (entitySetName === 'tags') {
          return;
        }

        var entitiesInSet = entities[entitySetName];

        if (!entitiesInSet) {
          return;
        }

        var entitiesInSetCount = entitiesInSet.length;

        for (var j = 0; j < entitiesInSetCount; j++) {
          var entity = entitiesInSet[j];

          if (entity.tags != null) {
            _this2.groupEntityByTagAndType(entitiesByTagAndType, allTagEntities, entity);
          } else {
            entitiesByTypeWithoutTag[entity.__entitySet] = entitiesByTypeWithoutTag[entity.__entitySet] || [];
            entitiesByTypeWithoutTag[entity.__entitySet].push(entity);
          }
        }
      });

      this.addItemsByTag(newItems, entitySetsNames, allTagEntities, entities.tags, entitiesByTagAndType, entitiesByTypeWithoutTag);

      return newItems;
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var containerStyles = this.props.containerStyles;


      return _react2.default.createElement(
        'div',
        { style: containerStyles },
        _react2.default.cloneElement(this.props.children, {}, function (_ref) {
          var renderDefaultTree = _ref.renderDefaultTree,
              renderTree = _ref.renderTree,
              getSetsToRender = _ref.getSetsToRender,
              entitySets = _ref.entitySets,
              entities = _ref.entities;
          var organizeByTags = _this3.state.organizeByTags;


          if (!organizeByTags) {
            return renderDefaultTree(entitySets, entities);
          }

          return renderTree(_this3.groupEntitiesByTag(getSetsToRender(entitySets), entities));
        })
      );
    }
  }]);

  return EntityTreeTagOrganizer;
}(_react.Component);

exports.default = EntityTreeTagOrganizer;

/***/ }),
/* 23 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
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

/* harmony default export */ __webpack_exports__["default"] = (mitt);
//# sourceMappingURL=mitt.es.js.map


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var noTagGroupName = '(objects without tag)';
var tagsGroupName = 'tags';
var reservedTagNames = [noTagGroupName, tagsGroupName];

module.exports.default = reservedTagNames;
module.exports.noTagGroupName = noTagGroupName;
module.exports.tagsGroupName = tagsGroupName;

/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _organizeState = __webpack_require__(5);

var organizeState = _interopRequireWildcard(_organizeState);

var _emitter = __webpack_require__(3);

var _emitter2 = _interopRequireDefault(_emitter);

var _TagEntityTreeButtonToolbar = __webpack_require__(9);

var _TagEntityTreeButtonToolbar2 = _interopRequireDefault(_TagEntityTreeButtonToolbar);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TagEntityTreeOrganizeButtonToolbar = function (_Component) {
  _inherits(TagEntityTreeOrganizeButtonToolbar, _Component);

  function TagEntityTreeOrganizeButtonToolbar(props) {
    _classCallCheck(this, TagEntityTreeOrganizeButtonToolbar);

    var _this = _possibleConstructorReturn(this, (TagEntityTreeOrganizeButtonToolbar.__proto__ || Object.getPrototypeOf(TagEntityTreeOrganizeButtonToolbar)).call(this, props));

    _this.handleOrganizationModeChange = _this.handleOrganizationModeChange.bind(_this);
    return _this;
  }

  _createClass(TagEntityTreeOrganizeButtonToolbar, [{
    key: 'handleOrganizationModeChange',
    value: function handleOrganizationModeChange(ev) {
      ev.stopPropagation();

      // notify parent that the organization mode has changed
      _emitter2.default.emit('organizationModeByTagsChanged', !organizeState.current);
      this.props.closeMenu();
    }
  }, {
    key: 'render',
    value: function render() {
      return _react2.default.createElement(
        'div',
        {
          title: 'Group and organize entities tree by tag',
          style: { display: 'inline-block' },
          onClick: this.handleOrganizationModeChange
        },
        _react2.default.createElement(
          'span',
          {
            style: { display: 'inline-block', marginRight: '0.3rem' },
            className: organizeState.current ? _TagEntityTreeButtonToolbar2.default.active : ''
          },
          _react2.default.createElement('span', { className: 'fa fa-tags' })
        ),
        _react2.default.createElement(
          'span',
          { style: { display: 'inline-block' } },
          'Group by tag'
        )
      );
    }
  }]);

  return TagEntityTreeOrganizeButtonToolbar;
}(_react.Component);

exports.default = TagEntityTreeOrganizeButtonToolbar;

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _organizeState = __webpack_require__(5);

var organizeState = _interopRequireWildcard(_organizeState);

var _emitter = __webpack_require__(3);

var _emitter2 = _interopRequireDefault(_emitter);

var _TagEntityTreeFilterByTags = __webpack_require__(27);

var _TagEntityTreeFilterByTags2 = _interopRequireDefault(_TagEntityTreeFilterByTags);

var _TagEntityTreeButtonToolbar = __webpack_require__(9);

var _TagEntityTreeButtonToolbar2 = _interopRequireDefault(_TagEntityTreeButtonToolbar);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TagEntityTreeFilterButtonToolbar = function (_Component) {
  _inherits(TagEntityTreeFilterButtonToolbar, _Component);

  function TagEntityTreeFilterButtonToolbar(props) {
    _classCallCheck(this, TagEntityTreeFilterButtonToolbar);

    var _this = _possibleConstructorReturn(this, (TagEntityTreeFilterButtonToolbar.__proto__ || Object.getPrototypeOf(TagEntityTreeFilterButtonToolbar)).call(this, props));

    _this.state = {
      showFilter: false,
      selectedTags: organizeState.filterTags || []
    };

    _this.handleFilterClick = _this.handleFilterClick.bind(_this);
    _this.handleCloseFilter = _this.handleCloseFilter.bind(_this);
    _this.handleTagSelectChange = _this.handleTagSelectChange.bind(_this);
    return _this;
  }

  _createClass(TagEntityTreeFilterButtonToolbar, [{
    key: 'handleFilterClick',
    value: function handleFilterClick(ev) {
      ev.stopPropagation();
      this.setState({ showFilter: true });
    }
  }, {
    key: 'handleCloseFilter',
    value: function handleCloseFilter() {
      this.setState({ showFilter: false });
      this.props.closeMenu();
    }
  }, {
    key: 'handleTagSelectChange',
    value: function handleTagSelectChange(selectedTags) {
      var setFilter = this.props.setFilter;


      setFilter({
        tags: selectedTags
      });

      this.setState({
        selectedTags: selectedTags
      }, function () {
        _emitter2.default.emit('filterByTagsChanged', selectedTags);
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var _state = this.state,
          showFilter = _state.showFilter,
          selectedTags = _state.selectedTags;

      var allTags = _jsreportStudio2.default.getReferences().tags;
      var isActive = selectedTags.length > 0;

      return _react2.default.createElement(
        'div',
        {
          title: 'Filter entities tree by tag',
          style: { display: 'inline-block' },
          onClick: this.handleFilterClick
        },
        _react2.default.createElement(
          'span',
          { style: { display: 'inline-block' } },
          _react2.default.createElement(
            'span',
            {
              style: { display: 'inline-block', marginRight: '0.3rem' },
              className: isActive ? _TagEntityTreeButtonToolbar2.default.active : ''
            },
            _react2.default.createElement('span', { className: 'fa fa-filter' }),
            '\xA0',
            _react2.default.createElement('span', { className: 'fa fa-tag' })
          ),
          _react2.default.createElement(
            'span',
            { style: { display: 'inline-block' } },
            'Filter by tag'
          )
        ),
        _react2.default.createElement(
          _jsreportStudio.Popover,
          {
            open: showFilter,
            onClose: this.handleCloseFilter
          },
          _react2.default.createElement(_TagEntityTreeFilterByTags2.default, {
            tags: allTags,
            selectedTags: selectedTags,
            onTagSelectChange: this.handleTagSelectChange,
            onFilterClose: this.handleCloseFilter
          })
        )
      );
    }
  }]);

  return TagEntityTreeFilterButtonToolbar;
}(_react.Component);

exports.default = TagEntityTreeFilterButtonToolbar;

/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactList = __webpack_require__(28);

var _reactList2 = _interopRequireDefault(_reactList);

var _colorLuminance = __webpack_require__(8);

var _colorLuminance2 = _interopRequireDefault(_colorLuminance);

var _getColorLuminance = __webpack_require__(29);

var _getColorLuminance2 = _interopRequireDefault(_getColorLuminance);

var _ShowColor = __webpack_require__(2);

var _ShowColor2 = _interopRequireDefault(_ShowColor);

var _TagEntityTreeFilterByTags = __webpack_require__(31);

var _TagEntityTreeFilterByTags2 = _interopRequireDefault(_TagEntityTreeFilterByTags);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TagEntityTreeFilterByTags = function (_Component) {
  _inherits(TagEntityTreeFilterByTags, _Component);

  function TagEntityTreeFilterByTags(props) {
    _classCallCheck(this, TagEntityTreeFilterByTags);

    var _this = _possibleConstructorReturn(this, (TagEntityTreeFilterByTags.__proto__ || Object.getPrototypeOf(TagEntityTreeFilterByTags)).call(this, props));

    _this.tagSelectionRef = _react2.default.createRef();
    _this.tagSelectionInputRef = _react2.default.createRef();
    _this.tagListRef = _react2.default.createRef();

    _this.state = {
      showTagsList: true,
      filterText: ''
    };

    _this.createRenderer = _this.createRenderer.bind(_this);
    _this.addSelectedTag = _this.addSelectedTag.bind(_this);
    _this.handleTagSelectionClick = _this.handleTagSelectionClick.bind(_this);
    _this.handleChangeInputTag = _this.handleChangeInputTag.bind(_this);
    _this.handleKeyDownInputTag = _this.handleKeyDownInputTag.bind(_this);
    _this.onRemoveTagItem = _this.onRemoveTagItem.bind(_this);
    return _this;
  }

  _createClass(TagEntityTreeFilterByTags, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.focus();
    }
  }, {
    key: 'createRenderer',
    value: function createRenderer(tags) {
      var _this2 = this;

      return function (index, key) {
        return _this2.renderTagItem(tags[index]);
      };
    }
  }, {
    key: 'addSelectedTag',
    value: function addSelectedTag(tag) {
      var previousSelectedTags = this.props.selectedTags;

      var selectedTags = [].concat(_toConsumableArray(previousSelectedTags), [tag]);

      this.props.onTagSelectChange(selectedTags);
      this.focus();
    }
  }, {
    key: 'focus',
    value: function focus() {
      if (this.tagSelectionInputRef.current && typeof this.tagSelectionInputRef.current.focus === 'function') {
        this.tagSelectionInputRef.current.focus();
      }
    }
  }, {
    key: 'getTagsToShow',
    value: function getTagsToShow(allTags, selectedTags, filterText) {
      if (selectedTags.length === 0 && filterText === '') {
        return allTags;
      }

      return allTags.filter(function (tag) {
        var filterPass = true;

        if (filterText !== '') {
          filterPass = tag.name.indexOf(filterText) !== -1;
        }

        if (!filterPass) {
          return false;
        }

        var foundInSelectedTags = selectedTags.some(function (selectTag) {
          return selectTag.shortid === tag.shortid;
        });

        return !foundInSelectedTags;
      });
    }
  }, {
    key: 'handleTagSelectionClick',
    value: function handleTagSelectionClick(ev) {
      // if the tag selection area is directly clicked
      // focus the input
      if (ev.target === this.tagSelectionRef.current) {
        this.focus();
      }
    }
  }, {
    key: 'handleChangeInputTag',
    value: function handleChangeInputTag(ev) {
      this.setState({
        filterText: ev.target.value
      });
    }
  }, {
    key: 'handleKeyDownInputTag',
    value: function handleKeyDownInputTag(ev) {
      if (ev.defaultPrevented) {
        return;
      }

      var keyCode = ev.keyCode;
      var inputTag = ev.target;
      var remove = false;
      var enterKey = 13;
      var removeKey = 8;

      if (keyCode === enterKey) {
        ev.preventDefault();

        return this.props.onFilterClose();
      }

      if (keyCode === removeKey) {
        remove = true;
      }

      if (remove && inputTag.value === '') {
        var selectedTags = this.props.selectedTags;
        var selectedTagsLastIndex = selectedTags.length - 1;

        ev.preventDefault();

        if (selectedTagsLastIndex >= 0) {
          this.onRemoveTagItem(selectedTags[selectedTagsLastIndex], selectedTagsLastIndex);
        }
      }
    }
  }, {
    key: 'onRemoveTagItem',
    value: function onRemoveTagItem(tag, tagIndex) {
      var originalSelectedTags = this.props.selectedTags;

      var selectedTags = [].concat(_toConsumableArray(originalSelectedTags.slice(0, tagIndex)), _toConsumableArray(originalSelectedTags.slice(tagIndex + 1)));

      this.props.onTagSelectChange(selectedTags);
    }
  }, {
    key: 'renderTagItem',
    value: function renderTagItem(tag) {
      var _this3 = this;

      return _react2.default.createElement(
        'div',
        {
          key: tag.shortid,
          className: _TagEntityTreeFilterByTags2.default.tagsListItem,
          onClick: function onClick() {
            return _this3.addSelectedTag(tag);
          }
        },
        _react2.default.createElement(_ShowColor2.default, { color: tag.color }),
        '\xA0',
        _react2.default.createElement(
          'span',
          null,
          tag.name
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      var _this4 = this;

      var _state = this.state,
          showTagsList = _state.showTagsList,
          filterText = _state.filterText;
      var _props = this.props,
          tags = _props.tags,
          selectedTags = _props.selectedTags;

      var tagsToShowInList = this.getTagsToShow(tags, selectedTags, filterText);

      var stylesForTagsList = {};
      var stylesForInputTag = {};

      if (showTagsList) {
        stylesForTagsList.display = 'block';
      } else {
        stylesForTagsList.display = 'none';
      }

      if (selectedTags.length === 0) {
        stylesForInputTag.width = '100%';
      }

      return _react2.default.createElement(
        'div',
        { className: _TagEntityTreeFilterByTags2.default.searchTagsContainer },
        _react2.default.createElement(
          'div',
          { className: _TagEntityTreeFilterByTags2.default.searchTagsInputBox },
          _react2.default.createElement(
            'div',
            { ref: this.tagSelectionRef, className: _TagEntityTreeFilterByTags2.default.tagsSelect, onClick: this.handleTagSelectionClick },
            _react2.default.createElement(
              'span',
              null,
              selectedTags.map(function (tag, tagIndex) {
                var tagStyles = {
                  backgroundColor: tag.color,
                  borderColor: (0, _colorLuminance2.default)(tag.color, -0.35),
                  color: (0, _getColorLuminance2.default)(tag.color) >= 0.5 ? '#000' : '#fff'
                };

                return _react2.default.createElement(
                  'span',
                  { key: tag.shortid, className: _TagEntityTreeFilterByTags2.default.tagsSelectItem, style: tagStyles },
                  tag.name,
                  _react2.default.createElement('a', { className: _TagEntityTreeFilterByTags2.default.tagsSelectItemRemove, onClick: function onClick() {
                      return _this4.onRemoveTagItem(tag, tagIndex);
                    } })
                );
              }),
              _react2.default.createElement('input', {
                ref: this.tagSelectionInputRef,
                type: 'text',
                placeholder: selectedTags.length === 0 ? 'select a tag' : '',
                className: _TagEntityTreeFilterByTags2.default.searchTags,
                style: stylesForInputTag,
                onChange: this.handleChangeInputTag,
                onKeyDown: this.handleKeyDownInputTag
              })
            )
          )
        ),
        _react2.default.createElement(
          'div',
          {
            ref: this.tagListRef,
            className: _TagEntityTreeFilterByTags2.default.tagsListContainer,
            style: stylesForTagsList
          },
          _react2.default.createElement(
            'div',
            { className: _TagEntityTreeFilterByTags2.default.tagsList },
            tags.length === 0 ? _react2.default.createElement(
              'div',
              { className: _TagEntityTreeFilterByTags2.default.tagsListEmpty },
              'No tags registered'
            ) : _react2.default.createElement(_reactList2.default, {
              itemRenderer: this.createRenderer(tagsToShowInList),
              length: tagsToShowInList.length
            })
          )
        )
      );
    }
  }]);

  return TagEntityTreeFilterByTags;
}(_react.Component);

TagEntityTreeFilterByTags.defaultProps = {
  onTagSelectChange: function onTagSelectChange() {}
};

exports.default = TagEntityTreeFilterByTags;

/***/ }),
/* 28 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['react-list'];

/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _hexToRgb = __webpack_require__(30);

var _hexToRgb2 = _interopRequireDefault(_hexToRgb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (hex) {
  var rgb = (0, _hexToRgb2.default)(hex);

  var R = void 0,
      G = void 0,
      B = void 0;

  var RsRGB = rgb.r / 255;
  var GsRGB = rgb.g / 255;
  var BsRGB = rgb.b / 255;

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
};

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;

exports.default = function (hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var fullHex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);

  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"searchTagsContainer":"x-tags-TagEntityTreeFilterByTags-searchTagsContainer","searchTagsInputBox":"x-tags-TagEntityTreeFilterByTags-searchTagsInputBox","searchTags":"x-tags-TagEntityTreeFilterByTags-searchTags","tagsListContainer":"x-tags-TagEntityTreeFilterByTags-tagsListContainer","tagsList":"x-tags-TagEntityTreeFilterByTags-tagsList","tagsListEmpty":"x-tags-TagEntityTreeFilterByTags-tagsListEmpty","tagsListItem":"x-tags-TagEntityTreeFilterByTags-tagsListItem","tagsSelect":"x-tags-TagEntityTreeFilterByTags-tagsSelect","tagsSelectItem":"x-tags-TagEntityTreeFilterByTags-tagsSelectItem","tagsSelectItemRemove":"x-tags-TagEntityTreeFilterByTags-tagsSelectItemRemove"};

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _ShowColor = __webpack_require__(2);

var _ShowColor2 = _interopRequireDefault(_ShowColor);

var _findTagInSet = __webpack_require__(4);

var _findTagInSet2 = _interopRequireDefault(_findTagInSet);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TagEntityTreeItem = function (_Component) {
  _inherits(TagEntityTreeItem, _Component);

  function TagEntityTreeItem() {
    _classCallCheck(this, TagEntityTreeItem);

    return _possibleConstructorReturn(this, (TagEntityTreeItem.__proto__ || Object.getPrototypeOf(TagEntityTreeItem)).apply(this, arguments));
  }

  _createClass(TagEntityTreeItem, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          entity = _props.entity,
          entities = _props.entities;

      var tags = entity.tags || [];

      // for tags, display the color right in the entity tree
      if (entity.__entitySet === 'tags') {
        tags = [entity];
      }

      var tagsLength = tags.length;

      return _react2.default.createElement(
        'div',
        { style: { display: 'inline-block', marginLeft: '0.2rem', marginRight: '0.2rem' } },
        tags.map(function (tag, tagIndex) {
          var tagFound = (0, _findTagInSet2.default)(entities.tags, tag.shortid) || {};

          return _react2.default.createElement(
            'span',
            { key: tag.shortid, title: tagFound.name },
            _react2.default.createElement(_ShowColor2.default, { color: tagFound.color, width: 8, height: 15 }),
            tagIndex !== tagsLength - 1 ? ' ' : null
          );
        })
      );
    }
  }]);

  return TagEntityTreeItem;
}(_react.Component);

exports.default = TagEntityTreeItem;

/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _ShowColor = __webpack_require__(2);

var _ShowColor2 = _interopRequireDefault(_ShowColor);

var _findTagInSet = __webpack_require__(4);

var _findTagInSet2 = _interopRequireDefault(_findTagInSet);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TagEntityTreeTagGroupItem = function (_Component) {
  _inherits(TagEntityTreeTagGroupItem, _Component);

  function TagEntityTreeTagGroupItem() {
    _classCallCheck(this, TagEntityTreeTagGroupItem);

    return _possibleConstructorReturn(this, (TagEntityTreeTagGroupItem.__proto__ || Object.getPrototypeOf(TagEntityTreeTagGroupItem)).apply(this, arguments));
  }

  _createClass(TagEntityTreeTagGroupItem, [{
    key: 'render',
    value: function render() {
      var __entitySet = this.props.__entitySet;


      if (__entitySet !== 'tags' && __entitySet !== 'folders') {
        return null;
      }

      var tags = [];

      if (__entitySet === 'tags') {
        tags.push({ name: this.props.name, shortid: this.props.shortid, color: this.props.color });
      } else {
        tags = this.props.tags || [];

        tags = tags.map(function (t) {
          return (0, _findTagInSet2.default)(_jsreportStudio2.default.getReferences().tags, t.shortid);
        });
      }

      var tagsLength = tags.length;

      return _react2.default.createElement(
        'div',
        { style: { display: 'inline-block', marginLeft: '0.2rem', marginRight: '0.2rem' } },
        tags.map(function (tag, tagIndex) {
          if (!tag) {
            return null;
          }

          return _react2.default.createElement(
            'span',
            { key: tag.shortid, title: tag.name },
            _react2.default.createElement(_ShowColor2.default, { color: tag.color, width: 8, height: 15 }),
            tagIndex !== tagsLength - 1 ? ' ' : null
          );
        })
      );
    }
  }]);

  return TagEntityTreeTagGroupItem;
}(_react.Component);

exports.default = TagEntityTreeTagGroupItem;

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (entity, entitySets, filterInfo) {
  var tags = filterInfo.tags;

  var allTagsInEntity = entity.tags || [];

  if (tags == null) {
    return true;
  }

  if (tags.length > 0) {
    return tags.every(function (tag) {
      return allTagsInEntity.some(function (tagInEntity) {
        return tagInEntity.shortid === tag.shortid;
      });
    });
  }

  return true;
};

/***/ })
/******/ ]);