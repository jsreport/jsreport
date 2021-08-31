import React, { Component } from 'react'
import AssetUploadButton from './AssetUploadButton.js'
import Studio from 'jsreport-studio'

class NewAssetModal extends Component {
  constructor () {
    super()

    this.nameRef = React.createRef()
    this.linkRef = React.createRef()
    this.state = { isLink: false }
  }

  handleKeyPress (e) {
    if (e.key === 'Enter') {
      this.createAsset()
    }
  }

  // the modal component for some reason after open focuses the panel itself
  componentDidMount () {
    setTimeout(() => this.nameRef.current.focus(), 0)
  }

  async createAsset (e) {
    let entity = {}

    if (!this.state.isLink && (!this.nameRef.current.value || this.nameRef.current.value.indexOf('.')) < 0) {
      return this.setState({ error: 'name should include file extension, for example foo.js' })
    }

    if (this.props.options.defaults != null) {
      entity = Object.assign(entity, this.props.options.defaults)
    }

    if (this.state.isLink) {
      entity.link = this.linkRef.current.value
      const fragments = entity.link.split('/')
      entity.name = fragments[fragments.length - 1]
    } else {
      entity.name = this.nameRef.current.value
    }

    try {
      if (Studio.workspaces) {
        await Studio.workspaces.save()
      }

      const response = await Studio.api.post('/odata/assets', {
        data: entity
      })
      response.__entitySet = 'assets'

      Studio.addExistingEntity(response)
      Studio.openTab(response, this.props.options.activateNewTab)

      if (this.props.options.onNewEntity) {
        this.props.options.onNewEntity(response)
      }

      this.props.close()
    } catch (e) {
      this.setState({ error: e.message })
    }
  }

  render () {
    const { isLink, error } = this.state

    return (
      <div>
        {isLink
          ? (
            <div className='form-group'>
              <label>Relative or absolute path to existing file</label>
              <input
                type='text'
                name='link'
                ref={this.linkRef}
              />
            </div>
            )
          : (
            <div className='form-group'>
              <label>Name</label>
              <input
                type='text'
                name='name'
                ref={this.nameRef}
                placeholder='styles.css'
                onKeyPress={(e) => this.handleKeyPress(e)}
              />
            </div>
            )}
        {Studio.extensions.assets.options.allowAssetsLinkedToFiles !== false
          ? (
            <div className='form-group'>
              <label>link to existing file</label>
              <input
                type='checkbox' checked={isLink}
                onChange={() => this.setState({ isLink: !isLink })}
              />
            </div>
            )
          : <div />}
        <div className='form-group'>
          <span
            style={{ color: 'red', display: error ? 'block' : 'none' }}
          >{error}
          </span>
        </div>
        <div className='form-group' style={{ opacity: 0.8 }}>
          <hr />
          <span>You can use assets to embed any kind of static content into report template.<br />
            This can be for example css style, image, font, html or even javascript shared helpers. <br />See the
            <a target='_blank' rel='noreferrer' title='Help' href='http://jsreport.net/learn/assets'>documentation</a> for details.
          </span>
        </div>
        <div className='button-bar'>
          <button
            className='button confirmation'
            onClick={() => {
              this.props.close()
              AssetUploadButton.OpenUploadNew(this.props.options.defaults, {
                activateNewTab: this.props.options.activateNewTab,
                onNewEntityCallback: this.props.options.onNewEntity
              })
            }}
          >Upload
          </button>
          <button onClick={() => this.createAsset()} className='button confirmation'>Ok</button>
        </div>
      </div>
    )
  }
}

export default NewAssetModal
