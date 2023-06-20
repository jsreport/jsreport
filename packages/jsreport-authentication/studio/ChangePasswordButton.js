import React, { Component } from 'react'
import ChangePasswordModal from './ChangePasswordModal.js'
import Studio from 'jsreport-studio'

class ChangePasswordButton extends Component {
  render () {
    if (
      !this.props.tab ||
      !this.props.tab.entity ||
      this.props.tab.entity.__entitySet !== 'users' ||
      // display change password always for super admin,
      // and only if the current admin user opens its own user or a normal non-admin user
      (
        Studio.authentication.isUserAdmin(this.props.tab.entity) &&
        (Studio.authentication.user.isGroup ||
        this.props.tab.entity.name !== Studio.authentication.user.name) &&
        !Studio.authentication.user.isSuperAdmin
      )
    ) {
      return <span />
    }

    return (
      <div>
        <div
          className='toolbar-button'
          onClick={(e) => Studio.openModal(ChangePasswordModal, { entity: this.props.tab.entity })}
        >
          <i className='fa fa-key' />Change Password
        </div>
      </div>
    )
  }
}

export default ChangePasswordButton
