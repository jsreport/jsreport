import Studio from 'jsreport-studio'
import CreateSamplesModal from './CreateSamplesModal'

Studio.readyListeners.push(() => {
  const samplesCreated = Studio.getSettingValueByKey('sample-created', false) === true

  if (
    Studio.extensions['sample-template'].options.createSamples != null ||
    samplesCreated === true ||
    Studio.extensions['sample-template'].options.skipCreateSamplesModal === true
  ) {
    return
  }

  if (Studio.getAllEntities().length === 0) {
    Studio.openModal(CreateSamplesModal)
  }
})
