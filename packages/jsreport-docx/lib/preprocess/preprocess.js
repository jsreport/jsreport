const base = require('./base')
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
const object = require('./object')
const html = require('./html')
const child = require('./child')

module.exports = (files, sharedData) => {
  base(files, sharedData)
  concatTags(files)

  const sectionsDetails = sections(files, sharedData)

  const headerFooterRefs = sectionsDetails.reduce((acu, section) => {
    if (section.headerFooterReferences) {
      acu.push(...section.headerFooterReferences)
    }

    return acu
  }, [])

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
  object(files, headerFooterRefs, sharedData)
  // we handle the html step as the last processing step to ensure no other step
  // work with the attribute and comment we put in the <w:p> elements for the html handling
  html(files, headerFooterRefs)
  // we process context here to ensure we get the chance to pick all changes,
  // no transformation done here other than adding the wrapping helper calls
  context(files, headerFooterRefs, sharedData)

  return headerFooterRefs
}
