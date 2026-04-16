const { DOMParser } = require('@xmldom/xmldom')
const stringReplaceAsync = require('../stringReplaceAsync')
const { getSectionDetail } = require('../sectionUtils')

module.exports = async (files, sharedData) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentFilePath = documentFile.path
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const sections = []

  const sectionsCounter = new Map()
  // we are sure the last section is the last sequential number in the template, because
  // there is no way user content can change that section
  const latestSectionId = (sharedData.sections.template.data.size - 1).toString()
  const totalSectionsMarkCount = Array.from(sharedData.sections.output.counter.values()).reduce((acu, info) => acu + info.count, 0)
  const totalSectionsMarkBeforeLastCount = totalSectionsMarkCount - sharedData.sections.output.counter.get(latestSectionId).count
  const replaceLastSection = sharedData.sections.output.counter.size > 1 && sharedData.sections.output.counter.get(latestSectionId).count === 1
  let sectionMarkCount = 0
  let sectionToMoveId

  documentFile.data = await stringReplaceAsync(
    documentFile.data.toString(),
    /<!--__docxSectionPr([\d]+)__-->/g,
    async (match, sectionId) => {
      const currentRepetition = (sectionsCounter.get(sectionId) ?? 0) + 1

      sectionsCounter.set(sectionId, currentRepetition)
      sectionMarkCount++

      if (!sharedData.sections.output.counter.get(sectionId).keep.includes(currentRepetition)) {
        return ''
      }

      if (sharedData.sections.output.counter.size > 1 && sectionMarkCount === totalSectionsMarkBeforeLastCount) {
        sectionToMoveId = sectionId
      }

      if (replaceLastSection && sectionId === sectionToMoveId) {
        // the previous section is moved to the last section, so in this place we just
        // return an empty string
        return ''
      }

      let sectionXml

      if (replaceLastSection && sectionId === latestSectionId) {
        sectionXml = sharedData.sections.template.data.get(sectionToMoveId).xml
      } else {
        sectionXml = sharedData.sections.template.data.get(sectionId).xml
      }

      const doc = new DOMParser().parseFromString(sectionXml)
      const sectionPrEl = doc.documentElement
      const section = getSectionDetail(sectionPrEl, { documentFilePath, documentRelsDoc, files })
      sections.push(section)

      return sectionXml
    }
  )

  return sections
}
