const concatTags = require('./concatTags')
const slides = require('./slides')
const list = require('./list')
const table = require('./table')

module.exports = (files) => {
  concatTags(files)
  slides(files)
  list(files)
  table(files)
}
