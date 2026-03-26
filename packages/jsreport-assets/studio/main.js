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
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


if (true) {
  module.exports = __webpack_require__(10);
} else // removed by dead control flow
{}


/***/ }),
/* 3 */
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
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);



let _fileUploadButton;
class AssetUploadButton extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    this.inputFileRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
  }

  // we need to have global action in main_dev which is triggered when users clicks on + on images
  // this triggers invisible button in the toolbar
  static OpenUpload(opts) {
    _fileUploadButton.openFileDialog('edit', undefined, opts);
  }
  static OpenUploadNew(defaults, opts) {
    _fileUploadButton.openFileDialog('new', defaults, opts);
  }
  componentDidMount() {
    _fileUploadButton = this;
  }
  upload(e) {
    if (!e.target.files.length) {
      return;
    }
    const assetDefaults = e.target.assetDefaults;
    const targetAsset = e.target.targetAsset;
    const activateNewTab = e.target.activateNewTab;
    const onNewEntityCallback = e.target.onNewEntityCallback;
    const uploadCallback = e.target.uploadCallback;
    delete e.target.assetDefaults;
    delete e.target.targetAsset;
    delete e.target.uploadCallback;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = async () => {
      this.inputFileRef.current.value = '';
      if (this.type === 'new') {
        if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().workspaces)) {
          await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().workspaces.save();
        }
        let asset = {};
        if (assetDefaults != null) {
          asset = Object.assign(asset, assetDefaults);
        }
        asset = Object.assign(asset, {
          content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length),
          name: file.name
        });
        const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.post('/odata/assets', {
          data: asset
        });
        response.__entitySet = 'assets';
        jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().addExistingEntity(response);
        jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().openTab(Object.assign({}, response), activateNewTab);
        if (onNewEntityCallback) {
          onNewEntityCallback(response);
        }
      }
      if (this.type === 'edit') {
        if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().workspaces)) {
          jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().updateEntity({
            name: targetAsset.name,
            content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length)
          });
          await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().workspaces.save();
        } else {
          await jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().api.patch(`/odata/assets(${targetAsset._id})`, {
            data: {
              content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length),
              link: null
            }
          });
          jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().loadEntity(targetAsset._id, true);
        }
      }
      if (uploadCallback) {
        uploadCallback();
      }
    };
    reader.onerror = function () {
      const errMsg = 'There was an error reading the file!';
      if (uploadCallback) {
        uploadCallback(new Error(errMsg));
      }
      alert(errMsg);
    };
    reader.readAsDataURL(file);
  }
  openFileDialog(type, defaults) {
    let opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const targetAssetIdAndName = opts.targetAsset;
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
  renderUpload() {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("input", {
      type: "file",
      ref: this.inputFileRef,
      style: {
        display: 'none'
      },
      onChange: e => this.upload(e)
    }, 'file');
  }
  render() {
    return this.renderUpload(true);
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (AssetUploadButton);

/***/ }),
/* 4 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var _require = __webpack_require__(12),
  CopyToClipboard = _require.CopyToClipboard;
CopyToClipboard.CopyToClipboard = CopyToClipboard;
module.exports = CopyToClipboard;

/***/ }),
/* 5 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var deselectCurrent = __webpack_require__(6);

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
    // avoid screen readers from reading out loud the text
    mark.ariaHidden = "true"
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
/* 6 */
/***/ ((module) => {


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
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ([{
  key: 'global',
  title: 'global',
  value: 'global',
  desc: 'helpers in the asset will be attached to all templates'
}, {
  key: 'folder',
  title: 'folder',
  value: 'folder',
  desc: 'helpers in the asset will be attached to all templates in the same folder hierarchy'
}]);

/***/ }),
/* 8 */,
/* 9 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _AssetUploadButton_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var superagent__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(11);
/* harmony import */ var superagent__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(superagent__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var react_copy_to_clipboard__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(4);
/* harmony import */ var react_copy_to_clipboard__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(react_copy_to_clipboard__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var binary_extensions__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(13);
/* harmony import */ var _AssetEditor_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(14);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(2);








binary_extensions__WEBPACK_IMPORTED_MODULE_5__.push('p12');

// Studio.api currently always open dialogs on failures and that is what we don't want, so arbitrary implementation here
const getTextFromApi = path => {
  return new Promise((resolve, reject) => {
    const request = superagent__WEBPACK_IMPORTED_MODULE_3___default().get(jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(path));
    request.end(function (err) {
      let {
        text
      } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      return err ? reject(new Error(text || err.toString())) : resolve(text);
    });
  });
};
class AssetEditor extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor(props) {
    super(props);
    let defaultCodeActive = false;
    if (props.codeEntity != null && props.initialCodeActive != null) {
      defaultCodeActive = props.initialCodeActive;
    }
    this.state = {
      initialLoading: true,
      codeActive: defaultCodeActive,
      previewOpen: false,
      previewLoading: false
    };
    this.previewLoadFinish = this.previewLoadFinish.bind(this);
  }
  async componentDidMount() {
    const {
      entity
    } = this.props;
    if (!entity) {
      return this.setState({
        initialLoading: false
      });
    }
    let content = entity.content;
    if (entity.link) {
      await jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().saveEntity(entity._id);
      const ab = await jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().api.get(`assets/${entity._id}/content`, {
        responseType: 'arraybuffer'
      });
      const str = String.fromCharCode.apply(null, new Uint8Array(ab));
      const fixedStr = decodeURIComponent(escape(str));
      content = btoa(unescape(encodeURIComponent(fixedStr)));
    }
    this.setState({
      content,
      initialLoading: false
    });
  }
  async componentDidUpdate(prevProps) {
    const {
      entity
    } = this.props;
    if (!entity) {
      return;
    }
    if (entity.link && (!this.state.link || prevProps.entity.link !== entity.link)) {
      try {
        const link = await getTextFromApi(`assets/link/${encodeURIComponent(entity.link)}`);
        this.setState({
          link: link
        });
      } catch (e) {
        this.setState({
          link: e.message
        });
      }
    }
  }
  isOfficeFile(entity) {
    if (entity == null) {
      return false;
    }
    return entity.name.match(/\.(docx|xlsx|pptx)$/) != null;
  }
  isImage(entity) {
    if (entity == null) {
      return false;
    }
    return entity.name.match(/\.(jpeg|jpg|gif|png|svg)$/) != null;
  }
  isFont(entity) {
    if (entity == null) {
      return false;
    }
    return entity.name.match(/\.(otf|woff|ttf|eot|woff2)$/) != null;
  }
  isPdf(entity) {
    if (entity == null) {
      return false;
    }
    return entity.name.match(/\.(pdf)$/) != null;
  }
  getFormat(extension) {
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
  getEmbeddingCode(entity) {
    if (entity == null) {
      return '';
    }
    const parts = entity.name.split('.');
    const extension = parts[parts.length - 1];
    if (this.props.embeddingCode != null) {
      return this.props.embeddingCode;
    }
    if (this.isImage(entity)) {
      return `<img src="{{asset "${jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveEntityPath(entity)}" "dataURI"}}" />`;
    }
    if (this.isFont(entity)) {
      return `@font-face {
  font-family: '${parts[0]}';
  src: url({{asset "${jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveEntityPath(entity)}" "dataURI"}});
  format('${this.getFormat(extension)}');
}`;
    }
    if (this.isOfficeFile(entity)) {
      return `{{asset "${jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveEntityPath(entity)}" "base64"}}`;
    }
    return `{{asset "${jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveEntityPath(entity)}"}}`;
  }
  getLazyPreviewStatus(entity) {
    if (this.props.lazyPreview != null) {
      return this.props.lazyPreview;
    }
    if (this.isOfficeFile(entity)) {
      return true;
    }
    return false;
  }
  getPreviewEnabledStatus(entity) {
    if (this.props.previewEnabled != null) {
      return this.props.previewEnabled;
    }
    if (this.isOfficeFile(entity)) {
      return (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().extensions).assets.options.officePreview.enabled !== false;
    }
    return true;
  }
  preview(entity) {
    const {
      previewOpen
    } = this.state;
    const {
      onPreview
    } = this.props;
    const lazyPreview = this.getLazyPreviewStatus(entity);
    const previewEnabled = this.getPreviewEnabledStatus(entity);
    if (!lazyPreview || !previewEnabled) {
      return;
    }
    if (onPreview) {
      onPreview(entity);
    } else if (this.isOfficeFile(entity)) {
      if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().extensions).assets.options.officePreview.showWarning !== false && jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().getSettingValueByKey('office-preview-informed', false) === false) {
        jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().setSetting('office-preview-informed', true);
        jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openModal(() => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
          children: ["We need to upload your office asset to our publicly hosted server to be able to use Office Online Service for previewing here in the studio. You can disable it in the configuration, see", /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("a", {
            href: "https://jsreport.net/learn/xlsx#preview-in-studio",
            target: "_blank",
            rel: "noopener noreferrer",
            children: "the docs for details"
          }), "."]
        }));
      }
    }
    if (previewOpen) {
      this.clearPreview(() => {
        this.preview(entity);
      });
    } else {
      jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().startProgress();
      this.setState({
        previewLoading: true,
        previewOpen: true,
        codeActive: false
      });
    }
  }
  previewLoadFinish() {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().stopProgress();
    this.setState({
      previewLoading: false
    });
  }
  clearPreview(done) {
    this.setState({
      previewOpen: false
    }, () => done && done());
  }
  renderBinary(entity) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      className: "custom-editor",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("h1", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("i", {
            className: "fa fa-file-o"
          }), " ", entity.name]
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("a", {
          className: "button confirmation",
          rel: "noreferrer",
          target: "_blank",
          href: jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`assets/${entity._id}/content?download=true`),
          title: "Download",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("i", {
            className: "fa fa-download"
          }), " Download"]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("button", {
          className: "button confirmation",
          onClick: () => _AssetUploadButton_js__WEBPACK_IMPORTED_MODULE_1__["default"].OpenUpload(),
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("i", {
            className: "fa fa-upload"
          }), " Upload"]
        })]
      })]
    });
  }
  renderEditorToolbar() {
    const {
      link,
      previewLoading,
      previewOpen,
      codeActive
    } = this.state;
    const {
      entity,
      codeEntity,
      displayName,
      icon = 'fa-file-o',
      onDownload,
      onUpload
    } = this.props;
    const lazyPreview = this.getLazyPreviewStatus(entity);
    const previewEnabled = this.getPreviewEnabledStatus(entity);
    const embeddingCode = this.getEmbeddingCode(entity);
    let visibleName = displayName;
    if (!visibleName && entity) {
      visibleName = entity.name;
    }
    if (!visibleName) {
      visibleName = '<none>';
    }
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      className: _AssetEditor_css__WEBPACK_IMPORTED_MODULE_6__["default"].toolbarContainer,
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        className: _AssetEditor_css__WEBPACK_IMPORTED_MODULE_6__["default"].toolbarRow,
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("h3", {
          className: _AssetEditor_css__WEBPACK_IMPORTED_MODULE_6__["default"].toolbarAssetName,
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("i", {
              className: `fa ${icon}`
            }), "\xA0", entity != null ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("a", {
              href: "#",
              onClick: ev => {
                ev.preventDefault();
                jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openTab({
                  _id: entity._id
                });
              },
              children: visibleName
            }) : visibleName]
          })
        }), embeddingCode !== '' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(react_copy_to_clipboard__WEBPACK_IMPORTED_MODULE_4__.CopyToClipboard, {
          text: embeddingCode,
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("a", {
            className: "button confirmation",
            title: "Copy the embedding code to clipboard",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("i", {
              className: "fa fa-clipboard"
            })
          })
        }), entity != null && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
          className: "button confirmation",
          title: "Download",
          onClick: () => {
            if (onDownload) {
              onDownload(entity);
            } else {
              const downloadEl = document.createElement('a');
              downloadEl.target = '_blank';
              downloadEl.href = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`assets/${entity._id}/content?download=true`);
              downloadEl.click();
            }
          },
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("i", {
            className: "fa fa-download"
          })
        }), entity != null && !entity.link && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
          className: "button confirmation",
          title: "Upload",
          onClick: () => {
            const cb = () => {
              let wasOpen = false;
              if (lazyPreview && this.state.previewOpen) {
                wasOpen = true;
              }
              this.clearPreview(() => {
                if (wasOpen) {
                  this.preview(entity);
                }
              });
            };
            if (onUpload) {
              onUpload(entity, cb);
            } else {
              _AssetUploadButton_js__WEBPACK_IMPORTED_MODULE_1__["default"].OpenUpload({
                targetAsset: {
                  _id: entity._id,
                  name: entity.name
                },
                uploadCallback: cb
              });
            }
          },
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("i", {
            className: "fa fa-upload"
          })
        }), lazyPreview && entity != null && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("button", {
          className: `button confirmation ${!previewEnabled || previewLoading ? 'disabled' : ''}`,
          onClick: () => this.preview(entity),
          title: previewOpen ? 'Refresh' : 'Preview',
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("i", {
            className: `fa fa-${previewLoading ? '' : previewOpen ? 'retweet' : 'eye'}`
          }), " ", previewLoading ? 'Loading..' : '']
        }), lazyPreview && entity != null && previewOpen && !previewLoading && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
          className: `button confirmation ${!previewEnabled || previewLoading ? 'disabled' : ''}`,
          onClick: () => this.clearPreview(),
          title: "Clear",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("i", {
            className: "fa fa-times"
          })
        }), codeEntity != null && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
          className: `button ${codeActive ? 'danger' : 'confirmation'}`,
          onClick: () => this.setState(state => {
            const change = {};
            if (state.codeActive) {
              jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().store.dispatch(jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().entities.actions.flushUpdates());
            } else {
              change.previewOpen = false;
              change.previewLoading = false;
              jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().stopProgress();
            }
            return {
              codeActive: !state.codeActive,
              ...change
            };
          }),
          title: `${codeActive ? 'Hide' : 'Show'} ${codeEntity.content != null ? 'content and helpers' : 'helpers'}`,
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("i", {
            className: "fa fa-code"
          })
        })]
      }), entity != null && entity.link && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        className: _AssetEditor_css__WEBPACK_IMPORTED_MODULE_6__["default"].toolbarRow,
        style: {
          margin: '0.6rem'
        },
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("span", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("b", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("i", {
              className: "fa fa-folder-open"
            }), " linked to file:"]
          }), " ", link]
        })
      })]
    });
  }
  renderEditorContent() {
    const {
      entity,
      codeEntity,
      emptyMessage,
      getPreviewContent,
      onUpdate
    } = this.props;
    const {
      codeActive
    } = this.state;
    if (codeEntity != null && codeActive) {
      const helpersEditor = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__.TextEditor, {
        name: codeEntity._id + '_helpers',
        getFilename: () => `${codeEntity.name} (helpers)`,
        mode: "javascript",
        onUpdate: v => onUpdate(Object.assign({
          _id: codeEntity._id
        }, {
          helpers: v
        })),
        value: codeEntity.helpers || ''
      }, codeEntity._id + '_helpers');
      if (Object.prototype.hasOwnProperty.call(codeEntity, 'content')) {
        return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__.SplitPane, {
          primary: "second",
          split: "horizontal",
          resizerClassName: "resizer-horizontal",
          defaultSize: window.innerHeight * 0.2 + 'px',
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__.TextEditor, {
            name: codeEntity._id,
            getFilename: () => codeEntity.name,
            mode: resolveTemplateEditorMode(codeEntity) || 'handlebars',
            onUpdate: v => onUpdate(Object.assign({
              _id: codeEntity._id
            }, {
              content: v
            })),
            value: codeEntity.content || ''
          }, codeEntity._id), helpersEditor]
        });
      }
      return helpersEditor;
    }
    if (entity == null) {
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        style: {
          padding: '2rem'
        },
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("i", {
          children: emptyMessage != null ? emptyMessage : 'Asset is empty'
        })
      });
    }
    const parts = entity.name.split('.');
    const extension = parts[parts.length - 1];
    const lazyPreview = this.getLazyPreviewStatus(entity);
    let previewOpen = true;
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
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        style: {
          overflow: 'auto'
        },
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("img", {
          src: jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`assets/${entity._id}/content?v=${new Date().getTime()}`),
          style: {
            display: 'block',
            margin: '3rem auto'
          }
        })
      });
    }
    if (this.isFont(entity)) {
      const newStyle = document.createElement('style');
      newStyle.appendChild(document.createTextNode(`@font-face {
         font-family: '${parts[0]}';
         src: url('${jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`/assets/${entity._id}/content`)}');
         format('${extension === 'ttf' ? 'truetype' : 'woff'}');
        }`));
      document.head.appendChild(newStyle);
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        style: {
          overflow: 'auto',
          fontFamily: parts[0],
          padding: '2rem'
        },
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("h1", {
          children: [" Hello world font ", entity.name]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
          children: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book."
        })]
      });
    }
    if (this.isPdf(entity)) {
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        className: "block",
        style: {
          height: '100%'
        },
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("object", {
          style: {
            height: '100%'
          },
          data: jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`assets/${entity._id}/content?v=${new Date().getTime()}`),
          type: "application/pdf",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("embed", {
            src: jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`assets/${entity._id}/content?v=${new Date().getTime()}`),
            type: "application/pdf"
          })
        })
      });
    }
    if (this.isOfficeFile(entity)) {
      const officeSrc = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`assets/office/${entity._id}/content`);
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__.FramePreview, {
        onLoad: () => this.previewLoadFinish(),
        src: officeSrc
      });
    }
    if (entity.name.split('.').length > 1 && binary_extensions__WEBPACK_IMPORTED_MODULE_5__.includes(entity.name.split('.')[1])) {
      return this.renderBinary(entity);
    }
    let mode = parts[parts.length - 1];
    if (extension === 'js') {
      mode = 'javascript';
    }
    if (extension === 'html') {
      mode = 'handlebars';
    }
    const content = (entity.content || entity.forceUpdate ? entity.content : this.state.content) || '';
    let text;
    try {
      text = decodeURIComponent(escape(atob(content)));
    } catch (e) {
      return this.renderBinary(entity);
    }
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__.TextEditor, {
      name: entity._id,
      mode: mode,
      value: text,
      onUpdate: v => this.props.onUpdate(Object.assign({}, entity, {
        content: btoa(unescape(encodeURIComponent(v))),
        forceUpdate: true
      }))
    });
  }
  render() {
    const {
      initialLoading
    } = this.state;
    if (initialLoading) {
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {});
    }
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      className: "block",
      children: [this.renderEditorToolbar(), this.renderEditorContent()]
    });
  }
}
function resolveTemplateEditorMode(template) {
  // eslint-disable-next-line
  for (const k in jsreport_studio__WEBPACK_IMPORTED_MODULE_2__.templateEditorModeResolvers) {
    const mode = jsreport_studio__WEBPACK_IMPORTED_MODULE_2__.templateEditorModeResolvers[k](template);
    if (mode) {
      return mode;
    }
  }
  return null;
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (AssetEditor);

/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";
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
/* 11 */
/***/ ((module) => {

"use strict";
module.exports = Studio.libraries['superagent'];

/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.CopyToClipboard = void 0;
var _copyToClipboard = _interopRequireDefault(__webpack_require__(5));
var _react = _interopRequireDefault(__webpack_require__(0));
var _excluded = ["text", "onCopy", "options", "children"];
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var CopyToClipboard = exports.CopyToClipboard = /*#__PURE__*/function (_React$PureComponent) {
  function CopyToClipboard() {
    var _this;
    _classCallCheck(this, CopyToClipboard);
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    _this = _callSuper(this, CopyToClipboard, [].concat(args));
    _defineProperty(_this, "onClick", function (event) {
      var _this$props = _this.props,
        text = _this$props.text,
        onCopy = _this$props.onCopy,
        children = _this$props.children,
        options = _this$props.options;
      var elem = _react["default"].Children.only(children);
      var result = (0, _copyToClipboard["default"])(text, options);
      if (onCopy) {
        onCopy(text, result);
      }

      // Bypass onClick if it was present
      if (elem !== null && elem !== void 0 && elem.props && typeof elem.props.onClick === 'function') {
        elem.props.onClick(event);
      }
    });
    return _this;
  }
  _inherits(CopyToClipboard, _React$PureComponent);
  return _createClass(CopyToClipboard, [{
    key: "render",
    value: function render() {
      var _this$props2 = this.props,
        _text = _this$props2.text,
        _onCopy = _this$props2.onCopy,
        _options = _this$props2.options,
        children = _this$props2.children,
        props = _objectWithoutProperties(_this$props2, _excluded);
      var elem = _react["default"].Children.only(children);
      return /*#__PURE__*/_react["default"].cloneElement(elem, _objectSpread(_objectSpread({}, props), {}, {
        onClick: this.onClick
      }));
    }
  }]);
}(_react["default"].PureComponent);
_defineProperty(CopyToClipboard, "defaultProps", {
  onCopy: undefined,
  options: undefined
});

/***/ }),
/* 13 */
/***/ ((module) => {

"use strict";
module.exports = /*#__PURE__*/JSON.parse('["3dm","3ds","3g2","3gp","7z","a","aac","adp","ai","aif","aiff","alz","ape","apk","ar","arj","asf","au","avi","bak","baml","bh","bin","bk","bmp","btif","bz2","bzip2","cab","caf","cgm","class","cmx","cpio","cr2","csv","cur","dat","dcm","deb","dex","djvu","dll","dmg","dng","doc","docm","docx","dot","dotm","dra","DS_Store","dsk","dts","dtshd","dvb","dwg","dxf","ecelp4800","ecelp7470","ecelp9600","egg","eol","eot","epub","exe","f4v","fbs","fh","fla","flac","fli","flv","fpx","fst","fvt","g3","gh","gif","graffle","gz","gzip","h261","h263","h264","icns","ico","ief","img","ipa","iso","jar","jpeg","jpg","jpgv","jpm","jxr","key","ktx","lha","lib","lvp","lz","lzh","lzma","lzo","m3u","m4a","m4v","mar","mdi","mht","mid","midi","mj2","mka","mkv","mmr","mng","mobi","mov","movie","mp3","mp4","mp4a","mpeg","mpg","mpga","mxu","nef","npx","numbers","o","oga","ogg","ogv","otf","pages","pbm","pcx","pdb","pdf","pea","pgm","pic","png","pnm","pot","potm","potx","ppa","ppam","ppm","pps","ppsm","ppsx","ppt","pptm","pptx","psd","pya","pyc","pyo","pyv","qt","rar","ras","raw","resources","rgb","rip","rlc","rmf","rmvb","rtf","rz","s3m","s7z","scpt","sgi","shar","sil","sketch","slk","smv","so","stl","sub","swf","tar","tbz","tbz2","tga","tgz","thmx","tif","tiff","tlz","ttc","ttf","txz","udf","uvh","uvi","uvm","uvp","uvs","uvu","viv","vob","war","wav","wax","wbmp","wdp","weba","webm","webp","whl","wim","wm","wma","wmv","wmx","woff","woff2","wrm","wvx","xbm","xif","xla","xlam","xls","xlsb","xlsm","xlsx","xlt","xltm","xltx","xm","xmind","xpi","xpm","xwd","xz","z","zip","zipx"]');

/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// extracted by mini-css-extract-plugin
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({"toolbarContainer":"x-assets-AssetEditor-toolbarContainer","toolbarRow":"x-assets-AssetEditor-toolbarRow","toolbarAssetName":"x-assets-AssetEditor-toolbarAssetName"});

/***/ }),
/* 15 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _scopeOptions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7);
/* harmony import */ var _AssetUploadButton__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2);





class NewAssetModal extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  constructor() {
    super();
    this.nameRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.linkRef = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createRef();
    this.state = {
      isLink: false,
      isSharedHelper: false,
      scope: null
    };
  }
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      this.createAsset();
    }
  }

  // the modal component for some reason after open focuses the panel itself
  componentDidMount() {
    setTimeout(() => this.nameRef.current.focus(), 0);
  }
  async createAsset(e) {
    let entity = {};
    if (!this.state.isLink && (!this.nameRef.current.value || this.nameRef.current.value.indexOf('.')) < 0) {
      return this.setState({
        error: 'name should include file extension, for example foo.js'
      });
    }
    if (this.props.options.defaults != null) {
      entity = Object.assign(entity, this.props.options.defaults);
    }
    if (this.state.isLink) {
      entity.link = this.linkRef.current.value;
      const fragments = entity.link.split('/');
      entity.name = fragments[fragments.length - 1];
    } else {
      entity.name = this.nameRef.current.value;
    }
    if (this.state.isSharedHelper) {
      entity.sharedHelpersScope = this.state.scope;
    } else {
      entity.sharedHelpersScope = null;
    }
    try {
      if ((jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().workspaces)) {
        await jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().workspaces.save();
      }
      const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().api.post('/odata/assets', {
        data: entity
      });
      response.__entitySet = 'assets';
      jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().addExistingEntity(response);
      jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().openTab(response, this.props.options.activateNewTab);
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
      isLink,
      isSharedHelper,
      scope,
      error
    } = this.state;
    const currentScopeValue = scope != null ? scope : 'global';
    const currentScopeOption = _scopeOptions__WEBPACK_IMPORTED_MODULE_1__["default"].find(opt => opt.value === currentScopeValue);
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
        className: "form-group",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("label", {
          children: "New asset"
        })
      }), isLink ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("label", {
          children: "relative or absolute path to existing file"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("input", {
          type: "text",
          name: "link",
          ref: this.linkRef
        })]
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("label", {
          children: "name"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("input", {
          type: "text",
          name: "name",
          ref: this.nameRef,
          placeholder: "styles.css",
          onKeyPress: e => this.handleKeyPress(e)
        })]
      }), (jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().extensions).assets.options.allowAssetsLinkedToFiles !== false ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("label", {
          children: "link to existing file"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("input", {
          type: "checkbox",
          checked: isLink,
          onChange: () => this.setState({
            isLink: !isLink
          })
        })]
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("label", {
          children: "shared helpers attached to templates"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("input", {
          type: "checkbox",
          checked: isSharedHelper === true,
          onChange: v => {
            this.setState({
              isSharedHelper: v.target.checked,
              scope: v.target.checked === false ? null : 'global'
            });
          }
        })]
      }), isSharedHelper && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("label", {
          children: "scope"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("select", {
          value: currentScopeValue,
          onChange: v => {
            const newScope = v.target.value;
            this.setState({
              scope: newScope
            });
          },
          children: _scopeOptions__WEBPACK_IMPORTED_MODULE_1__["default"].map(opt => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("option", {
            value: opt.value,
            title: opt.desc,
            children: opt.title
          }, opt.key))
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("em", {
          children: currentScopeOption.desc
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
        className: "form-group",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
          style: {
            color: 'red',
            display: error ? 'block' : 'none'
          },
          children: error
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
        className: "form-group",
        style: {
          opacity: 0.8
        },
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("hr", {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("span", {
          children: ["You can use assets to embed any kind of static content into report template.", /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("br", {}), "This can be for example css style, image, font, html or even javascript shared helpers. ", /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("br", {}), "See the", /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("a", {
            target: "_blank",
            rel: "noreferrer",
            title: "Help",
            href: "http://jsreport.net/learn/assets",
            children: "documentation"
          }), " for details."]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
        className: "button-bar",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("button", {
          className: "button confirmation",
          onClick: () => {
            this.props.close();
            _AssetUploadButton__WEBPACK_IMPORTED_MODULE_2__["default"].OpenUploadNew(this.props.options.defaults, {
              activateNewTab: this.props.options.activateNewTab,
              onNewEntityCallback: this.props.options.onNewEntity
            });
          },
          children: "Upload"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("button", {
          onClick: () => this.createAsset(),
          className: "button confirmation",
          children: "Ok"
        })]
      })]
    });
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (NewAssetModal);

/***/ }),
/* 16 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _scopeOptions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2);




class AssetProperties extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  static title(entity, entities) {
    let suffix = entity.link ? ' (link)' : '';
    if (entity.sharedHelpersScope != null) {
      suffix += ` (shared helper, scope: ${entity.sharedHelpersScope})`;
    }
    return `asset${suffix}`;
  }
  componentDidMount() {
    this.normalizeScope();
  }
  componentDidUpdate() {
    this.normalizeScope();
  }
  normalizeScope() {
    const {
      entity,
      onChange
    } = this.props;
    if (entity.isSharedHelper === true && entity.sharedHelpersScope == null) {
      onChange({
        _id: entity._id,
        sharedHelpersScope: 'global',
        isSharedHelper: false
      });
    }
  }
  render() {
    const {
      entity,
      onChange
    } = this.props;
    const currentScopeValue = entity.sharedHelpersScope != null ? entity.sharedHelpersScope : 'global';
    const currentScopeOption = _scopeOptions__WEBPACK_IMPORTED_MODULE_1__["default"].find(opt => opt.value === currentScopeValue);
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
      children: [(jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().extensions).assets.options.allowAssetsLinkedToFiles !== false ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("label", {
          children: "link"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("input", {
          type: "text",
          value: entity.link || '',
          onChange: v => onChange({
            _id: entity._id,
            link: v.target.value
          })
        })]
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("div", {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("label", {
          children: "shared helpers attached to templates"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("input", {
          type: "checkbox",
          checked: entity.sharedHelpersScope != null,
          onChange: v => {
            onChange({
              _id: entity._id,
              sharedHelpersScope: v.target.checked === false ? null : 'global'
            });
          }
        })]
      }), entity.sharedHelpersScope != null && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
        className: "form-group",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("label", {
          children: "scope"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("select", {
          value: currentScopeValue,
          onChange: v => {
            const newScope = v.target.value;
            onChange({
              _id: entity._id,
              sharedHelpersScope: newScope
            });
          },
          children: _scopeOptions__WEBPACK_IMPORTED_MODULE_1__["default"].map(opt => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("option", {
            value: opt.value,
            title: opt.desc,
            children: opt.title
          }, opt.key))
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("em", {
          children: currentScopeOption.desc
        })]
      })]
    });
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (AssetProperties);

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
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _AssetEditor_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9);
/* harmony import */ var _AssetUploadButton_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);
/* harmony import */ var _NewAssetModal_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(15);
/* harmony import */ var _AssetProperties_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(16);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_4__);





jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addEntitySet({
  name: 'assets',
  faIcon: 'fa-file',
  visibleName: 'asset',
  onNew: options => jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().openModal(_NewAssetModal_js__WEBPACK_IMPORTED_MODULE_2__["default"], options),
  referenceAttributes: ['isSharedHelper', 'sharedHelpersScope'],
  entityTreePosition: 700
});
(jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().sharedComponents).NewAssetModal = _NewAssetModal_js__WEBPACK_IMPORTED_MODULE_2__["default"];
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addEditorComponent('assets', _AssetEditor_js__WEBPACK_IMPORTED_MODULE_0__["default"]);
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addToolbarComponent(_AssetUploadButton_js__WEBPACK_IMPORTED_MODULE_1__["default"]);
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addPropertiesComponent(_AssetProperties_js__WEBPACK_IMPORTED_MODULE_3__["default"].title, _AssetProperties_js__WEBPACK_IMPORTED_MODULE_3__["default"], entity => entity.__entitySet === 'assets');
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().entityTreeIconResolvers.push(entity => {
  if (entity.__entitySet !== 'assets') {
    return;
  }
  const parts = entity.name.split('.');
  if (parts.length === 1) {
    return;
  }
  const extension = parts[parts.length - 1];
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
jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().entityTreeDropResolvers.push({
  type: (jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().dragAndDropNativeTypes).FILE,
  async handler(_ref) {
    let {
      draggedItem,
      dragOverContext,
      dropComplete
    } = _ref;
    const files = draggedItem.files;
    const targetInfo = {
      shortid: null
    };
    if (dragOverContext && dragOverContext.containerTargetEntity) {
      targetInfo.shortid = dragOverContext.containerTargetEntity.shortid;
    }
    const errors = [];
    for (const file of files) {
      if (/\.zip$/.test(file.name) || /\.jsrexport$/.test(file.name)) {
        continue;
      }
      try {
        const assetFile = await new Promise((resolve, reject) => {
          const fileName = file.name;
          const reader = new FileReader();
          reader.onloadend = async () => {
            resolve({
              name: fileName,
              content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length)
            });
          };
          reader.onerror = function () {
            const errMsg = `There was an error reading the file "${fileName}"`;
            reject(errMsg);
          };
          reader.readAsDataURL(file);
        });
        if (targetInfo.shortid != null) {
          assetFile.folder = {
            shortid: targetInfo.shortid
          };
        }
        const response = await jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().api.post('/odata/assets', {
          data: assetFile
        }, true);
        response.__entitySet = 'assets';
        jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().addExistingEntity(response);
        jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().openTab(Object.assign({}, response));

        // delay the collapsing a bit to avoid showing ugly transition of collapsed -> uncollapsed
        setTimeout(() => {
          jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().collapseEntity({
            shortid: response.shortid
          }, false, {
            parents: true,
            self: false
          });
        }, 200);
      } catch (e) {
        errors.push(e);
      }
    }
    dropComplete();
    if (errors.length > 0) {
      const assetsUploadedError = new Error(`Could not complete asset upload${files.length > 1 ? ' of some files' : ''}.\n\n${errors.map(e => e.message).join('\n')}`);
      jsreport_studio__WEBPACK_IMPORTED_MODULE_4___default().apiFailed(assetsUploadedError);
    }
  }
});
})();

/******/ })()
;