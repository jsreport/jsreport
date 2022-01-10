import React, { Component } from 'react'
import scopeOptions from './scopeOptions'

class ScriptProperties extends Component {
  static title (entity, entities) {
    if (entity.scope != null) {
      return `scripts (scope: ${entity.scope})`
    }

    return 'scripts'
  }

  componentDidMount () {
    this.removeOldIsGlobalProperty()
  }

  componentDidUpdate () {
    this.removeOldIsGlobalProperty()
  }

  removeOldIsGlobalProperty () {
    const { entity, onChange } = this.props

    if (entity.isGlobal === true) {
      onChange({ _id: entity._id, scope: 'global', isGlobal: false })
    } else if (entity.scope == null && !entity.isGlobal) {
      onChange({ _id: entity._id, scope: 'template', isGlobal: false })
    }
  }

  render () {
    const { entity, onChange } = this.props

    const currentScopeValue = entity.scope != null ? entity.scope : 'template'
    const currentScopeOption = scopeOptions.find((opt) => opt.value === currentScopeValue)

    return (
      <div className='properties-section'>
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
      </div>
    )
  }
}

export default ScriptProperties
