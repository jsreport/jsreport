const concatTags = require('./concatTags')
const slides = require('./slides')
const list = require('./list')
const table = require('./table')
const link = require('./link')
const chart = require('./chart')
const style = require('./style')
const context = require('./context')

module.exports = (files, sharedData) => {
  concatTags(files)
  slides(files)
  chart(files)
  list(files)
  table(files)
  link(files)
  style(files)
  // we process context here to ensure we get the chance to pick all changes,
  // no transformation done here other than adding the wrapping helper calls
  context(files, sharedData)
}
