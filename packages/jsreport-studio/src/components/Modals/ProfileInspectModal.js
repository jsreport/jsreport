import { Component } from 'react'
import { connect } from 'react-redux'
import shortid from 'shortid'
import fileSaver from 'filesaver.js-npm'
import { actions as editorActions } from '../../redux/editor'
import uid from '../../helpers/uid.js'
import resolveUrl from '../../helpers/resolveUrl.js'

class ProfilerInspectModal extends Component {
  constructor (props) {
    super(props)

    this.handleOpenTemplateClick = this.handleOpenTemplateClick.bind(this)
    this.handleOpenDataClick = this.handleOpenDataClick.bind(this)
    this.handleOpenRequestClick = this.handleOpenRequestClick.bind(this)
    this.handleResponse = this.handleResponse.bind(this)

    this.state = {
      content: null
    }
  }

  componentDidMount () {
    setTimeout(() => {
      this.setState({
        content: {
          ...this.props.options.data.getContent()
        }
      })
    }, 250)
  }

  componentWillUnmount () {
    this.props.options.onModalClose()
  }

  handleOpenTemplateClick () {
    const stepId = `${this.props.options.data.sourceId}-${this.props.options.data.targetId}`
    const req = this.state.content.req

    if (req != null) {
      this.props.openTab({
        key: `profiler-inspect-request-template-${stepId}`,
        title: `Profiler inspect - ${req.template.name} (template)`,
        customUrl: req.template.shortid != null ? resolveUrl(`/studio/templates/${req.template.shortid}`) : '/',
        getEntity: () => Object.assign({}, req.template, {
          _id: uid(),
          shortid: shortid.generate(),
          __entitySet: 'templates'
        }),
        readOnly: true
      })
    }
  }

  handleOpenDataClick () {
    const stepId = `${this.props.options.data.sourceId}-${this.props.options.data.targetId}`
    const req = this.state.content.req

    const key = `profiler-inspect-request-template-${stepId}-data`

    this.props.openTab({
      key,
      title: `Profiler inspect - ${req.template.name} (data)`,
      customUrl: req.shortid != null ? resolveUrl(`/studio/templates/${req.template.shortid}`) : '/',
      editorComponentKey: 'inspectJSON',
      readOnly: true,
      getProps: () => ({
        jsonId: key,
        jsonName: `${req.template.name} (data)`,
        jsonContent: JSON.stringify(req.data, null, 2)
      })
    })
  }

  handleOpenRequestClick () {
    const stepId = `${this.props.options.data.sourceId}-${this.props.options.data.targetId}`
    const req = this.state.content.req

    const key = `profiler-inspect-request-template-${stepId}-request`

    this.props.openTab({
      key,
      title: `Profiler inspect - ${req.template.name} (request)`,
      customUrl: req.template.shortid != null ? resolveUrl(`/studio/templates/${req.template.shortid}`) : '/',
      editorComponentKey: 'inspectJSON',
      readOnly: true,
      getProps: () => ({
        jsonId: key,
        jsonName: `${req.template.name} (request)`,
        jsonContent: JSON.stringify(req, null, 2)
      })
    })
  }

  handleResponse (download) {
    const stepId = `${this.props.options.data.sourceId}-${this.props.options.data.targetId}`
    const { res, req } = this.state.content

    if (res.meta.reportName == null) {
      res.meta.reportName = req.template.name
    }

    if (download) {
      fileSaver.saveAs(res.content, `${res.meta.reportName}.${res.meta.fileExtension}`)
    } else {
      const responseContentURL = window.URL.createObjectURL(res.content)

      const previewURL = window.URL.createObjectURL(new Blob([`
        <html>
          <head>
            <title>Profiler inspect - ${req.template.name} (response)</title>
            <style>
              html, body {
                margin: 0px;
                width: 100%;
                height: 100%;
              }
            </style>
          </head>
          <body>
            <iframe src="${responseContentURL}" frameborder="0" width="100%" height="100%" />
          </body>
        </html>
      `], { type: 'text/html' }))

      const newWindow = window.open(
        previewURL,
        `profiler-inspect-response-${stepId}-content`
      )

      const timerRef = setInterval(() => {
        if (newWindow.closed) {
          window.URL.revokeObjectURL(responseContentURL)
          window.URL.revokeObjectURL(previewURL)
          clearInterval(timerRef)
        }
      }, 1000)
    }
  }

  render () {
    const isLoading = this.state.content == null
    const reqTooLarge = this.state.content != null && this.state.content.req != null && this.state.content.req.tooLarge === true
    const reqActionsEnabled = this.state.content != null && this.state.content.req != null && this.state.content.req.tooLarge !== true
    const resActionsEnabled = this.state.content != null && this.state.content.res != null && this.state.content.res.content !== null && this.state.content.res.content.size > 0

    return (
      <div>
        <h3>Inspect Render Step <i className='fa fa-circle-o-notch fa-spin' style={{ display: isLoading ? 'inline-block' : 'none' }} /></h3>
        <div className='form-group'>
          <h5>
            <b>Request state actions</b>
          </h5>
          <div title={reqTooLarge === true ? 'The request was too large to diff and store in profile. You can increase the maximum size using config profiler.maxDiffSize' : ''}>
            <button
              className={`button confirmation ${(reqActionsEnabled && this.state.content.req.template.recipe) ? '' : 'disabled'}`}
              style={{ marginLeft: 0 }}
              onClick={this.handleOpenTemplateClick}
              disabled={!reqActionsEnabled || !this.state.content.req.template.recipe}
            >
              <i className='fa fa-file' style={{ verticalAlign: 'middle' }} /> Open Template
            </button>
            <button
              className={`button confirmation ${reqActionsEnabled ? '' : 'disabled'}`}
              onClick={this.handleOpenDataClick}
              disabled={!reqActionsEnabled}
            >
              <i className='fa fa-database' style={{ verticalAlign: 'middle' }} /> Open Data
            </button>
            <button
              className={`button confirmation ${reqActionsEnabled ? '' : 'disabled'}`}
              onClick={this.handleOpenRequestClick}
              disabled={!reqActionsEnabled}
            >
              <i className='fa fa-plug' style={{ verticalAlign: 'middle' }} /> Open Request
            </button>
          </div>
        </div>
        <br />
        <div className='form-group'>
          <h5>
            <b>Response state actions</b>
          </h5>
          <div>
            <button
              className={`button confirmation ${resActionsEnabled ? '' : 'disabled'}`}
              style={{ marginLeft: 0 }}
              onClick={() => this.handleResponse(true)}
              disabled={!resActionsEnabled}
            >
              <i className='fa fa-download' style={{ verticalAlign: 'middle' }} /> Download Response
            </button>
            <button
              className={`button confirmation ${resActionsEnabled ? '' : 'disabled'}`}
              onClick={() => this.handleResponse()}
              disabled={!resActionsEnabled}
            >
              <i className='fa fa-external-link' style={{ verticalAlign: 'middle' }} /> Open Response
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(undefined, {
  openTab: editorActions.openTab
})(ProfilerInspectModal)
