import React, { Component } from 'react'
import { TextEditor } from 'jsreport-studio'

class PhantomEditor extends Component {
  render () {
    const { entity, onUpdate, tab } = this.props

    return (
      <TextEditor
        name={entity._id + '_phantom' + tab.headerOrFooter}
        mode='handlebars'
        value={entity.phantom ? entity.phantom[tab.headerOrFooter] : ''}
        onUpdate={(v) => onUpdate(Object.assign({}, entity, { phantom: Object.assign({}, entity.phantom, { [tab.headerOrFooter]: v }) }))}
      />
    )
  }
}

export default PhantomEditor
