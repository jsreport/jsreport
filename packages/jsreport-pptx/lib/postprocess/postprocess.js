const slides = require('./slides')
const image = require('./image')
const chart = require('./chart')
const clearOriginalSlideNumber = require('./clearOriginalSlideNumber')

module.exports = async (files) => {
  slides(files)
  await image(files)
  await chart(files)
  clearOriginalSlideNumber(files)
}
