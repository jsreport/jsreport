import React, { Component } from 'react'
import * as Constants from './constants.js'
import Studio from 'jsreport-studio'

export default class Properties extends Component {
  static title (entity, entities) {
    if (!entity.libreOffice || (!entity.libreOffice.format && !entity.libreOffice.forma) || entity.libreOffice.enabled === false) {
      return 'libre office'
    }

    return `libre office ${entity.libreOffice.format || ''} ${entity.libreOffice.print || ''}`
  }

  changeLibreOffice (props, change) {
    const { entity, onChange } = props
    const libreOffice = entity.libreOffice || {}

    onChange({
      ...entity,
      libreOffice: { ...libreOffice, ...change }
    })
  }

  openEditor () {
    Studio.openTab({
      key: this.props.entity._id + '_libreOfficePdfExportOptions',
      _id: this.props.entity._id,
      editorComponentKey: Constants.LIBREOFFICE_PDF_EXPORT_TAB_EDITOR,
      titleComponentKey: Constants.LIBREOFFICE_PDF_EXPORT_TAB_TITLE
    })
  }

  render () {
    const { entity } = this.props

    return (
      <div className='properties-section'>
        <div className='form-group'><label>Format</label>
          <input
            type='text'
            placeholder='pdf'
            value={entity.libreOffice ? entity.libreOffice.format : ''}
            onChange={(v) => this.changeLibreOffice(this.props, { format: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Print</label>
          <input
            type='text'
            placeholder='default'
            value={entity.libreOffice ? entity.libreOffice.print : ''}
            onChange={(v) => this.changeLibreOffice(this.props, { print: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>Enabled</label>
          <input
            type='checkbox'
            checked={!entity.libreOffice || entity.libreOffice.enabled !== false}
            onChange={(v) => this.changeLibreOffice(this.props, { enabled: v.target.checked })}
          />
        </div>
        <div className='form-group'>
          <label>Pdf Export Options</label>
          <button onClick={() => this.openEditor()}>Configure</button>
        </div>
      </div>
    )
  }
}
