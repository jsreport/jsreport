import React, { Component } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect
const sharedComponents = Studio.sharedComponents

class DocxProperties extends Component {
  static selectAssets (entities) {
    return Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets').map((k) => entities[k])
  }

  componentDidMount () {
    this.removeInvalidReferences()
  }

  componentDidUpdate () {
    this.removeInvalidReferences()
  }

  removeInvalidReferences () {
    const { entity, entities, onChange } = this.props

    if (!entity.docx) {
      return
    }

    const updatedAssetItems = Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets' && entities[k].shortid === entity.docx.templateAssetShortid)

    if (updatedAssetItems.length === 0) {
      onChange({ _id: entity._id, docx: null })
    }
  }

  static title (entity, entities) {
    if (!entity.docx || !entity.docx.templateAssetShortid) {
      return 'docx'
    }

    const foundItems = DocxProperties.selectAssets(entities).filter((e) => entity.docx.templateAssetShortid === e.shortid)

    if (!foundItems.length) {
      return 'docx'
    }

    return 'docx asset: ' + foundItems[0].name
  }

  render () {
    const { entity, onChange } = this.props

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <EntityRefSelect
            headingLabel='Select docx template'
            newLabel='New docx asset for template'
            value={entity.docx ? entity.docx.templateAssetShortid : ''}
            onChange={(selected) => onChange({ _id: entity._id, docx: selected.length > 0 ? { templateAssetShortid: selected[0].shortid } : null })}
            filter={(references) => ({ data: references.assets })}
            renderNew={(modalProps) => <sharedComponents.NewAssetModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder }, activateNewTab: false }} />}
          />
        </div>
      </div>
    )
  }
}

export default DocxProperties
