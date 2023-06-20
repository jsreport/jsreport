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
    const userIcon = Studio.resolveEntityTreeIconStyle(entity)
    const isAdmin = Studio.authentication.isUserAdmin(entity)

    return (
      <div className='custom-editor'>
        <h1><i className={`fa ${userIcon}`} /> {entity.name}</h1>
        {isAdmin && (
          <div>
            <b>Admin user</b>
          </div>
        )}
        <div>
          {Studio.authentication.useEditorComponents.map((c, i) => <div key={i}>{c(entity, onUpdate)}</div>)}
        </div>
      </div>
    )
  }
}

export default UserEditor
