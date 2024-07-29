import React, { Component } from 'react'

export default class Properties extends Component {
  render () {
    const { entity, onChange } = this.props

    return (
      <div className='properties-section'>
        <div className='form-group'><label>Content Type</label>
          <input
            type='text'
            placeholder='text/html'
            value={entity.contentType || ''}
            onChange={(v) => onChange({ _id: entity._id, contentType: v.target.value })}
          />
        </div>
        <div className='form-group'><label>File Extension</label>
          <input
            type='text'
            placeholder='html'
            value={entity.fileExtension || ''}
            onChange={(v) => onChange({ _id: entity._id, fileExtension: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Content Disposition</label>
          <input
            type='text'
            placeholder='inline'
            value={entity.contentDisposition || ''}
            onChange={(v) => onChange({ _id: entity._id, contentDisposition: v.target.value })}
          />
        </div>
      </div>
    )
  }
}
