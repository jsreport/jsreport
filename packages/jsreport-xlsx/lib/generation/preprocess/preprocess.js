const concatTags = require('./concatTags')
const loop = require('./loop/loop')
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
  loop(parameters)
  drawingObject(parameters)

  for (const endCallback of endCallbacks) {
    endCallback()
  }
}
