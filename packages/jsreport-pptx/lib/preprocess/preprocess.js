const concatTags = require('./concatTags')
const slides = require('./slides')
const list = require('./list')
const table = require('./table')
const link = require('./link')
const chart = require('./chart')
const style = require('./style')

module.exports = (files) => {
  concatTags(files)
  slides(files)
  chart(files)
  list(files)
  table(files)
  link(files)
  style(files)
}
