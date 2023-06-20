import React, { Component } from 'react'
import Studio from 'jsreport-studio'

class ChangePasswordModal extends Component {
  constructor (props) {
    super(props)

    this.oldPasswordRef = React.createRef()
    this.newPassword1Ref = React.createRef()
    this.newPassword2Ref = React.createRef()

    this.state = {}
  }

  async changePassword () {
    const { entity } = this.props.options
    const { close } = this.props

    try {
      const data = {
        newPassword: this.newPassword1Ref.current.value
      }

      if (this.needsOldPassword(entity)) {
        data.oldPassword = this.oldPasswordRef.current.value
      }

      await Studio.api.post(`/api/users/${entity.shortid}/password`, { data: data })
      this.newPassword1Ref.current.value = ''
      this.newPassword2Ref.current.value = ''
      close()
    } catch (e) {
      this.setState({ apiError: e.message })
    }
  }

  validatePassword () {
    this.setState(
      {
        passwordError: this.newPassword2Ref.current.value && this.newPassword2Ref.current.value !== this.newPassword1Ref.current.value,
        apiError: null
      })
  }

  needsOldPassword (entity) {
    let needsOldPassword = true

    if (Studio.authentication.isUserAdmin(Studio.authentication.user)) {
      needsOldPassword = Studio.authentication.user.isGroup ? false : entity.name === Studio.authentication.user.name
    }

    return needsOldPassword
  }

  render () {
    const { entity } = this.props.options

    return (
      <div>
        {this.needsOldPassword(entity)
          ? <div className='form-group'><label>old password</label><input type='password' autoComplete='off' ref={this.oldPasswordRef} /></div>
          : ''}
        <div className='form-group'>
          <label>new password</label>
          <input type='password' autoComplete='off' ref={this.newPassword1Ref} />
        </div>
        <div className='form-group'>
          <label>new password verification</label>
          <input type='password' autoComplete='off' ref={this.newPassword2Ref} onChange={() => this.validatePassword()} />
        </div>
        <div className='form-group'>
          <span style={{ color: 'red', display: this.state.passwordError ? 'block' : 'none' }}>password doesn't match</span>
          <span style={{ color: 'red', display: this.state.apiError ? 'block' : 'none' }}>{this.state.apiError}</span>
        </div>
        <div className='button-bar'>
          <button className='button confirmation' onClick={() => this.changePassword()}>ok</button>
        </div>
      </div>
    )
  }
}

export default ChangePasswordModal
