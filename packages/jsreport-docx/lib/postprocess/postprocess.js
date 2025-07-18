const sections = require('./sections')
const bookmark = require('./bookmark')
const drawingObject = require('./drawingObject')
const table = require('./table')
const link = require('./link')
const form = require('./form')
const watermark = require('./watermark')
const pageBreak = require('./pageBreak')
const toc = require('./toc')
const removeBlockHelper = require('./removeBlockHelper')
const html = require('./html')

module.exports = async (files, sharedData) => {
  const newBookmarksMap = new Map()
  const sectionsDetails = await sections(files, sharedData)

  const headerFooterRefs = sectionsDetails.reduce((acu, section) => {
    if (section.headerFooterReferences) {
      acu.push(...section.headerFooterReferences)
    }

    return acu
  }, [])

  // we handle the html step as the first to ensure no other step
  // work with the attribute and comment we put for the <w:p> elements for the html handling
  await html(files, sectionsDetails, sharedData)
  await bookmark(files, headerFooterRefs, newBookmarksMap)
  await watermark(files)
  await pageBreak(files)
  await drawingObject(files, headerFooterRefs, newBookmarksMap, sharedData)
  link(files)
  form(files)
  await toc(files)
  await removeBlockHelper(files)
  await table(files, headerFooterRefs)
}
