import React, { Component } from 'react'
import { TextEditor } from 'jsreport-studio'

class WKEditor extends Component {
  render () {
    const { entity, onUpdate, tab } = this.props

    return (
      <TextEditor
        name={entity._id + '_wk' + tab.headerOrFooter}
        mode='handlebars'
        value={entity.wkhtmltopdf ? entity.wkhtmltopdf[tab.headerOrFooter] : ''}
        onUpdate={(v) => onUpdate(Object.assign({}, entity, { wkhtmltopdf: Object.assign({}, entity.wkhtmltopdf, { [tab.headerOrFooter]: v }) }))}
      />
    )
  }
}

export default WKEditor
