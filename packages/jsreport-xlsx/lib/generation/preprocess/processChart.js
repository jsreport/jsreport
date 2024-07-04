const path = require('path')
const { nodeListToArray, findChildNode } = require('../../utils')

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

  // drawing in xlsx are in separate files (not inline), this means that it is possible to
  // have multiple charts in a single drawing,
  // so we assume there is going to be more than one chart from the drawing.
  // this was also validated by verifying the output in Excel by duplicating
  // a chart, it always create a drawing with multiple chart definitions.
  const graphicDataEls = nodeListToArray(drawingDoc.getElementsByTagName('a:graphicData'))

  for (const graphicDataEl of graphicDataEls) {
    if (
      graphicDataEl.getAttribute('uri') !== 'http://schemas.openxmlformats.org/drawingml/2006/chart' &&
      graphicDataEl.getAttribute('uri') !== 'http://schemas.microsoft.com/office/drawing/2014/chartex'
    ) {
      continue
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
      continue
    }

    const chartRelId = graphicDataChartEl.getAttribute('r:id')

    const drawingRelsPath = path.posix.join(path.posix.dirname(drawingPath), '_rels', `${path.posix.basename(drawingPath)}.rels`)

    const drawingRelsDoc = files.find((file) => file.path === drawingRelsPath)?.doc

    if (drawingRelsDoc == null) {
      continue
    }

    const drawingRelationshipEls = nodeListToArray(drawingRelsDoc.getElementsByTagName('Relationship'))

    const chartRelationshipEl = drawingRelationshipEls.find((r) => r.getAttribute('Id') === chartRelId)

    if (chartRelationshipEl == null) {
      continue
    }

    if (
      graphicDataChartEl.prefix === 'cx' &&
      chartRelationshipEl.getAttribute('Type') !== 'http://schemas.microsoft.com/office/2014/relationships/chartEx'
    ) {
      continue
    }

    if (
      graphicDataChartEl.prefix === 'c' &&
      chartRelationshipEl.getAttribute('Type') !== 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart'
    ) {
      continue
    }

    const chartPath = path.posix.join(path.posix.dirname(sheetFilepath), chartRelationshipEl.getAttribute('Target'))

    const chartDoc = files.find((file) => file.path === chartPath)?.doc

    if (chartDoc == null) {
      continue
    }

    let chartEl

    if (graphicDataChartEl.prefix === 'cx') {
      chartEl = chartDoc.getElementsByTagName('cx:chart')[0]
    } else {
      chartEl = chartDoc.getElementsByTagName('c:chart')[0]
    }

    if (chartEl == null) {
      continue
    }

    // ensuring the cached strings in xlsx are not processed by handlebars, because it will
    // give errors otherwise
    if (graphicDataChartEl.prefix === 'c') {
      // it seems only the standard charts "c:" cache data in the chart definition,
      // for the chartex it is not needed that we do something
      const existingChartSeriesElements = nodeListToArray(chartDoc.getElementsByTagName('c:ser'))

      for (const chartSerieEl of existingChartSeriesElements) {
        const tagsToCheck = ['c:tx', 'c:cat', 'c:val', 'c:xVal', 'c:yVal', 'c:bubbleSize']

        for (const targetTag of tagsToCheck) {
          const existingTagEl = findChildNode(targetTag, chartSerieEl)

          if (existingTagEl == null) {
            continue
          }

          const strRefEl = findChildNode('c:strRef', existingTagEl)
          const numRefEl = findChildNode('c:numRef', existingTagEl)

          for (const targetInfo of [{ el: strRefEl, cacheTag: 'strCache' }, { el: numRefEl, cacheTag: 'numCache' }]) {
            if (targetInfo.el == null) {
              continue
            }

            const cacheEl = findChildNode(`c:${targetInfo.cacheTag}`, targetInfo.el)

            if (cacheEl == null) {
              continue
            }

            const ptEls = findChildNode('c:pt', cacheEl, true)

            for (const ptEl of ptEls) {
              const ptValueEl = findChildNode('c:v', ptEl)

              if (ptValueEl == null) {
                continue
              }

              if (ptValueEl.textContent.includes('{{') && ptValueEl.textContent.includes('}}')) {
                ptValueEl.textContent = `{{{{_D t='raw'}}}}${ptValueEl.textContent}{{{{/_D}}}}`
              }
            }
          }
        }
      }
    }

    const chartTitles = nodeListToArray(chartEl.getElementsByTagName(`${graphicDataChartEl.prefix}:title`))
    const chartMainTitleEl = chartTitles[0]

    if (chartMainTitleEl == null) {
      continue
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
}
