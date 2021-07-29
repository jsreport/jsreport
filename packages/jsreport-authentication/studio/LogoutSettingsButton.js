import React, { Component } from 'react'
import Studio from 'jsreport-studio'

class LogoutSettingsButton extends Component {
  constructor (props) {
    super(props)

    this.logoutRef = React.createRef()
  }

  render () {
    return (
      <div>
        <div
          onClick={() => {
            this.logoutRef.current.click()
            this.props.closeMenu()
          }}
          style={{ cursor: 'pointer' }}
        >
          <form method='POST' action={Studio.resolveUrl('/logout')}>
            <input ref={this.logoutRef} type='submit' id='logoutBtn' style={{ display: 'none' }} />
          </form>
          <i className='fa fa-power-off' />Logout
        </div>
      </div>
    )
  }
}

export default LogoutSettingsButton
