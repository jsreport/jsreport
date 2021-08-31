import React, { Component } from 'react'
import { connect } from 'react-redux'
import api from '../../helpers/api'
import resolveUrl from '../../helpers/resolveUrl'
import openProfileFromStreamReader from '../../helpers/openProfileFromStreamReader'
import storeMethods from '../../redux/methods'
import { actions as settingsActions } from '../../redux/settings'
import moment from 'moment'

class Profiler extends Component {
  constructor () {
    super()
    this.state = { profiles: [], fullProfilingEnabled: false }
  }

  componentDidMount () {
    this.loadProfiles()
    this._interval = setInterval(() => this.loadProfiles(), 5000)

    const fullProfilerRunning = storeMethods.getSettingsByKey('fullProfilerRunning', false)
    this.setState({
      fullProfilingEnabled: fullProfilerRunning != null ? fullProfilerRunning : false
    })
  }

  async loadProfiles () {
    const response = await api.get('/odata/profiles?$top=1000&$orderby=timestamp desc')
    this.setState({
      profiles: response.value.map(p => {
        let template = storeMethods.getEntityByShortid(p.templateShortid, false)

        if (!template) {
          template = { name: 'anonymous', path: 'anonymous' }
        } else {
          template = { ...template, path: storeMethods.resolveEntityPath(template) }
        }

        return {
          ...p,
          template
        }
      })
    })
  }

  componentWillUnmount () {
    clearInterval(this._interval)
  }

  stateStyle (state) {
    const style = {
      fontSize: '0.8rem',
      padding: '0.3rem',
      display: 'inline-block',
      textAlign: 'center',
      minWidth: '4rem',
      color: 'white'
    }

    if (state === 'success') {
      style.backgroundColor = '#4CAF50'
    }

    if (state === 'error') {
      style.backgroundColor = '#da532c'
    }

    if (state === 'running') {
      style.backgroundColor = '#007acc'
    }

    return style
  }

  renderProfiles (profiles) {
    const { openTab } = this.props

    return (
      <div>
        <div>
          <table className='table' style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>template</th>
                <th>started</th>
                <th>state</th>
              </tr>
            </thead>
            <tbody>
              {(profiles).map((p, k) => (
                <tr key={k} onClick={() => this.openProfile(p)}>
                  <td className='selection'>
                    <a style={{ textDecoration: 'underline' }} onClick={() => p.template._id ? openTab({ _id: p.template._id }) : null}>
                      {p.template.path}
                    </a>
                  </td>
                  <td>{
                    (new Date().getTime() - new Date(p.timestamp).getTime()) > (1000 * 60 * 60 * 24)
                      ? new Date(p.timestamp).toLocaleString()
                      : moment.duration(moment(new Date()).diff(moment(new Date(p.timestamp)))).humanize() + ' ago'
                      }
                  </td>
                  <td><span style={this.stateStyle(p.state)}>{p.state}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  async openProfile (p) {
    try {
      await openProfileFromStreamReader(async () => {
        const getBlobUrl = resolveUrl(`/api/profile/${p._id}/events`)

        const response = await window.fetch(getBlobUrl, {
          method: 'GET',
          cache: 'no-cache'
        })

        if (response.status !== 200) {
          throw new Error(`Got not ok response, status: ${response.status}`)
        }

        return response.body.getReader()
      }, {
        name: p.template.name,
        shortid: p.template.shortid
      })
    } catch (e) {
      const newError = new Error(`Open profile "${p._id}" failed. ${e.message}`)

      newError.stack = e.stack
      Object.assign(newError, e)

      throw newError
    }
  }

  startFullRequestProfiling () {
    this.props.update('fullProfilerRunning', true)
    this.setState({
      fullProfilingEnabled: true
    })
  }

  stopFullRequestProfiling () {
    this.props.update('fullProfilerRunning', false)
    this.setState({
      fullProfilingEnabled: false
    })
  }

  render () {
    return (
      <div className='block custom-editor' style={{ overflow: 'auto', minHeight: 0, height: 'auto' }}>
        <div>
          <h2><i className='fa fa-spinner fa-spin fa-fw' /> profiling</h2>
          <small>
            Profiler now automatically pops up running requests. You can select "Full profiling" to collect additional information like input data and the output report. Note this slightly degrades the request performance and should not be enabled in production permanently.
          </small>
          <div style={{ paddingTop: '0.8rem' }}>
            <label>
              <input
                type='radio'
                checked={!this.state.fullProfilingEnabled}
                onChange={(ev) => {
                  ev.target.checked && this.stopFullRequestProfiling()
                }}
              />
              <span>Standard profiling</span>
            </label>
            <label style={{ paddingLeft: '1rem' }}>
              <input
                type='radio'
                checked={this.state.fullProfilingEnabled}
                onChange={(ev) => {
                  ev.target.checked && this.startFullRequestProfiling()
                }}
              />
              <span>Full profiling</span>
            </label>
          </div>
        </div>
        {this.renderProfiles(this.state.profiles)}
      </div>
    )
  }
}

export default connect(
  undefined,
  { ...settingsActions },
  undefined,
  { forwardRef: true }
)(Profiler)
