const concatTags = require('./concatTags')
const base = require('./base')
const sheet = require('./sheet/sheet')
const drawingObject = require('./drawingObject/drawingObject')

module.exports = (files, sharedData) => {
  const endCallbacks = []

  const addEndCallback = (cb) => {
    endCallbacks.push(cb)
  }

  const parameters = {
    files,
    sharedData,
    addEndCallback
  }

  concatTags(parameters)
  base(parameters)
  sheet(parameters)
  drawingObject(parameters)

  for (const endCallback of endCallbacks) {
    endCallback()
  }
}
