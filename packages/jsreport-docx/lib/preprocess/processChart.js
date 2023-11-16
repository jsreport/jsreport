const path = require('path')
const { nodeListToArray, getChartEl } = require('../utils')

module.exports = function processChart (files, drawingEl, documentFile, relsDoc) {
  // drawing in docx is inline, this means that it seems not possible to
  // have multiple charts in a single drawing,
  // so we still assume to get a single chart from the drawing.
  // this was also validated by verifying the output in Word by duplicating
  // a chart, it always create two separate inline drawings with single chart on each
  const chartDrawingEl = getChartEl(drawingEl)

  if (!chartDrawingEl) {
    return
  }

  const documentPath = documentFile.path
  const relsElements = nodeListToArray(relsDoc.getElementsByTagName('Relationship'))
  const chartRId = chartDrawingEl.getAttribute('r:id')
  const chartREl = relsElements.find((r) => r.getAttribute('Id') === chartRId)
  const chartPath = path.posix.join(path.posix.dirname(documentPath), chartREl.getAttribute('Target'))
  const chartFile = files.find(f => f.path === chartPath)
  const chartDoc = chartFile.doc
  const chartTitles = nodeListToArray(chartDoc.getElementsByTagName(`${chartDrawingEl.prefix}:title`))
  const chartMainTitleEl = chartTitles[0]

  if (!chartMainTitleEl) {
    return
  }

  const chartAxTitleEls = []

  for (const titleEl of chartTitles.slice(1)) {
    if (titleEl.parentNode.localName === 'catAx' || titleEl.parentNode.localName === 'valAx') {
      chartAxTitleEls.push(titleEl)
    }
  }

  const chartMainReplaceEl = chartDoc.createElement('docxChartMainReplace')

  chartMainReplaceEl.appendChild(chartMainTitleEl.cloneNode(true))

  for (const chartAxTitleEl of chartAxTitleEls) {
    chartMainReplaceEl.appendChild(chartAxTitleEl.cloneNode(true))
  }

  drawingEl.insertBefore(chartMainReplaceEl, drawingEl.firstChild)

  while (chartMainTitleEl.firstChild) {
    chartMainTitleEl.removeChild(chartMainTitleEl.firstChild)
  }

  for (const chartAxTitleEl of chartAxTitleEls) {
    while (chartAxTitleEl.firstChild) {
      chartAxTitleEl.removeChild(chartAxTitleEl.firstChild)
    }
  }
}
