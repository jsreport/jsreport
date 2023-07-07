import { values as configuration } from '../lib/configuration'

function openModal (componentOrText, options) {
  configuration.modalHandler.open(componentOrText, options || {})
}

function isModalOpen () {
  return configuration.modalHandler.isModalOpen()
}

export { openModal, isModalOpen }
