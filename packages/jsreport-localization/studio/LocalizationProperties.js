import React, { Component } from 'react'
export default class LocalizationProperties extends Component {
  static title (entity, entities) {
    if (!entity.localization) {
      return 'localization'
    }

    return `localization: ${entity.localization.language || ''}`
  }

  render () {
    const { entity, onChange } = this.props
    const localization = (entity.localization || {}).language

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <label>Template language <a href='http://jsreport.net/learn/localization' target='_blank' rel='noreferrer'><i className='fa fa-question' /> </a></label>
          <input
            type='text' placeholder='en' value={localization || ''}
            onChange={(v) => onChange({ _id: entity._id, localization: { language: v.target.value } })}
          />
        </div>
      </div>
    )
  }
}
