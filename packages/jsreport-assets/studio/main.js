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
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);


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
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "file",
      key: "file",
      ref: this.inputFileRef,
      style: {
        display: 'none'
      },
      onChange: e => this.upload(e)
    });
  }
  render() {
    return this.renderUpload(true);
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (AssetUploadButton);

/***/ }),
/* 3 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var _require = __webpack_require__(10),
    CopyToClipboard = _require.CopyToClipboard;

CopyToClipboard.CopyToClipboard = CopyToClipboard;
module.exports = CopyToClipboard;

/***/ }),
/* 4 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var deselectCurrent = __webpack_require__(5);

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
/* 5 */
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
/* 6 */
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
/* 7 */,
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _AssetUploadButton_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var superagent__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(9);
/* harmony import */ var superagent__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(superagent__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var react_copy_to_clipboard__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(3);
/* harmony import */ var react_copy_to_clipboard__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(react_copy_to_clipboard__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var binary_extensions__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(11);
/* harmony import */ var _AssetEditor_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(12);







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
        jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openModal(() => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "We need to upload your office asset to our publicly hosted server to be able to use Office Online Service for previewing here in the studio. You can disable it in the configuration, see", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("a", {
          href: "https://jsreport.net/learn/xlsx#preview-in-studio",
          target: "_blank",
          rel: "noopener noreferrer"
        }, "the docs for details"), "."));
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
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "custom-editor"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h1", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-file-o"
    }), " ", entity.name)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("a", {
      className: "button confirmation",
      rel: "noreferrer",
      target: "_blank",
      href: jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`assets/${entity._id}/content?download=true`),
      title: "Download"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-download"
    }), " Download"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button confirmation",
      onClick: () => _AssetUploadButton_js__WEBPACK_IMPORTED_MODULE_1__["default"].OpenUpload()
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-upload"
    }), " Upload")));
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
      icon,
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
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _AssetEditor_css__WEBPACK_IMPORTED_MODULE_6__["default"].toolbarContainer
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _AssetEditor_css__WEBPACK_IMPORTED_MODULE_6__["default"].toolbarRow
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h3", {
      className: _AssetEditor_css__WEBPACK_IMPORTED_MODULE_6__["default"].toolbarAssetName
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: `fa ${icon}`
    }), "\xA0", entity != null ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("a", {
      href: "#",
      onClick: ev => {
        ev.preventDefault();
        jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openTab({
          _id: entity._id
        });
      }
    }, visibleName) : visibleName)), embeddingCode !== '' && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(react_copy_to_clipboard__WEBPACK_IMPORTED_MODULE_4__.CopyToClipboard, {
      text: embeddingCode
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("a", {
      className: "button confirmation",
      title: "Copy the embedding code to clipboard"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-clipboard"
    }))), entity != null && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
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
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-download"
    })), entity != null && !entity.link && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
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
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-upload"
    })), lazyPreview && entity != null && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: `button confirmation ${!previewEnabled || previewLoading ? 'disabled' : ''}`,
      onClick: () => this.preview(entity),
      title: previewOpen ? 'Refresh' : 'Preview'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: `fa fa-${previewLoading ? '' : previewOpen ? 'retweet' : 'eye'}`
    }), " ", previewLoading ? 'Loading..' : ''), lazyPreview && entity != null && previewOpen && !previewLoading && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: `button confirmation ${!previewEnabled || previewLoading ? 'disabled' : ''}`,
      onClick: () => this.clearPreview(),
      title: "Clear"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-times"
    })), codeEntity != null && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
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
      title: `${codeActive ? 'Hide' : 'Show'} ${codeEntity.content != null ? 'content and helpers' : 'helpers'}`
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-code"
    }))), entity != null && entity.link && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _AssetEditor_css__WEBPACK_IMPORTED_MODULE_6__["default"].toolbarRow,
      style: {
        margin: '0.6rem'
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("b", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-folder-open"
    }), " linked to file:"), " ", link)));
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
      const helpersEditor = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__.TextEditor, {
        key: codeEntity._id + '_helpers',
        name: codeEntity._id + '_helpers',
        getFilename: () => `${codeEntity.name} (helpers)`,
        mode: "javascript",
        onUpdate: v => onUpdate(Object.assign({
          _id: codeEntity._id
        }, {
          helpers: v
        })),
        value: codeEntity.helpers || ''
      });
      if (Object.prototype.hasOwnProperty.call(codeEntity, 'content')) {
        return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__.SplitPane, {
          primary: "second",
          split: "horizontal",
          resizerClassName: "resizer-horizontal",
          defaultSize: window.innerHeight * 0.2 + 'px'
        }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__.TextEditor, {
          key: codeEntity._id,
          name: codeEntity._id,
          getFilename: () => codeEntity.name,
          mode: resolveTemplateEditorMode(codeEntity) || 'handlebars',
          onUpdate: v => onUpdate(Object.assign({
            _id: codeEntity._id
          }, {
            content: v
          })),
          value: codeEntity.content || ''
        }), helpersEditor);
      }
      return helpersEditor;
    }
    if (entity == null) {
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
        style: {
          padding: '2rem'
        }
      }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", null, emptyMessage != null ? emptyMessage : 'Asset is empty'));
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
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
        style: {
          overflow: 'auto'
        }
      }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("img", {
        src: jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`assets/${entity._id}/content?v=${new Date().getTime()}`),
        style: {
          display: 'block',
          margin: '3rem auto'
        }
      }));
    }
    if (this.isFont(entity)) {
      const newStyle = document.createElement('style');
      newStyle.appendChild(document.createTextNode(`@font-face {
         font-family: '${parts[0]}';
         src: url('${jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`/assets/${entity._id}/content`)}');
         format('${extension === 'ttf' ? 'truetype' : 'woff'}');
        }`));
      document.head.appendChild(newStyle);
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
        style: {
          overflow: 'auto',
          fontFamily: parts[0],
          padding: '2rem'
        }
      }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h1", null, " Hello world font ", entity.name), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", null, "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book."));
    }
    if (this.isPdf(entity)) {
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
        className: "block",
        style: {
          height: '100%'
        }
      }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("object", {
        style: {
          height: '100%'
        },
        data: jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`assets/${entity._id}/content?v=${new Date().getTime()}`),
        type: "application/pdf"
      }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("embed", {
        src: jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`assets/${entity._id}/content?v=${new Date().getTime()}`),
        type: "application/pdf"
      })));
    }
    if (this.isOfficeFile(entity)) {
      const officeSrc = jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().resolveUrl(`assets/office/${entity._id}/content`);
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__.FramePreview, {
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
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__.TextEditor, {
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
      return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null);
    }
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "block"
    }, this.renderEditorToolbar(), this.renderEditorContent());
  }
}
AssetEditor.defaultProps = {
  icon: 'fa-file-o'
};
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
/* 9 */
/***/ ((module) => {

"use strict";
module.exports = Studio.libraries['superagent'];

/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.CopyToClipboard = void 0;

var _react = _interopRequireDefault(__webpack_require__(0));

var _copyToClipboard = _interopRequireDefault(__webpack_require__(4));

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
/* 11 */
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('["3dm","3ds","3g2","3gp","7z","a","aac","adp","ai","aif","aiff","alz","ape","apk","ar","arj","asf","au","avi","bak","baml","bh","bin","bk","bmp","btif","bz2","bzip2","cab","caf","cgm","class","cmx","cpio","cr2","csv","cur","dat","dcm","deb","dex","djvu","dll","dmg","dng","doc","docm","docx","dot","dotm","dra","DS_Store","dsk","dts","dtshd","dvb","dwg","dxf","ecelp4800","ecelp7470","ecelp9600","egg","eol","eot","epub","exe","f4v","fbs","fh","fla","flac","fli","flv","fpx","fst","fvt","g3","gh","gif","graffle","gz","gzip","h261","h263","h264","icns","ico","ief","img","ipa","iso","jar","jpeg","jpg","jpgv","jpm","jxr","key","ktx","lha","lib","lvp","lz","lzh","lzma","lzo","m3u","m4a","m4v","mar","mdi","mht","mid","midi","mj2","mka","mkv","mmr","mng","mobi","mov","movie","mp3","mp4","mp4a","mpeg","mpg","mpga","mxu","nef","npx","numbers","o","oga","ogg","ogv","otf","pages","pbm","pcx","pdb","pdf","pea","pgm","pic","png","pnm","pot","potm","potx","ppa","ppam","ppm","pps","ppsm","ppsx","ppt","pptm","pptx","psd","pya","pyc","pyo","pyv","qt","rar","ras","raw","resources","rgb","rip","rlc","rmf","rmvb","rtf","rz","s3m","s7z","scpt","sgi","shar","sil","sketch","slk","smv","so","stl","sub","swf","tar","tbz","tbz2","tga","tgz","thmx","tif","tiff","tlz","ttc","ttf","txz","udf","uvh","uvi","uvm","uvp","uvs","uvu","viv","vob","war","wav","wax","wbmp","wdp","weba","webm","webp","whl","wim","wm","wma","wmv","wmx","woff","woff2","wrm","wvx","xbm","xif","xla","xlam","xls","xlsb","xlsm","xlsx","xlt","xltm","xltx","xm","xmind","xpi","xpm","xwd","xz","z","zip","zipx"]');

/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// extracted by mini-css-extract-plugin
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({"toolbarContainer":"x-assets-AssetEditor-toolbarContainer","toolbarRow":"x-assets-AssetEditor-toolbarRow","toolbarAssetName":"x-assets-AssetEditor-toolbarAssetName"});

/***/ }),
/* 13 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _scopeOptions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6);
/* harmony import */ var _AssetUploadButton__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_3__);




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
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "New asset")), isLink ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "relative or absolute path to existing file"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      name: "link",
      ref: this.linkRef
    })) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "name"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      name: "name",
      ref: this.nameRef,
      placeholder: "styles.css",
      onKeyPress: e => this.handleKeyPress(e)
    })), (jsreport_studio__WEBPACK_IMPORTED_MODULE_3___default().extensions).assets.options.allowAssetsLinkedToFiles !== false ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "link to existing file"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: isLink,
      onChange: () => this.setState({
        isLink: !isLink
      })
    })) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "shared helpers attached to templates"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: isSharedHelper === true,
      onChange: v => {
        this.setState({
          isSharedHelper: v.target.checked,
          scope: v.target.checked === false ? null : 'global'
        });
      }
    })), isSharedHelper && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "scope"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: currentScopeValue,
      onChange: v => {
        const newScope = v.target.value;
        this.setState({
          scope: newScope
        });
      }
    }, _scopeOptions__WEBPACK_IMPORTED_MODULE_1__["default"].map(opt => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: opt.key,
      value: opt.value,
      title: opt.desc
    }, opt.title))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("em", null, currentScopeOption.desc)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
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
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("hr", null), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, "You can use assets to embed any kind of static content into report template.", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("br", null), "This can be for example css style, image, font, html or even javascript shared helpers. ", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("br", null), "See the", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("a", {
      target: "_blank",
      rel: "noreferrer",
      title: "Help",
      href: "http://jsreport.net/learn/assets"
    }, "documentation"), " for details.")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "button-bar"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button confirmation",
      onClick: () => {
        this.props.close();
        _AssetUploadButton__WEBPACK_IMPORTED_MODULE_2__["default"].OpenUploadNew(this.props.options.defaults, {
          activateNewTab: this.props.options.activateNewTab,
          onNewEntityCallback: this.props.options.onNewEntity
        });
      }
    }, "Upload"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      onClick: () => this.createAsset(),
      className: "button confirmation"
    }, "Ok")));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (NewAssetModal);

/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _scopeOptions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



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
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, (jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().extensions).assets.options.allowAssetsLinkedToFiles !== false ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "link"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      value: entity.link || '',
      onChange: v => onChange({
        _id: entity._id,
        link: v.target.value
      })
    })) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "shared helpers attached to templates"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.sharedHelpersScope != null,
      onChange: v => {
        onChange({
          _id: entity._id,
          sharedHelpersScope: v.target.checked === false ? null : 'global'
        });
      }
    })), entity.sharedHelpersScope != null && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "scope"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: currentScopeValue,
      onChange: v => {
        const newScope = v.target.value;
        onChange({
          _id: entity._id,
          sharedHelpersScope: newScope
        });
      }
    }, _scopeOptions__WEBPACK_IMPORTED_MODULE_1__["default"].map(opt => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      key: opt.key,
      value: opt.value,
      title: opt.desc
    }, opt.title))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("em", null, currentScopeOption.desc)));
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
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _AssetEditor_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(8);
/* harmony import */ var _AssetUploadButton_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var _NewAssetModal_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(13);
/* harmony import */ var _AssetProperties_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(14);
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