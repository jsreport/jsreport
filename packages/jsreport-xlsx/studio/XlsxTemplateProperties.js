import React, { Component } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect
const sharedComponents = Studio.sharedComponents

class XlsxTemplateProperties extends Component {
  static selectItems (entities) {
    return Object.keys(entities).filter((k) => entities[k].__entitySet === 'xlsxTemplates').map((k) => entities[k])
  }

  static selectAssets (entities) {
    return Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets').map((k) => entities[k])
  }

  static title (entity, entities) {
    if (
      (!entity.xlsxTemplate || !entity.xlsxTemplate.shortid) &&
      (!entity.xlsx || !entity.xlsx.templateAssetShortid)
    ) {
      return 'xlsx template'
    }

    const foundItems = XlsxTemplateProperties.selectItems(entities).filter((e) => entity.xlsxTemplate != null && entity.xlsxTemplate.shortid === e.shortid)
    const foundAssets = XlsxTemplateProperties.selectAssets(entities).filter((e) => entity.xlsx != null && entity.xlsx.templateAssetShortid === e.shortid)

    if (!foundItems.length && !foundAssets.length) {
      return 'xlsx template'
    }

    let name

    if (foundAssets.length) {
      name = foundAssets[0].name
    } else {
      name = foundItems[0].name
    }

    return 'xlsx template: ' + name
  }

  componentDidMount () {
    this.removeInvalidXlsxTemplateReferences()
  }

  componentDidUpdate () {
    this.removeInvalidXlsxTemplateReferences()
  }

  removeInvalidXlsxTemplateReferences () {
    const { entity, entities, onChange } = this.props

    if (!entity.xlsxTemplate && !entity.xlsx) {
      return
    }

    const updatedXlsxTemplates = Object.keys(entities).filter((k) => entities[k].__entitySet === 'xlsxTemplates' && entity.xlsxTemplate != null && entities[k].shortid === entity.xlsxTemplate.shortid)
    const updatedXlsxAssets = Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets' && entity.xlsx != null && entities[k].shortid === entity.xlsx.templateAssetShortid)

    if (entity.xlsx && entity.xlsx.templateAssetShortid && updatedXlsxAssets.length === 0) {
      onChange({ _id: entity._id, xlsx: null })
    }

    if (entity.xlsxTemplate && entity.xlsxTemplate.shortid && updatedXlsxTemplates.length === 0) {
      onChange({ _id: entity._id, xlsxTemplate: null })
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
          <label>xlsx asset</label>
          <EntityRefSelect
            headingLabel='Select xlsx template'
            newLabel='New xlsx asset for template'
            value={entity.xlsx ? entity.xlsx.templateAssetShortid : ''}
            onChange={(selected) => onChange({
              _id: entity._id,
              xlsx: selected != null && selected.length > 0 ? { templateAssetShortid: selected[0].shortid } : null
            })}
            filter={(references) => ({ assets: references.assets })}
            renderNew={(modalProps) => <sharedComponents.NewAssetModal {...modalProps} options={{ ...modalProps.options, activateNewTab: false }} />}
          />
        </div>
        <div className='form-group'>
          <label>xlsx template (deprecated)</label>
          <EntityRefSelect
            headingLabel='Select xlsx template'
            filter={(references) => ({ xlsxTemplates: references.xlsxTemplates })}
            value={entity.xlsxTemplate ? entity.xlsxTemplate.shortid : null}
            onChange={(selected) => onChange({
              _id: entity._id,
              xlsxTemplate: selected != null && selected.length > 0 ? { shortid: selected[0].shortid } : null
            })}
          />
        </div>
      </div>
    )
  }
}

export default XlsxTemplateProperties
