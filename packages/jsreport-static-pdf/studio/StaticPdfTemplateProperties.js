import React, { Component } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect
const sharedComponents = Studio.sharedComponents

class StaticPdfTemplateProperties extends Component {
  static title (entity, entities) {
    if (!entity.staticPdf || !entity.staticPdf.pdfAssetShortid) {
      return 'static pdf'
    }

    const foundItems = StaticPdfTemplateProperties.selectAssets(entities).filter(
      (e) => entity.staticPdf.pdfAssetShortid === e.shortid
    )

    if (!foundItems.length) {
      return 'static pdf'
    }

    return `static pdf: ${foundItems[0].name}`
  }

  static selectAssets (entities) {
    return Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets').map((k) => entities[k])
  }

  componentDidMount () {
    this.removeInvalidReferences()
  }

  componentDidUpdate () {
    this.removeInvalidReferences()
  }

  changeStaticPdf (props, change) {
    const { entity, onChange } = props
    const staticPdf = entity.staticPdf || {}

    onChange({
      ...entity,
      staticPdf: { ...staticPdf, ...change }
    })
  }

  removeInvalidReferences () {
    const { entity, entities, onChange } = this.props

    if (!entity.staticPdf) {
      return
    }

    const updatedAssetItems = Object.keys(entities).filter(
      (k) => entities[k].__entitySet === 'assets' && entities[k].shortid === entity.staticPdf.pdfAssetShortid
    )

    if (updatedAssetItems.length === 0 && entity.staticPdf.pdfAssetShortid) {
      onChange({
        _id: entity._id,
        staticPdf: {
          ...entity.staticPdf,
          pdfAssetShortid: null
        }
      })
    }
  }

  render () {
    const { entity } = this.props
    const staticPdf = entity.staticPdf || {}
    const changeStaticPdf = this.changeStaticPdf

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <label>Select PDF asset</label>
          <EntityRefSelect
            headingLabel='Select PDF asset'
            newLabel='New PDF asset for template'
            value={staticPdf.pdfAssetShortid || ''}
            onChange={(selected) => changeStaticPdf(this.props, { pdfAssetShortid: selected.length > 0 ? selected[0].shortid : null })}
            filter={(references) => ({ data: references.assets })}
            renderNew={(modalProps) => <sharedComponents.NewAssetModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder }, activateNewTab: false }} />}
          />
        </div>
      </div>
    )
  }
}

export default StaticPdfTemplateProperties
