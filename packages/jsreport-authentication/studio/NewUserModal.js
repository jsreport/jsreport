import React, { Component } from 'react'
import Studio from 'jsreport-studio'

class NewUserModal extends Component {
  constructor () {
    super()

    this.usernameRef = React.createRef()
    this.password1Ref = React.createRef()
    this.password2Ref = React.createRef()

    this.state = {}
  }

  componentDidMount () {
    setTimeout(() => this.usernameRef.current.focus(), 0)
  }

  handleKeyPress (e) {
    if (e.key === 'Enter') {
      this.createUser()
    }
  }

  async createUser () {
    let entity = {}

    if (this.props.options.defaults != null) {
      entity = Object.assign(entity, this.props.options.defaults)
    }

    if (!this.usernameRef.current.value) {
      return this.setState({ userNameError: true })
    }

    if (!this.password1Ref.current.value) {
      return this.setState({ passwordError: true })
    }

    entity.name = this.usernameRef.current.value
    entity.password = this.password1Ref.current.value

    try {
      const response = await Studio.api.post('/odata/users', {
        data: entity
      })

      response.__entitySet = 'users'

      Studio.addExistingEntity(response)

      if (this.props.options.onNewEntity) {
        this.props.options.onNewEntity(response)
      }

      this.props.close()
    } catch (e) {
      this.setState({ apiError: e.message })
    }
  }

  validatePassword () {
    this.setState(
      {
        passwordError: this.password2Ref.current.value && this.password2Ref.current.value !== this.password1Ref.current.value,
        apiError: null
      })
  }

  validateUsername () {
    this.setState(
      {
        userNameError: this.usernameRef.current.value === '',
        apiError: null
      })
  }

  render () {
    return (
      <div>
        <div className='form-group'>
          <label>New user</label>
        </div>
        <div className='form-group'>
          <label>username</label>
          <input type='text' ref={this.usernameRef} onChange={() => this.validateUsername()} onKeyPress={(e) => this.handleKeyPress(e)} />
        </div>
        <div className='form-group'>
          <label>password</label>
          <input type='password' autoComplete='off' ref={this.password1Ref} />
        </div>
        <div className='form-group'>
          <label>password verification</label>
          <input type='password' autoComplete='off' ref={this.password2Ref} onChange={() => this.validatePassword()} />
        </div>
        <div className='form-group'>
          <span style={{ color: 'red', display: this.state.passwordError ? 'block' : 'none' }}>password doesn't match</span>
          <span
            style={{ color: 'red', display: this.state.userNameError ? 'block' : 'none' }}
          >username must be filled
          </span>
          <span style={{ color: 'red', display: this.state.apiError ? 'block' : 'none' }}>{this.state.apiError}</span>
        </div>
        <div className='button-bar'>
          <button className='button confirmation' onClick={() => this.createUser()}>ok</button>
        </div>
      </div>
    )
  }
}

export default NewUserModal
