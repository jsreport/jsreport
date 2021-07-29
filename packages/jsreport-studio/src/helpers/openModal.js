import { modalHandler } from '../lib/configuration'

function openModal (componentOrText, options) {
  modalHandler.open(componentOrText, options || {})
}

function isModalOpen () {
  return modalHandler.isModalOpen()
}

export { openModal, isModalOpen }
