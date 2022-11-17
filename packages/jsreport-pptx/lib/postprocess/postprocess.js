const slides = require('./slides')
const image = require('./image')

module.exports = async (files) => {
  slides(files)
  await image(files)
}
