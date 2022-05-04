import XlsxTemplateProperties from './XlsxTemplateProperties.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent(XlsxTemplateProperties.title, XlsxTemplateProperties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'xlsx')

Studio.entityEditorComponentKeyResolvers.push((entity) => {
  if (entity.__entitySet === 'templates' && entity.recipe === 'xlsx') {
    let officeAsset

    if (entity.xlsx != null && entity.xlsx.templateAssetShortid != null) {
      officeAsset = Studio.getEntityByShortid(entity.xlsx.templateAssetShortid, false)
    }

    let initialCodeActive = true

    if (
      officeAsset != null &&
      (entity.content == null || entity.content === '')
    ) {
      initialCodeActive = false
    }

    return {
      key: 'assets',
      entity: officeAsset,
      props: {
        icon: 'fa-link',
        embeddingCode: '',
        initialCodeActive,
        codeEntity: {
          _id: entity._id,
          shortid: entity.shortid,
          name: entity.name,
          content: entity.content,
          helpers: entity.helpers
        },
        displayName: `xlsx asset: ${officeAsset != null ? officeAsset.name : '<none>'}`,
        emptyMessage: 'No xlsx asset assigned, please add a reference to a xlsx asset in the properties'
      }
    }
  }
})

Studio.runListeners.push((request, entities) => {
  if (request.template.recipe !== 'xlsx') {
    return
  }

  if (Studio.extensions.xlsx.options.preview.enabled === false) {
    return
  }

  if (Studio.extensions.xlsx.options.preview.showWarning === false) {
    return
  }

  if (Studio.getSettingValueByKey('office-preview-informed', false) === true) {
    return
  }

  Studio.setSetting('office-preview-informed', true)

  Studio.openModal(() => (
    <div>
      We need to upload your office report to our publicly hosted server to be able to use
      Excel Online Service for previewing here in the studio. You can disable it in the configuration, see <a href='https://jsreport.net/learn/xlsx' rel='noopener noreferrer' target='_blank'>https://jsreport.net/learn/xlsx</a> for details.
    </div>
  ))
})
