import React, { Component } from 'react'
import { TextEditor } from 'jsreport-studio'

class PhantomEditor extends Component {
  render () {
    const { entity, onUpdate, headerOrFooter, tab } = this.props
    const editorName = `${entity._id}_${tab.docProp.replace(/\./g, '_')}`

    return (
      <TextEditor
        name={editorName}
        mode='handlebars'
        value={entity.phantom ? entity.phantom[headerOrFooter] : ''}
        onUpdate={(v) => onUpdate(Object.assign({}, entity, { phantom: Object.assign({}, entity.phantom, { [headerOrFooter]: v }) }))}
      />
    )
  }
}

export default PhantomEditor
