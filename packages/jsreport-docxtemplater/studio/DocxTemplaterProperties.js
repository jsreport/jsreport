import React, { Component } from 'react'

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

    if (!entity.docxtemplater) {
      return
    }

    const updatedAssetItems = Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets' && entities[k].shortid === entity.docxtemplater.templateAssetShortid)

    if (updatedAssetItems.length === 0) {
      onChange({ _id: entity._id, docxtemplater: null })
    }
  }

  static title (entity, entities) {
    if (!entity.docxtemplater || !entity.docxtemplater.templateAssetShortid) {
      return 'docxtemplater'
    }

    const foundItems = Properties.selectAssets(entities).filter((e) => entity.docxtemplater.templateAssetShortid === e.shortid)

    if (!foundItems.length) {
      return 'docxtemplater'
    }

    return 'docxtemplater asset: ' + foundItems[0].name
  }

  render () {
    const { entity, entities, onChange } = this.props
    const assets = Properties.selectAssets(entities)

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <select
            value={entity.docxtemplater ? entity.docxtemplater.templateAssetShortid : ''}
            onChange={(v) => onChange({ _id: entity._id, docxtemplater: v.target.value !== 'empty' ? { templateAssetShortid: v.target.value } : null })}
          >
            <option key='empty' value='empty'>- not selected -</option>
            {assets.map((e) => <option key={e.shortid} value={e.shortid}>{e.name}</option>)}
          </select>
        </div>
      </div>
    )
  }
}

export default Properties
