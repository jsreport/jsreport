import React, { Component } from 'react'

export default class Properties extends Component {
  static title (entity, entities) {
    if (!entity.libreOffice || (!entity.libreOffice.format && !entity.libreOffice.forma) || entity.libreOffice.enabled === false) {
      return 'libre office'
    }

    return `libre office ${entity.libreOffice.format || ''} ${entity.libreOffice.print || ''}`
  }

  render () {
    const { entity, onChange } = this.props

    return (
      <div className='properties-section'>
        <div className='form-group'><label>Format</label>
          <input
            type='text'
            placeholder='pdf'
            value={entity.libreOffice ? entity.libreOffice.format : ''}
            onChange={(v) => onChange({
              _id: entity._id,
              libreOffice: {
                format: v.target.value,
                enabled: !entity.libreOffice || entity.libreOffice.enabled !== false,
                print: entity.libreOffice ? entity.libreOffice.print : ''
              }
            })}
          />
        </div>
        <div className='form-group'><label>Print</label>
          <input
            type='text'
            placeholder='default'
            value={entity.libreOffice ? entity.libreOffice.print : ''}
            onChange={(v) => onChange({
              _id: entity._id,
              libreOffice: {
                format: entity.libreOffice ? entity.libreOffice.format : '',
                enabled: !entity.libreOffice || entity.libreOffice.enabled !== false,
                print: v.target.value
              }
            })}
          />
        </div>
        <div className='form-group'>
          <label>Enabled</label>
          <input
            type='checkbox'
            checked={!entity.libreOffice || entity.libreOffice.enabled !== false}
            onChange={(v) => onChange({
              _id: entity._id,
              libreOffice: {
                enabled: v.target.checked,
                format: entity.libreOffice ? entity.libreOffice.format : '',
                print: entity.libreOffice ? entity.libreOffice.print : ''
              }
            })}
          />
        </div>
      </div>
    )
  }
}
