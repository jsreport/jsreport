import React, { Component } from 'react'
import Studio from 'jsreport-studio'

let _fileUploadButton

class AssetUploadButton extends Component {
  constructor (props) {
    super(props)

    this.inputFileRef = React.createRef()
  }

  // we need to have global action in main_dev which is triggered when users clicks on + on images
  // this triggers invisible button in the toolbar
  static OpenUpload (opts) {
    _fileUploadButton.openFileDialog('edit', undefined, opts)
  }

  static OpenUploadNew (defaults, opts) {
    _fileUploadButton.openFileDialog('new', defaults, opts)
  }

  componentDidMount () {
    _fileUploadButton = this
  }

  upload (e) {
    if (!e.target.files.length) {
      return
    }

    const assetDefaults = e.target.assetDefaults
    const targetAsset = e.target.targetAsset
    const activateNewTab = e.target.activateNewTab
    const onNewEntityCallback = e.target.onNewEntityCallback
    const uploadCallback = e.target.uploadCallback

    delete e.target.assetDefaults
    delete e.target.targetAsset
    delete e.target.uploadCallback

    const file = e.target.files[0]
    const reader = new FileReader()

    reader.onloadend = async () => {
      this.inputFileRef.current.value = ''

      if (this.type === 'new') {
        if (Studio.workspaces) {
          await Studio.workspaces.save()
        }

        let asset = {}

        if (assetDefaults != null) {
          asset = Object.assign(asset, assetDefaults)
        }

        asset = Object.assign(asset, {
          content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length),
          name: file.name
        })

        const response = await Studio.api.post('/odata/assets', {
          data: asset
        })

        response.__entitySet = 'assets'

        Studio.addExistingEntity(response)
        Studio.openTab(Object.assign({}, response), activateNewTab)

        if (onNewEntityCallback) {
          onNewEntityCallback(response)
        }
      }

      if (this.type === 'edit') {
        if (Studio.workspaces) {
          Studio.updateEntity({
            name: targetAsset.name,
            content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length)
          })

          await Studio.workspaces.save()
        } else {
          await Studio.api.patch(`/odata/assets(${targetAsset._id})`, {
            data: {
              content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length),
              link: null
            }
          })
          Studio.loadEntity(targetAsset._id, true)
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

  openFileDialog (type, defaults, opts = {}) {
    const targetAssetIdAndName = opts.targetAsset

    this.type = type

    if (opts.activateNewTab != null) {
      this.inputFileRef.current.activateNewTab = opts.activateNewTab
    } else {
      delete this.inputFileRef.current.activateNewTab
    }

    if (defaults) {
      this.inputFileRef.current.assetDefaults = defaults
    } else {
      delete this.inputFileRef.current.assetDefaults
    }

    if (targetAssetIdAndName) {
      this.inputFileRef.current.targetAsset = targetAssetIdAndName
    } else if (type !== 'new') {
      this.inputFileRef.current.targetAsset = {
        _id: this.props.tab.entity._id,
        name: this.props.tab.entity.name
      }
    }

    if (opts.onNewEntityCallback) {
      this.inputFileRef.current.onNewEntityCallback = opts.onNewEntityCallback
    } else {
      delete this.inputFileRef.current.onNewEntityCallback
    }

    if (opts.uploadCallback) {
      this.inputFileRef.current.uploadCallback = opts.uploadCallback
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
        onChange={(e) => this.upload(e)}
      />
    )
  }

  render () {
    return this.renderUpload(true)
  }
}

export default AssetUploadButton
