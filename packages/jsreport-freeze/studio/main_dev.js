import { Component } from 'react'
import Studio from 'jsreport-studio'

class FreezeModal extends Component {
  freeze () {
    Studio.setSetting('freeze', true)
    this.props.close()
  }

  render () {
    return (
      <div>
        <h2>Freeze changes</h2>
        <p>
          The freeze mode will block accidental changes in entities like templates.<br />
          The only permitted operations in freeze mode are persisting logs and output reports.<br />
          The freeze mode can be switched back to normal using the menu command "Release freeze".
        </p>
        <div className='button-bar'>
          <button className='button confirmation' onClick={() => this.freeze()}>Freeze</button>
        </div>
      </div>
    )
  }
}

class ReleaseFreezeModal extends Component {
  release () {
    Studio.setSetting('freeze', false)
    this.props.close()
  }

  render () {
    return (
      <div>
        <h2>Release freeze</h2>
        <p>
          This will switch the editing mode to normal.
        </p>
        <div className='button-bar'>
          <button className='button confirmation' onClick={() => this.release()}>Release</button>
        </div>
      </div>
    )
  }
}

const freeze = () => {
  Studio.openModal(FreezeModal)
}

const release = () => {
  Studio.openModal(ReleaseFreezeModal)
}

Studio.initializeListeners.push(() => {
  if (Studio.authentication && !Studio.authentication.isUserAdmin(Studio.authentication.user)) {
    return
  }

  Studio.addToolbarComponent((props) => (
    Studio.getSettingValueByKey('freeze', false)
      ? <span />
      : (
        <div
          className='toolbar-button'
          onClick={() => {
            freeze()
            props.closeMenu()
          }}
        >
          <i className='fa fa-lock' />Freeze edits
        </div>
        )
  ), 'settings')

  Studio.addToolbarComponent((props) => (
    Studio.getSettingValueByKey('freeze', false)
      ? (
        <div
          className='toolbar-button'
          onClick={() => {
            release()
            props.closeMenu()
          }}
        >
          <i className='fa fa-unlock' />Release freeze
        </div>
        )
      : <span />
  ), 'settings')
})
