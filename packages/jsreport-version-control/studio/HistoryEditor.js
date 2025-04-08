import React, { Component } from 'react'
import Studio from 'jsreport-studio'
import ChangesTable from './ChangesTable.js'
import style from './VersionControl.css'

export default class HistoryEditor extends Component {
  constructor () {
    super()
    this.state = { history: [], inExecution: false }
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
      const res = await Studio.api.get('/api/version-control/history')
      this.setState({ history: res })
    } catch (e) {
      alert(e)
    } finally {
      this.fetchRequested = false
    }
  }

  async checkout (id) {
    if (this.state.inExecution) {
      return
    }

    try {
      this.setState({ inExecution: true })

      const localChanges = await Studio.api.get('/api/version-control/local-changes')

      if (localChanges.length > 0) {
        this.setState({ inExecution: false })
        return this.setState({ error: 'You have uncommitted changes. You need to commit or revert them before checkout.' })
      }

      if (confirm('This will change the state of all entities to the state stored with selected commit. Are you sure?')) {
        await Studio.api.post('/api/version-control/checkout', {
          data: {
            _id: id
          }
        })

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

  async selectCommit (c) {
    this.setState({ commit: c })

    try {
      const res = await Studio.api.get(`/api/version-control/diff/${c._id}`)
      this.setState({ diff: res })
    } catch (e) {
      alert(e)
    }
  }

  renderCommit (commit) {
    return (
      <div>
        <h2><i className='fa fa-info-circle' /> {commit.message}</h2>
        <div>
          <small>{commit.date.toLocaleString()}</small>
          <button className='button danger' disabled={this.state.inExecution} onClick={() => this.checkout(commit._id)}>Checkout</button>
          <span style={{ color: 'red', marginTop: '0.5rem', display: this.state.error ? 'block' : 'none' }}>{this.state.error}</span>
        </div>
      </div>
    )
  }

  localChanges () {
    Studio.openTab({ key: 'versionControlLocalChanges', editorComponentKey: 'versionControlLocalChanges', title: 'Uncommitted changes' })
  }

  async clearAllCommits () {
    if (window.confirm('This will permanently delete all commits. Are you sure you want to perform this action?')) {
      try {
        const res = await Studio.api.get('/odata/versions')
        await Promise.all(res.value.map(v => Studio.api.del(`/odata/versions('${v._id}')`)))
        this.load()
      } catch (e) {
        alert(e)
      }
    }
  }

  render () {
    return (
      <div className='block custom-editor'>
        <h2>
          <i className='fa fa-history' /> Commits history
          <button className='button confirmation' onClick={() => this.localChanges()}>Uncommitted changes</button>
          <button className='button danger' onClick={() => this.clearAllCommits()}>Clear all commits</button>
        </h2>
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          {this.state.history.length > 0 ? 'Select a commit from the list to inspect the changes..' : ''}
        </div>
        <div className={style.listContainer + ' block-item'}>
          <table className='table'>
            <thead>
              <tr>
                <th>date</th>
                <th>message</th>
              </tr>
            </thead>
            <tbody>
              {this.state.history.map((h) => (
                <tr key={h._id} onClick={() => this.selectCommit(h)}>
                  <td>{h.date.toLocaleString()}</td>
                  <td>{h.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          {this.state.commit ? this.renderCommit(this.state.commit) : null}
        </div>
        <div className={style.listContainer + ' block-item'}>
          {this.state.diff ? <ChangesTable changes={this.state.diff} /> : ''}
        </div>
      </div>
    )
  }
}
