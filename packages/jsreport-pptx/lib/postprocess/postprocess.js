const slides = require('./slides')
const image = require('./image')
const chart = require('./chart')
const link = require('./link')
const removeBlockHelper = require('./removeBlockHelper')
const table = require('./table')
const clearOriginalSlideNumber = require('./clearOriginalSlideNumber')

module.exports = async (files, sharedData) => {
  slides(files)
  await image(files)
  await chart(files)
  link(files)
  removeBlockHelper(files)
  table(files)
  clearOriginalSlideNumber(files)
}
