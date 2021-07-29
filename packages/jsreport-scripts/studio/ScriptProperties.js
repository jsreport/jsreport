import React, { Component } from 'react'

export default class ScriptProperties extends Component {
  static title (entity, entities) {
    return `scripts (global: ${entity.isGlobal === true})`
  }

  render () {
    const { entity, onChange } = this.props
    return (
      <div className='properties-section'>
        <div className='form-group'>
          <label>run every time</label>
          <input
            type='checkbox' checked={entity.isGlobal === true}
            onChange={(v) => onChange({_id: entity._id, isGlobal: v.target.checked})} />
        </div>
      </div>
    )
  }
}
