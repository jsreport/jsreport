const path = require('path')
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const moment = require('moment')
const toExcelDate = require('js-excel-date-convert').toExcelDate
const { serializeXml, nodeListToArray, getChartEl, getNewRelIdFromBaseId, clearEl, findChildNode, findOrCreateChildNode } = require('../utils')

module.exports = function processChart (files, referenceDrawingEl, relsDoc, originalChartsXMLMap, newRelIdCounterMap) {
  const drawingEl = referenceDrawingEl.cloneNode(true)
  const relsEl = relsDoc.getElementsByTagName('Relationships')[0]
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const contentTypesDoc = files.find(f => f.path === '[Content_Types].xml').doc

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
  let chartRId = chartDrawingEl.getAttribute('r:id')
  let chartREl = nodeListToArray(relsDoc.getElementsByTagName('Relationship')).find((r) => r.getAttribute('Id') === chartRId)
  let chartPath = path.posix.join(path.posix.dirname(documentPath), chartREl.getAttribute('Target'))
  let chartFile = files.find(f => f.path === chartPath)
  // take the original (not modified) document
  let chartDoc = originalChartsXMLMap.has(chartPath) ? new DOMParser().parseFromString(originalChartsXMLMap.get(chartPath)) : chartFile.doc

  if (!originalChartsXMLMap.has(chartPath)) {
    originalChartsXMLMap.set(chartPath, new XMLSerializer().serializeToString(chartDoc))
  }

  let chartRelsFilename = `word/charts/_rels/${chartPath.split('/').slice(-1)[0]}.rels`
  // take the original (not modified) document
  let chartRelsDoc = originalChartsXMLMap.has(chartRelsFilename) ? new DOMParser().parseFromString(originalChartsXMLMap.get(chartRelsFilename)) : files.find(f => f.path === chartRelsFilename).doc

  if (!originalChartsXMLMap.has(chartRelsFilename)) {
    originalChartsXMLMap.set(chartRelsFilename, new XMLSerializer().serializeToString(chartRelsDoc))
  }

  const chartStyleRelNode = nodeListToArray(chartRelsDoc.getElementsByTagName('Relationship')).find((el) => {
    return el.getAttribute('Type') === 'http://schemas.microsoft.com/office/2011/relationships/chartStyle'
  })

  let chartStyleRelFilename

  if (chartStyleRelNode) {
    chartStyleRelFilename = `word/charts/${chartStyleRelNode.getAttribute('Target')}`
  }

  if (chartStyleRelFilename && !originalChartsXMLMap.has(chartStyleRelFilename)) {
    originalChartsXMLMap.set(chartStyleRelFilename, new XMLSerializer().serializeToString(
      files.find((f) => f.path === chartStyleRelFilename).doc
    ))
  }

  const chartColorStyleRelNode = nodeListToArray(chartRelsDoc.getElementsByTagName('Relationship')).find((el) => {
    return el.getAttribute('Type') === 'http://schemas.microsoft.com/office/2011/relationships/chartColorStyle'
  })

  let chartColorStyleRelFilename

  if (chartColorStyleRelNode) {
    chartColorStyleRelFilename = `word/charts/${chartColorStyleRelNode.getAttribute('Target')}`
  }

  if (chartColorStyleRelFilename && !originalChartsXMLMap.has(chartColorStyleRelFilename)) {
    originalChartsXMLMap.set(chartColorStyleRelFilename, new XMLSerializer().serializeToString(
      files.find((f) => f.path === chartColorStyleRelFilename).doc
    ))
  }

  if (drawingEl.firstChild.localName === 'docxChartMainReplace') {
    const newChartMainTitleEl = drawingEl.firstChild.firstChild
    const newChartAxTitleEls = []
    let currentNode = newChartMainTitleEl

    do {
      currentNode = currentNode.nextSibling

      if (currentNode) {
        newChartAxTitleEls.push(currentNode)
      }
    } while (currentNode)

    const newChartRelId = getNewRelIdFromBaseId(relsDoc, newRelIdCounterMap, chartRId)

    if (chartRId !== newChartRelId) {
      const newRel = nodeListToArray(relsDoc.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === chartRId
      }).cloneNode()

      newRel.setAttribute('Id', newChartRelId)

      let getIdRegexp

      if (chartDrawingEl.prefix === 'cx') {
        getIdRegexp = () => /word\/charts\/chartEx(\d+)\.xml/
      } else {
        getIdRegexp = () => /word\/charts\/chart(\d+)\.xml/
      }

      const newChartId = files.filter((f) => getIdRegexp().test(f.path)).reduce((lastId, f) => {
        const numStr = getIdRegexp().exec(f.path)[1]
        const num = parseInt(numStr, 10)

        if (num > lastId) {
          return num
        }

        return lastId
      }, 0) + 1

      let filePrefix = 'chart'

      if (chartDrawingEl.prefix === 'cx') {
        filePrefix = 'chartEx'
      }

      newRel.setAttribute('Target', `charts/${filePrefix}${newChartId}.xml`)

      relsEl.appendChild(newRel)

      const originalChartXMLStr = originalChartsXMLMap.get(chartPath)
      const newChartDoc = new DOMParser().parseFromString(originalChartXMLStr)

      chartDoc = newChartDoc

      files.push({
        path: `word/charts/${filePrefix}${newChartId}.xml`,
        data: originalChartXMLStr,
        // creates new doc
        doc: newChartDoc
      })

      const originalChartRelsXMLStr = originalChartsXMLMap.get(chartRelsFilename)
      const newChartRelsDoc = new DOMParser().parseFromString(originalChartRelsXMLStr)

      files.push({
        path: `word/charts/_rels/${filePrefix}${newChartId}.xml.rels`,
        data: originalChartRelsXMLStr,
        // creates new doc
        doc: newChartRelsDoc
      })

      let newChartStyleId

      if (chartStyleRelFilename != null) {
        newChartStyleId = files.filter((f) => /word\/charts\/style(\d+)\.xml/.test(f.path)).reduce((lastId, f) => {
          const numStr = /word\/charts\/style(\d+)\.xml/.exec(f.path)[1]
          const num = parseInt(numStr, 10)

          if (num > lastId) {
            return num
          }

          return lastId
        }, 0) + 1

        files.push({
          path: `word/charts/style${newChartStyleId}.xml`,
          data: originalChartsXMLMap.get(chartStyleRelFilename),
          doc: new DOMParser().parseFromString(originalChartsXMLMap.get(chartStyleRelFilename))
        })
      }

      let newChartColorStyleId

      if (chartColorStyleRelFilename != null) {
        newChartColorStyleId = files.filter((f) => /word\/charts\/colors(\d+)\.xml/.test(f.path)).reduce((lastId, f) => {
          const numStr = /word\/charts\/colors(\d+)\.xml/.exec(f.path)[1]
          const num = parseInt(numStr, 10)

          if (num > lastId) {
            return num
          }

          return lastId
        }, 0) + 1

        files.push({
          path: `word/charts/colors${newChartColorStyleId}.xml`,
          data: originalChartsXMLMap.get(chartColorStyleRelFilename),
          doc: new DOMParser().parseFromString(originalChartsXMLMap.get(chartColorStyleRelFilename))
        })
      }

      const newChartType = nodeListToArray(contentTypesDoc.getElementsByTagName('Override')).find((el) => {
        return el.getAttribute('PartName') === `/${chartPath}`
      }).cloneNode()

      newChartType.setAttribute('PartName', `/word/charts/${filePrefix}${newChartId}.xml`)

      let newChartStyleType

      if (chartStyleRelFilename != null && newChartStyleId != null) {
        newChartStyleType = nodeListToArray(contentTypesDoc.getElementsByTagName('Override')).find((el) => {
          return el.getAttribute('PartName') === `/${chartStyleRelFilename}`
        }).cloneNode()

        newChartStyleType.setAttribute('PartName', `/word/charts/style${newChartStyleId}.xml`)
      }

      let newChartColorStyleType

      if (chartColorStyleRelFilename && newChartColorStyleId != null) {
        newChartColorStyleType = nodeListToArray(contentTypesDoc.getElementsByTagName('Override')).find((el) => {
          return el.getAttribute('PartName') === `/${chartColorStyleRelFilename}`
        }).cloneNode()

        newChartColorStyleType.setAttribute('PartName', `/word/charts/colors${newChartColorStyleId}.xml`)
      }

      nodeListToArray(newChartRelsDoc.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Type') === 'http://schemas.microsoft.com/office/2011/relationships/chartStyle'
      }).setAttribute('Target', `style${newChartStyleId}.xml`)

      nodeListToArray(newChartRelsDoc.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Type') === 'http://schemas.microsoft.com/office/2011/relationships/chartColorStyle'
      }).setAttribute('Target', `colors${newChartColorStyleId}.xml`)

      contentTypesDoc.documentElement.appendChild(newChartType)

      if (newChartStyleType) {
        contentTypesDoc.documentElement.appendChild(newChartStyleType)
      }

      if (newChartColorStyleType) {
        contentTypesDoc.documentElement.appendChild(newChartColorStyleType)
      }
    }

    newChartMainTitleEl.parentNode.removeChild(newChartMainTitleEl)

    for (const newChartAxTitleEl of newChartAxTitleEls) {
      newChartAxTitleEl.parentNode.removeChild(newChartAxTitleEl)
    }

    chartDrawingEl.setAttribute('r:id', newChartRelId)

    const existingChartTitles = nodeListToArray(chartDoc.getElementsByTagName(`${chartDrawingEl.prefix}:title`))
    const existingChartTitleEl = chartDoc.getElementsByTagName(`${chartDrawingEl.prefix}:title`)[0]
    const existingChartAxTitleEls = []

    for (const titleEl of existingChartTitles.slice(1)) {
      if (titleEl.parentNode.localName === 'catAx' || titleEl.parentNode.localName === 'valAx') {
        existingChartAxTitleEls.push(titleEl)
      }
    }

    existingChartTitleEl.parentNode.replaceChild(newChartMainTitleEl, existingChartTitleEl)

    for (let i = 0; i < existingChartAxTitleEls.length; i++) {
      const existingChartAxTitleEl = existingChartAxTitleEls[i]

      if (newChartAxTitleEls[i]) {
        existingChartAxTitleEl.parentNode.replaceChild(newChartAxTitleEls[i], existingChartAxTitleEl)
      }
    }

    drawingEl.firstChild.parentNode.removeChild(drawingEl.firstChild)
  }

  chartRId = chartDrawingEl.getAttribute('r:id')
  chartREl = nodeListToArray(relsDoc.getElementsByTagName('Relationship')).find((r) => r.getAttribute('Id') === chartRId)
  chartPath = path.posix.join(path.posix.dirname(documentPath), chartREl.getAttribute('Target'))
  chartFile = files.find(f => f.path === chartPath)
  chartDoc = chartFile.doc
  chartRelsFilename = `word/charts/_rels/${chartPath.split('/').slice(-1)[0]}.rels`
  chartRelsDoc = files.find(f => f.path === chartRelsFilename).doc

  const chartTitleEl = chartDoc.getElementsByTagName(`${chartDrawingEl.prefix}:title`)[0]

  if (!chartTitleEl) {
    return drawingEl
  }

  const chartTitleTextElements = nodeListToArray(chartTitleEl.getElementsByTagName('a:t'))

  for (const chartTitleTextEl of chartTitleTextElements) {
    const textContent = chartTitleTextEl.textContent

    if (!textContent.includes('$docxChart')) {
      continue
    }

    const match = textContent.match(/\$docxChart([^$]*)\$/)
    const chartConfig = JSON.parse(Buffer.from(match[1], 'base64').toString())

    // remove chart helper text
    chartTitleTextEl.textContent = chartTitleTextEl.textContent.replace(match[0], '')

    const externalDataEl = chartDoc.getElementsByTagName(`${chartDrawingEl.prefix}:externalData`)[0]

    if (externalDataEl) {
      const externalDataId = externalDataEl.getAttribute('r:id')
      // remove external data reference if exists
      externalDataEl.parentNode.removeChild(externalDataEl)

      const externalXlsxRel = nodeListToArray(chartRelsDoc.getElementsByTagName('Relationship')).find((r) => {
        return r.getAttribute('Id') === externalDataId
      })

      if (externalXlsxRel) {
        const externalXlsxFilename = externalXlsxRel.getAttribute('Target').split('/').slice(-1)[0]
        const externalXlsxFileIndex = files.findIndex((f) => f.path === `word/embeddings/${externalXlsxFilename}`)

        if (externalXlsxFileIndex !== -1) {
          files.splice(externalXlsxFileIndex, 1)
        }

        externalXlsxRel.parentNode.removeChild(externalXlsxRel)
      }
    }

    if (chartDrawingEl.prefix === 'cx') {
      const chartSeriesEl = chartDoc.getElementsByTagName('cx:plotArea')[0].getElementsByTagName('cx:series')[0]
      const chartType = chartSeriesEl.getAttribute('layoutId')
      const supportedCharts = ['waterfall', 'treemap', 'sunburst', 'funnel', 'clusteredColumn']

      if (!supportedCharts.includes(chartType)) {
        throw new Error(`"${chartType}" type (chartEx) is not supported`)
      }

      const chartDataEl = chartDoc.getElementsByTagName('cx:chartData')[0]
      const existingDataItemsElements = nodeListToArray(chartDataEl.getElementsByTagName('cx:data'))
      const dataPlaceholderEl = chartDoc.createElement('docxChartexDataReplace')
      const seriesPlaceholderEl = chartDoc.createElement('docxChartexSeriesReplace')

      dataPlaceholderEl.textContent = 'sample'
      seriesPlaceholderEl.textContent = 'sample'

      chartDataEl.appendChild(dataPlaceholderEl)
      chartSeriesEl.parentNode.insertBefore(seriesPlaceholderEl, chartSeriesEl.nextSibling)

      existingDataItemsElements.forEach((dataItemEl) => {
        dataItemEl.parentNode.removeChild(dataItemEl)
      })

      chartSeriesEl.parentNode.removeChild(chartSeriesEl)

      chartFile.data = serializeXml(chartFile.doc)
      chartFile.serializeFromDoc = false

      let newDataItemElement = existingDataItemsElements[0].cloneNode(true)

      newDataItemElement.setAttribute('id', 0)

      addChartexItem(chartDoc, {
        name: 'cx:strDim',
        type: chartType,
        data: Array.isArray(chartConfig.data.labels[0]) ? chartConfig.data.labels.map((subLabels) => ({ items: subLabels })) : [{ items: chartConfig.data.labels }]
      }, newDataItemElement)

      addChartexItem(chartDoc, { name: 'cx:numDim', type: chartType, data: [{ items: chartConfig.data.datasets[0].data || [] }] }, newDataItemElement)

      let newChartSeriesElement = chartSeriesEl.cloneNode(true)

      addChartexItem(chartDoc, { name: 'cx:tx', data: chartConfig.data.datasets[0].label || '' }, newChartSeriesElement)
      addChartexItem(chartDoc, { name: 'cx:dataId', data: newDataItemElement.getAttribute('id') }, newChartSeriesElement)

      newDataItemElement = serializeXml(newDataItemElement)
      newChartSeriesElement = serializeXml(newChartSeriesElement)

      chartFile.data = chartFile.data.replace(/<docxChartexDataReplace[^>]*>[^]*?(?=<\/docxChartexDataReplace>)<\/docxChartexDataReplace>/g, newDataItemElement)
      chartFile.data = chartFile.data.replace(/<docxChartexSeriesReplace[^>]*>[^]*?(?=<\/docxChartexSeriesReplace>)<\/docxChartexSeriesReplace>/g, newChartSeriesElement)
    } else {
      const chartPlotAreaEl = chartDoc.getElementsByTagName('c:plotArea')[0]

      const supportedCharts = [
        'areaChart', 'area3DChart', 'barChart', 'bar3DChart', 'lineChart', 'line3DChart',
        'pieChart', 'pie3DChart', 'doughnutChart', 'stockChart', 'scatterChart', 'bubbleChart'
      ]

      const existingChartSeriesElements = nodeListToArray(chartDoc.getElementsByTagName('c:ser'))

      if (existingChartSeriesElements.length === 0) {
        throw new Error(`Base chart in docx must have at least one data serie defined, ref: "${chartPath}"`)
      }

      if (chartConfig.options != null) {
        const existingAxesNodes = []

        for (let i = 0; i < chartPlotAreaEl.childNodes.length; i++) {
          const currentNode = chartPlotAreaEl.childNodes[i]

          if (currentNode.nodeName === 'c:catAx' || currentNode.nodeName === 'c:valAx') {
            existingAxesNodes.push(currentNode)
          }
        }

        if (chartConfig.options.scales && Array.isArray(chartConfig.options.scales.xAxes) && chartConfig.options.scales.xAxes.length > 0) {
          const primaryXAxisConfig = chartConfig.options.scales.xAxes[0]
          const secondaryXAxisConfig = chartConfig.options.scales.xAxes[1]
          const primaryXAxisEl = existingAxesNodes[0]
          const secondaryXAxisEl = existingAxesNodes[3]

          if (primaryXAxisConfig && primaryXAxisEl) {
            configureAxis(chartDoc, primaryXAxisConfig, primaryXAxisEl)
          }

          if (secondaryXAxisConfig && secondaryXAxisEl) {
            configureAxis(chartDoc, secondaryXAxisConfig, secondaryXAxisEl)
          }
        }

        if (chartConfig.options.scales && Array.isArray(chartConfig.options.scales.yAxes) && chartConfig.options.scales.yAxes.length > 0) {
          const primaryYAxisConfig = chartConfig.options.scales.yAxes[0]
          const secondaryYAxisConfig = chartConfig.options.scales.yAxes[1]
          const primaryYAxisEl = existingAxesNodes[1]
          const secondaryYAxisEl = existingAxesNodes[2]

          if (primaryYAxisConfig && primaryYAxisEl) {
            configureAxis(chartDoc, primaryYAxisConfig, primaryYAxisEl)
          }

          if (secondaryYAxisConfig && secondaryYAxisEl) {
            configureAxis(chartDoc, secondaryYAxisConfig, secondaryYAxisEl)
          }
        }
      }

      const lastExistingChartSerieEl = existingChartSeriesElements[existingChartSeriesElements.length - 1]
      let lastChartTypeContentEl

      for (const [serieIdx, serieEl] of existingChartSeriesElements.entries()) {
        const chartTypeContentEl = serieEl.parentNode
        const chartType = chartTypeContentEl.localName

        lastChartTypeContentEl = chartTypeContentEl

        if (!supportedCharts.includes(chartType)) {
          throw new Error(`Chart "${chartType}" type is not supported, ref: "${chartPath}"`)
        }

        const refNode = serieEl.nextSibling

        serieEl.parentNode.removeChild(serieEl)

        const currentDataset = chartConfig.data.datasets[serieIdx]

        if (!currentDataset) {
          continue
        }

        const newChartSerieNode = serieEl.cloneNode(true)

        prepareChartSerie(chartDoc, chartType, newChartSerieNode, {
          serieIdx,
          serieLabel: currentDataset.label,
          generalLabels: chartConfig.data.labels,
          dataErrors: currentDataset.dataErrors,
          dataLabels: currentDataset.dataLabels,
          dataValues: currentDataset.data
        })

        refNode.parentNode.insertBefore(newChartSerieNode, refNode)
      }

      if (chartConfig.data.datasets.length > existingChartSeriesElements.length) {
        const lastSerieIdx = existingChartSeriesElements.length - 1
        const seriesInLastChartNodes = nodeListToArray(lastChartTypeContentEl.getElementsByTagName('c:ser'))
        const chartType = lastChartTypeContentEl.localName
        const remainingDatasets = chartConfig.data.datasets.slice(existingChartSeriesElements.length)
        const refNode = seriesInLastChartNodes[seriesInLastChartNodes.length - 1].nextSibling

        for (const [remainingIdx, currentDataset] of remainingDatasets.entries()) {
          // create based on the last serie, but without predefined shape properties
          const newChartSerieNode = lastExistingChartSerieEl.cloneNode(true)

          const shapePropertiesEl = findChildNode('c:spPr', newChartSerieNode)

          if (shapePropertiesEl) {
            shapePropertiesEl.parentNode.removeChild(shapePropertiesEl)
          }

          const markerEl = findChildNode('c:marker', newChartSerieNode)

          if (markerEl) {
            const symbolEl = findChildNode('c:symbol', markerEl)

            if (symbolEl && symbolEl.getAttribute('val') !== 'none') {
              symbolEl.setAttribute('val', 'none')
            }
          }

          prepareChartSerie(chartDoc, chartType, newChartSerieNode, {
            serieIdx: lastSerieIdx + remainingIdx + 1,
            serieLabel: currentDataset.label,
            generalLabels: chartConfig.data.labels,
            dataErrors: currentDataset.dataErrors,
            dataLabels: currentDataset.dataLabels,
            dataValues: currentDataset.data
          })

          refNode.parentNode.insertBefore(newChartSerieNode, refNode)
        }
      }

      chartFile.data = serializeXml(chartFile.doc)
      chartFile.serializeFromDoc = false
    }
  }

  return drawingEl
}

function configureAxis (chartDoc, axisConfig, axisEl) {
  const scalingEl = findChildNode('c:scaling', axisEl)

  if (axisConfig.display != null) {
    const deleteEl = findChildNode('c:delete', axisEl)
    deleteEl.setAttribute('val', axisConfig.display === false ? 1 : 0)
  }

  if (axisEl.nodeName === 'c:valAx' && axisConfig.ticks && axisConfig.ticks.stepSize != null) {
    const majorUnitEl = findOrCreateChildNode(chartDoc, 'c:majorUnit', axisEl)
    majorUnitEl.setAttribute('val', axisConfig.ticks.stepSize)
  }

  if (axisEl.nodeName === 'c:valAx' && axisConfig.ticks && axisConfig.ticks.min != null) {
    const minEl = findOrCreateChildNode(chartDoc, 'c:min', scalingEl)
    minEl.setAttribute('val', axisConfig.ticks.min)
  }

  if (axisEl.nodeName === 'c:valAx' && axisConfig.ticks && axisConfig.ticks.max != null) {
    const maxEl = findOrCreateChildNode(chartDoc, 'c:max', scalingEl)
    maxEl.setAttribute('val', axisConfig.ticks.max)
  }
}

function prepareChartSerie (chartDoc, chartType, baseChartSerieEl, serieData) {
  const { serieIdx, serieLabel, generalLabels, dataErrors, dataLabels, dataValues } = serieData

  clearEl(baseChartSerieEl, (c) => c.nodeName !== 'c:extLst')

  addChartSerieItem(chartDoc, { name: 'c:idx', data: serieIdx }, baseChartSerieEl)
  addChartSerieItem(chartDoc, { name: 'c:order', data: serieIdx }, baseChartSerieEl)
  addChartSerieItem(chartDoc, { name: 'c:tx', data: { values: [serieLabel] } }, baseChartSerieEl)

  if (chartType === 'scatterChart' || chartType === 'bubbleChart') {
    addChartSerieItem(chartDoc, { name: 'c:xVal', data: { values: generalLabels } }, baseChartSerieEl)

    if (chartType === 'bubbleChart') {
      if (dataValues.some((d) => !Array.isArray(d))) {
        throw new Error('bubbleChart expects each data item to be array of [yValue, sizeValue]')
      }

      addChartSerieItem(chartDoc, { name: 'c:yVal', data: { values: dataValues.map((d) => d[0]) } }, baseChartSerieEl)
      addChartSerieItem(chartDoc, { name: 'c:bubbleSize', data: { values: dataValues.map((d) => d[1]) } }, baseChartSerieEl)
    } else {
      addChartSerieItem(chartDoc, { name: 'c:yVal', data: { values: dataValues } }, baseChartSerieEl)
    }
  } else {
    addChartSerieItem(chartDoc, { name: 'c:cat', type: chartType, data: { values: generalLabels } }, baseChartSerieEl)
    addChartSerieItem(chartDoc, { name: 'c:val', data: { count: generalLabels.length, values: dataValues } }, baseChartSerieEl)
  }

  // TODO: for now datalabel are just supported for "scatterChart", until we can verify the same
  // code works for other chart types
  if (chartType === 'scatterChart' && dataLabels != null) {
    if (!Array.isArray(dataLabels)) {
      throw new Error('dataLabels must be an array')
    }

    addChartSerieItem(chartDoc, {
      name: 'c:dLbls',
      data: dataLabels.map((d) => {
        const dataLabelInfo = {}

        if (typeof d === 'string') {
          dataLabelInfo.value = d
        } else {
          Object.assign(dataLabelInfo, d)
        }

        return dataLabelInfo
      })
    }, baseChartSerieEl)
  }

  if (dataErrors != null) {
    if (!Array.isArray(dataErrors)) {
      throw new Error('dataErrors must be an array')
    }

    addChartSerieItem(chartDoc, {
      name: 'c:errBars',
      type: chartType,
      data: dataErrors.map((d) => {
        const dataErrorInfo = {}

        if (!Array.isArray(d)) {
          dataErrorInfo.value = [0, 0]
        } else {
          dataErrorInfo.value = [d[0] != null ? d[0] : 0, d[1] != null ? d[1] : 0]
        }

        return dataErrorInfo
      })
    }, baseChartSerieEl)
  }
}

function prepareChartSerieDataLabel (docNode, baseDataLabelEl, serieDataLabel) {
  const idxNode = findOrCreateChildNode(docNode, 'c:idx', baseDataLabelEl)
  idxNode.setAttribute('val', serieDataLabel.idx)

  const txNode = findOrCreateChildNode(docNode, 'c:tx', baseDataLabelEl)
  const richNode = findOrCreateChildNode(docNode, 'c:rich', txNode)
  findOrCreateChildNode(docNode, 'a:bodyPr', richNode)
  findOrCreateChildNode(docNode, 'a:lstStyle', richNode)
  const pNode = findOrCreateChildNode(docNode, 'a:p', richNode)

  const existingFldNode = findChildNode('a:fld', pNode)

  if (existingFldNode != null) {
    existingFldNode.parentNode.removeChild(existingFldNode)
  }

  const existingEndParaRPrNode = findChildNode('a:endParaRPr', pNode)

  if (existingEndParaRPrNode != null) {
    existingEndParaRPrNode.parentNode.removeChild(existingEndParaRPrNode)
  }

  const rNode = findOrCreateChildNode(docNode, 'a:r', pNode)
  const tNode = findOrCreateChildNode(docNode, 'a:t', rNode)

  tNode.textContent = serieDataLabel.value

  const existingPosNode = findChildNode('c:dLblPos', baseDataLabelEl)

  const mapPositionToValue = (pos) => {
    switch (pos) {
      case 'left':
        return 'l'
      case 'right':
        return 'r'
      case 'center':
        return 'ctr'
      case 'top':
        return 't'
      case 'bottom':
        return 'b'
      default:
        return null
    }
  }

  if (existingPosNode != null) {
    const positionVal = mapPositionToValue(serieDataLabel.position)

    if (positionVal != null) {
      existingPosNode.setAttribute('val', positionVal)
    }
  } else {
    const posNode = findOrCreateChildNode(docNode, 'c:dLblPos', baseDataLabelEl)
    const positionVal = mapPositionToValue(serieDataLabel.position != null ? serieDataLabel.position : 'right')

    if (positionVal != null) {
      posNode.setAttribute('val', positionVal)
    }
  }

  const showLegendKeyNode = findOrCreateChildNode(docNode, 'c:showLegendKey', baseDataLabelEl)
  showLegendKeyNode.setAttribute('val', '0')

  const showValNode = findOrCreateChildNode(docNode, 'c:showVal', baseDataLabelEl)
  showValNode.setAttribute('val', '0')

  const showCatNameNode = findOrCreateChildNode(docNode, 'c:showCatName', baseDataLabelEl)
  showCatNameNode.setAttribute('val', '0')

  const showSerNameNode = findOrCreateChildNode(docNode, 'c:showSerName', baseDataLabelEl)
  showSerNameNode.setAttribute('val', '0')
}

function addChartexItem (docNode, nodeInfo, targetNode) {
  let newNode

  const existingNode = findChildNode(nodeInfo.name, targetNode)

  if (existingNode) {
    newNode = existingNode.cloneNode(true)
  } else {
    newNode = docNode.createElement(nodeInfo.name)
  }

  switch (nodeInfo.name) {
    case 'cx:strDim':
    case 'cx:numDim': {
      let empty = false
      const isHierarchyType = nodeInfo.type === 'treemap' || nodeInfo.type === 'sunburst'
      const isNum = nodeInfo.name === 'cx:numDim'
      let type = isNum ? 'val' : 'cat'

      if (isNum && isHierarchyType) {
        type = 'size'
      }

      if (!isNum && nodeInfo.type === 'clusteredColumn') {
        empty = true
      }

      newNode.setAttribute('type', type)

      clearEl(newNode, (c) => c.nodeName !== 'cx:f')

      const existingLvlNodes = findChildNode('cx:lvl', newNode, true)

      if (!empty) {
        let targetData = nodeInfo.data

        if (!isNum && isHierarchyType) {
          targetData = targetData.reverse()
        }

        for (const [idx, lvlInfo] of targetData.entries()) {
          let lvlNode

          if (existingLvlNodes[idx] != null) {
            lvlNode = existingLvlNodes[idx].cloneNode(true)
            newNode.insertBefore(lvlNode, existingLvlNodes[0])
          } else {
            lvlNode = docNode.createElement('cx:lvl')

            if (existingLvlNodes.length > 0) {
              newNode.insertBefore(lvlNode, existingLvlNodes[0])
            } else {
              newNode.appendChild(lvlNode)
            }
          }

          lvlNode.setAttribute('ptCount', lvlInfo.items.length)

          const existingPtNodes = findChildNode('cx:pt', lvlNode, true)

          for (const [itemIdx, item] of lvlInfo.items.entries()) {
            let ptNode

            if (existingPtNodes[itemIdx] != null) {
              ptNode = existingPtNodes[itemIdx].cloneNode(true)
              lvlNode.insertBefore(ptNode, existingPtNodes[0])
            } else {
              ptNode = docNode.createElement('cx:pt')

              if (existingPtNodes.length > 0) {
                lvlNode.insertBefore(ptNode, existingPtNodes[0])
              } else {
                lvlNode.appendChild(ptNode)
              }
            }

            ptNode.setAttribute('idx', itemIdx)
            ptNode.textContent = item != null ? item : ''
          }

          for (const ePtNode of existingPtNodes) {
            ePtNode.parentNode.removeChild(ePtNode)
          }
        }
      } else {
        newNode = null
      }

      for (const eLvlNode of existingLvlNodes) {
        eLvlNode.parentNode.removeChild(eLvlNode)
      }

      break
    }
    case 'cx:tx': {
      const txDataNode = findOrCreateChildNode(docNode, 'cx:txData', newNode)

      clearEl(txDataNode, (c) => c.nodeName !== 'cx:f')

      const txValueNode = findOrCreateChildNode(docNode, 'cx:v', txDataNode)

      txValueNode.textContent = nodeInfo.data

      break
    }
    case 'cx:dataId': {
      newNode.setAttribute('val', nodeInfo.data)
      break
    }
    default:
      throw new Error(`node chartex item "${nodeInfo.name}" not supported`)
  }

  if (!newNode) {
    if (existingNode) {
      targetNode.removeChild(existingNode)
    }

    return
  }

  if (existingNode) {
    targetNode.replaceChild(newNode, existingNode)
  } else {
    targetNode.appendChild(newNode)
  }
}

function addChartSerieItem (docNode, nodeInfo, targetNode) {
  let newNode

  const existingNode = findChildNode(nodeInfo.name, targetNode)

  if (existingNode) {
    newNode = existingNode.cloneNode(true)
  } else {
    newNode = docNode.createElement(nodeInfo.name)
  }

  switch (nodeInfo.name) {
    case 'c:idx':
    case 'c:order':
      newNode.setAttribute('val', nodeInfo.data)
      break
    case 'c:tx':
    case 'c:cat':
    case 'c:val':
    case 'c:xVal':
    case 'c:yVal':
    case 'c:bubbleSize': {
      const shouldBeDateType = nodeInfo.name === 'c:cat' && nodeInfo.type === 'stockChart'
      let isNum = nodeInfo.name === 'c:val' || nodeInfo.name === 'c:xVal' || nodeInfo.name === 'c:yVal' || nodeInfo.name === 'c:bubbleSize'

      if (shouldBeDateType) {
        isNum = true
      }

      addValueNodes(docNode, newNode, {
        dateType: shouldBeDateType,
        numType: isNum,
        type: nodeInfo.type,
        count: nodeInfo.data.count,
        values: nodeInfo.data.values
      })

      break
    }
    case 'c:dLbls': {
      const existingDataLabelsNodes = findChildNode('c:dLbl', newNode, true)

      for (const [idx, dataLabelEl] of existingDataLabelsNodes.entries()) {
        const refNode = dataLabelEl.nextSibling

        dataLabelEl.parentNode.removeChild(dataLabelEl)

        const currentDataLabel = nodeInfo.data[idx]

        if (!currentDataLabel) {
          continue
        }

        const newDataLabelNode = dataLabelEl.cloneNode(true)

        prepareChartSerieDataLabel(docNode, newDataLabelNode, {
          ...currentDataLabel,
          idx
        })

        refNode.parentNode.insertBefore(newDataLabelNode, refNode)
      }

      if (nodeInfo.data.length > existingDataLabelsNodes.length) {
        const lastDataLabelIdx = existingDataLabelsNodes.length - 1
        const remainingDataLabels = nodeInfo.data.slice(existingDataLabelsNodes.length)

        for (const [remainingIdx, currentDataLabel] of remainingDataLabels.entries()) {
          const dataLabelIdx = lastDataLabelIdx + remainingIdx + 1

          const newDataLabelNode = docNode.createElement('c:dLbl')

          prepareChartSerieDataLabel(docNode, newDataLabelNode, {
            ...currentDataLabel,
            idx: dataLabelIdx
          })

          if (newNode.childNodes.length === 0) {
            newNode.appendChild(newDataLabelNode)
          } else {
            if (newNode.firstChild.nodeName === 'c:dLbl') {
              newNode.insertBefore(newDataLabelNode, newNode.firstChild.nextSibling)
            } else {
              newNode.insertBefore(newDataLabelNode, newNode.firstChild)
            }
          }
        }
      }

      break
    }
    case 'c:errBars': {
      const plusNode = findOrCreateChildNode(docNode, 'c:plus', newNode)

      addValueNodes(docNode, plusNode, {
        numType: true,
        type: nodeInfo.type,
        values: nodeInfo.data.map((d) => d.value[0])
      })

      const minusNode = findOrCreateChildNode(docNode, 'c:minus', newNode)

      addValueNodes(docNode, minusNode, {
        numType: true,
        type: nodeInfo.type,
        values: nodeInfo.data.map((d) => d.value[1])
      })

      break
    }
    default:
      throw new Error(`node chart item "${nodeInfo.name}" not supported`)
  }

  if (existingNode) {
    targetNode.replaceChild(newNode, existingNode)
  } else {
    targetNode.appendChild(newNode)
  }
}

function addValueNodes (docNode, parentNode, opts = {}) {
  let { dateType = false, numType = false, type, count, values } = opts

  if (dateType) {
    numType = true
  }

  const refNode = findOrCreateChildNode(docNode, numType ? 'c:numRef' : 'c:strRef', parentNode)
  clearEl(refNode, (c) => c.nodeName !== 'c:f')
  const cacheNode = findOrCreateChildNode(docNode, numType ? 'c:numCache' : 'c:strCache', refNode)
  const existingFormatNode = findChildNode('c:formatCode', cacheNode)

  if (numType && !existingFormatNode) {
    const formatNode = docNode.createElement('c:formatCode')
    formatNode.textContent = dateType ? 'm/d/yy' : 'General'
    cacheNode.insertBefore(formatNode, cacheNode.firstChild)
  }

  const ptCountNode = findOrCreateChildNode(docNode, 'c:ptCount', cacheNode)

  ptCountNode.setAttribute('val', count != null ? count : values.length)

  const existingPtNodes = findChildNode('c:pt', cacheNode, true)

  for (const [idx, item] of values.entries()) {
    let ptNode

    if (existingPtNodes[idx] != null) {
      ptNode = existingPtNodes[idx].cloneNode(true)
      cacheNode.insertBefore(ptNode, existingPtNodes[0])
    } else {
      ptNode = docNode.createElement('c:pt')

      if (existingPtNodes.length > 0) {
        cacheNode.insertBefore(ptNode, existingPtNodes[0])
      } else {
        cacheNode.appendChild(ptNode)
      }
    }

    ptNode.setAttribute('idx', idx)

    const ptValueNode = findOrCreateChildNode(docNode, 'c:v', ptNode)

    let value = item

    if (dateType) {
      const parsedValue = moment(item)

      if (parsedValue.isValid() === false) {
        throw new Error(`label for "${type}" should be date string in format of YYYY-MM-DD`)
      }

      value = toExcelDate(parsedValue.toDate())
    }

    ptValueNode.textContent = value
  }

  for (const eNode of existingPtNodes) {
    eNode.parentNode.removeChild(eNode)
  }
}
