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
        helpersEntity: entity,
        displayName: `pptx asset: ${officeAsset != null ? officeAsset.name : '<none>'}`,
        emptyMessage: 'No pptx asset assigned, please add a reference to a pptx asset in the properties'
      }
    }
  }
})

const pendingModalsLaunch = []

const pendingModalsInterval = setInterval(() => {
  if (pendingModalsLaunch.length === 0 || Studio.isModalOpen()) {
    return
  }

  const toLaunch = pendingModalsLaunch.splice(0, 1)

  toLaunch[0]()

  if (pendingModalsLaunch.length === 0) {
    clearInterval(pendingModalsInterval)
  }
}, 200)

Studio.runListeners.push((request, entities) => {
  if (request.template.recipe !== 'pptx') {
    return
  }

  if (Studio.extensions.pptx.options.beta.showWarning === false) {
    return
  }

  if (Studio.getSettingValueByKey('beta-pptx-informed', false) === true) {
    return
  }

  Studio.setSetting('beta-pptx-informed', true)

  const launchBetaModal = () => {
    Studio.openModal(() => (
      <div>
        pptx recipe is currently in the beta phase and in continuous development.
        There're use cases it doesn't support yet but we get there soon if you help us with
        <a href='https://forum.jsreport.net' target='_blank' rel='noreferrer'>feedback</a>.
        Please note there can be breaking changes in the next versions of the recipe until we reach stable API.
      </div>
    ))
  }

  pendingModalsLaunch.push(launchBetaModal)
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

  const launchOfficeModal = () => {
    Studio.openModal(() => (
      <div>
        We need to upload your pptx report to our publicly hosted server to be able to use
        Office Online Service for previewing here in the studio. You can disable it in the configuration,
        see <a href='https://jsreport.net/learn/pptx' target='_blank' rel='noreferrer'>https://jsreport.net/learn/pptx</a> for details.
      </div>
    ))
  }

  pendingModalsLaunch.push(launchOfficeModal)
})
