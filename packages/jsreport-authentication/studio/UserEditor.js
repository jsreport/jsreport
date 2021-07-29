import React, { Component } from 'react'
import ChangePasswordModal from './ChangePasswordModal.js'
import Studio from 'jsreport-studio'

class UserEditor extends Component {
  componentDidMount () {
    if (this.props.entity.__isNew && !this.props.entity.password) {
      Studio.openModal(ChangePasswordModal, { entity: this.props.entity })
    }
  }

  render () {
    const { entity, onUpdate } = this.props

    return (
      <div className='custom-editor'>
        <h1><i className='fa fa-user' /> {entity.name}</h1>
        <div>
          {Studio.authentication.useEditorComponents.map((c, i) => <div key={i}>{c(entity, onUpdate)}</div>)}
        </div>
      </div>
    )
  }
}

export default UserEditor
