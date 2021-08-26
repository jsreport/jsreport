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

  let chartCatAxTitleEl
  let chartValAxTitleEl

  for (const titleEl of chartTitles.slice(1)) {
    if (titleEl.parentNode.localName === 'catAx') {
      chartCatAxTitleEl = titleEl
    } else if (titleEl.parentNode.localName === 'valAx') {
      chartValAxTitleEl = titleEl
    }
  }

  const chartMainReplaceEl = chartDoc.createElement('docxChartMainReplace')

  chartMainReplaceEl.appendChild(chartMainTitleEl.cloneNode(true))

  if (chartCatAxTitleEl) {
    chartMainReplaceEl.appendChild(chartCatAxTitleEl.cloneNode(true))
  }

  if (chartValAxTitleEl) {
    chartMainReplaceEl.appendChild(chartValAxTitleEl.cloneNode(true))
  }

  drawingEl.insertBefore(chartMainReplaceEl, drawingEl.firstChild)

  while (chartMainTitleEl.firstChild) {
    chartMainTitleEl.removeChild(chartMainTitleEl.firstChild)
  }

  if (chartCatAxTitleEl) {
    while (chartCatAxTitleEl.firstChild) {
      chartCatAxTitleEl.removeChild(chartCatAxTitleEl.firstChild)
    }
  }

  if (chartValAxTitleEl) {
    while (chartValAxTitleEl.firstChild) {
      chartValAxTitleEl.removeChild(chartValAxTitleEl.firstChild)
    }
  }
}
