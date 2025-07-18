const { getSectionDetail } = require('../sectionUtils')
const { nodeListToArray } = require('../utils')

module.exports = (files, sharedData) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentFilePath = documentFile.path
  const documentDoc = documentFile.doc
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc

  const sectionPrEls = nodeListToArray(documentDoc.getElementsByTagName('w:sectPr'))

  const sections = []

  sharedData.sections = {
    template: {
      data: new Map()
    },
    output: {
      counter: new Map()
    }
  }

  sharedData.headerAndFooterSections = new Map()

  for (const sectionPrEl of sectionPrEls) {
    const section = getSectionDetail(sectionPrEl, { documentFilePath, documentRelsDoc, files })

    // we are using a simple sequential number as the id just for simplicity,
    // but we can use anything, we treat it as a opaque string
    const sectionId = sections.length.toString()

    sharedData.sections.template.data.set(sectionId, {
      colsWidth: section.colsWidth
    })

    sectionPrEl.setAttribute('__cId__', sectionId)

    sections.push(section)

    if (section.headerFooterReferences?.length > 0) {
      for (const ref of section.headerFooterReferences) {
        sharedData.headerAndFooterSections.set(ref.name, sectionId)
      }
    }
  }

  return sections
}
