const concatTags = require('./concatTags')
const context = require('./context')
const sections = require('./sections')
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
const child = require('./child')

module.exports = (files) => {
  concatTags(files)

  const sectionsDetails = sections(files)

  const headerFooterRefs = sectionsDetails.reduce((acu, section) => {
    if (section.headerFooterReferences) {
      acu.push(...section.headerFooterReferences)
    }

    return acu
  }, [])

  context(files, headerFooterRefs)
  bookmark(files, headerFooterRefs)
  watermark(files, headerFooterRefs)
  drawingObject(files, headerFooterRefs)
  list(files)
  raw(files)
  table(files)
  link(files)
  style(files)
  toc(files)
  pageBreak(files)
  child(files, headerFooterRefs)
  // we handle the html step as the last to ensure no other step
  // work with the attribute and comment we put in the <w:p> elements for the html handling
  html(files, headerFooterRefs)
}
