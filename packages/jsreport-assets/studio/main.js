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
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
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

var _fileUploadButton = void 0;

var AssetUploadButton = function (_Component) {
  _inherits(AssetUploadButton, _Component);

  function AssetUploadButton(props) {
    _classCallCheck(this, AssetUploadButton);

    var _this = _possibleConstructorReturn(this, (AssetUploadButton.__proto__ || Object.getPrototypeOf(AssetUploadButton)).call(this, props));

    _this.inputFileRef = _react2.default.createRef();
    return _this;
  }

  // we need to have global action in main_dev which is triggered when users clicks on + on images
  // this triggers invisible button in the toolbar


  _createClass(AssetUploadButton, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      _fileUploadButton = this;
    }
  }, {
    key: 'upload',
    value: function upload(e) {
      var _this2 = this;

      if (!e.target.files.length) {
        return;
      }

      var assetDefaults = e.target.assetDefaults;
      var targetAsset = e.target.targetAsset;
      var activateNewTab = e.target.activateNewTab;
      var onNewEntityCallback = e.target.onNewEntityCallback;
      var uploadCallback = e.target.uploadCallback;

      delete e.target.assetDefaults;
      delete e.target.targetAsset;
      delete e.target.uploadCallback;

      var file = e.target.files[0];
      var reader = new FileReader();

      reader.onloadend = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var asset, response;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _this2.inputFileRef.current.value = '';

                if (!(_this2.type === 'new')) {
                  _context.next = 15;
                  break;
                }

                if (!_jsreportStudio2.default.workspaces) {
                  _context.next = 5;
                  break;
                }

                _context.next = 5;
                return _jsreportStudio2.default.workspaces.save();

              case 5:
                asset = {};


                if (assetDefaults != null) {
                  asset = Object.assign(asset, assetDefaults);
                }

                asset = Object.assign(asset, {
                  content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length),
                  name: file.name
                });

                _context.next = 10;
                return _jsreportStudio2.default.api.post('/odata/assets', {
                  data: asset
                });

              case 10:
                response = _context.sent;


                response.__entitySet = 'assets';

                _jsreportStudio2.default.addExistingEntity(response);
                _jsreportStudio2.default.openTab(Object.assign({}, response), activateNewTab);

                if (onNewEntityCallback) {
                  onNewEntityCallback(response);
                }

              case 15:
                if (!(_this2.type === 'edit')) {
                  _context.next = 25;
                  break;
                }

                if (!_jsreportStudio2.default.workspaces) {
                  _context.next = 22;
                  break;
                }

                _jsreportStudio2.default.updateEntity({
                  name: targetAsset.name,
                  content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length)
                });

                _context.next = 20;
                return _jsreportStudio2.default.workspaces.save();

              case 20:
                _context.next = 25;
                break;

              case 22:
                _context.next = 24;
                return _jsreportStudio2.default.api.patch('/odata/assets(' + targetAsset._id + ')', {
                  data: {
                    content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length),
                    link: null
                  }
                });

              case 24:
                _jsreportStudio2.default.loadEntity(targetAsset._id, true);

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
    value: function openFileDialog(type, defaults) {
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var targetAssetIdAndName = opts.targetAsset;

      this.type = type;

      if (opts.activateNewTab != null) {
        this.inputFileRef.current.activateNewTab = opts.activateNewTab;
      } else {
        delete this.inputFileRef.current.activateNewTab;
      }

      if (defaults) {
        this.inputFileRef.current.assetDefaults = defaults;
      } else {
        delete this.inputFileRef.current.assetDefaults;
      }

      if (targetAssetIdAndName) {
        this.inputFileRef.current.targetAsset = targetAssetIdAndName;
      } else if (type !== 'new') {
        this.inputFileRef.current.targetAsset = {
          _id: this.props.tab.entity._id,
          name: this.props.tab.entity.name
        };
      }

      if (opts.onNewEntityCallback) {
        this.inputFileRef.current.onNewEntityCallback = opts.onNewEntityCallback;
      } else {
        delete this.inputFileRef.current.onNewEntityCallback;
      }

      if (opts.uploadCallback) {
        this.inputFileRef.current.uploadCallback = opts.uploadCallback;
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
        }
      });
    }
  }, {
    key: 'render',
    value: function render() {
      return this.renderUpload(true);
    }
  }], [{
    key: 'OpenUpload',
    value: function OpenUpload(opts) {
      _fileUploadButton.openFileDialog('edit', undefined, opts);
    }
  }, {
    key: 'OpenUploadNew',
    value: function OpenUploadNew(defaults, opts) {
      _fileUploadButton.openFileDialog('new', defaults, opts);
    }
  }]);

  return AssetUploadButton;
}(_react.Component);

exports.default = AssetUploadButton;

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = [{
  key: 'global',
  title: 'global',
  value: 'global',
  desc: 'helpers in the asset will be attached to all templates'
}, {
  key: 'folder',
  title: 'folder',
  value: 'folder',
  desc: 'helpers in the asset will be attached to all templates in the same folder hierarchy'
}];

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _AssetEditor = __webpack_require__(5);

var _AssetEditor2 = _interopRequireDefault(_AssetEditor);

var _AssetUploadButton = __webpack_require__(2);

var _AssetUploadButton2 = _interopRequireDefault(_AssetUploadButton);

var _NewAssetModal = __webpack_require__(13);

var _NewAssetModal2 = _interopRequireDefault(_NewAssetModal);

var _AssetProperties = __webpack_require__(14);

var _AssetProperties2 = _interopRequireDefault(_AssetProperties);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

_jsreportStudio2.default.addEntitySet({
  name: 'assets',
  faIcon: 'fa-file',
  visibleName: 'asset',
  onNew: function onNew(options) {
    return _jsreportStudio2.default.openModal(_NewAssetModal2.default, options);
  },
  referenceAttributes: ['isSharedHelper', 'sharedHelpersScope'],
  entityTreePosition: 700
});

_jsreportStudio2.default.sharedComponents.NewAssetModal = _NewAssetModal2.default;
_jsreportStudio2.default.addEditorComponent('assets', _AssetEditor2.default);

_jsreportStudio2.default.addToolbarComponent(_AssetUploadButton2.default);
_jsreportStudio2.default.addPropertiesComponent(_AssetProperties2.default.title, _AssetProperties2.default, function (entity) {
  return entity.__entitySet === 'assets';
});

_jsreportStudio2.default.entityTreeIconResolvers.push(function (entity) {
  if (entity.__entitySet !== 'assets') {
    return;
  }

  var parts = entity.name.split('.');

  if (parts.length === 1) {
    return;
  }

  var extension = parts[parts.length - 1];

  switch (extension) {
    case 'html':
      return 'fa-html5';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
      return 'fa-camera';
    case 'js':
      return entity.isSharedHelper ? 'fa-cogs' : 'fa-cog';
    case 'css':
      return 'fa-css3';
    default:
      return 'fa-file-o ';
  }
});

_jsreportStudio2.default.entityTreeDropResolvers.push({
  type: _jsreportStudio2.default.dragAndDropNativeTypes.FILE,
  handler: function handler(_ref) {
    var _this = this;

    var draggedItem = _ref.draggedItem,
        dragOverContext = _ref.dragOverContext,
        dropComplete = _ref.dropComplete;
    return _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
      var files, targetInfo, errors, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _loop, _iterator, _step, _ret, assetsUploadedError;

      return regeneratorRuntime.wrap(function _callee2$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              files = draggedItem.files;
              targetInfo = {
                shortid: null
              };


              if (dragOverContext && dragOverContext.containerTargetEntity) {
                targetInfo.shortid = dragOverContext.containerTargetEntity.shortid;
              }

              errors = [];
              _iteratorNormalCompletion = true;
              _didIteratorError = false;
              _iteratorError = undefined;
              _context3.prev = 7;
              _loop = /*#__PURE__*/regeneratorRuntime.mark(function _loop() {
                var file, assetFile, response;
                return regeneratorRuntime.wrap(function _loop$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        file = _step.value;

                        if (!(/\.zip$/.test(file.name) || /\.jsrexport$/.test(file.name))) {
                          _context2.next = 3;
                          break;
                        }

                        return _context2.abrupt('return', 'continue');

                      case 3:
                        _context2.prev = 3;
                        _context2.next = 6;
                        return new Promise(function (resolve, reject) {
                          var fileName = file.name;
                          var reader = new FileReader();

                          reader.onloadend = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
                            return regeneratorRuntime.wrap(function _callee$(_context) {
                              while (1) {
                                switch (_context.prev = _context.next) {
                                  case 0:
                                    resolve({
                                      name: fileName,
                                      content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length)
                                    });

                                  case 1:
                                  case 'end':
                                    return _context.stop();
                                }
                              }
                            }, _callee, _this);
                          }));

                          reader.onerror = function () {
                            var errMsg = 'There was an error reading the file "' + fileName + '"';
                            reject(errMsg);
                          };

                          reader.readAsDataURL(file);
                        });

                      case 6:
                        assetFile = _context2.sent;


                        if (targetInfo.shortid != null) {
                          assetFile.folder = {
                            shortid: targetInfo.shortid
                          };
                        }

                        _context2.next = 10;
                        return _jsreportStudio2.default.api.post('/odata/assets', {
                          data: assetFile
                        }, true);

                      case 10:
                        response = _context2.sent;


                        response.__entitySet = 'assets';

                        _jsreportStudio2.default.addExistingEntity(response);
                        _jsreportStudio2.default.openTab(Object.assign({}, response));

                        // delay the collapsing a bit to avoid showing ugly transition of collapsed -> uncollapsed
                        setTimeout(function () {
                          _jsreportStudio2.default.collapseEntity({ shortid: response.shortid }, false, { parents: true, self: false });
                        }, 200);
                        _context2.next = 20;
                        break;

                      case 17:
                        _context2.prev = 17;
                        _context2.t0 = _context2['catch'](3);

                        errors.push(_context2.t0);

                      case 20:
                      case 'end':
                        return _context2.stop();
                    }
                  }
                }, _loop, _this, [[3, 17]]);
              });
              _iterator = files[Symbol.iterator]();

            case 10:
              if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                _context3.next = 18;
                break;
              }

              return _context3.delegateYield(_loop(), 't0', 12);

            case 12:
              _ret = _context3.t0;

              if (!(_ret === 'continue')) {
                _context3.next = 15;
                break;
              }

              return _context3.abrupt('continue', 15);

            case 15:
              _iteratorNormalCompletion = true;
              _context3.next = 10;
              break;

            case 18:
              _context3.next = 24;
              break;

            case 20:
              _context3.prev = 20;
              _context3.t1 = _context3['catch'](7);
              _didIteratorError = true;
              _iteratorError = _context3.t1;

            case 24:
              _context3.prev = 24;
              _context3.prev = 25;

              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }

            case 27:
              _context3.prev = 27;

              if (!_didIteratorError) {
                _context3.next = 30;
                break;
              }

              throw _iteratorError;

            case 30:
              return _context3.finish(27);

            case 31:
              return _context3.finish(24);

            case 32:

              dropComplete();

              if (errors.length > 0) {
                assetsUploadedError = new Error('Could not complete asset upload' + (files.length > 1 ? ' of some files' : '') + '.\n\n' + errors.map(function (e) {
                  return e.message;
                }).join('\n'));

                _jsreportStudio2.default.apiFailed(assetsUploadedError);
              }

            case 34:
            case 'end':
              return _context3.stop();
          }
        }
      }, _callee2, _this, [[7, 20, 24, 32], [25,, 27, 31]]);
    }))();
  }
});

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _AssetUploadButton = __webpack_require__(2);

var _AssetUploadButton2 = _interopRequireDefault(_AssetUploadButton);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

var _superagent = __webpack_require__(6);

var _superagent2 = _interopRequireDefault(_superagent);

var _reactCopyToClipboard = __webpack_require__(7);

var _binaryExtensions = __webpack_require__(11);

var _binaryExtensions2 = _interopRequireDefault(_binaryExtensions);

var _AssetEditor = __webpack_require__(12);

var _AssetEditor2 = _interopRequireDefault(_AssetEditor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

_binaryExtensions2.default.push('p12');

// Studio.api currently always open dialogs on failures and that is what we don't want, so arbitrary implementation here
var getTextFromApi = function getTextFromApi(path) {
  return new Promise(function (resolve, reject) {
    var request = _superagent2.default.get(_jsreportStudio2.default.resolveUrl(path));
    request.end(function (err) {
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          text = _ref.text;

      return err ? reject(new Error(text || err.toString())) : resolve(text);
    });
  });
};

var AssetEditor = function (_Component) {
  _inherits(AssetEditor, _Component);

  function AssetEditor(props) {
    _classCallCheck(this, AssetEditor);

    var _this = _possibleConstructorReturn(this, (AssetEditor.__proto__ || Object.getPrototypeOf(AssetEditor)).call(this, props));

    var defaultCodeActive = false;

    if (props.codeEntity != null && props.initialCodeActive != null) {
      defaultCodeActive = props.initialCodeActive;
    }

    _this.state = {
      initialLoading: true,
      codeActive: defaultCodeActive,
      previewOpen: false,
      previewLoading: false
    };

    _this.previewLoadFinish = _this.previewLoadFinish.bind(_this);
    return _this;
  }

  _createClass(AssetEditor, [{
    key: 'componentDidMount',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var entity, content, ab, str, fixedStr;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                entity = this.props.entity;

                if (entity) {
                  _context.next = 3;
                  break;
                }

                return _context.abrupt('return', this.setState({
                  initialLoading: false
                }));

              case 3:
                content = entity.content;

                if (!entity.link) {
                  _context.next = 13;
                  break;
                }

                _context.next = 7;
                return _jsreportStudio2.default.saveEntity(entity._id);

              case 7:
                _context.next = 9;
                return _jsreportStudio2.default.api.get('assets/' + entity._id + '/content', { responseType: 'arraybuffer' });

              case 9:
                ab = _context.sent;
                str = String.fromCharCode.apply(null, new Uint8Array(ab));
                fixedStr = decodeURIComponent(escape(str));

                content = btoa(unescape(encodeURIComponent(fixedStr)));

              case 13:

                this.setState({ content: content, initialLoading: false });

              case 14:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function componentDidMount() {
        return _ref2.apply(this, arguments);
      }

      return componentDidMount;
    }()
  }, {
    key: 'componentDidUpdate',
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(prevProps) {
        var entity, link;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                entity = this.props.entity;

                if (entity) {
                  _context2.next = 3;
                  break;
                }

                return _context2.abrupt('return');

              case 3:
                if (!(entity.link && (!this.state.link || prevProps.entity.link !== entity.link))) {
                  _context2.next = 14;
                  break;
                }

                _context2.prev = 4;
                _context2.next = 7;
                return getTextFromApi('assets/link/' + encodeURIComponent(entity.link));

              case 7:
                link = _context2.sent;

                this.setState({ link: link });
                _context2.next = 14;
                break;

              case 11:
                _context2.prev = 11;
                _context2.t0 = _context2['catch'](4);

                this.setState({ link: _context2.t0.message });

              case 14:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this, [[4, 11]]);
      }));

      function componentDidUpdate(_x2) {
        return _ref3.apply(this, arguments);
      }

      return componentDidUpdate;
    }()
  }, {
    key: 'isOfficeFile',
    value: function isOfficeFile(entity) {
      if (entity == null) {
        return false;
      }
      return entity.name.match(/\.(docx|xlsx|pptx)$/) != null;
    }
  }, {
    key: 'isImage',
    value: function isImage(entity) {
      if (entity == null) {
        return false;
      }
      return entity.name.match(/\.(jpeg|jpg|gif|png|svg)$/) != null;
    }
  }, {
    key: 'isFont',
    value: function isFont(entity) {
      if (entity == null) {
        return false;
      }
      return entity.name.match(/\.(otf|woff|ttf|eot|woff2)$/) != null;
    }
  }, {
    key: 'isPdf',
    value: function isPdf(entity) {
      if (entity == null) {
        return false;
      }
      return entity.name.match(/\.(pdf)$/) != null;
    }
  }, {
    key: 'getFormat',
    value: function getFormat(extension) {
      switch (extension) {
        case 'ttf':
          return 'truetype';
        case 'woff2':
          return 'woff2';
        case 'eot':
          return 'embedded-opentype';
        default:
          return 'woff';
      }
    }
  }, {
    key: 'getEmbeddingCode',
    value: function getEmbeddingCode(entity) {
      if (entity == null) {
        return '';
      }

      var parts = entity.name.split('.');
      var extension = parts[parts.length - 1];

      if (this.props.embeddingCode != null) {
        return this.props.embeddingCode;
      }

      if (this.isImage(entity)) {
        return '<img src="{{asset "' + _jsreportStudio2.default.resolveEntityPath(entity) + '" "dataURI"}}" />';
      }

      if (this.isFont(entity)) {
        return '@font-face {\n  font-family: \'' + parts[0] + '\';\n  src: url({{asset "' + _jsreportStudio2.default.resolveEntityPath(entity) + '" "dataURI"}});\n  format(\'' + this.getFormat(extension) + '\');\n}';
      }

      if (this.isOfficeFile(entity)) {
        return '{{asset "' + _jsreportStudio2.default.resolveEntityPath(entity) + '" "base64"}}';
      }

      return '{{asset "' + _jsreportStudio2.default.resolveEntityPath(entity) + '"}}';
    }
  }, {
    key: 'getLazyPreviewStatus',
    value: function getLazyPreviewStatus(entity) {
      if (this.props.lazyPreview != null) {
        return this.props.lazyPreview;
      }

      if (this.isOfficeFile(entity)) {
        return true;
      }

      return false;
    }
  }, {
    key: 'getPreviewEnabledStatus',
    value: function getPreviewEnabledStatus(entity) {
      if (this.props.previewEnabled != null) {
        return this.props.previewEnabled;
      }

      if (this.isOfficeFile(entity)) {
        return _jsreportStudio2.default.extensions.assets.options.officePreview.enabled !== false;
      }

      return true;
    }
  }, {
    key: 'preview',
    value: function preview(entity) {
      var _this2 = this;

      var previewOpen = this.state.previewOpen;
      var onPreview = this.props.onPreview;

      var lazyPreview = this.getLazyPreviewStatus(entity);
      var previewEnabled = this.getPreviewEnabledStatus(entity);

      if (!lazyPreview || !previewEnabled) {
        return;
      }

      if (onPreview) {
        onPreview(entity);
      } else if (this.isOfficeFile(entity)) {
        if (_jsreportStudio2.default.extensions.assets.options.officePreview.showWarning !== false && _jsreportStudio2.default.getSettingValueByKey('office-preview-informed', false) === false) {
          _jsreportStudio2.default.setSetting('office-preview-informed', true);

          _jsreportStudio2.default.openModal(function () {
            return _react2.default.createElement(
              'div',
              null,
              'We need to upload your office asset to our publicly hosted server to be able to use Office Online Service for previewing here in the studio. You can disable it in the configuration, see',
              _react2.default.createElement(
                'a',
                {
                  href: 'https://jsreport.net/learn/xlsx#preview-in-studio', target: '_blank', rel: 'noopener noreferrer'
                },
                'the docs for details'
              ),
              '.'
            );
          });
        }
      }

      if (previewOpen) {
        this.clearPreview(function () {
          _this2.preview(entity);
        });
      } else {
        _jsreportStudio2.default.startProgress();

        this.setState({
          previewLoading: true,
          previewOpen: true,
          codeActive: false
        });
      }
    }
  }, {
    key: 'previewLoadFinish',
    value: function previewLoadFinish() {
      _jsreportStudio2.default.stopProgress();

      this.setState({
        previewLoading: false
      });
    }
  }, {
    key: 'clearPreview',
    value: function clearPreview(done) {
      this.setState({
        previewOpen: false
      }, function () {
        return done && done();
      });
    }
  }, {
    key: 'renderBinary',
    value: function renderBinary(entity) {
      return _react2.default.createElement(
        'div',
        { className: 'custom-editor' },
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'h1',
            null,
            _react2.default.createElement('i', { className: 'fa fa-file-o' }),
            ' ',
            entity.name
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'a',
            { className: 'button confirmation', rel: 'noreferrer', target: '_blank', href: _jsreportStudio2.default.resolveUrl('assets/' + entity._id + '/content?download=true'), title: 'Download' },
            _react2.default.createElement('i', { className: 'fa fa-download' }),
            ' Download'
          ),
          _react2.default.createElement(
            'button',
            { className: 'button confirmation', onClick: function onClick() {
                return _AssetUploadButton2.default.OpenUpload();
              } },
            _react2.default.createElement('i', { className: 'fa fa-upload' }),
            ' Upload'
          )
        )
      );
    }
  }, {
    key: 'renderEditorToolbar',
    value: function renderEditorToolbar() {
      var _this3 = this;

      var _state = this.state,
          link = _state.link,
          previewLoading = _state.previewLoading,
          previewOpen = _state.previewOpen,
          codeActive = _state.codeActive;
      var _props = this.props,
          entity = _props.entity,
          codeEntity = _props.codeEntity,
          displayName = _props.displayName,
          icon = _props.icon,
          onDownload = _props.onDownload,
          onUpload = _props.onUpload;

      var lazyPreview = this.getLazyPreviewStatus(entity);
      var previewEnabled = this.getPreviewEnabledStatus(entity);
      var embeddingCode = this.getEmbeddingCode(entity);

      var visibleName = displayName;

      if (!visibleName && entity) {
        visibleName = entity.name;
      }

      if (!visibleName) {
        visibleName = '<none>';
      }

      return _react2.default.createElement(
        'div',
        { className: _AssetEditor2.default.toolbarContainer },
        _react2.default.createElement(
          'div',
          { className: _AssetEditor2.default.toolbarRow },
          _react2.default.createElement(
            'h3',
            { className: _AssetEditor2.default.toolbarAssetName },
            _react2.default.createElement(
              'div',
              null,
              _react2.default.createElement('i', { className: 'fa ' + icon }),
              '\xA0',
              entity != null ? _react2.default.createElement(
                'a',
                { href: '#', onClick: function onClick(ev) {
                    ev.preventDefault();_jsreportStudio2.default.openTab({ _id: entity._id });
                  } },
                visibleName
              ) : visibleName
            )
          ),
          embeddingCode !== '' && _react2.default.createElement(
            _reactCopyToClipboard.CopyToClipboard,
            { text: embeddingCode },
            _react2.default.createElement(
              'a',
              { className: 'button confirmation', title: 'Copy the embedding code to clipboard' },
              _react2.default.createElement('i', { className: 'fa fa-clipboard' })
            )
          ),
          entity != null && _react2.default.createElement(
            'button',
            {
              className: 'button confirmation',
              title: 'Download',
              onClick: function onClick() {
                if (onDownload) {
                  onDownload(entity);
                } else {
                  var downloadEl = document.createElement('a');
                  downloadEl.target = '_blank';
                  downloadEl.href = _jsreportStudio2.default.resolveUrl('assets/' + entity._id + '/content?download=true');
                  downloadEl.click();
                }
              }
            },
            _react2.default.createElement('i', { className: 'fa fa-download' })
          ),
          entity != null && !entity.link && _react2.default.createElement(
            'button',
            {
              className: 'button confirmation',
              title: 'Upload',
              onClick: function onClick() {
                var cb = function cb() {
                  var wasOpen = false;

                  if (lazyPreview && _this3.state.previewOpen) {
                    wasOpen = true;
                  }

                  _this3.clearPreview(function () {
                    if (wasOpen) {
                      _this3.preview(entity);
                    }
                  });
                };

                if (onUpload) {
                  onUpload(entity, cb);
                } else {
                  _AssetUploadButton2.default.OpenUpload({
                    targetAsset: {
                      _id: entity._id,
                      name: entity.name
                    },
                    uploadCallback: cb
                  });
                }
              }
            },
            _react2.default.createElement('i', { className: 'fa fa-upload' })
          ),
          lazyPreview && entity != null && _react2.default.createElement(
            'button',
            {
              className: 'button confirmation ' + (!previewEnabled || previewLoading ? 'disabled' : ''),
              onClick: function onClick() {
                return _this3.preview(entity);
              },
              title: previewOpen ? 'Refresh' : 'Preview'
            },
            _react2.default.createElement('i', { className: 'fa fa-' + (previewLoading ? '' : previewOpen ? 'retweet' : 'eye') }),
            ' ',
            previewLoading ? 'Loading..' : ''
          ),
          lazyPreview && entity != null && previewOpen && !previewLoading && _react2.default.createElement(
            'button',
            {
              className: 'button confirmation ' + (!previewEnabled || previewLoading ? 'disabled' : ''),
              onClick: function onClick() {
                return _this3.clearPreview();
              },
              title: 'Clear'
            },
            _react2.default.createElement('i', { className: 'fa fa-times' })
          ),
          codeEntity != null && _react2.default.createElement(
            'button',
            {
              className: 'button ' + (codeActive ? 'danger' : 'confirmation'),
              onClick: function onClick() {
                return _this3.setState(function (state) {
                  var change = {};

                  if (state.codeActive) {
                    _jsreportStudio2.default.store.dispatch(_jsreportStudio2.default.entities.actions.flushUpdates());
                  } else {
                    change.previewOpen = false;
                    change.previewLoading = false;
                    _jsreportStudio2.default.stopProgress();
                  }

                  return _extends({ codeActive: !state.codeActive }, change);
                });
              },
              title: (codeActive ? 'Hide' : 'Show') + ' ' + (codeEntity.content != null ? 'content and helpers' : 'helpers')
            },
            _react2.default.createElement('i', { className: 'fa fa-code' })
          )
        ),
        entity != null && entity.link && _react2.default.createElement(
          'div',
          { className: _AssetEditor2.default.toolbarRow, style: { margin: '0.6rem' } },
          _react2.default.createElement(
            'span',
            null,
            _react2.default.createElement(
              'b',
              null,
              _react2.default.createElement('i', { className: 'fa fa-folder-open' }),
              ' linked to file:'
            ),
            ' ',
            link
          )
        )
      );
    }
  }, {
    key: 'renderEditorContent',
    value: function renderEditorContent() {
      var _this4 = this;

      var _props2 = this.props,
          entity = _props2.entity,
          codeEntity = _props2.codeEntity,
          emptyMessage = _props2.emptyMessage,
          getPreviewContent = _props2.getPreviewContent,
          _onUpdate = _props2.onUpdate;
      var codeActive = this.state.codeActive;


      if (codeEntity != null && codeActive) {
        var helpersEditor = _react2.default.createElement(_jsreportStudio.TextEditor, {
          key: codeEntity._id + '_helpers',
          name: codeEntity._id + '_helpers',
          getFilename: function getFilename() {
            return codeEntity.name + ' (helpers)';
          },
          mode: 'javascript',
          onUpdate: function onUpdate(v) {
            return _onUpdate(Object.assign({ _id: codeEntity._id }, { helpers: v }));
          },
          value: codeEntity.helpers || ''
        });

        if (Object.prototype.hasOwnProperty.call(codeEntity, 'content')) {
          return _react2.default.createElement(
            _jsreportStudio.SplitPane,
            {
              primary: 'second',
              split: 'horizontal',
              resizerClassName: 'resizer-horizontal',
              defaultSize: window.innerHeight * 0.2 + 'px'
            },
            _react2.default.createElement(_jsreportStudio.TextEditor, {
              key: codeEntity._id,
              name: codeEntity._id,
              getFilename: function getFilename() {
                return codeEntity.name;
              },
              mode: resolveTemplateEditorMode(codeEntity) || 'handlebars',
              onUpdate: function onUpdate(v) {
                return _onUpdate(Object.assign({ _id: codeEntity._id }, { content: v }));
              },
              value: codeEntity.content || ''
            }),
            helpersEditor
          );
        }

        return helpersEditor;
      }

      if (entity == null) {
        return _react2.default.createElement(
          'div',
          { style: { padding: '2rem' } },
          _react2.default.createElement(
            'i',
            null,
            emptyMessage != null ? emptyMessage : 'Asset is empty'
          )
        );
      }

      var parts = entity.name.split('.');
      var extension = parts[parts.length - 1];
      var lazyPreview = this.getLazyPreviewStatus(entity);

      var previewOpen = true;

      if (lazyPreview) {
        previewOpen = this.state.previewOpen;
      }

      if (!previewOpen) {
        return null;
      }

      if (getPreviewContent) {
        return getPreviewContent(entity, {
          previewLoadFinish: this.previewLoadFinish
        });
      }

      if (this.isImage(entity)) {
        return _react2.default.createElement(
          'div',
          { style: { overflow: 'auto' } },
          _react2.default.createElement('img', {
            src: _jsreportStudio2.default.resolveUrl('assets/' + entity._id + '/content?v=' + new Date().getTime()),
            style: { display: 'block', margin: '3rem auto' }
          })
        );
      }

      if (this.isFont(entity)) {
        var newStyle = document.createElement('style');

        newStyle.appendChild(document.createTextNode('@font-face {\n         font-family: \'' + parts[0] + '\';\n         src: url(\'' + _jsreportStudio2.default.resolveUrl('/assets/' + entity._id + '/content') + '\');\n         format(\'' + (extension === 'ttf' ? 'truetype' : 'woff') + '\');\n        }'));

        document.head.appendChild(newStyle);

        return _react2.default.createElement(
          'div',
          { style: { overflow: 'auto', fontFamily: parts[0], padding: '2rem' } },
          _react2.default.createElement(
            'h1',
            null,
            ' Hello world font ',
            entity.name
          ),
          _react2.default.createElement(
            'p',
            null,
            'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.'
          )
        );
      }

      if (this.isPdf(entity)) {
        return _react2.default.createElement(
          'div',
          { className: 'block', style: { height: '100%' } },
          _react2.default.createElement(
            'object',
            { style: { height: '100%' }, data: _jsreportStudio2.default.resolveUrl('assets/' + entity._id + '/content?v=' + new Date().getTime()), type: 'application/pdf' },
            _react2.default.createElement('embed', { src: _jsreportStudio2.default.resolveUrl('assets/' + entity._id + '/content?v=' + new Date().getTime()), type: 'application/pdf' })
          )
        );
      }

      if (this.isOfficeFile(entity)) {
        var officeSrc = _jsreportStudio2.default.resolveUrl('assets/office/' + entity._id + '/content');

        return _react2.default.createElement(_jsreportStudio.FramePreview, {
          onLoad: function onLoad() {
            return _this4.previewLoadFinish();
          },
          src: officeSrc
        });
      }

      if (entity.name.split('.').length > 1 && _binaryExtensions2.default.includes(entity.name.split('.')[1])) {
        return this.renderBinary(entity);
      }

      var mode = parts[parts.length - 1];

      if (extension === 'js') {
        mode = 'javascript';
      }

      if (extension === 'html') {
        mode = 'handlebars';
      }

      var content = (entity.content || entity.forceUpdate ? entity.content : this.state.content) || '';
      var text = void 0;
      try {
        text = decodeURIComponent(escape(atob(content)));
      } catch (e) {
        return this.renderBinary(entity);
      }

      return _react2.default.createElement(_jsreportStudio.TextEditor, {
        name: entity._id,
        mode: mode,
        value: text,
        onUpdate: function onUpdate(v) {
          return _this4.props.onUpdate(Object.assign({}, entity, { content: btoa(unescape(encodeURIComponent(v))), forceUpdate: true }));
        }
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var initialLoading = this.state.initialLoading;


      if (initialLoading) {
        return _react2.default.createElement('div', null);
      }

      return _react2.default.createElement(
        'div',
        { className: 'block' },
        this.renderEditorToolbar(),
        this.renderEditorContent()
      );
    }
  }]);

  return AssetEditor;
}(_react.Component);

AssetEditor.defaultProps = {
  icon: 'fa-file-o'
};

function resolveTemplateEditorMode(template) {
  // eslint-disable-next-line
  for (var k in _jsreportStudio.templateEditorModeResolvers) {
    var mode = _jsreportStudio.templateEditorModeResolvers[k](template);
    if (mode) {
      return mode;
    }
  }

  return null;
}

exports.default = AssetEditor;

/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = Studio.libraries['superagent'];

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _require = __webpack_require__(8),
    CopyToClipboard = _require.CopyToClipboard;

CopyToClipboard.CopyToClipboard = CopyToClipboard;
module.exports = CopyToClipboard;

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CopyToClipboard = void 0;

var _react = _interopRequireDefault(__webpack_require__(0));

var _copyToClipboard = _interopRequireDefault(__webpack_require__(9));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var CopyToClipboard =
/*#__PURE__*/
function (_React$PureComponent) {
  _inherits(CopyToClipboard, _React$PureComponent);

  function CopyToClipboard() {
    var _getPrototypeOf2;

    var _this;

    _classCallCheck(this, CopyToClipboard);

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = _possibleConstructorReturn(this, (_getPrototypeOf2 = _getPrototypeOf(CopyToClipboard)).call.apply(_getPrototypeOf2, [this].concat(args)));

    _defineProperty(_assertThisInitialized(_this), "onClick", function (event) {
      var _this$props = _this.props,
          text = _this$props.text,
          onCopy = _this$props.onCopy,
          children = _this$props.children,
          options = _this$props.options;

      var elem = _react["default"].Children.only(children);

      var result = (0, _copyToClipboard["default"])(text, options);

      if (onCopy) {
        onCopy(text, result);
      } // Bypass onClick if it was present


      if (elem && elem.props && typeof elem.props.onClick === 'function') {
        elem.props.onClick(event);
      }
    });

    return _this;
  }

  _createClass(CopyToClipboard, [{
    key: "render",
    value: function render() {
      var _this$props2 = this.props,
          _text = _this$props2.text,
          _onCopy = _this$props2.onCopy,
          _options = _this$props2.options,
          children = _this$props2.children,
          props = _objectWithoutProperties(_this$props2, ["text", "onCopy", "options", "children"]);

      var elem = _react["default"].Children.only(children);

      return _react["default"].cloneElement(elem, _objectSpread({}, props, {
        onClick: this.onClick
      }));
    }
  }]);

  return CopyToClipboard;
}(_react["default"].PureComponent);

exports.CopyToClipboard = CopyToClipboard;

_defineProperty(CopyToClipboard, "defaultProps", {
  onCopy: undefined,
  options: undefined
});

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var deselectCurrent = __webpack_require__(10);

var clipboardToIE11Formatting = {
  "text/plain": "Text",
  "text/html": "Url",
  "default": "Text"
}

var defaultMessage = "Copy to clipboard: #{key}, Enter";

function format(message) {
  var copyKey = (/mac os x/i.test(navigator.userAgent) ? "⌘" : "Ctrl") + "+C";
  return message.replace(/#{\s*key\s*}/g, copyKey);
}

function copy(text, options) {
  var debug,
    message,
    reselectPrevious,
    range,
    selection,
    mark,
    success = false;
  if (!options) {
    options = {};
  }
  debug = options.debug || false;
  try {
    reselectPrevious = deselectCurrent();

    range = document.createRange();
    selection = document.getSelection();

    mark = document.createElement("span");
    mark.textContent = text;
    // reset user styles for span element
    mark.style.all = "unset";
    // prevents scrolling to the end of the page
    mark.style.position = "fixed";
    mark.style.top = 0;
    mark.style.clip = "rect(0, 0, 0, 0)";
    // used to preserve spaces and line breaks
    mark.style.whiteSpace = "pre";
    // do not inherit user-select (it may be `none`)
    mark.style.webkitUserSelect = "text";
    mark.style.MozUserSelect = "text";
    mark.style.msUserSelect = "text";
    mark.style.userSelect = "text";
    mark.addEventListener("copy", function(e) {
      e.stopPropagation();
      if (options.format) {
        e.preventDefault();
        if (typeof e.clipboardData === "undefined") { // IE 11
          debug && console.warn("unable to use e.clipboardData");
          debug && console.warn("trying IE specific stuff");
          window.clipboardData.clearData();
          var format = clipboardToIE11Formatting[options.format] || clipboardToIE11Formatting["default"]
          window.clipboardData.setData(format, text);
        } else { // all other browsers
          e.clipboardData.clearData();
          e.clipboardData.setData(options.format, text);
        }
      }
      if (options.onCopy) {
        e.preventDefault();
        options.onCopy(e.clipboardData);
      }
    });

    document.body.appendChild(mark);

    range.selectNodeContents(mark);
    selection.addRange(range);

    var successful = document.execCommand("copy");
    if (!successful) {
      throw new Error("copy command was unsuccessful");
    }
    success = true;
  } catch (err) {
    debug && console.error("unable to copy using execCommand: ", err);
    debug && console.warn("trying IE specific stuff");
    try {
      window.clipboardData.setData(options.format || "text", text);
      options.onCopy && options.onCopy(window.clipboardData);
      success = true;
    } catch (err) {
      debug && console.error("unable to copy using clipboardData: ", err);
      debug && console.error("falling back to prompt");
      message = format("message" in options ? options.message : defaultMessage);
      window.prompt(message, text);
    }
  } finally {
    if (selection) {
      if (typeof selection.removeRange == "function") {
        selection.removeRange(range);
      } else {
        selection.removeAllRanges();
      }
    }

    if (mark) {
      document.body.removeChild(mark);
    }
    reselectPrevious();
  }

  return success;
}

module.exports = copy;


/***/ }),
/* 10 */
/***/ (function(module, exports) {


module.exports = function () {
  var selection = document.getSelection();
  if (!selection.rangeCount) {
    return function () {};
  }
  var active = document.activeElement;

  var ranges = [];
  for (var i = 0; i < selection.rangeCount; i++) {
    ranges.push(selection.getRangeAt(i));
  }

  switch (active.tagName.toUpperCase()) { // .toUpperCase handles XHTML
    case 'INPUT':
    case 'TEXTAREA':
      active.blur();
      break;

    default:
      active = null;
      break;
  }

  selection.removeAllRanges();
  return function () {
    selection.type === 'Caret' &&
    selection.removeAllRanges();

    if (!selection.rangeCount) {
      ranges.forEach(function(range) {
        selection.addRange(range);
      });
    }

    active &&
    active.focus();
  };
};


/***/ }),
/* 11 */
/***/ (function(module) {

module.exports = ["3dm","3ds","3g2","3gp","7z","a","aac","adp","ai","aif","aiff","alz","ape","apk","ar","arj","asf","au","avi","bak","baml","bh","bin","bk","bmp","btif","bz2","bzip2","cab","caf","cgm","class","cmx","cpio","cr2","csv","cur","dat","dcm","deb","dex","djvu","dll","dmg","dng","doc","docm","docx","dot","dotm","dra","DS_Store","dsk","dts","dtshd","dvb","dwg","dxf","ecelp4800","ecelp7470","ecelp9600","egg","eol","eot","epub","exe","f4v","fbs","fh","fla","flac","fli","flv","fpx","fst","fvt","g3","gh","gif","graffle","gz","gzip","h261","h263","h264","icns","ico","ief","img","ipa","iso","jar","jpeg","jpg","jpgv","jpm","jxr","key","ktx","lha","lib","lvp","lz","lzh","lzma","lzo","m3u","m4a","m4v","mar","mdi","mht","mid","midi","mj2","mka","mkv","mmr","mng","mobi","mov","movie","mp3","mp4","mp4a","mpeg","mpg","mpga","mxu","nef","npx","numbers","o","oga","ogg","ogv","otf","pages","pbm","pcx","pdb","pdf","pea","pgm","pic","png","pnm","pot","potm","potx","ppa","ppam","ppm","pps","ppsm","ppsx","ppt","pptm","pptx","psd","pya","pyc","pyo","pyv","qt","rar","ras","raw","resources","rgb","rip","rlc","rmf","rmvb","rtf","rz","s3m","s7z","scpt","sgi","shar","sil","sketch","slk","smv","so","stl","sub","swf","tar","tbz","tbz2","tga","tgz","thmx","tif","tiff","tlz","ttc","ttf","txz","udf","uvh","uvi","uvm","uvp","uvs","uvu","viv","vob","war","wav","wax","wbmp","wdp","weba","webm","webp","whl","wim","wm","wma","wmv","wmx","woff","woff2","wrm","wvx","xbm","xif","xla","xlam","xls","xlsb","xlsm","xlsx","xlt","xltm","xltx","xm","xmind","xpi","xpm","xwd","xz","z","zip","zipx"];

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"toolbarContainer":"x-assets-AssetEditor-toolbarContainer","toolbarRow":"x-assets-AssetEditor-toolbarRow","toolbarAssetName":"x-assets-AssetEditor-toolbarAssetName"};

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _scopeOptions = __webpack_require__(3);

var _scopeOptions2 = _interopRequireDefault(_scopeOptions);

var _AssetUploadButton = __webpack_require__(2);

var _AssetUploadButton2 = _interopRequireDefault(_AssetUploadButton);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var NewAssetModal = function (_Component) {
  _inherits(NewAssetModal, _Component);

  function NewAssetModal() {
    _classCallCheck(this, NewAssetModal);

    var _this = _possibleConstructorReturn(this, (NewAssetModal.__proto__ || Object.getPrototypeOf(NewAssetModal)).call(this));

    _this.nameRef = _react2.default.createRef();
    _this.linkRef = _react2.default.createRef();
    _this.state = { isLink: false, isSharedHelper: false, scope: null };
    return _this;
  }

  _createClass(NewAssetModal, [{
    key: 'handleKeyPress',
    value: function handleKeyPress(e) {
      if (e.key === 'Enter') {
        this.createAsset();
      }
    }

    // the modal component for some reason after open focuses the panel itself

  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this2 = this;

      setTimeout(function () {
        return _this2.nameRef.current.focus();
      }, 0);
    }
  }, {
    key: 'createAsset',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(e) {
        var entity, fragments, response;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                entity = {};

                if (!(!this.state.isLink && (!this.nameRef.current.value || this.nameRef.current.value.indexOf('.')) < 0)) {
                  _context.next = 3;
                  break;
                }

                return _context.abrupt('return', this.setState({ error: 'name should include file extension, for example foo.js' }));

              case 3:

                if (this.props.options.defaults != null) {
                  entity = Object.assign(entity, this.props.options.defaults);
                }

                if (this.state.isLink) {
                  entity.link = this.linkRef.current.value;
                  fragments = entity.link.split('/');

                  entity.name = fragments[fragments.length - 1];
                } else {
                  entity.name = this.nameRef.current.value;
                }

                if (this.state.isSharedHelper) {
                  entity.sharedHelpersScope = this.state.scope;
                } else {
                  entity.sharedHelpersScope = null;
                }

                _context.prev = 6;

                if (!_jsreportStudio2.default.workspaces) {
                  _context.next = 10;
                  break;
                }

                _context.next = 10;
                return _jsreportStudio2.default.workspaces.save();

              case 10:
                _context.next = 12;
                return _jsreportStudio2.default.api.post('/odata/assets', {
                  data: entity
                });

              case 12:
                response = _context.sent;

                response.__entitySet = 'assets';

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
                _context.t0 = _context['catch'](6);

                this.setState({ error: _context.t0.message });

              case 23:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[6, 20]]);
      }));

      function createAsset(_x) {
        return _ref.apply(this, arguments);
      }

      return createAsset;
    }()
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var _state = this.state,
          isLink = _state.isLink,
          isSharedHelper = _state.isSharedHelper,
          scope = _state.scope,
          error = _state.error;


      var currentScopeValue = scope != null ? scope : 'global';
      var currentScopeOption = _scopeOptions2.default.find(function (opt) {
        return opt.value === currentScopeValue;
      });

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'New asset'
          )
        ),
        isLink ? _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'relative or absolute path to existing file'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            name: 'link',
            ref: this.linkRef
          })
        ) : _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'name'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            name: 'name',
            ref: this.nameRef,
            placeholder: 'styles.css',
            onKeyPress: function onKeyPress(e) {
              return _this3.handleKeyPress(e);
            }
          })
        ),
        _jsreportStudio2.default.extensions.assets.options.allowAssetsLinkedToFiles !== false ? _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'link to existing file'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', checked: isLink,
            onChange: function onChange() {
              return _this3.setState({ isLink: !isLink });
            }
          })
        ) : _react2.default.createElement('div', null),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'shared helpers attached to templates'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', checked: isSharedHelper === true,
            onChange: function onChange(v) {
              _this3.setState({
                isSharedHelper: v.target.checked,
                scope: v.target.checked === false ? null : 'global'
              });
            }
          })
        ),
        isSharedHelper && _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'scope'
          ),
          _react2.default.createElement(
            'select',
            {
              value: currentScopeValue,
              onChange: function onChange(v) {
                var newScope = v.target.value;
                _this3.setState({
                  scope: newScope
                });
              }
            },
            _scopeOptions2.default.map(function (opt) {
              return _react2.default.createElement(
                'option',
                { key: opt.key, value: opt.value, title: opt.desc },
                opt.title
              );
            })
          ),
          _react2.default.createElement(
            'em',
            null,
            currentScopeOption.desc
          )
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
            'You can use assets to embed any kind of static content into report template.',
            _react2.default.createElement('br', null),
            'This can be for example css style, image, font, html or even javascript shared helpers. ',
            _react2.default.createElement('br', null),
            'See the',
            _react2.default.createElement(
              'a',
              { target: '_blank', rel: 'noreferrer', title: 'Help', href: 'http://jsreport.net/learn/assets' },
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
            {
              className: 'button confirmation',
              onClick: function onClick() {
                _this3.props.close();
                _AssetUploadButton2.default.OpenUploadNew(_this3.props.options.defaults, {
                  activateNewTab: _this3.props.options.activateNewTab,
                  onNewEntityCallback: _this3.props.options.onNewEntity
                });
              }
            },
            'Upload'
          ),
          _react2.default.createElement(
            'button',
            { onClick: function onClick() {
                return _this3.createAsset();
              }, className: 'button confirmation' },
            'Ok'
          )
        )
      );
    }
  }]);

  return NewAssetModal;
}(_react.Component);

exports.default = NewAssetModal;

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _scopeOptions = __webpack_require__(3);

var _scopeOptions2 = _interopRequireDefault(_scopeOptions);

var _jsreportStudio = __webpack_require__(1);

var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var AssetProperties = function (_Component) {
  _inherits(AssetProperties, _Component);

  function AssetProperties() {
    _classCallCheck(this, AssetProperties);

    return _possibleConstructorReturn(this, (AssetProperties.__proto__ || Object.getPrototypeOf(AssetProperties)).apply(this, arguments));
  }

  _createClass(AssetProperties, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.normalizeScope();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      this.normalizeScope();
    }
  }, {
    key: 'normalizeScope',
    value: function normalizeScope() {
      var _props = this.props,
          entity = _props.entity,
          onChange = _props.onChange;


      if (entity.isSharedHelper === true && entity.sharedHelpersScope == null) {
        onChange({ _id: entity._id, sharedHelpersScope: 'global', isSharedHelper: false });
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _props2 = this.props,
          entity = _props2.entity,
          _onChange = _props2.onChange;


      var currentScopeValue = entity.sharedHelpersScope != null ? entity.sharedHelpersScope : 'global';
      var currentScopeOption = _scopeOptions2.default.find(function (opt) {
        return opt.value === currentScopeValue;
      });

      return _react2.default.createElement(
        'div',
        null,
        _jsreportStudio2.default.extensions.assets.options.allowAssetsLinkedToFiles !== false ? _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'link'
          ),
          _react2.default.createElement('input', {
            type: 'text',
            value: entity.link || '',
            onChange: function onChange(v) {
              return _onChange({ _id: entity._id, link: v.target.value });
            }
          })
        ) : _react2.default.createElement('div', null),
        _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'shared helpers attached to templates'
          ),
          _react2.default.createElement('input', {
            type: 'checkbox', checked: entity.sharedHelpersScope != null,
            onChange: function onChange(v) {
              _onChange({
                _id: entity._id,
                sharedHelpersScope: v.target.checked === false ? null : 'global'
              });
            }
          })
        ),
        entity.sharedHelpersScope != null && _react2.default.createElement(
          'div',
          { className: 'form-group' },
          _react2.default.createElement(
            'label',
            null,
            'scope'
          ),
          _react2.default.createElement(
            'select',
            {
              value: currentScopeValue,
              onChange: function onChange(v) {
                var newScope = v.target.value;
                _onChange({ _id: entity._id, sharedHelpersScope: newScope });
              }
            },
            _scopeOptions2.default.map(function (opt) {
              return _react2.default.createElement(
                'option',
                { key: opt.key, value: opt.value, title: opt.desc },
                opt.title
              );
            })
          ),
          _react2.default.createElement(
            'em',
            null,
            currentScopeOption.desc
          )
        )
      );
    }
  }], [{
    key: 'title',
    value: function title(entity, entities) {
      var suffix = entity.link ? ' (link)' : '';

      if (entity.sharedHelpersScope != null) {
        suffix += ' (shared helper, scope: ' + entity.sharedHelpersScope + ')';
      }

      return 'asset' + suffix;
    }
  }]);

  return AssetProperties;
}(_react.Component);

exports.default = AssetProperties;

/***/ })
/******/ ]);