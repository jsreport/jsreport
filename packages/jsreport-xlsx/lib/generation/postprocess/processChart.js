const path = require('path')
const fs = require('fs')
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const moment = require('moment')
const { num2col } = require('xlsx-coordinates')
const toExcelDate = require('js-excel-date-convert').toExcelDate
const { serializeXml, nodeListToArray, findOrCreateChildNode, findChildNode } = require('../../utils')
const defaultNewSheetContentPath = path.join(__dirname, '../../../static/defaultNewSheet.xml')
const defaultNewSheetContent = fs.readFileSync(defaultNewSheetContentPath, 'utf8')

module.exports = async function processChart (files, sheetContent, drawingEl) {
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
    const chartFile = files.find((file) => file.path === chartPath)
    const chartDoc = chartFile?.doc

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

    const chartTitles = nodeListToArray(chartEl.getElementsByTagName(`${graphicDataChartEl.prefix}:title`))
    const chartMainTitleEl = chartTitles[0]

    if (chartMainTitleEl == null) {
      continue
    }

    const chartMainTitleTextElements = nodeListToArray(chartMainTitleEl.getElementsByTagName('a:t'))

    for (const chartMainTitleTextEl of chartMainTitleTextElements) {
      const textContent = chartMainTitleTextEl.textContent

      if (!textContent.includes('$xlsxChart')) {
        continue
      }

      const match = textContent.match(/\$xlsxChart([^$]*)\$/)
      const chartConfig = JSON.parse(Buffer.from(match[1], 'base64').toString())

      // remove chart helper text
      chartMainTitleTextEl.textContent = chartMainTitleTextEl.textContent.replace(match[0], '')

      if (graphicDataChartEl.prefix === 'cx') {
        const chartSeriesEl = chartDoc.getElementsByTagName('cx:plotArea')[0].getElementsByTagName('cx:series')[0]
        const chartType = chartSeriesEl.getAttribute('layoutId')
        const supportedCharts = ['waterfall', 'treemap', 'sunburst', 'funnel', 'clusteredColumn']

        if (!supportedCharts.includes(chartType)) {
          throw new Error(`"${chartType}" type (chartEx) is not supported`)
        }

        const chartDataEl = chartDoc.getElementsByTagName('cx:chartData')[0]
        const existingDataItemsElements = nodeListToArray(chartDataEl.getElementsByTagName('cx:data'))
        const dataPlaceholderEl = chartDoc.createElement('xlsxChartexDataReplace')
        const seriesPlaceholderEl = chartDoc.createElement('xlsxChartexSeriesReplace')

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

        chartFile.data = chartFile.data.replace(/<xlsxChartexDataReplace[^>]*>[^]*?(?=<\/xlsxChartexDataReplace>)<\/xlsxChartexDataReplace>/g, newDataItemElement)
        chartFile.data = chartFile.data.replace(/<xlsxChartexSeriesReplace[^>]*>[^]*?(?=<\/xlsxChartexSeriesReplace>)<\/xlsxChartexSeriesReplace>/g, newChartSeriesElement)
      } else {
        const chartPlotAreaEl = chartDoc.getElementsByTagName('c:plotArea')[0]

        const supportedCharts = [
          'barChart', 'lineChart',
          'stockChart', 'scatterChart', 'bubbleChart'
          // 'areaChart', 'area3DChart', 'barChart', 'bar3DChart', 'lineChart', 'line3DChart',
          // 'pieChart', 'pie3DChart', 'doughnutChart', 'stockChart', 'scatterChart', 'bubbleChart'
        ]

        const existingChartSeriesElements = nodeListToArray(chartDoc.getElementsByTagName('c:ser'))

        if (existingChartSeriesElements.length === 0) {
          throw new Error(`Base chart in xlsx must have at least one data serie defined, ref: "${chartPath}"`)
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

          // NOTE: option "storeDataInSheet" not supported for now
          // it requires to complete the implementation to put
          // cell references in chart series data
          delete chartConfig.options.storeDataInSheet

          if (chartConfig.options.storeDataInSheet === true) {
            // creating new sheet to store the data for the chart
            const newSheetInfo = getNewSheet(files)

            // transform the chart data to the order in which the sheet data
            // expects to be
            const sheetData = [
              [null, ...chartConfig.data.datasets.map((d) => d.label)],
              ...chartConfig.data.labels.map((label, idx) => {
                const arr = [label]

                for (const dataset of chartConfig.data.datasets) {
                  const datasetVal = dataset.data[idx]

                  if (datasetVal != null) {
                    arr.push(datasetVal)
                  } else {
                    arr.push(null)
                  }
                }

                return arr
              })
            ]

            addDataToSheet(newSheetInfo, sheetData)
            addNewSheetToWorkbook(newSheetInfo, files)
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
  }
}

function getNewSheet (files) {
  const sheetPathRegExp = /^xl\/worksheets\/sheet(\d+).xml$/
  const sheetFiles = files.filter((f) => sheetPathRegExp.test(f.path))
  let lastSheetSeq = 0

  if (sheetFiles.length > 0) {
    const sheetSequentials = sheetFiles.map((f) => {
      const match = f.path.match(sheetPathRegExp)
      return parseInt(match[1], 10)
    })

    // sort DESC
    sheetSequentials.sort((a, b) => b - a)

    // the first one is the major sequential
    lastSheetSeq = sheetSequentials[0]
  }

  const id = lastSheetSeq + 1

  const doc = new DOMParser().parseFromString(defaultNewSheetContent)
  const dataEl = doc.getElementsByTagName('sheetData')[0]

  return {
    filename: `sheet${id}`,
    name: '_chartsData',
    id,
    doc,
    dataEl
  }
}

function addDataToSheet (newSheet, data) {
  const sheetDoc = newSheet.doc
  const sheetDataEl = newSheet.dataEl
  let lastCellRef

  for (const [rowIdx, row] of data.entries()) {
    const newRowEl = sheetDoc.createElement('row')

    newRowEl.setAttribute('r', rowIdx + 1)
    newRowEl.setAttribute('x14ac:dyDescent', '0.2')

    for (const [cellIdx, cellValue] of row.entries()) {
      const newCellEl = sheetDoc.createElement('c')
      const cellLetter = num2col(cellIdx)
      const cellRef = `${cellLetter}${rowIdx + 1}`

      lastCellRef = cellRef

      newCellEl.setAttribute('r', cellRef)

      let cellType

      if (cellValue == null) {
        cellType = 'inlineStr'
      } else if (typeof cellValue === 'boolean') {
        cellType = 'b'
      } else if (typeof cellValue === 'number') {
        cellType = 'n'
      } else {
        cellType = 'inlineStr'
      }

      newCellEl.setAttribute('t', cellType)

      if (cellType === 'inlineStr') {
        const newIsEl = sheetDoc.createElement('is')
        const newTEl = sheetDoc.createElement('t')

        newTEl.textContent = cellValue == null ? '' : cellValue
        newIsEl.appendChild(newTEl)
        newCellEl.appendChild(newIsEl)
      } else if (cellType === 'b') {
        const newValEl = sheetDoc.createElement('v')
        newValEl.textContent = cellValue ? '1' : '0'
        newCellEl.appendChild(newValEl)
      } else if (cellType === 'n') {
        const newValEl = sheetDoc.createElement('v')
        newValEl.textContent = cellValue
        newCellEl.appendChild(newValEl)
      }

      newRowEl.appendChild(newCellEl)
    }

    sheetDataEl.appendChild(newRowEl)
  }

  if (lastCellRef != null && lastCellRef !== 'A1') {
    const dimensionEl = sheetDoc.getElementsByTagName('dimension')[0]
    dimensionEl.setAttribute('ref', `A1:${lastCellRef}`)
  }
}

function addNewSheetToWorkbook (newSheet, files) {
  const workbookDoc = files.find((file) => file.path === 'xl/workbook.xml').doc
  const workbookRelsDoc = files.find((file) => file.path === 'xl/_rels/workbook.xml.rels').doc
  const contentTypesDoc = files.find((file) => file.path === '[Content_Types].xml').doc

  const typesEl = contentTypesDoc.getElementsByTagName('Types')[0]
  const newSheetTypeEl = contentTypesDoc.createElement('Override')

  newSheetTypeEl.setAttribute('PartName', `/xl/worksheets/${newSheet.filename}.xml`)
  newSheetTypeEl.setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml')
  typesEl.appendChild(newSheetTypeEl)

  const relationshipsEl = workbookRelsDoc.getElementsByTagName('Relationships')[0]
  const relationshipEls = nodeListToArray(workbookRelsDoc.getElementsByTagName('Relationship'))

  const newSheetRelationshipEl = workbookRelsDoc.createElement('Relationship')
  const relationshipIdRegExp = /^rId(\d+)$/

  const newSheetResourceIdSeq = relationshipEls.reduce((idSeq, relationshipEl) => {
    const currentRId = relationshipEl.getAttribute('Id')
    const match = currentRId.match(relationshipIdRegExp)

    if (match == null) {
      return idSeq
    }

    const currentIdSeq = parseInt(match[1], 10)

    if (currentIdSeq > idSeq) {
      return currentIdSeq
    }

    return idSeq
  }, 0) + 1

  newSheetRelationshipEl.setAttribute('Id', `rId${newSheetResourceIdSeq}`)
  newSheetRelationshipEl.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet')
  newSheetRelationshipEl.setAttribute('Target', `worksheets/${newSheet.filename}.xml`)
  relationshipsEl.appendChild(newSheetRelationshipEl)

  const sheetsEl = workbookDoc.getElementsByTagName('sheets')[0]
  const newSheetEl = workbookDoc.createElement('sheet')

  newSheetEl.setAttribute('name', newSheet.name)
  newSheetEl.setAttribute('sheetId', newSheet.id)
  newSheetEl.setAttribute('state', 'hidden')
  newSheetEl.setAttribute('r:id', `rId${newSheetResourceIdSeq}`)
  sheetsEl.appendChild(newSheetEl)

  files.push({
    path: `xl/worksheets/${newSheet.filename}.xml`,
    data: new XMLSerializer().serializeToString(newSheet.doc),
    doc: newSheet.doc
  })
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
  // TODO: accepting refs it is still a work in progress, it only works for the serie label
  // for now, but we don't use it, if there is need to support charts with cell references in the future we should
  // complete the implementation
  const { serieIdx, serieLabel, generalLabels, dataErrors, dataLabels, dataValues, refs } = serieData

  removeChildNodes('c:extLst', baseChartSerieEl)

  addChartSerieItem(chartDoc, { name: 'c:idx', data: serieIdx }, baseChartSerieEl)
  addChartSerieItem(chartDoc, { name: 'c:order', data: serieIdx }, baseChartSerieEl)
  addChartSerieItem(chartDoc, { name: 'c:tx', data: { ref: refs?.serieLabel, values: [serieLabel] } }, baseChartSerieEl)

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

      removeChildNodes('cx:f', newNode)

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

      removeChildNodes('cx:f', txDataNode)

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
        ref: nodeInfo.data.ref,
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
  let { dateType = false, numType = false, type, ref, count, values } = opts

  if (dateType) {
    numType = true
  }

  const refNode = findOrCreateChildNode(docNode, numType ? 'c:numRef' : 'c:strRef', parentNode)
  removeChildNodes('c:f', refNode)

  if (ref != null) {
    const newFNode = findOrCreateChildNode(docNode, 'c:f', refNode)
    newFNode.textContent = ref
  }

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

function removeChildNodes (nodeName, targetNode) {
  for (let i = 0; i < targetNode.childNodes.length; i++) {
    const childNode = targetNode.childNodes[i]

    if (childNode.nodeName === nodeName) {
      targetNode.removeChild(childNode)
    }
  }
}
