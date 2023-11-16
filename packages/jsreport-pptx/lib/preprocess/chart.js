const path = require('path')
const { nodeListToArray, getCNvPrEl, getChartEl } = require('../utils')

module.exports = (files) => {
  // NOTE: while technically the pptx has header and footer, it seems it does not
  // support rich content (like the docx),
  // so we don't try to check the header/footer xml for charts
  const contentTypesDoc = files.find(f => f.path === '[Content_Types].xml').doc
  const allSlideFiles = files.filter(f => f.path.includes('ppt/slides/slide'))

  for (const slideFile of allSlideFiles) {
    const slideDoc = slideFile.doc
    const slideNumber = parseInt(slideFile.path.replace('ppt/slides/slide', '').replace('.xml', ''))
    const slideRelsDoc = files.find(f => f.path === `ppt/slides/_rels/slide${slideNumber}.xml.rels`).doc
    const maxCNvPrIdAttrName = `slide${slideNumber}graphicFrameMaxCNvPrId`
    // the id is unique per slide
    let maxCNvPrId

    const graphicFrameEls = nodeListToArray(slideDoc.getElementsByTagName('p:graphicFrame'))

    for (const graphicFrameEl of graphicFrameEls) {
      const cNvPrId = getCNvPrId(graphicFrameEl)

      if (
        cNvPrId != null &&
        (
          maxCNvPrId == null ||
          (maxCNvPrId != null && cNvPrId > maxCNvPrId)
        )
      ) {
        maxCNvPrId = cNvPrId
      }

      processChartEl(files, graphicFrameEl, slideFile, slideRelsDoc)
    }

    if (maxCNvPrId != null) {
      contentTypesDoc.documentElement.setAttribute(maxCNvPrIdAttrName, maxCNvPrId)
    }
  }
}

function processChartEl (files, graphicFrameEl, slideFile, relsDoc) {
  const chartEl = getChartEl(graphicFrameEl)

  if (!chartEl) {
    return
  }

  const slidePath = slideFile.path
  const relsElements = nodeListToArray(relsDoc.getElementsByTagName('Relationship'))
  const chartRId = chartEl.getAttribute('r:id')
  const chartREl = relsElements.find((r) => r.getAttribute('Id') === chartRId)
  const chartPath = path.posix.join(path.posix.dirname(slidePath), chartREl.getAttribute('Target'))
  const chartFile = files.find(f => f.path === chartPath)
  const chartDoc = chartFile.doc
  const chartTitles = nodeListToArray(chartDoc.getElementsByTagName(`${chartEl.prefix}:title`))
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

  const chartMainReplaceEl = chartDoc.createElement('pptxChartMainReplace')

  chartMainReplaceEl.appendChild(chartMainTitleEl.cloneNode(true))

  for (const chartAxTitleEl of chartAxTitleEls) {
    chartMainReplaceEl.appendChild(chartAxTitleEl.cloneNode(true))
  }

  graphicFrameEl.insertBefore(chartMainReplaceEl, graphicFrameEl.firstChild)

  while (chartMainTitleEl.firstChild) {
    chartMainTitleEl.removeChild(chartMainTitleEl.firstChild)
  }

  for (const chartAxTitleEl of chartAxTitleEls) {
    while (chartAxTitleEl.firstChild) {
      chartAxTitleEl.removeChild(chartAxTitleEl.firstChild)
    }
  }
}

function getCNvPrId (graphicFrameEl) {
  const containerEl = nodeListToArray(graphicFrameEl.childNodes).find((node) => node.nodeName === 'p:nvGraphicFramePr')

  if (!containerEl) {
    return
  }

  const cNvPrEl = getCNvPrEl(graphicFrameEl)

  if (!cNvPrEl) {
    return
  }

  const id = parseInt(cNvPrEl.getAttribute('id'), 10)

  if (isNaN(id)) {
    return
  }

  return id
}
