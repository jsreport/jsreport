import React, { Component } from 'react'
import Studio from 'jsreport-studio'
import styles from './styles.css'

class LibreOfficePdfExportOptionsEditor extends Component {
  changeLibreOffice (props, change) {
    const { entity } = props

    Studio.updateEntity(Object.assign({}, entity, { libreOffice: { ...entity.libreOffice, ...change } }))
  }

  reset () {
    if (confirm('Are you sure you want to reset to defaults?')) {
      const { entity } = this.props
      Studio.updateEntity(Object.assign({}, entity, {
        libreOffice: {
          format: entity.libreOffice?.format,
          enabled: entity.libreOffice?.enabled
        }
      }))
    }
  }

  render () {
    const { entity } = this.props

    return (
      <div className='block custom-editor' style={{ overflowX: 'auto' }}>
        <h1>
          <i className='fa fa-file-pdf-o' /> Libre Office PDF Export Options
          <button className='button danger' onClick={() => this.reset()}>Reset to defaults</button>
        </h1>
        <h2>General
        </h2>

        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Page Range</label>
            <input
              type='text'
              value={entity.libreOffice?.pdfExportPageRange}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportPageRange: v.target.value })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Use lossless compression</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportUseLosslessCompression === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportUseLosslessCompression: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Quality</label>
            <input
              type='number'
              placeholder='90'
              value={entity.libreOffice?.pdfExportQuality}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportQuality: v.target.valueAsNumber })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Reduce image resolution</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportReduceImageResolution === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportReduceImageResolution: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Max image resolution</label>
            <input
              type='number'
              placeholder='90'
              value={entity.libreOffice?.pdfExportMaxImageResolution}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportMaxImageResolution: v.target.valueAsNumber })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>PDF version</label>
            <select
              value={entity.libreOffice?.pdfExportSelectPdfVersion == null ? '0' : entity.libreOffice.pdfExportSelectPdfVersion}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportSelectPdfVersion: parseInt(v.target.value) })}
            >
              <option value='0'>PDF 1.7</option>
              <option value='1'>PDF/A-1b</option>
              <option value='2'>PDF/A-2b</option>
              <option value='3'>PDF/A-3b</option>
              <option value='15'>PDF 1.5</option>
              <option value='16'>PDF 1.6</option>
              <option value='17'>PDF 1.7</option>
            </select>
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>PDF U/A compliance</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportPDFUACompliance === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportPDFUACompliance: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Use tagged PDF</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportUseTaggedPDF === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportUseTaggedPDF: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Export form fields</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportExportFormFields !== false}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportExportFormFields: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Forms type</label>
            <select
              value={entity.libreOffice?.pdfExportFormsType == null ? '0' : entity.libreOffice.pdfExportFormsType}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportFormsType: parseInt(v.target.value) })}
            >
              <option value='0'>Form type FDF is used</option>
              <option value='1'>Form type PDF is used</option>
              <option value='2'>Form type HTML is used</option>
              <option value='3'>Form type XML is used</option>
            </select>
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Allow duplicate field names</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportAllowDuplicateFieldNames === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportAllowDuplicateFieldNames: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Export bookmarks</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportExportBookmarks !== false}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportExportBookmarks: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Export placeholders</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportExportPlaceholders === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportExportPlaceholders: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Export notes</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportExportNotes === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportExportNotes: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Export notes pages</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportExportNotesPages === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportExportNotesPages: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Export only notes pages</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportExportOnlyNotesPages === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportExportOnlyNotesPages: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Export notes in margin</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportExportNotesInMargin === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportExportNotesInMargin: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Export hidden slides</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportExportHiddenSlides === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportExportHiddenSlides: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Is skip empty pages</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportIsSkipEmptyPages === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportIsSkipEmptyPages: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Embed standard fonts</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportEmbedStandardFonts === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportEmbedStandardFonts: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Is add s tream</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportIsAddStream === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportIsAddStream: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Watermak</label>
            <input
              type='text'
              value={entity.libreOffice?.pdfExportWatermark}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportWatermark: v.target.value })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Watermark color</label>
            <input
              type='number'
              placeholder='0'
              value={entity.libreOffice?.pdfExportWatermarkColor}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportWatermarkColor: v.target.valueAsNumber })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Watermark font height</label>
            <input
              type='number'
              placeholder='0'
              value={entity.libreOffice?.pdfExportWatermarkFontHeight}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportWatermarkFontHeight: v.target.valueAsNumber })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Watermark rotate angle</label>
            <input
              type='number'
              placeholder='0'
              value={entity.libreOffice?.pdfExportWatermarkRotateAngle}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportWatermarkRotateAngle: v.target.valueAsNumber })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Watermak font name</label>
            <input
              type='text'
              placeholder='Helvetica'
              value={entity.libreOffice?.pdfExportWatermarkFontName}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportWatermarkFontName: v.target.value })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Tiled watermark</label>
            <input
              type='text'
              value={entity.libreOffice?.pdfExportTiledWatermark}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportTiledWatermark: v.target.value })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Use reference XObject</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportUseReferenceXObject === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportUseReferenceXObject: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Is redact mode</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportIsRedactMode === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportIsRedactMode: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Single page sheets</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportSinglePageSheets === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportSinglePageSheets: v.target.checked })}
            />
          </div>
        </div>
        <h2>Initial View
        </h2>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Resize window to initial page</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportResizeWindowToInitialPage === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportResizeWindowToInitialPage: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Center window</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportCenterWindow === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportCenterWindow: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Open in full screen mode</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportOpenInFullScreenMode === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportOpenInFullScreenMode: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Display PDF Document title</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportDisplayPDFDocumentTitle !== false}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportDisplayPDFDocumentTitle: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Hide viewer menu bar</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportHideViewerMenubar === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportHideViewerMenubar: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Hide viewer toolbar</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportHideViewerToolbar === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportHideViewerToolbar: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Hide viewer window controls</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportHideViewerWindowControls === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportHideViewerWindowControls: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Use transition effects</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportUseTransitionEffects !== false}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportUseTransitionEffects: v.target.checked })}
            />
          </div>
        </div>
        <h2>Links
        </h2>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Open bookmark levels</label>
            <input
              type='number'
              placeholder='-1'
              value={entity.libreOffice?.pdfExportOpenBookmarkLevels}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportOpenBookmarkLevels: v.target.valueAsNumber })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Export bookmarks to PDF destination</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportExportBookmarksToPDFDestination === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportExportBookmarksToPDFDestination: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Convert OOo target to PDF target</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportConvertOOoTargetToPDFTarget === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportConvertOOoTargetToPDFTarget: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Export links relative Fsys</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportExportLinksRelativeFsys === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportExportLinksRelativeFsys: v.target.checked })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>PDF view selection</label>
            <select
              value={entity.libreOffice?.pdfExportPDFViewSelection == null ? '0' : entity.libreOffice.pdfExportPDFViewSelection}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportPDFViewSelection: parseInt(v.target.value) })}
            >
              <option value='0'>All the links external to the document treated as URI</option>
              <option value='1'>Viewed through a PDF reader application only</option>
              <option value='2'>Viewed through an Internet browser</option>
            </select>
          </div>
        </div>

        <h2>Security
        </h2>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Encrypt file</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportEncryptFile === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportEncryptFile: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Document open password</label>
            <input
              type='password'
              value={entity.libreOffice?.pdfExportDocumentOpenPassword}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportDocumentOpenPassword: v.target.value })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Restrict permissions</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportRestrictPermissions === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportRestrictPermissions: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Permissions password</label>
            <input
              type='password'
              value={entity.libreOffice?.pdfExportPermissionPassword}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportPermissionPassword: v.target.value })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Printing</label>
            <select
              value={entity.libreOffice?.pdfExportPrinting == null ? '2' : entity.libreOffice.pdfExportPrinting}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportPrinting: parseInt(v.target.value) })}
            >
              <option value='0'>The document cannot be printed</option>
              <option value='1'>The document can be printed at low resolution only</option>
              <option value='2'>The document can be printed at maximum resolution</option>
            </select>
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Changes</label>
            <select
              value={entity.libreOffice?.pdfExportChanges == null ? '4' : entity.libreOffice.pdfExportChanges}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportChanges: parseInt(v.target.value) })}
            >
              <option value='0'>The document cannot be changed</option>
              <option value='1'>Inserting deleting and rotating pages is allowed</option>
              <option value='2'>Filling of form field is allowed</option>
              <option value='3'>Both filling of form field and commenting is allowed</option>
              <option value='4'>All the changes of the previous selections are permitted</option>
            </select>
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Enable copying of content</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportEnableCopyingOfContent !== false}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportEnableCopyingOfContent: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Enable text access for accessibility tools</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportEnableTextAccessForAccessibilityTools !== false}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportEnableTextAccessForAccessibilityTools: v.target.checked })}
            />
          </div>
        </div>
        <h2>Digital signature
        </h2>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Sign PDF</label>
            <input
              type='checkbox'
              checked={entity.libreOffice && entity.libreOffice.pdfExportSignPDF === true}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportSignPDF: v.target.checked })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Signature location</label>
            <input
              type='text'
              value={entity.libreOffice?.pdfExportSignatureLocation}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportSignatureLocation: v.target.value })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Signature reason</label>
            <input
              type='text'
              value={entity.libreOffice?.pdfExportSignatureReason}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportSignatureReason: v.target.value })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Signature contact info</label>
            <input
              type='text'
              value={entity.libreOffice?.pdfExportSignatureContactInfo}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportSignatureContactInfo: v.target.value })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Signature password</label>
            <input
              type='password'
              value={entity.libreOffice?.pdfExportSignaturePassword}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportSignaturePassword: v.target.value })}
            />
          </div>
          <div className={styles.column + ' form-group'}>
            <label>Signature certificate subject name</label>
            <input
              type='text'
              value={entity.libreOffice?.pdfExportSignCertificateSubjectName}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportSignCertificateSubjectName: v.target.value })}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column + ' form-group'}>
            <label>Signature timestamp</label>
            <input
              type='text'
              value={entity.libreOffice?.pdfExportSignatureTSA}
              onChange={(v) => this.changeLibreOffice(this.props, { pdfExportSignatureTSA: v.target.value })}
            />
          </div>
        </div>
      </div>
    )
  }
}

export default LibreOfficePdfExportOptionsEditor
