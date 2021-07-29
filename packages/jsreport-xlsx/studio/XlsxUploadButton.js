import React, { Component } from 'react'
import Studio from 'jsreport-studio'

let _xlsxTemplateUploadButton

class XlsxUploadButton extends Component {
  constructor (props) {
    super(props)

    this.inputFileRef = React.createRef()
  }

  // we need to have global action in main_dev which is triggered when users clicks on + on images
  // this triggers invisible button in the toolbar
  static OpenUpload (forNew = true, options) {
    _xlsxTemplateUploadButton.openFileDialog(forNew, options)
  }

  componentDidMount () {
    _xlsxTemplateUploadButton = this
  }

  upload (e) {
    if (!e.target.files.length) {
      return
    }

    const xlsxDefaults = e.target.xlsxDefaults
    const uploadCallback = e.target.uploadCallback

    delete e.target.xlsxDefaults
    delete e.target.uploadCallback

    const file = e.target.files[0]
    const reader = new FileReader()

    reader.onloadend = async () => {
      this.inputFileRef.current.value = ''
      if (this.forNew) {
        if (Studio.workspaces) {
          await Studio.workspaces.save()
        }

        let xlsx = {}

        if (xlsxDefaults != null) {
          xlsx = Object.assign(xlsx, xlsxDefaults)
        }

        xlsx = Object.assign(xlsx, {
          contentRaw: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length),
          name: file.name.replace(/.xlsx$/, '')
        })

        const response = await Studio.api.post('/odata/xlsxTemplates', {
          data: xlsx
        })

        response.__entitySet = 'xlsxTemplates'

        Studio.addExistingEntity(response)
        Studio.openTab(Object.assign({}, response))
      } else {
        if (Studio.workspaces) {
          Studio.updateEntity({
            _id: this.props.tab.entity._id,
            contentRaw: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length)
          })

          await Studio.workspaces.save()
        } else {
          await Studio.api.patch(`/odata/xlsxTemplates(${this.props.tab.entity._id})`, {
            data: {
              contentRaw: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length)
            }
          })
          Studio.loadEntity(this.props.tab.entity._id, true)
        }
      }

      if (uploadCallback) {
        uploadCallback()
      }
    }

    reader.onerror = function () {
      const errMsg = 'There was an error reading the file!'

      if (uploadCallback) {
        uploadCallback(new Error(errMsg))
      }

      alert(errMsg)
    }

    reader.readAsDataURL(file)
  }

  openFileDialog (forNew, options = {}) {
    this.forNew = forNew

    if (options.defaults) {
      this.inputFileRef.current.xlsxDefaults = options.defaults
    } else {
      delete this.inputFileRef.current.xlsxDefaults
    }

    if (options.uploadCallback) {
      this.inputFileRef.current.uploadCallback = options.uploadCallback
    } else {
      delete this.inputFileRef.current.uploadCallback
    }

    this.inputFileRef.current.dispatchEvent(new MouseEvent('click', {
      view: window,
      bubbles: false,
      cancelable: true
    }))
  }

  renderUpload () {
    return (
      <input
        type='file'
        key='file'
        ref={this.inputFileRef}
        style={{ display: 'none' }}
        onChange={(e) => this.upload(e)} accept='.xlsx'
      />
    )
  }

  render () {
    return this.renderUpload(true)
  }
}

export default XlsxUploadButton
