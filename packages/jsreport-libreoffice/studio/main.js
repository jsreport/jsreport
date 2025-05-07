/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ ((module) => {

module.exports = Studio.libraries['react'];

/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = Studio;

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LIBREOFFICE_PDF_EXPORT_TAB_EDITOR: () => (/* binding */ LIBREOFFICE_PDF_EXPORT_TAB_EDITOR),
/* harmony export */   LIBREOFFICE_PDF_EXPORT_TAB_TITLE: () => (/* binding */ LIBREOFFICE_PDF_EXPORT_TAB_TITLE)
/* harmony export */ });
const LIBREOFFICE_PDF_EXPORT_TAB_TITLE = 'LIBREOFFICE_PDF_EXPORT_TAB_TITLE';
const LIBREOFFICE_PDF_EXPORT_TAB_EDITOR = 'LIBREOFFICE_PDF_EXPORT_TAB_EDITOR';

/***/ }),
/* 3 */,
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Properties)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_2__);



class Properties extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  static title(entity, entities) {
    if (!entity.libreOffice || !entity.libreOffice.format && !entity.libreOffice.forma || entity.libreOffice.enabled === false) {
      return 'libre office';
    }
    return `libre office ${entity.libreOffice.format || ''} ${entity.libreOffice.print || ''}`;
  }
  changeLibreOffice(props, change) {
    const {
      entity,
      onChange
    } = props;
    const libreOffice = entity.libreOffice || {};
    onChange({
      ...entity,
      libreOffice: {
        ...libreOffice,
        ...change
      }
    });
  }
  openEditor() {
    jsreport_studio__WEBPACK_IMPORTED_MODULE_2___default().openTab({
      key: this.props.entity._id + '_libreOfficePdfExportOptions',
      _id: this.props.entity._id,
      editorComponentKey: _constants_js__WEBPACK_IMPORTED_MODULE_1__.LIBREOFFICE_PDF_EXPORT_TAB_EDITOR,
      titleComponentKey: _constants_js__WEBPACK_IMPORTED_MODULE_1__.LIBREOFFICE_PDF_EXPORT_TAB_TITLE
    });
  }
  render() {
    const {
      entity
    } = this.props;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "properties-section"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Format"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "pdf",
      value: entity.libreOffice ? entity.libreOffice.format : '',
      onChange: v => this.changeLibreOffice(this.props, {
        format: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Print"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "default",
      value: entity.libreOffice ? entity.libreOffice.print : '',
      onChange: v => this.changeLibreOffice(this.props, {
        print: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Enabled"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: !entity.libreOffice || entity.libreOffice.enabled !== false,
      onChange: v => this.changeLibreOffice(this.props, {
        enabled: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Pdf Export Options"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      onClick: () => this.openEditor()
    }, "Configure")));
  }
}

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _styles_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6);



class LibreOfficePdfExportOptionsEditor extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  changeLibreOffice(props, change) {
    const {
      entity
    } = props;
    jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().updateEntity(Object.assign({}, entity, {
      libreOffice: {
        ...entity.libreOffice,
        ...change
      }
    }));
  }
  reset() {
    if (confirm('Are you sure you want to reset to defaults?')) {
      var _entity$libreOffice, _entity$libreOffice2;
      const {
        entity
      } = this.props;
      jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().updateEntity(Object.assign({}, entity, {
        libreOffice: {
          format: (_entity$libreOffice = entity.libreOffice) === null || _entity$libreOffice === void 0 ? void 0 : _entity$libreOffice.format,
          enabled: (_entity$libreOffice2 = entity.libreOffice) === null || _entity$libreOffice2 === void 0 ? void 0 : _entity$libreOffice2.enabled
        }
      }));
    }
  }
  render() {
    var _entity$libreOffice3, _entity$libreOffice4, _entity$libreOffice5, _entity$libreOffice6, _entity$libreOffice7, _entity$libreOffice8, _entity$libreOffice9, _entity$libreOffice0, _entity$libreOffice1, _entity$libreOffice10, _entity$libreOffice11, _entity$libreOffice12, _entity$libreOffice13, _entity$libreOffice14, _entity$libreOffice15, _entity$libreOffice16, _entity$libreOffice17, _entity$libreOffice18, _entity$libreOffice19, _entity$libreOffice20, _entity$libreOffice21, _entity$libreOffice22, _entity$libreOffice23;
    const {
      entity
    } = this.props;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: "block custom-editor",
      style: {
        overflowX: 'auto'
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h1", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("i", {
      className: "fa fa-file-pdf-o"
    }), " Libre Office PDF Export Options", /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", {
      className: "button danger",
      onClick: () => this.reset()
    }, "Reset to defaults")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h2", null, "General"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Page Range"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      value: (_entity$libreOffice3 = entity.libreOffice) === null || _entity$libreOffice3 === void 0 ? void 0 : _entity$libreOffice3.pdfExportPageRange,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportPageRange: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Use lossless compression"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportUseLosslessCompression === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportUseLosslessCompression: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Quality"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "number",
      placeholder: "90",
      value: (_entity$libreOffice4 = entity.libreOffice) === null || _entity$libreOffice4 === void 0 ? void 0 : _entity$libreOffice4.pdfExportQuality,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportQuality: v.target.valueAsNumber
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Reduce image resolution"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportReduceImageResolution === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportReduceImageResolution: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Max image resolution"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "number",
      placeholder: "90",
      value: (_entity$libreOffice5 = entity.libreOffice) === null || _entity$libreOffice5 === void 0 ? void 0 : _entity$libreOffice5.pdfExportMaxImageResolution,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportMaxImageResolution: v.target.valueAsNumber
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "PDF version"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: ((_entity$libreOffice6 = entity.libreOffice) === null || _entity$libreOffice6 === void 0 ? void 0 : _entity$libreOffice6.pdfExportSelectPdfVersion) == null ? '0' : entity.libreOffice.pdfExportSelectPdfVersion,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportSelectPdfVersion: parseInt(v.target.value)
      })
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "0"
    }, "PDF 1.7"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "1"
    }, "PDF/A-1b"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "2"
    }, "PDF/A-2b"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "3"
    }, "PDF/A-3b"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "15"
    }, "PDF 1.5"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "16"
    }, "PDF 1.6"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "17"
    }, "PDF 1.7")))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "PDF U/A compliance"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportPDFUACompliance === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportPDFUACompliance: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Use tagged PDF"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportUseTaggedPDF === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportUseTaggedPDF: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Export form fields"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportExportFormFields !== false,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportExportFormFields: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Forms type"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: ((_entity$libreOffice7 = entity.libreOffice) === null || _entity$libreOffice7 === void 0 ? void 0 : _entity$libreOffice7.pdfExportFormsType) == null ? '0' : entity.libreOffice.pdfExportFormsType,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportFormsType: parseInt(v.target.value)
      })
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "0"
    }, "Form type FDF is used"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "1"
    }, "Form type PDF is used"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "2"
    }, "Form type HTML is used"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "3"
    }, "Form type XML is used")))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Allow duplicate field names"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportAllowDuplicateFieldNames === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportAllowDuplicateFieldNames: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Export bookmarks"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportExportBookmarks !== false,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportExportBookmarks: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Export placeholders"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportExportPlaceholders === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportExportPlaceholders: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Export notes"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportExportNotes === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportExportNotes: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Export notes pages"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportExportNotesPages === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportExportNotesPages: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Export only notes pages"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportExportOnlyNotesPages === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportExportOnlyNotesPages: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Export notes in margin"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportExportNotesInMargin === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportExportNotesInMargin: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Export hidden slides"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportExportHiddenSlides === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportExportHiddenSlides: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Is skip empty pages"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportIsSkipEmptyPages === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportIsSkipEmptyPages: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Embed standard fonts"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportEmbedStandardFonts === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportEmbedStandardFonts: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Is add s tream"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportIsAddStream === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportIsAddStream: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Watermak"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      value: (_entity$libreOffice8 = entity.libreOffice) === null || _entity$libreOffice8 === void 0 ? void 0 : _entity$libreOffice8.pdfExportWatermark,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportWatermark: v.target.value
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Watermark color"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "number",
      placeholder: "0",
      value: (_entity$libreOffice9 = entity.libreOffice) === null || _entity$libreOffice9 === void 0 ? void 0 : _entity$libreOffice9.pdfExportWatermarkColor,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportWatermarkColor: v.target.valueAsNumber
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Watermark font height"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "number",
      placeholder: "0",
      value: (_entity$libreOffice0 = entity.libreOffice) === null || _entity$libreOffice0 === void 0 ? void 0 : _entity$libreOffice0.pdfExportWatermarkFontHeight,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportWatermarkFontHeight: v.target.valueAsNumber
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Watermark rotate angle"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "number",
      placeholder: "0",
      value: (_entity$libreOffice1 = entity.libreOffice) === null || _entity$libreOffice1 === void 0 ? void 0 : _entity$libreOffice1.pdfExportWatermarkRotateAngle,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportWatermarkRotateAngle: v.target.valueAsNumber
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Watermak font name"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      placeholder: "Helvetica",
      value: (_entity$libreOffice10 = entity.libreOffice) === null || _entity$libreOffice10 === void 0 ? void 0 : _entity$libreOffice10.pdfExportWatermarkFontName,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportWatermarkFontName: v.target.value
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Tiled watermark"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      value: (_entity$libreOffice11 = entity.libreOffice) === null || _entity$libreOffice11 === void 0 ? void 0 : _entity$libreOffice11.pdfExportTiledWatermark,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportTiledWatermark: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Use reference XObject"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportUseReferenceXObject === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportUseReferenceXObject: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Is redact mode"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportIsRedactMode === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportIsRedactMode: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Single page sheets"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportSinglePageSheets === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportSinglePageSheets: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h2", null, "Initial View"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Resize window to initial page"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportResizeWindowToInitialPage === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportResizeWindowToInitialPage: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Center window"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportCenterWindow === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportCenterWindow: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Open in full screen mode"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportOpenInFullScreenMode === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportOpenInFullScreenMode: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Display PDF Document title"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportDisplayPDFDocumentTitle !== false,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportDisplayPDFDocumentTitle: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Hide viewer menu bar"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportHideViewerMenubar === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportHideViewerMenubar: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Hide viewer toolbar"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportHideViewerToolbar === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportHideViewerToolbar: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Hide viewer window controls"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportHideViewerWindowControls === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportHideViewerWindowControls: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Use transition effects"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportUseTransitionEffects !== false,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportUseTransitionEffects: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h2", null, "Links"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Open bookmark levels"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "number",
      placeholder: "-1",
      value: (_entity$libreOffice12 = entity.libreOffice) === null || _entity$libreOffice12 === void 0 ? void 0 : _entity$libreOffice12.pdfExportOpenBookmarkLevels,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportOpenBookmarkLevels: v.target.valueAsNumber
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Export bookmarks to PDF destination"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportExportBookmarksToPDFDestination === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportExportBookmarksToPDFDestination: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Convert OOo target to PDF target"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportConvertOOoTargetToPDFTarget === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportConvertOOoTargetToPDFTarget: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Export links relative Fsys"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportExportLinksRelativeFsys === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportExportLinksRelativeFsys: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "PDF view selection"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: ((_entity$libreOffice13 = entity.libreOffice) === null || _entity$libreOffice13 === void 0 ? void 0 : _entity$libreOffice13.pdfExportPDFViewSelection) == null ? '0' : entity.libreOffice.pdfExportPDFViewSelection,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportPDFViewSelection: parseInt(v.target.value)
      })
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "0"
    }, "All the links external to the document treated as URI"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "1"
    }, "Viewed through a PDF reader application only"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "2"
    }, "Viewed through an Internet browser")))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h2", null, "Security"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Encrypt file"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportEncryptFile === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportEncryptFile: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Document open password"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "password",
      value: (_entity$libreOffice14 = entity.libreOffice) === null || _entity$libreOffice14 === void 0 ? void 0 : _entity$libreOffice14.pdfExportDocumentOpenPassword,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportDocumentOpenPassword: v.target.value
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Restrict permissions"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportRestrictPermissions === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportRestrictPermissions: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Permissions password"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "password",
      value: (_entity$libreOffice15 = entity.libreOffice) === null || _entity$libreOffice15 === void 0 ? void 0 : _entity$libreOffice15.pdfExportPermissionPassword,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportPermissionPassword: v.target.value
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Printing"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: ((_entity$libreOffice16 = entity.libreOffice) === null || _entity$libreOffice16 === void 0 ? void 0 : _entity$libreOffice16.pdfExportPrinting) == null ? '2' : entity.libreOffice.pdfExportPrinting,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportPrinting: parseInt(v.target.value)
      })
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "0"
    }, "The document cannot be printed"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "1"
    }, "The document can be printed at low resolution only"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "2"
    }, "The document can be printed at maximum resolution"))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Changes"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", {
      value: ((_entity$libreOffice17 = entity.libreOffice) === null || _entity$libreOffice17 === void 0 ? void 0 : _entity$libreOffice17.pdfExportChanges) == null ? '4' : entity.libreOffice.pdfExportChanges,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportChanges: parseInt(v.target.value)
      })
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "0"
    }, "The document cannot be changed"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "1"
    }, "Inserting deleting and rotating pages is allowed"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "2"
    }, "Filling of form field is allowed"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "3"
    }, "Both filling of form field and commenting is allowed"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", {
      value: "4"
    }, "All the changes of the previous selections are permitted")))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Enable copying of content"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportEnableCopyingOfContent !== false,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportEnableCopyingOfContent: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Enable text access for accessibility tools"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportEnableTextAccessForAccessibilityTools !== false,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportEnableTextAccessForAccessibilityTools: v.target.checked
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h2", null, "Digital signature"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Sign PDF"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "checkbox",
      checked: entity.libreOffice && entity.libreOffice.pdfExportSignPDF === true,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportSignPDF: v.target.checked
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Signature location"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      value: (_entity$libreOffice18 = entity.libreOffice) === null || _entity$libreOffice18 === void 0 ? void 0 : _entity$libreOffice18.pdfExportSignatureLocation,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportSignatureLocation: v.target.value
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Signature reason"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      value: (_entity$libreOffice19 = entity.libreOffice) === null || _entity$libreOffice19 === void 0 ? void 0 : _entity$libreOffice19.pdfExportSignatureReason,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportSignatureReason: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Signature contact info"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      value: (_entity$libreOffice20 = entity.libreOffice) === null || _entity$libreOffice20 === void 0 ? void 0 : _entity$libreOffice20.pdfExportSignatureContactInfo,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportSignatureContactInfo: v.target.value
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Signature password"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "password",
      value: (_entity$libreOffice21 = entity.libreOffice) === null || _entity$libreOffice21 === void 0 ? void 0 : _entity$libreOffice21.pdfExportSignaturePassword,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportSignaturePassword: v.target.value
      })
    })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Signature certificate subject name"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      value: (_entity$libreOffice22 = entity.libreOffice) === null || _entity$libreOffice22 === void 0 ? void 0 : _entity$libreOffice22.pdfExportSignCertificateSubjectName,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportSignCertificateSubjectName: v.target.value
      })
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].row
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", {
      className: _styles_css__WEBPACK_IMPORTED_MODULE_2__["default"].column + ' form-group'
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", null, "Signature timestamp"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", {
      type: "text",
      value: (_entity$libreOffice23 = entity.libreOffice) === null || _entity$libreOffice23 === void 0 ? void 0 : _entity$libreOffice23.pdfExportSignatureTSA,
      onChange: v => this.changeLibreOffice(this.props, {
        pdfExportSignatureTSA: v.target.value
      })
    }))));
  }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (LibreOfficePdfExportOptionsEditor);

/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// extracted by mini-css-extract-plugin
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({"row":"x-libreoffice-styles-row","column":"x-libreoffice-styles-column"});

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (props => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, props.entity.name + ' libreoffice ' + (props.entity.__isDirty ? '*' : '')));

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
/* harmony import */ var _LibreOfficeProperties__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(jsreport_studio__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _LibreOfficePdfExportOptionsEditor_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(5);
/* harmony import */ var _LibreOfficePdfExportOptionsTitle_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(7);
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2);





jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().addPropertiesComponent(_LibreOfficeProperties__WEBPACK_IMPORTED_MODULE_0__["default"].title, _LibreOfficeProperties__WEBPACK_IMPORTED_MODULE_0__["default"], entity => entity.__entitySet === 'templates');
jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().addEditorComponent(_constants_js__WEBPACK_IMPORTED_MODULE_4__.LIBREOFFICE_PDF_EXPORT_TAB_EDITOR, _LibreOfficePdfExportOptionsEditor_js__WEBPACK_IMPORTED_MODULE_2__["default"]);
jsreport_studio__WEBPACK_IMPORTED_MODULE_1___default().addTabTitleComponent(_constants_js__WEBPACK_IMPORTED_MODULE_4__.LIBREOFFICE_PDF_EXPORT_TAB_TITLE, _LibreOfficePdfExportOptionsTitle_js__WEBPACK_IMPORTED_MODULE_3__["default"]);
})();

/******/ })()
;