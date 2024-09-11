const concatTags = require('./concatTags')
const loop = require('./loop')
const drawingObject = require('./drawingObject')

module.exports = (files, ctx) => {
  concatTags(files)
  loop(files, ctx)
  drawingObject(files)
}
