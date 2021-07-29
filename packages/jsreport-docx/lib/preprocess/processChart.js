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
  const chartTitleEl = chartDoc.getElementsByTagName(`${chartDrawingEl.prefix}:title`)[0]

  if (!chartTitleEl) {
    return
  }

  const chartTitleElClone = chartTitleEl.cloneNode(true)

  drawingEl.insertBefore(chartTitleElClone, drawingEl.firstChild)

  while (chartTitleEl.firstChild) {
    chartTitleEl.removeChild(chartTitleEl.firstChild)
  }
}
