import React, { Component } from 'react'
import { TextEditor } from 'jsreport-studio'

class WKEditor extends Component {
  render () {
    const { entity, onUpdate, headerOrFooter, tab } = this.props
    const editorName = `${entity._id}_${tab.docProp.replace(/\./g, '_')}`

    return (
      <TextEditor
        name={editorName}
        mode='handlebars'
        value={entity.wkhtmltopdf ? entity.wkhtmltopdf[headerOrFooter] : ''}
        onUpdate={(v) => onUpdate(Object.assign({}, entity, { wkhtmltopdf: Object.assign({}, entity.wkhtmltopdf, { [headerOrFooter]: v }) }))}
      />
    )
  }
}

export default WKEditor
