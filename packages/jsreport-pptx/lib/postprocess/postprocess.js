const slides = require('./slides')
const style = require('./style')
const image = require('./image')
const chart = require('./chart')
const link = require('./link')
const removeBlockHelper = require('./removeBlockHelper')
const table = require('./table')
const clearOriginalSlideNumber = require('./clearOriginalSlideNumber')

module.exports = async (files) => {
  slides(files)
  style(files)
  await image(files)
  await chart(files)
  link(files)
  removeBlockHelper(files)
  table(files)
  clearOriginalSlideNumber(files)
}
