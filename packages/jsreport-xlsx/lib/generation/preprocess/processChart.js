const path = require('path')
const { nodeListToArray } = require('../../utils')

module.exports = function processChart (files, sheetContent, drawingEl) {
  const { sheetFilepath, sheetRelsDoc } = sheetContent
  const drawingRelId = drawingEl.getAttribute('r:id')
  const sheetRelationshipEls = nodeListToArray(sheetRelsDoc.getElementsByTagName('Relationship'))

  const drawingRelationshipEl = sheetRelationshipEls.find((r) => r.getAttribute('Id') === drawingRelId)

  if (drawingRelationshipEl == null || drawingRelationshipEl.getAttribute('Type') !== 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing') {
    return
  }

  const drawingPath = path.posix.join(path.posix.dirname(sheetFilepath), drawingRelationshipEl.getAttribute('Target'))

  const drawingDoc = files.find((file) => file.path === drawingPath)?.doc

  if (drawingDoc == null) {
    return
  }

  const graphicDataEl = drawingDoc.getElementsByTagName('a:graphicData')[0]

  if (
    graphicDataEl == null
  ) {
    return
  }

  if (
    graphicDataEl.getAttribute('uri') !== 'http://schemas.openxmlformats.org/drawingml/2006/chart' &&
    graphicDataEl.getAttribute('uri') !== 'http://schemas.microsoft.com/office/drawing/2014/chartex'
  ) {
    return
  }

  const graphicDataChartEl = nodeListToArray(graphicDataEl.childNodes).find((el) => {
    let found = false

    found = (
      el.nodeName === 'c:chart' &&
      el.getAttribute('xmlns:c') === 'http://schemas.openxmlformats.org/drawingml/2006/chart' &&
      el.getAttribute('xmlns:r') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    )

    if (!found) {
      found = (
        el.nodeName === 'cx:chart' &&
        el.getAttribute('xmlns:cx') === 'http://schemas.microsoft.com/office/drawing/2014/chartex' &&
        el.getAttribute('xmlns:r') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
      )
    }

    return found
  })

  if (graphicDataChartEl == null) {
    return
  }

  const chartRelId = graphicDataChartEl.getAttribute('r:id')

  const drawingRelsPath = path.posix.join(path.posix.dirname(drawingPath), '_rels', `${path.posix.basename(drawingPath)}.rels`)

  const drawingRelsDoc = files.find((file) => file.path === drawingRelsPath)?.doc

  if (drawingRelsDoc == null) {
    return
  }

  const drawingRelationshipEls = nodeListToArray(drawingRelsDoc.getElementsByTagName('Relationship'))

  const chartRelationshipEl = drawingRelationshipEls.find((r) => r.getAttribute('Id') === chartRelId)

  if (chartRelationshipEl == null) {
    return
  }

  if (
    graphicDataChartEl.prefix === 'cx' &&
    chartRelationshipEl.getAttribute('Type') !== 'http://schemas.microsoft.com/office/2014/relationships/chartEx'
  ) {
    return
  }

  if (
    graphicDataChartEl.prefix === 'c' &&
    chartRelationshipEl.getAttribute('Type') !== 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart'
  ) {
    return
  }

  const chartPath = path.posix.join(path.posix.dirname(sheetFilepath), chartRelationshipEl.getAttribute('Target'))

  const chartDoc = files.find((file) => file.path === chartPath)?.doc

  if (chartDoc == null) {
    return
  }

  let chartEl

  if (graphicDataChartEl.prefix === 'cx') {
    chartEl = chartDoc.getElementsByTagName('cx:chart')[0]
  } else {
    chartEl = chartDoc.getElementsByTagName('c:chart')[0]
  }

  if (chartEl == null) {
    return
  }

  const chartTitles = nodeListToArray(chartEl.getElementsByTagName(`${graphicDataChartEl.prefix}:title`))
  const chartMainTitleEl = chartTitles[0]

  if (chartMainTitleEl == null) {
    return
  }

  if (graphicDataChartEl.prefix === 'cx') {
    const chartMainTitleTxEl = nodeListToArray(chartMainTitleEl.childNodes).find((el) => el.nodeName === 'cx:tx')
    const chartMainTitleTxDataEl = chartMainTitleTxEl != null ? nodeListToArray(chartMainTitleTxEl.childNodes).find((el) => el.nodeName === 'cx:txData') : undefined
    const chartMainTitleTxDataValueEl = chartMainTitleTxDataEl != null ? nodeListToArray(chartMainTitleTxDataEl.childNodes).find((el) => el.nodeName === 'cx:v') : undefined

    if (chartMainTitleTxDataValueEl?.textContent.startsWith('{{xlsxChart')) {
      chartMainTitleTxDataValueEl.textContent = ''
    }
  }
}
