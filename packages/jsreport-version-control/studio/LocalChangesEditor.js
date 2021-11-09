import React, { Component } from 'react'
import Studio from 'jsreport-studio'
import ChangesTable from './ChangesTable.js'
import style from './VersionControl.css'

export default class LocalChangesEditor extends Component {
  constructor (props) {
    super(props)
    this.state = { message: '', inExecution: false }
  }

  onTabActive () {
    this.load()
  }

  async load () {
    if (this.fetchRequested) {
      return
    }

    this.fetchRequested = true

    try {
      const res = await Studio.api.get('/api/version-control/local-changes')
      this.setState({ diff: res })
    } catch (e) {
      alert(e)
    } finally {
      this.fetchRequested = false
    }
  }

  async commit () {
    if (this.state.inExecution) {
      return
    }

    if (!this.state.message) {
      return this.setState({ error: 'Commit message must be filled' })
    }

    this.setState({ inExecution: true })

    try {
      await Studio.api.post('/api/version-control/commit', {
        data: {
          message: this.state.message
        }
      })
      this.setState({ message: '', error: null, inExecution: false })
      await this.load()
    } catch (e) {
      this.setState({ inExecution: false })
      alert(e)
    }
  }

  async revert () {
    if (this.state.inExecution) {
      return
    }

    this.setState({ inExecution: true })

    try {
      if (confirm('This will revert all your changes to the previous commit. In case you have no previous commit, you will loose all entities! Are you sure?')) {
        await Studio.api.post('/api/version-control/revert')
        this.setState({ inExecution: false })
        return Studio.reset().catch((e) => console.error(e))
      } else {
        this.setState({ inExecution: false })
      }
    } catch (e) {
      this.setState({ inExecution: false })
      alert(e)
    }
  }

  history () {
    Studio.openTab({ key: 'versionControlHistory', editorComponentKey: 'versionControlHistory', title: 'Commits history' })
  }

  render () {
    return (
      <div className='block custom-editor'>
        <h1>
          <i className='fa fa-history' /> uncommitted changes
          <button className='button confirmation' onClick={() => this.history()}>Commits history</button>
        </h1>
        <div className='form-group'>
          The version control is currently in beta.
        </div>
        <div className='form-group'>
          <label>Message</label>
          <input type='text' value={this.state.message} onChange={(event) => this.setState({ message: event.target.value, error: null })} />
          <span style={{ color: 'red', display: this.state.error ? 'block' : 'none' }}>{this.state.error}</span>
        </div>
        <div>
          <button className='button confirmation' disabled={this.state.inExecution} onClick={() => this.commit()}>Commit</button>
          <button className='button danger' disabled={this.state.inExecution} onClick={() => this.revert()}>Revert</button>
        </div>
        <div className={style.listContainer + ' block-item'}>
          {this.state.diff ? <ChangesTable changes={this.state.diff} /> : ''}
        </div>
      </div>
    )
  }
}
