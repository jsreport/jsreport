import Properties from './PptxProperties'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent(Properties.title, Properties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'pptx')

Studio.entityEditorComponentKeyResolvers.push((entity) => {
  if (entity.__entitySet === 'templates' && entity.recipe === 'pptx') {
    let officeAsset

    if (entity.pptx != null && entity.pptx.templateAssetShortid != null) {
      officeAsset = Studio.getEntityByShortid(entity.pptx.templateAssetShortid, false)
    }

    return {
      key: 'assets',
      entity: officeAsset,
      props: {
        icon: 'fa-link',
        embeddingCode: '',
        codeEntity: {
          _id: entity._id,
          shortid: entity.shortid,
          name: entity.name,
          helpers: entity.helpers
        },
        displayName: `pptx asset: ${officeAsset != null ? officeAsset.name : '<none>'}`,
        emptyMessage: 'No pptx asset assigned, please add a reference to a pptx asset in the properties'
      }
    }
  }
})

Studio.runListeners.push((request, entities) => {
  if (request.template.recipe !== 'pptx') {
    return
  }

  if (Studio.extensions.pptx.options.preview.enabled === false) {
    return
  }

  if (Studio.extensions.pptx.options.preview.showWarning === false) {
    return
  }

  if (Studio.getSettingValueByKey('office-preview-informed', false) === true) {
    return
  }

  Studio.setSetting('office-preview-informed', true)

  Studio.openModal(() => (
    <div>
      We need to upload your pptx report to our publicly hosted server to be able to use
      Office Online Service for previewing here in the studio. You can disable it in the configuration,
      see <a href='https://jsreport.net/learn/pptx' target='_blank' rel='noreferrer'>https://jsreport.net/learn/pptx</a> for details.
    </div>
  ))
})
