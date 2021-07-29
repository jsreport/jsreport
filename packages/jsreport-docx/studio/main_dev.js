import Properties from './DocxProperties'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent(Properties.title, Properties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'docx')

Studio.entityEditorComponentKeyResolvers.push((entity) => {
  if (entity.__entitySet === 'templates' && entity.recipe === 'docx') {
    let officeAsset

    if (entity.docx != null && entity.docx.templateAssetShortid != null) {
      officeAsset = Studio.getEntityByShortid(entity.docx.templateAssetShortid, false)
    }

    return {
      key: 'assets',
      entity: officeAsset,
      props: {
        icon: 'fa-link',
        embeddingCode: '',
        helpersEntity: entity,
        displayName: `docx asset: ${officeAsset != null ? officeAsset.name : '<none>'}`,
        emptyMessage: 'No docx asset assigned, please add a reference to a docx asset in the properties'
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
  if (request.template.recipe !== 'docx') {
    return
  }

  if (Studio.extensions.docx.options.beta.showWarning === false) {
    return
  }

  if (Studio.getSettingValueByKey('beta-docx-informed', false) === true) {
    return
  }

  Studio.setSetting('beta-docx-informed', true)

  const launchBetaModal = () => {
    Studio.openModal(() => (
      <div>
        docx recipe is currently in the beta phase and in continuous development. There're use cases it doesn't support yet but we get there soon if you help us with <a href='https://forum.jsreport.net' target='_blank'>feedback</a>. Please note there can be breaking changes in the next versions of the recipe until we reach stable API.
      </div>
    ))
  }

  pendingModalsLaunch.push(launchBetaModal)
})

Studio.runListeners.push((request, entities) => {
  if (request.template.recipe !== 'docx') {
    return
  }

  if (Studio.extensions.docx.options.preview.enabled === false) {
    return
  }

  if (Studio.extensions.docx.options.preview.showWarning === false) {
    return
  }

  if (Studio.getSettingValueByKey('office-preview-informed', false) === true) {
    return
  }

  Studio.setSetting('office-preview-informed', true)

  const launchOfficeModal = () => {
    Studio.openModal(() => <div>
      We need to upload your docx report to our publicly hosted server to be able to use
      Office Online Service for previewing here in the studio. You can disable it in the configuration, see <a
        href='https://jsreport.net/learn/docx' target='_blank'>https://jsreport.net/learn/docx</a> for details.
    </div>)
  }

  pendingModalsLaunch.push(launchOfficeModal)
})

Studio.runListeners.push(() => {
  if (pendingModalsLaunch.length === 0) {
    clearInterval(pendingModalsInterval)
  }
})
