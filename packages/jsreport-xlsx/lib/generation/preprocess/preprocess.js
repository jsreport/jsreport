const concatTags = require('./concatTags')
const loop = require('./loop')
const drawingObject = require('./drawingObject')

module.exports = (files, sharedData) => {
  concatTags(files)
  loop(files, sharedData)
  drawingObject(files)
}
