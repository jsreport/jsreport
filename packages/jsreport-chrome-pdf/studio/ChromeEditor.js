import React, { Component } from 'react'
import { TextEditor } from 'jsreport-studio'

class ChromeEditor extends Component {
  render () {
    const { entity, onUpdate, headerOrFooter, tab } = this.props
    const editorName = `${entity._id}_${tab.docProp.replace(/\./g, '_')}`

    return (
      <TextEditor
        name={editorName}
        mode='handlebars'
        value={entity.chrome ? entity.chrome[headerOrFooter + 'Template'] : ''}
        onUpdate={(v) => onUpdate(Object.assign({}, entity, { chrome: Object.assign({}, entity.chrome, { [headerOrFooter + 'Template']: v }) }))}
      />
    )
  }
}

export default ChromeEditor
