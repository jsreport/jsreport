import React, { Component } from 'react'
import ReportEditor from './ReportEditor'
import Studio from 'jsreport-studio'

class DownloadButton extends Component {
  getReportEditorInstance () {
    return ReportEditor.default ? ReportEditor.default.Instance : ReportEditor.Instance
  }

  download () {
    const instance = this.getReportEditorInstance()

    if (instance && instance.ActiveReport) {
      window.open(`${Studio.rootUrl}/reports/${instance.ActiveReport._id}/attachment`, '_self')
    }
  }

  render () {
    if (!this.props.tab || (this.props.tab.key !== 'Reports') || !this.getReportEditorInstance() || !this.getReportEditorInstance().ActiveReport) {
      return <div />
    }

    return (
      <div className='toolbar-button' onClick={() => this.download()}>
        <i className='fa fa-download' />Download
      </div>
    )
  }
}

export default DownloadButton
