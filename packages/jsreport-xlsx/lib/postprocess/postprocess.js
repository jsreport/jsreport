const loop = require('./loop')
const drawingObject = require('./drawingObject')

module.exports = async (files) => {
  await loop(files)
  await drawingObject(files)
}
