const concatTags = require('./concatTags')
const bookmark = require('./bookmark')
const drawingObject = require('./drawingObject')
const list = require('./list')
const raw = require('./raw')
const table = require('./table')
const link = require('./link')
const style = require('./style')
const pageBreak = require('./pageBreak')
const toc = require('./toc')
const watermark = require('./watermark')
const html = require('./html')

module.exports = (files) => {
  concatTags(files)
  bookmark(files)
  watermark(files)
  drawingObject(files)
  list(files)
  raw(files)
  table(files)
  link(files)
  style(files)
  toc(files)
  pageBreak(files)
  // we handle the html step as the last to ensure no other step
  // work with the attribute and comment we put in the <w:p> elements for the html handling
  html(files)
}
