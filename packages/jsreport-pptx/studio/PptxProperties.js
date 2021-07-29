import React, { Component } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect

class Properties extends Component {
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

    if (!entity.pptx) {
      return
    }

    const updatedAssetItems = Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets' && entities[k].shortid === entity.pptx.templateAssetShortid)

    if (updatedAssetItems.length === 0) {
      onChange({ _id: entity._id, pptx: null })
    }
  }

  static title (entity, entities) {
    if (!entity.pptx || !entity.pptx.templateAssetShortid) {
      return 'pptx'
    }

    const foundItems = Properties.selectAssets(entities).filter((e) => entity.pptx.templateAssetShortid === e.shortid)

    if (!foundItems.length) {
      return 'pptx'
    }

    return 'pptx asset: ' + foundItems[0].name
  }

  render () {
    const { entity, onChange } = this.props

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <EntityRefSelect
            headingLabel='Select pptx template'
            value={entity.pptx ? entity.pptx.templateAssetShortid : ''}
            onChange={(selected) => onChange({ _id: entity._id, pptx: selected.length > 0 ? { templateAssetShortid: selected[0].shortid } : null })}
            filter={(references) => ({ data: references.assets })}
          />
        </div>
      </div>
    )
  }
}

export default Properties
