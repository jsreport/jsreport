const moment = require('moment')
const toExcelDate = require('js-excel-date-convert').toExcelDate
const { findChildNode, findOrCreateChildNode } = require('./utils')

function updateChart (doc, chartPrefix, seriesData) {
  if (chartPrefix === 'cx') {
    const chartDataEl = doc.getElementsByTagName('cx:chartData')[0]
    const chartSeriesEl = doc.getElementsByTagName('cx:plotArea')[0].getElementsByTagName('cx:series')[0]
    const chartType = chartSeriesEl.getAttribute('layoutId')

    const supportedCharts = ['waterfall', 'treemap', 'sunburst', 'funnel', 'clusteredColumn']

    if (!supportedCharts.includes(chartType)) {
      throw new Error(`"${chartType}" type (chartEx) is not supported`)
    }

    const existingDataItemsElements = Array.from(chartDataEl.getElementsByTagName('cx:data'))
    const newDataItemElement = existingDataItemsElements[0].cloneNode(true)
    chartDataEl.appendChild(newDataItemElement)

    for (const dataItemEl of existingDataItemsElements) {
      dataItemEl.parentNode.removeChild(dataItemEl)
    }

    const newChartSeriesElement = chartSeriesEl.cloneNode(true)

    chartSeriesEl.parentNode.insertBefore(newChartSeriesElement, chartSeriesEl.nextSibling)
    chartSeriesEl.parentNode.removeChild(chartSeriesEl)

    newDataItemElement.setAttribute('id', 0)

    addChartexItem(doc, {
      name: 'cx:strDim',
      type: chartType,
      data: Array.isArray(seriesData.labels[0]) ? seriesData.labels.map((subLabels) => ({ items: subLabels })) : [{ items: seriesData.labels }]
    }, newDataItemElement)

    addChartexItem(doc, { name: 'cx:numDim', type: chartType, data: [{ items: seriesData.datasets[0].data || [] }] }, newDataItemElement)

    addChartexItem(doc, { name: 'cx:tx', data: seriesData.datasets[0].label || '' }, newChartSeriesElement)
    addChartexItem(doc, { name: 'cx:dataId', data: newDataItemElement.getAttribute('id') }, newChartSeriesElement)
  } else {
    const existingChartSeriesElements = Array.from(doc.documentElement.getElementsByTagName('c:ser'))
    const lastExistingChartSerieEl = existingChartSeriesElements[existingChartSeriesElements.length - 1]
    let lastChartTypeContentEl

    const supportedCharts = [
      'barChart', 'lineChart',
      'stockChart', 'scatterChart', 'bubbleChart'
      // 'areaChart', 'area3DChart', 'barChart', 'bar3DChart', 'lineChart', 'line3DChart',
      // 'pieChart', 'pie3DChart', 'doughnutChart', 'stockChart', 'scatterChart', 'bubbleChart'
    ]

    for (const [serieIdx, serieEl] of existingChartSeriesElements.entries()) {
      const chartTypeContentEl = serieEl.parentNode
      const chartType = chartTypeContentEl.localName

      lastChartTypeContentEl = chartTypeContentEl

      if (!supportedCharts.includes(chartType)) {
        throw new Error(`Chart "${chartType}" type is not supported`)
      }

      const refEl = serieEl.nextSibling

      serieEl.parentNode.removeChild(serieEl)

      const currentDataset = seriesData.datasets[serieIdx]

      if (!currentDataset) {
        continue
      }

      const newChartSerieNode = serieEl.cloneNode(true)

      prepareChartSerie(doc, chartType, newChartSerieNode, {
        serieIdx,
        serieLabel: currentDataset.label,
        generalLabels: seriesData.labels,
        dataErrors: currentDataset.dataErrors,
        dataLabels: currentDataset.dataLabels,
        dataValues: currentDataset.data
      })

      refEl.parentNode.insertBefore(newChartSerieNode, refEl)
    }

    if (seriesData.datasets.length > existingChartSeriesElements.length) {
      const lastSerieIdx = existingChartSeriesElements.length - 1
      const seriesInLastChartNodes = Array.from(lastChartTypeContentEl.getElementsByTagName('c:ser'))
      const chartType = lastChartTypeContentEl.localName
      const remainingDatasets = seriesData.datasets.slice(existingChartSeriesElements.length)
      const refEl = seriesInLastChartNodes[seriesInLastChartNodes.length - 1].nextSibling

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

        prepareChartSerie(doc, chartType, newChartSerieNode, {
          serieIdx: lastSerieIdx + remainingIdx + 1,
          serieLabel: currentDataset.label,
          generalLabels: seriesData.labels,
          dataErrors: currentDataset.dataErrors,
          dataLabels: currentDataset.dataLabels,
          dataValues: currentDataset.data
        })

        refEl.parentNode.insertBefore(newChartSerieNode, refEl)
      }
    }
  }
}

function prepareChartSerie (chartDoc, chartType, baseChartSerieEl, serieData) {
  // TODO: accepting refs it is still a work in progress, it only works for the serie label
  // for now, but we don't use it, if there is need to support charts with cell references in the future we should
  // complete the implementation
  const { serieIdx, serieLabel, generalLabels, dataErrors, dataLabels, dataValues, refs } = serieData

  removeChildNodes('c:extLst', baseChartSerieEl)

  // addChartSerieItem(chartDoc, { name: 'c:idx', data: serieIdx }, baseChartSerieEl)
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

module.exports.updateChart = updateChart
