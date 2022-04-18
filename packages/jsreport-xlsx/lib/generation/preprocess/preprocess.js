const concatTags = require('./concatTags')
const loop = require('./loop')
const drawingObject = require('./drawingObject')

module.exports = (files, meta) => {
  concatTags(files)
  loop(files, meta)
  drawingObject(files, meta)
}
