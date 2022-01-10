import React, { Component } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect
const sharedComponents = Studio.sharedComponents

class TemplateScriptProperties extends Component {
  static getSelectedScripts (entity, entities) {
    const getName = (s) => {
      const foundScripts = Object.keys(entities).map((k) => entities[k]).filter((sc) => sc.shortid === s.shortid)

      return foundScripts.length ? foundScripts[0].name : ''
    }

    return (entity.scripts || []).map((s) => ({
      ...s,
      name: getName(s)
    }))
  }

  renderOrder () {
    const scripts = TemplateScriptProperties.getSelectedScripts(this.props.entity, this.props.entities)

    return (
      <span>{scripts.map((s) => <span key={s.shortid}>{s.name + ' '}</span>)}</span>
    )
  }

  componentDidMount () {
    this.removeInvalidScriptReferences()
  }

  componentDidUpdate () {
    this.removeInvalidScriptReferences()
  }

  static title (entity, entities) {
    if (!entity.scripts || !entity.scripts.length) {
      return 'scripts'
    }

    return 'scripts: ' + TemplateScriptProperties.getSelectedScripts(entity, entities).map((s) => s.name).join(', ')
  }

  removeInvalidScriptReferences () {
    const { entity, entities, onChange } = this.props

    if (!entity.scripts) {
      return
    }

    const updatedScripts = entity.scripts.filter((s) => Object.keys(entities).filter((k) => (
      entities[k].__entitySet === 'scripts' &&
      entities[k].shortid === s.shortid &&
      (entities[k].scope === 'template' || (entities[k].scope == null && !entities[k].isGlobal))
    )).length)

    if (updatedScripts.length !== entity.scripts.length) {
      onChange({ _id: entity._id, scripts: updatedScripts })
    }
  }

  render () {
    const { entity, onChange } = this.props

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <EntityRefSelect
            headingLabel='Select script'
            newLabel='New script for template'
            filter={(references) => {
              const scripts = references.scripts.filter((e) => {
                return e.scope === 'template' || (e.scope == null && !e.isGlobal)
              })
              return { scripts: scripts }
            }}
            value={entity.scripts ? entity.scripts.map((s) => s.shortid) : []}
            onChange={(selected) => onChange({ _id: entity._id, scripts: selected.map((s) => ({ shortid: s.shortid })) })}
            renderNew={(modalProps) => <sharedComponents.NewEntityModal {...modalProps} options={{ ...modalProps.options, entitySet: 'scripts', defaults: { folder: entity.folder }, activateNewTab: false }} />}
            multiple
          />
          {(entity.scripts && entity.scripts.length) ? <div><span>Run order:</span>{this.renderOrder()}</div> : <div />}
        </div>
      </div>
    )
  }
}

export default TemplateScriptProperties
