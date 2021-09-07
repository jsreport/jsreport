const { nodeListToArray, getChartEl } = require('../utils')

module.exports = function processChart (files, drawingEl) {
  const relsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const chartDrawingEl = getChartEl(drawingEl)

  if (!chartDrawingEl) {
    return
  }

  const relsElements = nodeListToArray(relsDoc.getElementsByTagName('Relationship'))
  const chartRId = chartDrawingEl.getAttribute('r:id')
  const chartREl = relsElements.find((r) => r.getAttribute('Id') === chartRId)
  const chartFilename = `word/${chartREl.getAttribute('Target')}`
  const chartFile = files.find(f => f.path === chartFilename)
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
