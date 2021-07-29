import React, { Component } from 'react'
import TextEditor from './TextEditor.js'

class InspectJSONEditor extends Component {
  render () {
    const { jsonId, jsonName, jsonContent } = this.props

    return (
      <TextEditor
        key={jsonId}
        name={jsonId}
        getFilename={() => jsonName}
        mode='json'
        onUpdate={() => {}}
        value={jsonContent || ''}
        readOnly
      />
    )
  }
}

export default InspectJSONEditor
