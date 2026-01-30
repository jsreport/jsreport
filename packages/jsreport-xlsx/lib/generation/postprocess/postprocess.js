const drawingObject = require('./drawingObject/drawingObject')

module.exports = async (files, sharedData) => {
  await drawingObject(files, sharedData)
}
