import React, { Component } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect
const sharedComponents = Studio.sharedComponents

class XlsxTemplateProperties extends Component {
  static selectAssets (entities) {
    return Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets').map((k) => entities[k])
  }

  static title (entity, entities) {
    if (
      (!entity.xlsx || !entity.xlsx.templateAssetShortid)
    ) {
      return 'xlsx'
    }

    const foundAssets = XlsxTemplateProperties.selectAssets(entities).filter((e) => entity.xlsx != null && entity.xlsx.templateAssetShortid === e.shortid)

    if (!foundAssets.length) {
      return 'xlsx'
    }

    const name = foundAssets[0].name

    return 'xlsx asset: ' + name
  }

  componentDidMount () {
    this.removeInvalidXlsxTemplateReferences()
  }

  componentDidUpdate () {
    this.removeInvalidXlsxTemplateReferences()
  }

  removeInvalidXlsxTemplateReferences () {
    const { entity, entities, onChange } = this.props

    if (!entity.xlsx) {
      return
    }

    const updatedXlsxAssets = Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets' && entity.xlsx != null && entities[k].shortid === entity.xlsx.templateAssetShortid)

    if (entity.xlsx && entity.xlsx.templateAssetShortid && updatedXlsxAssets.length === 0) {
      onChange({ _id: entity._id, xlsx: null })
    }
  }

  changeXlsxTemplate (oldXlsxTemplate, prop, value) {
    let newValue

    if (value == null) {
      newValue = { ...oldXlsxTemplate }
      newValue[prop] = null
    } else {
      return { ...oldXlsxTemplate, [prop]: value }
    }

    newValue = Object.keys(newValue).length ? newValue : null

    return newValue
  }

  render () {
    const { entity, onChange } = this.props

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <EntityRefSelect
            headingLabel='Select xlsx template'
            newLabel='New xlsx asset for template'
            value={entity.xlsx ? entity.xlsx.templateAssetShortid : ''}
            onChange={(selected) => onChange({
              _id: entity._id,
              xlsx: selected != null && selected.length > 0 ? { templateAssetShortid: selected[0].shortid } : null
            })}
            filter={(references) => ({ assets: references.assets })}
            renderNew={(modalProps) => <sharedComponents.NewAssetModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder }, activateNewTab: false }} />}
          />
        </div>
      </div>
    )
  }
}

export default XlsxTemplateProperties
