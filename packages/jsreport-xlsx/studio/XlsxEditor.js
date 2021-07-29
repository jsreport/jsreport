import React, { Component } from 'react'
import b64toBlob from './b64toBlob.js'
import XlsxUploadButton from './XlsxUploadButton.js'
import fileSaver from 'filesaver.js-npm'

class XlsxEditor extends Component {
  download () {
    const blob = b64toBlob(this.props.entity.contentRaw, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    fileSaver.saveAs(blob, this.props.entity.name)
  }

  render () {
    const { entity } = this.props

    return (
      <div className='custom-editor'>
        <div><h1><i className='fa fa-file-excel-o' /> {entity.name}</h1></div>
        <div>
          <button className='button confirmation' onClick={() => this.download()}>
            <i className='fa fa-download' /> Download xlsx template
          </button>
          <button className='button confirmation' onClick={() => XlsxUploadButton.OpenUpload(false)}>
            <i className='fa fa-upload' /> Upload (edit) xlsx template
          </button>
        </div>
      </div>
    )
  }
}

export default XlsxEditor
