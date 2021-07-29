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
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
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
/***/ (function(module, exports) {

module.exports = Studio.libraries['filesaver.js-npm'];

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var b64toBlob = function b64toBlob(b64Data) {
  var contentType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var sliceSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 512;

  var byteCharacters = atob(b64Data);
  var byteArrays = [];

  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    var slice = byteCharacters.slice(offset, offset + sliceSize);

    var byteNumbers = new Array(slice.length);
    for (var i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    var byteArray = new Uint8Array(byteNumbers);

    byteArrays.push(byteArray);
  }

  var blob = new Blob(byteArrays, { type: contentType });
  return blob;
};

exports.default = b64toBlob;

/***/ }),
/* 4 */
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _xlsxTemplateUploadButton = void 0;

var XlsxUploadButton = function (_Component) {
  _inherits(XlsxUploadButton, _Component);

  function XlsxUploadButton(props) {
    _classCallCheck(this, XlsxUploadButton);

    var _this = _possibleConstructorReturn(this, (XlsxUploadButton.__proto__ || Object.getPrototypeOf(XlsxUploadButton)).call(this, props));

    _this.inputFileRef = _react2.default.createRef();
    return _this;
  }

  // we need to have global action in main_dev which is triggered when users clicks on + on images
  // this triggers invisible button in the toolbar


  _createClass(XlsxUploadButton, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      _xlsxTemplateUploadButton = this;
    }
  }, {
    key: 'upload',
    value: function upload(e) {
      var _this2 = this;

      if (!e.target.files.length) {
        return;
      }

      var xlsxDefaults = e.target.xlsxDefaults;
      var uploadCallback = e.target.uploadCallback;

      delete e.target.xlsxDefaults;
      delete e.target.uploadCallback;

      var file = e.target.files[0];
      var reader = new FileReader();

      reader.onloadend = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var xlsx, response;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _this2.inputFileRef.current.value = '';

                if (!_this2.forNew) {
                  _context.next = 16;
                  break;
                }

                if (!_jsreportStudio2.default.workspaces) {
                  _context.next = 5;
                  break;
                }

                _context.next = 5;
                return _jsreportStudio2.default.workspaces.save();

              case 5:
                xlsx = {};


                if (xlsxDefaults != null) {
                  xlsx = Object.assign(xlsx, xlsxDefaults);
                }

                xlsx = Object.assign(xlsx, {
                  contentRaw: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length),
                  name: file.name.replace(/.xlsx$/, '')
                });

                _context.next = 10;
                return _jsreportStudio2.default.api.post('/odata/xlsxTemplates', {
                  data: xlsx
                });

              case 10:
                response = _context.sent;


                response.__entitySet = 'xlsxTemplates';

                _jsreportStudio2.default.addExistingEntity(response);
                _jsreportStudio2.default.openTab(Object.assign({}, response));
                _context.next = 25;
                break;

              case 16:
                if (!_jsreportStudio2.default.workspaces) {
                  _context.next = 22;
                  break;
                }

                _jsreportStudio2.default.updateEntity({
                  _id: _this2.props.tab.entity._id,
                  contentRaw: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length)
                });

                _context.next = 20;
                return _jsreportStudio2.default.workspaces.save();

              case 20:
                _context.next = 25;
                break;

              case 22:
                _context.next = 24;
                return _jsreportStudio2.default.api.patch('/odata/xlsxTemplates(' + _this2.props.tab.entity._id + ')', {
                  data: {
                    contentRaw: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length)
                  }
                });

              case 24:
                _jsreportStudio2.default.loadEntity(_this2.props.tab.entity._id, true);

              case 25:

                if (uploadCallback) {
                  uploadCallback();
                }

              case 26:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, _this2);
      }));

      reader.onerror = function () {
        var errMsg = 'There was an error reading the file!';

        if (uploadCallback) {
          uploadCallback(new Error(errMsg));
        }

        alert(errMsg);
      };

      reader.readAsDataURL(file);
    }
  }, {
    key: 'openFileDialog',
    value: function openFileDialog(forNew) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      this.forNew = forNew;

      if (options.defaults) {
        this.inputFileRef.current.xlsxDefaults = options.defaults;
      } else {
        delete this.inputFileRef.current.xlsxDefaults;
      }

      if (options.uploadCallback) {
        this.inputFileRef.current.uploadCallback = options.uploadCallback;
      } else {
        delete this.inputFileRef.current.uploadCallback;
      }

      this.inputFileRef.current.dispatchEvent(new MouseEvent('click', {
        view: window,
        bubbles: false,
        cancelable: true
      }));
    }
  }, {
    key: 'renderUpload',
    value: function renderUpload() {
      var _this3 = this;

      return _react2.default.createElement('input', {
        type: 'file',
        key: 'file',
        ref: this.inputFileRef,
        style: { display: 'none' },
        onChange: function onChange(e) {
          return _this3.upload(e);
        }, accept: '.xlsx'
      });
    }
  }, {
    key: 'render',
    value: function render() {
      return this.renderUpload(true);
    }
  }], [{
    key: 'OpenUpload',
    value: function OpenUpload() {
      var forNew = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
      var options = arguments[1];

      _xlsxTemplateUploadButton.openFileDialog(forNew, options);
    }
  }]);

  return XlsxUploadButton;
}(_react.Component);

exports.default = XlsxUploadButton;

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _filesaver = __webpack_require__(2);

var _filesaver2 = _interopRequireDefault(_filesaver);

var _XlsxEditor = __webpack_require__(6);

var _XlsxEditor2 = _interopRequireDefault(_XlsxEditor);

var _b64toBlob = __webpack_require__(3);

var _b64toBlob2 = _interopRequireDefault(_b64toBlob);

var _XlsxUploadButton = __webpack_require__(4);

var _XlsxUploadButton2 = _interopRequireDefault(_XlsxUploadButton);

var _XlsxTemplateProperties = __webpack_require__(7);

var _XlsxTemplateProperties2 = _interopRequireDefault(_XlsxTemplateProperties);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_jsreportStudio2.default.addEntitySet({
  name: 'xlsxTemplates',
  faIcon: 'fa-file-excel-o',
  visibleName: 'xlsx template',
  onNew: function onNew() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return _XlsxUploadButton2.default.OpenUpload(true, options);
  },
  entityTreePosition: 500
});

_jsreportStudio2.default.addEditorComponent('xlsxTemplates', _XlsxEditor2.default);

_jsreportStudio2.default.entityEditorComponentKeyResolvers.push(function (entity) {
  if (entity.__entitySet === 'xlsxTemplates') {
    var editorKey = 'xlsxTemplates';
    var editorProps = {};

    if (_jsreportStudio2.default.extensions.assets) {
      // use assets editor for xlsxTemplate when
      // asset extension exists
      editorKey = 'assets';

      editorProps.icon = 'fa-file-excel-o';
      editorProps.embeddingCode = '';
      editorProps.displayName = entity.name;

      editorProps.onPreview = function () {
        if (_jsreportStudio2.default.extensions.xlsx.options.preview.showWarning !== false && _jsreportStudio2.default.getSettingValueByKey('office-preview-informed', false) !== true) {
          _jsreportStudio2.default.setSetting('office-preview-informed', true);

          _jsreportStudio2.default.openModal(function () {
            return React.createElement(
              'div',
              null,
              'We need to upload your xlsx to our publicly hosted server to be able to use Office Online Service for previewing here in the studio. You can disable it in the configuration, see ',
              React.createElement(
                'a',
                { href: 'https://jsreport.net/learn/xlsx#preview-in-studio', rel: 'noopener noreferrer', target: '_blank' },
                'the docs'
              ),
              ' for details.'
            );
          });
        }
      };

      editorProps.onDownload = function (entity) {
        var blob = (0, _b64toBlob2.default)(entity.contentRaw, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        _filesaver2.default.saveAs(blob, entity.name);
      };

      editorProps.onUpload = function (entity, cb) {
        _XlsxUploadButton2.default.OpenUpload(false, {
          uploadCallback: cb
        });
      };

      editorProps.getPreviewContent = function (entity, _ref) {
        var previewLoadFinish = _ref.previewLoadFinish;

        return React.createElement(_jsreportStudio.Preview, {
          onLoad: previewLoadFinish,
          initialSrc: _jsreportStudio2.default.resolveUrl('xlsxTemplates/office/' + entity._id + '/content')
        });
      };

      editorProps.emptyMessage = 'xlsxTemplate is empty';
    }

    return {
      key: editorKey,
      entity: editorKey === 'assets' ? _extends({}, entity, {
        name: entity.name + '.xlsx'
      }) : entity,
      props: editorProps
    };
  }
});

_jsreportStudio2.default.addToolbarComponent(_XlsxUploadButton2.default);
_jsreportStudio2.default.addPropertiesComponent(_XlsxTemplateProperties2.default.title, _XlsxTemplateProperties2.default, function (entity) {
  return entity.__entitySet === 'templates' && entity.recipe === 'xlsx';
});

_jsreportStudio2.default.runListeners.push(function (request, entities) {
  if (request.template.recipe !== 'xlsx') {
    return;
  }

  if (_jsreportStudio2.default.extensions.xlsx.options.preview.enabled === false) {
    return;
  }

  if (_jsreportStudio2.default.extensions.xlsx.options.preview.showWarning === false) {
    return;
  }

  if (_jsreportStudio2.default.getSettingValueByKey('office-preview-informed', false) === true) {
    return;
  }

  _jsreportStudio2.default.setSetting('office-preview-informed', true);

  _jsreportStudio2.default.openModal(function () {
    return React.createElement(
      'div',
      null,
      'We need to upload your office report to our publicly hosted server to be able to use Excel Online Service for previewing here in the studio. You can disable it in the configuration, see ',
      React.createElement(
        'a',
        { href: 'https://jsreport.net/learn/xlsx', rel: 'noopener noreferrer', target: '_blank' },
        'https://jsreport.net/learn/xlsx'
      ),
      ' for details.'
    );
  });
});

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _b64toBlob = __webpack_require__(3);

var _b64toBlob2 = _interopRequireDefault(_b64toBlob);

var _XlsxUploadButton = __webpack_require__(4);

var _XlsxUploadButton2 = _interopRequireDefault(_XlsxUploadButton);

var _filesaver = __webpack_require__(2);

var _filesaver2 = _interopRequireDefault(_filesaver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var XlsxEditor = function (_Component) {
  _inherits(XlsxEditor, _Component);

  function XlsxEditor() {
    _classCallCheck(this, XlsxEditor);

    return _possibleConstructorReturn(this, (XlsxEditor.__proto__ || Object.getPrototypeOf(XlsxEditor)).apply(this, arguments));
  }

  _createClass(XlsxEditor, [{
    key: 'download',
    value: function download() {
      var blob = (0, _b64toBlob2.default)(this.props.entity.contentRaw, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      _filesaver2.default.saveAs(blob, this.props.entity.name);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var entity = this.props.entity;


      return _react2.default.createElement(
        'div',
        { className: 'custom-editor' },
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'h1',
            null,
            _react2.default.createElement('i', { className: 'fa fa-file-excel-o' }),
            ' ',
            entity.name
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'button',
            { className: 'button confirmation', onClick: function onClick() {
                return _this2.download();
              } },
            _react2.default.createElement('i', { className: 'fa fa-download' }),
            ' Download xlsx template'
          ),
          _react2.default.createElement(
            'button',
            { className: 'button confirmation', onClick: function onClick() {
                return _XlsxUploadButton2.default.OpenUpload(false);
              } },
            _react2.default.createElement('i', { className: 'fa fa-upload' }),
            ' Upload (edit) xlsx template'
          )
        )
      );
    }
  }]);

  return XlsxEditor;
}(_react.Component);

exports.default = XlsxEditor;

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EntityRefSelect = _jsreportStudio2.default.EntityRefSelect;

var XlsxTemplateProperties = function (_Component) {
  _inherits(XlsxTemplateProperties, _Component);

  function XlsxTemplateProperties() {
    _classCallCheck(this, XlsxTemplateProperties);

    return _possibleConstructorReturn(this, (XlsxTemplateProperties.__proto__ || Object.getPrototypeOf(XlsxTemplateProperties)).apply(this, arguments));
  }

  _createClass(XlsxTemplateProperties, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.removeInvalidXlsxTemplateReferences();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      this.removeInvalidXlsxTemplateReferences();
    }
  }, {
    key: 'removeInvalidXlsxTemplateReferences',
    value: function removeInvalidXlsxTemplateReferences() {
      var _props = this.props,
          entity = _props.entity,
          entities = _props.entities,
          onChange = _props.onChange;


      if (!entity.xlsxTemplate && !entity.xlsx) {
        return;
      }

      var updatedXlsxTemplates = Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'xlsxTemplates' && entity.xlsxTemplate != null && entities[k].shortid === entity.xlsxTemplate.shortid;
      });
      var updatedXlsxAssets = Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'assets' && entity.xlsx != null && entities[k].shortid === entity.xlsx.templateAssetShortid;
      });

      if (entity.xlsx && entity.xlsx.templateAssetShortid && updatedXlsxAssets.length === 0) {
        onChange({ _id: entity._id, xlsx: null });
      }

      if (entity.xlsxTemplate && entity.xlsxTemplate.shortid && updatedXlsxTemplates.length === 0) {
        onChange({ _id: entity._id, xlsxTemplate: null });
      }
    }
  }, {
    key: 'changeXlsxTemplate',
    value: function changeXlsxTemplate(oldXlsxTemplate, prop, value) {
      var newValue = void 0;

      if (value == null) {
        newValue = _extends({}, oldXlsxTemplate);
        newValue[prop] = null;
      } else {
        return _extends({}, oldXlsxTemplate, _defineProperty({}, prop, value));
      }

      newValue = Object.keys(newValue).length ? newValue : null;

      return newValue;
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
          _react2.default.createElement(
            'label',
            null,
            'xlsx asset'
          ),
          _react2.default.createElement(EntityRefSelect, {
            headingLabel: 'Select docx template',
            value: entity.xlsx ? entity.xlsx.templateAssetShortid : '',
            onChange: function onChange(selected) {
              return _onChange({
                _id: entity._id,
                xlsx: selected != null && selected.length > 0 ? { templateAssetShortid: selected[0].shortid } : null
              });
            },
            filter: function filter(references) {
              return { assets: references.assets };
            }
          })
        ),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'xlsx template (deprecated)'
          ),
          _react2.default.createElement(EntityRefSelect, {
            headingLabel: 'Select xlsx template',
            filter: function filter(references) {
              return { xlsxTemplates: references.xlsxTemplates };
            },
            value: entity.xlsxTemplate ? entity.xlsxTemplate.shortid : null,
            onChange: function onChange(selected) {
              return _onChange({
                _id: entity._id,
                xlsxTemplate: selected != null && selected.length > 0 ? { shortid: selected[0].shortid } : null
              });
            }
          })
        )
      );
    }
  }], [{
    key: 'selectItems',
    value: function selectItems(entities) {
      return Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'xlsxTemplates';
      }).map(function (k) {
        return entities[k];
      });
    }
  }, {
    key: 'selectAssets',
    value: function selectAssets(entities) {
      return Object.keys(entities).filter(function (k) {
        return entities[k].__entitySet === 'assets';
      }).map(function (k) {
        return entities[k];
      });
    }
  }, {
    key: 'title',
    value: function title(entity, entities) {
      if ((!entity.xlsxTemplate || !entity.xlsxTemplate.shortid) && (!entity.xlsx || !entity.xlsx.templateAssetShortid)) {
        return 'xlsx template';
      }

      var foundItems = XlsxTemplateProperties.selectItems(entities).filter(function (e) {
        return entity.xlsxTemplate != null && entity.xlsxTemplate.shortid === e.shortid;
      });
      var foundAssets = XlsxTemplateProperties.selectAssets(entities).filter(function (e) {
        return entity.xlsx != null && entity.xlsx.templateAssetShortid === e.shortid;
      });

      if (!foundItems.length && !foundAssets.length) {
        return 'xlsx template';
      }

      var name = void 0;

      if (foundAssets.length) {
        name = foundAssets[0].name;
      } else {
        name = foundItems[0].name;
      }

      return 'xlsx template: ' + name;
    }
  }]);

  return XlsxTemplateProperties;
}(_react.Component);

exports.default = XlsxTemplateProperties;

/***/ })
/******/ ]);