const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray, serializeXml, getNewIdFromBaseId } = require('../utils')
const recursiveStringReplaceAsync = require('../recursiveStringReplaceAsync')
const processImage = require('./processImage')
const processChart = require('./processChart')

module.exports = async (files, newBookmarksMap, options) => {
  const contentTypesFile = files.find(f => f.path === '[Content_Types].xml').doc
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const docPrIdCounterMap = new Map()
  const imagesNewRelIdCounterMap = new Map()
  const chartsNewRelIdCounterMap = new Map()
  const originalChartsXMLMap = new Map()
  let maxDocPrId

  if (contentTypesFile.documentElement.hasAttribute('drawingMaxDocPrId')) {
    maxDocPrId = parseInt(contentTypesFile.documentElement.getAttribute('drawingMaxDocPrId'), 10)
    contentTypesFile.documentElement.removeAttribute('drawingMaxDocPrId')
  }

  documentFile.data = await recursiveStringReplaceAsync(
    {
      string: documentFile.data.toString(),
      parallelLimit: options.imageFetchParallelLimit
    },
    '<w:drawing>',
    '</w:drawing>',
    'g',
    async (val, content, hasNestedMatch) => {
      let changedDocPrId = false
      const drawingEl = new DOMParser({
        xmlns: {
          c: 'http://schemas.openxmlformats.org/drawingml/2006/chart',
          a: 'http://schemas.openxmlformats.org/drawingml/2006/main'
        }
      }).parseFromString(val).documentElement

      const docPrEl = getDocPrEl(drawingEl)
      let docPrId

      if (docPrEl != null) {
        const id = parseInt(docPrEl.getAttribute('id'), 10)

        if (!isNaN(id)) {
          docPrId = id
        }
      }

      // fix id for elements that have been generated after loop
      if (docPrId != null) {
        const newDocPrId = getNewIdFromBaseId(docPrIdCounterMap, docPrId, maxDocPrId || 0)

        if (newDocPrId !== docPrId) {
          changedDocPrId = true
          maxDocPrId = newDocPrId
          docPrEl.setAttribute('id', newDocPrId)
        }
      }

      const imageResult = await processImage(files, drawingEl, imagesNewRelIdCounterMap, newBookmarksMap)

      if (imageResult != null) {
        return imageResult
      }

      // only process charts it is a standalone drawing element
      if (hasNestedMatch) {
        return changedDocPrId ? serializeXml(drawingEl) : val
      }

      const chartResult = await processChart(files, drawingEl, originalChartsXMLMap, chartsNewRelIdCounterMap)

      if (chartResult) {
        return chartResult
      }

      return changedDocPrId ? serializeXml(drawingEl) : val
    }
  )
}

function getDocPrEl (drawingEl) {
  const docPrEl = nodeListToArray(drawingEl.firstChild.childNodes).find((el) => el.nodeName === 'wp:docPr')

  if (!docPrEl) {
    return
  }

  return docPrEl
}
