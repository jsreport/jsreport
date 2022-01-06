import React, { Component } from 'react'
import scopeOptions from './scopeOptions'
import Studio from 'jsreport-studio'

class AssetProperties extends Component {
  static title (entity, entities) {
    let suffix = entity.link ? ' (link)' : ''

    if (entity.isSharedHelper) {
      suffix += ` (shared helper, scope: ${entity.scope != null ? entity.scope : 'global'})`
    }

    return `asset${suffix}`
  }

  componentDidMount () {
    this.normalizeScope()
  }

  componentDidUpdate () {
    this.normalizeScope()
  }

  normalizeScope () {
    const { entity, onChange } = this.props

    if (entity.isSharedHelper === true && entity.scope == null) {
      onChange({ _id: entity._id, scope: 'global' })
    }
  }

  render () {
    const { entity, onChange } = this.props

    const currentScopeValue = entity.scope != null ? entity.scope : 'global'
    const currentScopeOption = scopeOptions.find((opt) => opt.value === currentScopeValue)

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
          <label>shared helpers attached to templates</label>
          <input
            type='checkbox' checked={entity.isSharedHelper === true}
            onChange={(v) => {
              onChange({
                _id: entity._id,
                isSharedHelper: v.target.checked,
                scope: v.target.checked === false ? null : 'global'
              })
            }}
          />
        </div>
        {entity.isSharedHelper && (
          <div className='form-group'>
            <label>scope</label>
            <select
              value={currentScopeValue}
              onChange={(v) => {
                const newScope = v.target.value
                onChange({ _id: entity._id, scope: newScope })
              }}
            >
              {scopeOptions.map((opt) => (
                <option key={opt.key} value={opt.value} title={opt.desc}>{opt.title}</option>
              ))}
            </select>
            <em>{currentScopeOption.desc}</em>
          </div>
        )}
      </div>
    )
  }
}

export default AssetProperties
