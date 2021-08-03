import React, { Component } from 'react'
import Studio from 'jsreport-studio'
import Style from './ShareModal.css'

class ShareModal extends Component {
  constructor (props) {
    super(props)

    this.state = { entity: props.options.entity }
  }

  async generateLink (method) {
    const response = await Studio.api.post(`/api/templates/sharing/${this.props.options.entity.shortid}/access/${method}`, {})
    const entity = this.state.entity
    const tokenProperty = method + 'SharingToken'
    const updated = {
      ...entity,
      [tokenProperty]: response.token
    }
    Studio.updateEntity(updated)
    this.setState({ entity: updated })
  }

  async removeLink () {
    Studio.updateEntity({ _id: this.state.entity._id, readSharingToken: null })
    Studio.saveEntity(this.state.entity._id)
    this.setState({ entity: { ...this.state.entity, readSharingToken: null } })
  }

  render () {
    const { entity } = this.state

    return (
      <div>
        <h2>Link with read permissions</h2>
        {entity.readSharingToken
          ? (
            <div>
              <a target='_blank' rel='noreferrer' href={Studio.rootUrl + `/public-templates?access_token=${entity.readSharingToken}`}>
                {Studio.rootUrl + `/public-templates?access_token=${entity.readSharingToken}`}
              </a>
            </div>
            )
          : (
            <div>
              <button type='button' className='button confirmation' onClick={() => this.generateLink('read')}>Generate Read Link
              </button>
            </div>
            )}
        <div className={Style.infoBox}>
          When requesting this link, jsreport will skip the authentication and authorization and render this
          particular template. User will be also able to execute
          any of the jsreport recipes from the served page but won't be allowed to access any of the existing
          templates or other entities.
        </div>

        <div className='button-bar'>
          <button className='button confirmation' onClick={() => this.props.close()}>ok</button>
          {entity.readSharingToken ? <button className='button danger' onClick={() => this.removeLink()}>Remove</button> : <span />}
        </div>
      </div>
    )
  }
}

export default ShareModal
