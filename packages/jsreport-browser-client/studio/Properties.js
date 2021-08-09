import React, { Component } from 'react'

export default class Properties extends Component {
  render () {
    const { entity, onChange } = this.props

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <label>omit serialized data from the output</label>
          <input
            type='checkbox'
            checked={entity.omitDataFromOutput === true}
            onChange={(v) => onChange({ _id: entity._id, omitDataFromOutput: v.target.checked })}
          />
        </div>
      </div>
    )
  }
}
