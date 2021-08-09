import React, { Component } from 'react'
import ReactList from 'react-list'
import Studio from 'jsreport-studio'
import _debounce from 'lodash/debounce'
import style from './ScheduleEditor.css'

let _activeReport

class ScheduleEditor extends Component {
  constructor () {
    super()
    this.state = { tasks: [], active: null, running: false }
    this.skip = 0
    this.top = 50
    this.pending = 0
    this.updateNextRun = _debounce(async () => {
      if (this.props.entity.cron) {
        const response = await Studio.api.get(`/api/scheduling/nextRun/${encodeURIComponent(this.props.entity.cron)}`)
        this.setState({ nextRun: response })
      }
    }, 500)
  }

  static get ActiveReport () {
    return _activeReport
  }

  onTabActive () {
    this.updateNextRun()
    this.reloadTasks()
  }

  componentWillUnmount () {
    this.updateNextRun.cancel()
  }

  componentDidMount () {
    this.updateNextRun()
  }

  componentDidUpdate (prevProps, prevState) {
    if (this.props.entity.cron !== prevProps.entity.cron) {
      this.updateNextRun()
    }
  }

  async openReport (t) {
    if (t.state === 'success') {
      const reports = await Studio.api.get(`/odata/reports?$filter=taskId eq '${t._id}'`)
      const report = reports.value[0]

      if (
        report.contentType === 'text/html' ||
        report.contentType === 'text/plain' ||
        report.contentType === 'application/pdf' ||
        (report.contentType && report.contentType.indexOf('image') !== -1)
      ) {
        Studio.preview({
          type: 'rawContent',
          data: {
            type: 'url',
            content: `${Studio.rootUrl}/reports/${report._id}/content`
          },
          completed: true
        })
      } else {
        window.open(`${Studio.rootUrl}/reports/${report._id}/attachment`, '_self')
      }

      this.setState({ active: t._id })
      _activeReport = report
    } else {
      _activeReport = null

      Studio.preview({
        type: 'rawContent',
        data: {
          type: 'text/html',
          content: t.error || t.state
        },
        completed: true
      })

      this.setState({ active: null })
    }
  }

  async reloadTasks () {
    this.skip = 0
    this.top = 50
    this.pending = 0

    this.lazyFetch(true)
  }

  async lazyFetch (replace) {
    if (this.loading) {
      return
    }

    this.loading = true
    const response = await Studio.api.get(`/odata/tasks?$orderby=finishDate desc&$count=true&$top=${this.top}&$skip=${this.skip}&$filter=scheduleShortid eq '${this.props.entity.shortid}'`)
    this.skip += this.top
    this.loading = false

    let tasks

    if (replace) {
      tasks = []
    } else {
      tasks = this.state.tasks
    }

    this.setState({ tasks: tasks.concat(response.value), count: response['@odata.count'] })
    if (this.state.tasks.length <= this.pending && response.value.length) {
      this.lazyFetch()
    }
  }

  async runNow () {
    this.setState({
      running: true
    })

    try {
      await Studio.api.post('/api/scheduling/runNow', {
        data: {
          scheduleId: this.props.entity._id
        }
      })

      this.updateNextRun()
      this.reloadTasks()
    } finally {
      this.setState({
        running: false
      })
    }
  }

  tryRenderItem (index) {
    const task = this.state.tasks[index]
    if (!task) {
      this.pending = Math.max(this.pending, index)
      this.lazyFetch()
      return (
        <tr key={index}>
          <td><i className='fa fa-spinner fa-spin fa-fw' /></td>
        </tr>
      )
    }

    return this.renderItem(task, index)
  }

  renderItem (task, index) {
    return (
      <tr
        key={index}
        className={(this.state.active === task._id) ? 'active' : ''}
        onClick={() => this.openReport(task)}
      >
        <td>
          <span
            className={style.state + ' ' + (task.state === 'error' ? style.error : (task.state === 'success' ? style.success : style.canceled))}
          >
            {task.state}
          </span>
        </td>
        <td>
          <span className={style.value}>{task.creationDate ? task.creationDate.toLocaleString() : ''}</span>
        </td>
        <td>
          <div className={style.value}>{task.finishDate ? task.finishDate.toLocaleString() : ''}</div>
        </td>
      </tr>
    )
  }

  renderItems (items, ref) {
    return (
      <table className='table' ref={ref}>
        <thead>
          <tr>
            <th>state</th>
            <th>start</th>
            <th>finish</th>
          </tr>
        </thead>
        <tbody>{items}</tbody>
      </table>
    )
  }

  render () {
    const { entity } = this.props
    let { count, nextRun } = this.state
    nextRun = nextRun || entity.nextRun

    return (
      <div className='block custom-editor'>
        <div>
          <h1><i className='fa fa-calendar' /> {entity.name}</h1>
          {nextRun
            ? (
              <div>
                <span>next run&nbsp;&nbsp;</span>
                <small>{nextRun.toLocaleString()}</small>
                {!this.props.entity.__isNew && (
                  <button
                    disabled={this.state.running}
                    style={this.state.running ? { color: '#c6c6c6' } : {}}
                    className='button confirmation'
                    onClick={() => this.runNow()}
                  >
                    <i className='fa fa-play' />
                    {' '}
                    <span>{this.state.running ? 'Running..' : 'Run now'}</span>
                  </button>
                )}
              </div>
              )
            : <div>Not planned yet. Fill CRON expression and report template in the properties.</div>}
        </div>
        <div className={style.listContainer + ' block-item'}>
          <ReactList
            type='uniform' itemsRenderer={this.renderItems} itemRenderer={(index) => this.tryRenderItem(index)}
            length={count}
          />
        </div>
      </div>
    )
  }
}

export default ScheduleEditor
