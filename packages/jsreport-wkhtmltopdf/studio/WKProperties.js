import * as Constants from './constants.js'
import React, { Component } from 'react'
import Studio from 'jsreport-studio'

export default class Properties extends Component {
  openHeaderFooter (type) {
    Studio.openTab({
      key: this.props.entity._id + '_wk' + type,
      _id: this.props.entity._id,
      headerOrFooter: type,
      editorComponentKey: Constants.WK_TAB_EDITOR,
      titleComponentKey: Constants.WK_TAB_TITLE
    })
  }

  render () {
    const { entity, onChange } = this.props
    const wkhtmltopdf = entity.wkhtmltopdf || {}

    const changeWK = (change) => onChange(Object.assign({}, entity, { wkhtmltopdf: Object.assign({}, entity.wkhtmltopdf, change) }))

    const wkhtmltopdfVersions = Studio.extensions.wkhtmltopdf.options.wkhtmltopdfVersions

    return (
      <div className='properties-section'>
        <div className='form-group'><label>wkhtmltopdf version</label>
          <select value={wkhtmltopdf.wkhtmltopdfVersion || wkhtmltopdfVersions[0].version} onChange={(v) => changeWK({ wkhtmltopdfVersion: v.target.value })}>
            {wkhtmltopdfVersions.map((p) => <option key={p.version} value={p.version}>{p.version}</option>)}
          </select>
        </div>
        <div className='form-group'><label>Metadata - title</label>
          <input
            type='text' placeholder='document title' value={wkhtmltopdf.title || ''}
            onChange={(v) => changeWK({ title: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Paper size</label>
          <select value={wkhtmltopdf.pageSize || ''} onChange={(v) => changeWK({ pageSize: v.target.value })}>
            <option key='A4' value='A4'>A4</option>
            <option key='A3' value='A3'>A3</option>
            <option key='A5' value='A5'>A5</option>
            <option key='Legal' value='Legal'>Legal</option>
            <option key='Letter' value='Letter'>Letter</option>
            <option key='Tabloid' value='Tabloid'>Tabloid</option>
          </select>
        </div>
        <div className='form-group'><label>Page width</label>
          <input
            type='text' placeholder='600px' value={wkhtmltopdf.pageWidth || ''}
            onChange={(v) => changeWK({ pageWidth: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Page height</label>
          <input
            type='text' placeholder='600px' value={wkhtmltopdf.pageHeight || ''}
            onChange={(v) => changeWK({ pageHeight: v.target.value })}
          />
        </div>
        <div key='foo' className='form-group'><label>Orientation</label>
          <select value={wkhtmltopdf.orientation || ''} onChange={(v) => changeWK({ orientation: v.target.value })}>
            <option key='portrait' value='portrait'>Portrait</option>
            <option key='landscape' value='landscape'>Landscape</option>
          </select>
        </div>
        <div className='form-group'><label>Dpi</label>
          <input
            type='text' placeholder='96' value={wkhtmltopdf.dpi || ''}
            onChange={(v) => changeWK({ dpi: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Margin bottom</label>
          <input
            type='text' placeholder='10mm' value={wkhtmltopdf.marginBottom || ''}
            onChange={(v) => changeWK({ marginBottom: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Margin left</label>
          <input
            type='text' placeholder='10mm' value={wkhtmltopdf.marginLeft || ''}
            onChange={(v) => changeWK({ marginLeft: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Margin right</label>
          <input
            type='text' placeholder='10mm' value={wkhtmltopdf.marginRight || ''}
            onChange={(v) => changeWK({ marginRight: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Margin top</label>
          <input
            type='text' placeholder='10mm' value={wkhtmltopdf.marginTop || ''}
            onChange={(v) => changeWK({ marginTop: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Header height in mm</label>
          <input
            type='text' placeholder='10' value={wkhtmltopdf.headerHeight || ''}
            onChange={(v) => changeWK({ headerHeight: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>Header</label>
          <button onClick={() => this.openHeaderFooter('header')}>open in tab...</button>
        </div>
        <div className='form-group'><label>Footer height in mm</label>
          <input
            type='text' placeholder='10' value={wkhtmltopdf.footerHeight || ''}
            onChange={(v) => changeWK({ footerHeight: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>Footer</label>
          <button onClick={() => this.openHeaderFooter('footer')}>open in tab...</button>
        </div>
        <div className='form-group'>
          <label>Cover Page</label>
          <button onClick={() => this.openHeaderFooter('cover')}>open in tab...</button>
        </div>
        <div className='form-group'>
          <label>Table of contents</label>
          <input
            type='checkbox' checked={wkhtmltopdf.toc === true}
            onChange={(v) => changeWK({ toc: v.target.checked })}
          />
        </div>
        <div className='form-group'><label>TOC header text</label>
          <input
            type='text' value={wkhtmltopdf.tocHeaderText || ''}
            onChange={(v) => changeWK({ tocHeaderText: v.target.value })}
          />
        </div>
        <div className='form-group'><label>TOC text size shrink</label>
          <input
            type='text' placeholder='10mm' value={wkhtmltopdf.tocTextSizeShrink || ''}
            onChange={(v) => changeWK({ tocTextSizeShrink: v.target.value })}
          />
        </div>
        <div className='form-group'><label>TOC level indentation</label>
          <input
            type='text' placeholder='10mm' value={wkhtmltopdf.tocLevelIndentation || ''}
            onChange={(v) => changeWK({ tocLevelIndentation: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Keep relative links</label>
          <input
            type='checkbox' checked={wkhtmltopdf.keepRelativeLinks === true}
            onChange={(v) => changeWK({ keepRelativeLinks: v.target.checked })}
          />
        </div>
        <div className='form-group'><label>Disable smart shrinking</label>
          <input
            type='checkbox' checked={wkhtmltopdf.disableSmartShrinking === true}
            onChange={(v) => changeWK({ disableSmartShrinking: v.target.checked })}
          />
        </div>
        <div className='form-group'><label>Print media type</label>
          <input
            type='checkbox' checked={wkhtmltopdf.printMediaType === true}
            onChange={(v) => changeWK({ printMediaType: v.target.checked })}
          />
        </div>
        <div className='form-group'><label>Javascript Delay</label>
          <input
            type='text' placeholder='200' value={wkhtmltopdf.javascriptDelay || ''}
            onChange={(v) => changeWK({ javascriptDelay: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Window Status</label>
          <input
            type='text' value={wkhtmltopdf.windowStatus || ''}
            onChange={(v) => changeWK({ windowStatus: v.target.value })}
          />
        </div>
      </div>
    )
  }
}
