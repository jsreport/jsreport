import React, { Component } from 'react'
import ReportEditor from './ReportEditor'

class DeleteButton extends Component {
  getReportEditorInstance () {
    return ReportEditor.default ? ReportEditor.default.Instance : ReportEditor.Instance
  }

  render () {
    if (!this.props.tab || (this.props.tab.key !== 'Reports') || !this.getReportEditorInstance() || !this.getReportEditorInstance().ActiveReport) {
      return <div />
    }

    return (
      <div className='toolbar-button' onClick={() => this.getReportEditorInstance().remove()}>
        <i className='fa fa-trash' />Delete
      </div>
    )
  }
}

export default DeleteButton
