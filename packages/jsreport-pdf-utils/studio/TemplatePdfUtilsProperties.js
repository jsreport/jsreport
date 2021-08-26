import React, { Component } from 'react'
import Studio from 'jsreport-studio'
import * as Constants from './constants.js'

class TemplatePdfUtilsProperties extends Component {
  static title (entity, entities) {
    if (
      (!entity.pdfOperations || entity.pdfOperations.length === 0) &&
      entity.pdfMeta == null &&
      entity.pdfPassword == null &&
      (entity.pdfSign == null || entity.pdfSign.certificateAssetShortid == null)
    ) {
      return 'pdf utils'
    }

    let title = 'pdf utils:'

    const getTemplate = (shortid) => Studio.getEntityByShortid(shortid, false) || { name: '' }

    if (entity.pdfOperations && entity.pdfOperations.length > 0) {
      title = `${title} ${entity.pdfOperations.map(o => getTemplate(o.templateShortid).name).join(', ')}`
    }

    const extra = []

    if (entity.pdfMeta != null) {
      extra.push('meta')
    }

    if (
      entity.pdfPassword != null &&
      (
        entity.pdfPassword.password != null ||
        entity.pdfPassword.ownerPassword != null
      )
    ) {
      extra.push('password')
    }

    if (entity.pdfSign != null && entity.pdfSign.certificateAssetShortid != null) {
      extra.push('sign')
    }

    if (extra.length > 0) {
      title = `${title} (${extra.join(', ')})`
    }

    return title
  }

  static selectAssets (entities) {
    return Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets').map((k) => entities[k])
  }

  componentDidMount () {
    this.removeInvalidTemplateReferences()
    this.removeInvalidAssetReferences()
  }

  componentDidUpdate () {
    this.removeInvalidTemplateReferences()
    this.removeInvalidAssetReferences()
  }

  openEditor () {
    Studio.openTab({
      key: this.props.entity._id + '_pdfUtils',
      _id: this.props.entity._id,
      editorComponentKey: Constants.PDF_UTILS_TAB_EDITOR,
      titleComponentKey: Constants.PDF_UTILS_TAB_TITLE
    })
  }

  removeInvalidTemplateReferences () {
    const { entity, entities, onChange } = this.props

    if (!entity.pdfOperations) {
      return
    }

    let hasTemplateReferences = false
    let updatedOperations

    updatedOperations = entity.pdfOperations
    hasTemplateReferences = entity.pdfOperations.filter(o => o.templateShortid != null).length > 0

    if (hasTemplateReferences) {
      updatedOperations = entity.pdfOperations.filter((o) => {
        // tolerate operations recently added
        if (o.templateShortid == null) {
          return true
        }

        return Object.keys(entities).filter((k) => entities[k].__entitySet === 'templates' && entities[k].shortid === o.templateShortid).length
      })
    }

    if (hasTemplateReferences && updatedOperations.length !== entity.pdfOperations.length) {
      onChange({ _id: entity._id, pdfOperations: updatedOperations })
    }
  }

  removeInvalidAssetReferences () {
    const { entity, entities, onChange } = this.props

    if (!entity.pdfSign) {
      return
    }

    const updatedAssetItems = Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets' && entities[k].shortid === entity.pdfSign.certificateAssetShortid)

    if (updatedAssetItems.length === 0 && entity.pdfSign.certificateAssetShortid) {
      onChange({
        _id: entity._id,
        pdfSign: {
          ...entity.pdfSign,
          certificateAssetShortid: null
        }
      })
    }
  }

  render () {
    return (
      <div className='properties-section'>
        <div className='form-group'>
          <button onClick={() => this.openEditor()}>Configure</button>
        </div>
      </div>
    )
  }
}

export default TemplatePdfUtilsProperties
