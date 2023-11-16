const concatTags = require('./concatTags')
const slides = require('./slides')
const list = require('./list')
const table = require('./table')
const chart = require('./chart')

module.exports = (files) => {
  concatTags(files)
  slides(files)
  chart(files)
  list(files)
  table(files)
}
