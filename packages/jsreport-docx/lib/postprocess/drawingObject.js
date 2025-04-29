const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray, serializeXml, getNewIdFromBaseId, getDocPrEl } = require('../utils')
const recursiveStringReplaceAsync = require('../recursiveStringReplaceAsync')
const processImage = require('./processImage')
const processChart = require('./processChart')

module.exports = async (files, headerFooterRefs, newBookmarksMap, sharedData) => {
  const contentTypesDoc = files.find(f => f.path === '[Content_Types].xml').doc
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const docPrIdCounterMap = new Map()
  const imagesNewRelIdCounterMap = new Map()
  const chartsNewRelIdCounterMap = new Map()
  const originalChartsXMLMap = new Map()
  let maxDocPrId

  if (contentTypesDoc.documentElement.hasAttribute('drawingMaxDocPrId')) {
    maxDocPrId = parseInt(contentTypesDoc.documentElement.getAttribute('drawingMaxDocPrId'), 10)
    contentTypesDoc.documentElement.removeAttribute('drawingMaxDocPrId')
  }

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<w:drawing>',
    '</w:drawing>',
    'g',
    async (val, content, hasNestedMatch) => {
      const doc = new DOMParser({
        xmlns: {
          c: 'http://schemas.openxmlformats.org/drawingml/2006/chart',
          a: 'http://schemas.openxmlformats.org/drawingml/2006/main'
        }
      }).parseFromString(val)

      const drawingEl = doc.documentElement

      const newDrawingEl = processDrawingEl(drawingEl, doc, documentRelsDoc, hasNestedMatch)

      if (newDrawingEl != null) {
        return newDrawingEl === '' ? newDrawingEl : serializeXml(newDrawingEl)
      }

      return val
    }
  )

  for (const { doc: headerFooterDoc, relsDoc: headerFooterRelsDoc } of headerFooterRefs) {
    if (headerFooterRelsDoc == null) {
      continue
    }

    const drawingEls = nodeListToArray(headerFooterDoc.getElementsByTagName('w:drawing'))

    for (const drawingEl of drawingEls) {
      const hasNestedMatch = nodeListToArray(drawingEl.getElementsByTagName('w:drawing')).length > 0
      const newDrawingEl = processDrawingEl(drawingEl, headerFooterDoc, headerFooterRelsDoc, hasNestedMatch)

      if (newDrawingEl == null) {
        continue
      }

      if (newDrawingEl !== '') {
        drawingEl.parentNode.insertBefore(newDrawingEl, drawingEl)
      }

      drawingEl.parentNode.removeChild(drawingEl)
    }
  }

  function processDrawingEl (referenceDrawingEl, doc, relsDoc, hasNestedMatch) {
    const drawingEl = referenceDrawingEl.cloneNode(true)
    let changedDocPrId = false
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

    const newImageDrawingEl = processImage(files, drawingEl, doc, relsDoc, imagesNewRelIdCounterMap, newBookmarksMap)

    if (newImageDrawingEl != null) {
      return newImageDrawingEl
    }

    // only process charts it is a standalone drawing element
    if (hasNestedMatch) {
      return changedDocPrId ? drawingEl : null
    }

    const newChartDrawingEl = processChart(files, drawingEl, relsDoc, originalChartsXMLMap, chartsNewRelIdCounterMap)

    if (newChartDrawingEl) {
      return newChartDrawingEl
    }

    return changedDocPrId ? drawingEl : null
  }
}
