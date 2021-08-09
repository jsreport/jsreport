import React, { Component } from 'react'
import fileSaver from 'filesaver.js-npm'

const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
  const byteCharacters = atob(b64Data)
  const byteArrays = []

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize)

    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)

    byteArrays.push(byteArray)
  }

  const blob = new Blob(byteArrays, { type: contentType })
  return blob
}

export default class DownloadBigFileModal extends Component {
  download () {
    const blob = b64toBlob(this.props.options.change.patch, this.props.options.change.contentMimeType)
    const nameParts = this.props.options.change.name.split('.')
    let nameExtension

    if (nameParts.length > 1) {
      nameExtension = nameParts.slice(-1)[0]
    }

    let filename = ''

    if (nameExtension != null && nameExtension === this.props.options.change.contentFileExtension) {
      filename = this.props.options.change.name
    } else {
      filename = `${this.props.options.change.name}.${this.props.options.change.contentFileExtension}`
    }

    fileSaver.saveAs(blob, filename)
  }

  renderDownload () {
    return (
      <div>
        <p>The version control doesn't diff big or binary files. Please download it to see its content</p>
        <div className='button-bar'>
          <button className='button confirmation' onClick={() => this.download()}>Download</button>
        </div>
      </div>
    )
  }

  renderEmpty () {
    return (
      <div>
        <p>The new document is empty.</p>
        <div className='button-bar'>
          <button className='button confirmation' onClick={() => this.props.close()}>Ok</button>
        </div>
      </div>
    )
  }

  render () {
    const filename = this.props.options.change.path.split('/')[0]

    return (
      <div>
        <h2>{filename}</h2>
        {this.props.options.change.patch ? this.renderDownload() : this.renderEmpty()}
      </div>
    )
  }
}
