import React, { Component } from 'react'
import Studio from 'jsreport-studio'

export default class AssetProperties extends Component {
  static title (entity, entities) {
    return `asset ${entity.link ? '(link)' : ''}`
  }

  render () {
    const { entity, onChange } = this.props

    return (
      <div>
        {Studio.extensions.assets.options.allowAssetsLinkedToFiles !== false
          ? (
            <div className='form-group'>
              <label>link</label>
              <input
                type='text'
                value={entity.link || ''}
                onChange={(v) => onChange({ _id: entity._id, link: v.target.value })}
              />
            </div>
            )
          : <div />}
        <div className='form-group'>
          <label>shared helpers attached to each template</label>
          <input
            type='checkbox' checked={entity.isSharedHelper === true}
            onChange={(v) => onChange({ _id: entity._id, isSharedHelper: v.target.checked })}
          />
        </div>
      </div>
    )
  }
}
