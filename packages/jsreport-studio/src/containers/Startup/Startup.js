import React, { Component } from 'react'
import { connect } from 'react-redux'
import { actions } from '../../redux/editor'
import storeMethods from '../../redux/methods'
import api from '../../helpers/api'
import openProfileFromServer from '../../helpers/openProfileFromServer'
import { values as configuration } from '../../lib/configuration'
import moment from 'moment'
import humanizeReportDuration from '../../helpers/humanizeReportDuration'

class Startup extends Component {
  constructor () {
    super()
    this.state = { templates: [], profiles: [], failedProfiles: [], stats: {}, monitoring: [], loadingProfile: false }
    this.openProfile = this.openProfile.bind(this)
  }

  async onTabActive () {
    if (this._loading) {
      return
    }
    this._loading = true

    try {
      await this.loadLastModifiedTemplates()
      await this.loadLastProfiles()
      await this.loadLastFailedProfiles()
      await this.loadStats()
    } finally {
      this._loading = false
    }
  }

  async loadLastModifiedTemplates () {
    const response = await api.get('/odata/templates?$top=5&$select=name,recipe,modificationDate&$orderby=modificationDate desc')

    this.setState({
      templates: response.value.map((t) => ({
        ...t,
        path: storeMethods.resolveEntityPath(t)
      }))
    })
  }

  async loadStats () {
    const timeFrom = moment().add(-1, 'hours').toDate().toISOString()
    const successR = await api.get(`/odata/profiles/$count?$filter=state eq 'success' and timestamp gt datetimeoffset'${timeFrom}'`)
    const failedR = await api.get(`/odata/profiles/$count?$filter=state eq 'error' and timestamp gt datetimeoffset'${timeFrom}'`)

    const runningR = await api.get('/odata/profiles/$count?$filter=state eq \'running\'')
    const queuedR = await api.get('/odata/profiles/$count?$filter=state eq \'queued\'')
    const templatesR = await api.get('/odata/templates/$count')

    this.setState({
      stats: {
        succesInHour: successR.value,
        failedInHour: failedR.value,
        running: runningR.value,
        queued: queuedR.value,
        templates: templatesR.value
      }
    })
  }

  async loadLastProfiles () {
    const response = await api.get('/odata/profiles?$top=5&$orderby=timestamp desc')

    this.setState({
      profiles: response.value.map(p => {
        let template = storeMethods.getEntityByShortid(p.templateShortid, false)

        if (!template) {
          template = { name: 'anonymous', shortid: null, path: 'anonymous' }
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

  async loadLastFailedProfiles () {
    const response = await api.get('/odata/profiles?$top=5&$orderby=timestamp desc&$filter=state eq \'error\'')

    this.setState({
      failedProfiles: response.value.map(p => {
        let template = storeMethods.getEntityByShortid(p.templateShortid, false)

        if (!template) {
          template = { name: 'anonymous', shortid: null, path: 'anonymous' }
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

  shouldComponentUpdate (props) {
    return props.activeTabKey === 'StartupPage'
  }

  async openProfile (p) {
    this.setState({
      loadingProfile: true
    })

    try {
      await openProfileFromServer(p)
    } catch (e) {
      console.warn(`Error while trying to open profile "${p._id}"`, e)
    } finally {
      this.setState({
        loadingProfile: false
      })
    }
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

  renderLastRequests (profiles) {
    const { loadingProfile } = this.state
    const { openTab } = this.props

    return (
      <div>
        <h2>Last requests
          <button className='button confirmation' onClick={() => openTab({ key: 'ProfilerPage', editorComponentKey: 'profiler', title: 'Profiler' })}><i className='fa fa-play' /> open profiler</button>
          <i className='fa fa-circle-o-notch fa-spin' style={{ marginLeft: '0.5rem', display: loadingProfile ? 'inline-block' : 'none' }} />
        </h2>

        <div>
          <table className='table'>
            <thead>
              <tr>
                <th>template</th>
                <th>started</th>
                <th>duration</th>
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
                  <td title={new Date(p.timestamp).toLocaleString()}>{moment.duration(moment(new Date()).diff(moment(new Date(p.timestamp)))).humanize() + ' ago'}</td>
                  <td>{p.finishedOn ? humanizeReportDuration(p.finishedOn - p.timestamp) : ''}</td>
                  <td><span style={this.stateStyle(p.state)}>{p.state}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  renderLastFailedRequests (profiles) {
    const { loadingProfile } = this.state
    const { openTab } = this.props

    return (
      <div>
        <h2>last failed requests <i className='fa fa-circle-o-notch fa-spin' style={{ display: loadingProfile ? 'inline-block' : 'none' }} /></h2>

        <div>
          <table className='table'>
            <thead>
              <tr>
                <th>template</th>
                <th>started</th>
                <th>duration</th>
                <th>error</th>
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
                  <td title={new Date(p.timestamp).toLocaleString()}>{moment.duration(moment(new Date()).diff(moment(new Date(p.timestamp)))).humanize() + ' ago'}</td>
                  <td>{p.finishedOn ? humanizeReportDuration(p.finishedOn - p.timestamp) : ''}</td>
                  <td>{!p.error || p.error.length < 90 ? p.error : (p.error.substring(0, 80) + '...')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  renderBadges () {
    const openProfiler = (state) => {
      this.props.openTab({
        key: 'ProfilerPage',
        editorComponentKey: 'profiler',
        title: 'Profiler',
        filterState: state,
        getProps: () => ({
          key: `ProfilerPage-${state}`
        })
      })
    }

    const badgeStyle = {
      margin: '0.8rem',
      padding: '0.3rem',
      width: '8.5rem',
      cursor: 'pointer'
    }
    const valueStyle = {
      fontSize: '1.5rem',
      textAlign: 'center',
      padding: '0.3rem'
    }
    const labelStyle = {
      fontSize: '0.7rem'
    }

    return (
      <div>
        <div style={{ display: 'flex' }}>
          <button className='button confirmation' style={badgeStyle}>
            <div style={labelStyle}>
              <i className='fa fa-file' />&nbsp;templates
            </div>
            <div style={valueStyle}>
              {this.state.stats.templates}
            </div>
          </button>
          <button className='button confirmation' title='open profiler' style={badgeStyle} onClick={() => openProfiler('running')}>
            <div style={labelStyle}>
              <i className='fa fa-play' />&nbsp; running
            </div>
            <div style={valueStyle}>
              {this.state.stats.running}
            </div>
          </button>
          <button className='button confirmation' title='open profiler' style={badgeStyle} onClick={() => openProfiler('queued')}>
            <div style={labelStyle}>
              <i className='fa fa-hourglass' />&nbsp; queued
            </div>
            <div style={valueStyle}>
              {this.state.stats.queued}
            </div>
          </button>
          <button className='button' title='maximally is eql to config profiler.maxProfilesHistory (click to open profiler)' style={{ ...badgeStyle, backgroundColor: '#4CAF50' }} onClick={() => openProfiler('success')}>
            <div style={labelStyle}>
              <i className='fa fa-check' />&nbsp; last hour
            </div>
            <div style={valueStyle}>
              {this.state.stats.succesInHour}
            </div>
          </button>
          <button className='button' title='maximally is eql to config profiler.maxProfilesHistory (click to open profiler)' style={{ ...badgeStyle, backgroundColor: '#da532c' }} onClick={() => openProfiler('error')}>
            <div style={labelStyle}>
              <i className='fa fa-exclamation' />&nbsp; last hour
            </div>
            <div style={valueStyle}>
              {this.state.stats.failedInHour}
            </div>
          </button>
        </div>
      </div>
    )
  }

  render () {
    const { templates, profiles, failedProfiles } = this.state
    const { openTab } = this.props

    return (
      <div className='block custom-editor' style={{ overflow: 'auto', minHeight: 0, height: 'auto' }}>
        {configuration.startupComponents.map((c, i) => <div key={'startuprow' + i} style={{ display: 'flex', flexDirection: 'row' }}>{React.createElement(c, { key: `StartupComponent${i}` })}       </div>)}

        <div style={{ display: 'flex', flexDirection: 'row' }}>
          {this.renderBadges()}
        </div>

        <h2>Last edited templates</h2>

        <div>
          <table className='table'>
            <thead>
              <tr>
                <th>name</th>
                <th>recipe</th>
                <th>last modified</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t._id} onClick={() => openTab({ _id: t._id })}>
                  <td className='selection'>{t.path}</td>
                  <td>{t.recipe}</td>
                  <td title={t.modificationDate.toLocaleString()}>{moment.duration(moment(new Date()).diff(moment(t.modificationDate))).humanize() + ' ago'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {this.renderLastRequests(profiles)}
        {this.renderLastFailedRequests(failedProfiles)}
      </div>
    )
  }
}

export default connect((state) => ({
  activeTabKey: state.editor.activeTabKey
}), { ...actions }, undefined, { forwardRef: true })(Startup)
