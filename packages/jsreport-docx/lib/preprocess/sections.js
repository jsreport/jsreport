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

    // we add a wrapper to be able to parse this easily in the post-process
    const wrapperEl = documentDoc.createElement('docxWrappedSectPr')
    const clonedSectionPrEl = sectionPrEl.cloneNode(true)
    clonedSectionPrEl.setAttribute('__sectionIdx__', '{{docxContext type="sectionIdx" increment=true}}')
    wrapperEl.appendChild(clonedSectionPrEl)
    sectionPrEl.parentNode.replaceChild(wrapperEl, sectionPrEl)
  }

  return sections
}
