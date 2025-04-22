const { getSectionDetail } = require('../sectionUtils')
const { nodeListToArray } = require('../utils')

module.exports = (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentFilePath = documentFile.path
  const documentDoc = documentFile.doc
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc

  const sectionPrEls = nodeListToArray(documentDoc.getElementsByTagName('w:sectPr'))

  const sections = []

  for (const sectionPrEl of sectionPrEls) {
    const section = getSectionDetail(sectionPrEl, { documentFilePath, documentRelsDoc, files })

    sections.push(section)

    const extraAttrs = [`colsWidth="${section.colsWidth.join(',')}"`]

    if (section.headerFooterReferences?.length > 0) {
      extraAttrs.push(`hf="${section.headerFooterReferences.map((ref) => ref.name).join(',')}"`)
    }

    // we add a wrapper to be able to parse this easily in the post-process
    const contextStartEl = documentDoc.createElement('docxRemove')
    contextStartEl.textContent = `{{#docxContext type='section' ${extraAttrs.join(' ')}}}`

    const contextEndEl = documentDoc.createElement('docxRemove')
    contextEndEl.textContent = '{{/docxContext}}'

    sectionPrEl.parentNode.insertBefore(contextStartEl, sectionPrEl)
    sectionPrEl.parentNode.insertBefore(contextEndEl, sectionPrEl.nextSibling)
  }

  return sections
}
