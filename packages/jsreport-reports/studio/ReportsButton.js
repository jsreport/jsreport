import React, { Component } from 'react'
import Studio from 'jsreport-studio'

class ReportsButton extends Component {
  openReports () {
    Studio.openTab({ key: 'Reports', editorComponentKey: 'reports', title: 'Reports' })
  }

  render () {
    return (
      <div
        onClick={() => {
          this.openReports()
          this.props.closeMenu()
        }}
      >
        <i className='fa fa-folder-open-o' />Reports
      </div>
    )
  }
}

export default ReportsButton
