const path = require('path')
const fs = require('fs')
const should = require('should')
const { DOMParser } = require('@xmldom/xmldom')
const moment = require('moment')
const toExcelDate = require('js-excel-date-convert').toExcelDate
const jsreport = require('@jsreport/jsreport-core')
const { decompress } = require('@jsreport/office')
const xlsx = require('xlsx')
const { nodeListToArray, findChildNode } = require('../../lib/utils')

const xlsxDirPath = path.join(__dirname, '../xlsx')
const outputPath = path.join(__dirname, '../../out.xlsx')

describe('xlsx generation - charts', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      store: {
        provider: 'memory'
      }
    })
      .use(require('../..')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-assets')())
      .use(jsreport.tests.listeners())
    return reporter.init()
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  it('chart', async () => {
    const labels = ['Jan', 'Feb', 'March', 'Apr']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1, 2]
    }, {
      label: 'Ser2',
      data: [2, 3, 5, 6]
    }, {
      label: 'Ser3',
      data: [6, 1, 8, 4]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(datasets[idx].data)
    })
  })

  it('chart should allow adding more data series than the ones defined in template', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 2, 4]
    }, {
      label: 'Ser4',
      data: [7, 5, 2]
    }, {
      label: 'Ser5',
      data: [6, 5, 4]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-data-series.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.should.have.length(5)

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(datasets[idx].data)
    })
  })

  it('chart should allow adding less data series than the ones defined in template', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-data-series.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.should.have.length(2)

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(datasets[idx].data)
    })
  })

  it('chart should allow producing chart with serie with empty values', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: []
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-data-series.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.should.have.length(1)

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      parseInt(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:ptCount')[0].getAttribute('val'), 10).should.be.eql(labels.length)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).should.have.length(0)
    })
  })

  it('chart should allow axis configuration for display', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 2, 4]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-options-axis.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        },
        chartOptions: {
          scales: {
            xAxes: [{
              display: false
            }]
          }
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const chartPlotAreaEl = doc.getElementsByTagName('c:plotArea')[0]

    const existingAxesNodes = []

    for (let i = 0; i < chartPlotAreaEl.childNodes.length; i++) {
      const currentNode = chartPlotAreaEl.childNodes[i]

      if (currentNode.nodeName === 'c:catAx' || currentNode.nodeName === 'c:valAx') {
        existingAxesNodes.push(currentNode)
      }
    }

    const mainXAxisEl = existingAxesNodes[0]
    const deleteEl = findChildNode('c:delete', mainXAxisEl)

    deleteEl.getAttribute('val').should.be.eql('1')
  })

  it('chart should allow axis configuration for min value', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 7]
    }, {
      label: 'Ser2',
      data: [4, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 6, 9]
    }]

    const minConfig = 2

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-options-axis.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        },
        chartOptions: {
          scales: {
            yAxes: [{
              ticks: {
                min: minConfig
              }
            }]
          }
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const chartPlotAreaEl = doc.getElementsByTagName('c:plotArea')[0]

    const existingAxesNodes = []

    for (let i = 0; i < chartPlotAreaEl.childNodes.length; i++) {
      const currentNode = chartPlotAreaEl.childNodes[i]

      if (currentNode.nodeName === 'c:catAx' || currentNode.nodeName === 'c:valAx') {
        existingAxesNodes.push(currentNode)
      }
    }

    const mainYAxisEl = existingAxesNodes[1]
    const scalingEl = findChildNode('c:scaling', mainYAxisEl)
    const minEl = findChildNode('c:min', scalingEl)

    parseInt(minEl.getAttribute('val'), 10).should.be.eql(minConfig)
  })

  it('chart should allow axis configuration for max value', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 7]
    }, {
      label: 'Ser2',
      data: [4, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 6, 9]
    }]

    const maxConfig = 12

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-options-axis.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        },
        chartOptions: {
          scales: {
            yAxes: [{
              ticks: {
                max: maxConfig
              }
            }]
          }
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const chartPlotAreaEl = doc.getElementsByTagName('c:plotArea')[0]

    const existingAxesNodes = []

    for (let i = 0; i < chartPlotAreaEl.childNodes.length; i++) {
      const currentNode = chartPlotAreaEl.childNodes[i]

      if (currentNode.nodeName === 'c:catAx' || currentNode.nodeName === 'c:valAx') {
        existingAxesNodes.push(currentNode)
      }
    }

    const mainYAxisEl = existingAxesNodes[1]
    const scalingEl = findChildNode('c:scaling', mainYAxisEl)
    const maxEl = findChildNode('c:max', scalingEl)

    parseInt(maxEl.getAttribute('val'), 10).should.be.eql(maxConfig)
  })

  it('chart should allow axis configuration for min, max values', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 7]
    }, {
      label: 'Ser2',
      data: [4, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 6, 9]
    }]

    const minConfig = 2
    const maxConfig = 12

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-options-axis.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        },
        chartOptions: {
          scales: {
            yAxes: [{
              ticks: {
                min: minConfig,
                max: maxConfig
              }
            }]
          }
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const chartPlotAreaEl = doc.getElementsByTagName('c:plotArea')[0]

    const existingAxesNodes = []

    for (let i = 0; i < chartPlotAreaEl.childNodes.length; i++) {
      const currentNode = chartPlotAreaEl.childNodes[i]

      if (currentNode.nodeName === 'c:catAx' || currentNode.nodeName === 'c:valAx') {
        existingAxesNodes.push(currentNode)
      }
    }

    const mainYAxisEl = existingAxesNodes[1]
    const scalingEl = findChildNode('c:scaling', mainYAxisEl)
    const minEl = findChildNode('c:min', scalingEl)
    const maxEl = findChildNode('c:max', scalingEl)

    parseInt(minEl.getAttribute('val'), 10).should.be.eql(minConfig)
    parseInt(maxEl.getAttribute('val'), 10).should.be.eql(maxConfig)
  })

  it('chart should allow axis configuration for stepSize value', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 7]
    }, {
      label: 'Ser2',
      data: [4, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 6, 9]
    }]

    const stepSizeConfig = 3

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-options-axis.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        },
        chartOptions: {
          scales: {
            yAxes: [{
              ticks: {
                stepSize: stepSizeConfig
              }
            }]
          }
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const chartPlotAreaEl = doc.getElementsByTagName('c:plotArea')[0]

    const existingAxesNodes = []

    for (let i = 0; i < chartPlotAreaEl.childNodes.length; i++) {
      const currentNode = chartPlotAreaEl.childNodes[i]

      if (currentNode.nodeName === 'c:catAx' || currentNode.nodeName === 'c:valAx') {
        existingAxesNodes.push(currentNode)
      }
    }

    const mainYAxisEl = existingAxesNodes[1]
    const majorUnitEl = findChildNode('c:majorUnit', mainYAxisEl)

    parseInt(majorUnitEl.getAttribute('val'), 10).should.be.eql(stepSizeConfig)
  })

  it('chart should allow setting datalabels', async () => {
    const labels = [0.7, 1.8, 2.6]

    const datasets = [{
      label: 'Ser1',
      data: [2.7, 3.2, 0.8],
      dataLabels: ['A1', {
        value: 'B1',
        position: 'left'
      }, 'C1']
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'basic-scatter-chart-datalabels.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.should.have.length(1)

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)

      nodeListToArray(dataEl.getElementsByTagName('c:dLbls')[0].getElementsByTagName('dLbl')).should.matchEach((dataLabelEl, dlIdx) => {
        let targetDataLabel = datasets[idx].dataLabels[dlIdx]

        if (typeof targetDataLabel !== 'string') {
          targetDataLabel = targetDataLabel.value
        }

        dataLabelEl.getElementsByTagName('c:tx')[0].getElementsByTagName('a:t')[0].textContent.should.be.eql(targetDataLabel)
      })
    })
  })

  it('chart without style, color xml files', async () => {
    const labels = ['Q1', 'Q2', 'Q3', 'Q4']
    const datasets = [{
      label: 'Apples',
      data: [100, 50, 10, 70]
    }, {
      label: 'Oranges',
      data: [20, 30, 20, 40]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-with-no-style-colors-xml-files.xlsx'))
          }
        }
      },
      data: {
        fruits: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(datasets[idx].data)
    })
  })

  it('chart with title', async () => {
    const labels = ['Jan', 'Feb', 'March']
    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-with-title.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const chartTitleEl = doc.getElementsByTagName('c:title')[0].getElementsByTagName('a:t')[0]

    chartTitleEl.textContent.should.be.eql('DEMO CHART')
  })

  it('chart with dynamic title', async () => {
    const labels = ['Jan', 'Feb', 'March']
    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }]
    const chartTitle = 'CUSTOM CHART'

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-with-dynamic-title.xlsx'))
          }
        }
      },
      data: {
        chartTitle,
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const chartTitleEl = doc.getElementsByTagName('c:title')[0].getElementsByTagName('a:t')[0]

    chartTitleEl.textContent.should.be.eql(chartTitle)
  })

  it('scatter chart', async () => {
    const labels = [
      2.3,
      1.4,
      4.2,
      3.1,
      2.5
    ]

    const datasets = [{
      label: 'Y Values',
      data: [
        4.6,
        3.2,
        5.4,
        2.1,
        1.5
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'scatter-chart.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)

      nodeListToArray(dataEl.getElementsByTagName('c:xVal')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels.map((l) => l.toString()))

      nodeListToArray(dataEl.getElementsByTagName('c:yVal')[0].getElementsByTagName('c:v')).map((el) => parseFloat(el.textContent)).should.be.eql(datasets[idx].data)
    })
  })

  it('bubble chart', async () => {
    const labels = [
      2.3,
      1.4,
      4.2,
      3.1,
      2.5
    ]

    const datasets = [{
      label: 'Y Values',
      data: [
        [4.6, 6],
        [3.2, 8],
        [5.4, 3],
        [2.1, 7],
        [1.5, 2]
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'bubble-chart.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)

      nodeListToArray(dataEl.getElementsByTagName('c:xVal')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels.map((l) => l.toString()))

      nodeListToArray(dataEl.getElementsByTagName('c:yVal')[0].getElementsByTagName('c:v')).map((el) => parseFloat(el.textContent)).should.be.eql(datasets[idx].data.map((d) => d[0]))

      nodeListToArray(dataEl.getElementsByTagName('c:bubbleSize')[0].getElementsByTagName('c:v')).map((el) => parseFloat(el.textContent)).should.be.eql(datasets[idx].data.map((d) => d[1]))
    })
  })

  it('stock chart', async () => {
    const labels = [
      '2020-05-10',
      '2020-06-10',
      '2020-07-10',
      '2020-08-10'
    ]

    const datasets = [{
      label: 'High',
      data: [
        43,
        56,
        24,
        36
      ]
    }, {
      label: 'Low',
      data: [
        17,
        25,
        47,
        32
      ]
    }, {
      label: 'Close',
      data: [
        19,
        42,
        29,
        33
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'stock-chart.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)

      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels.map((l) => {
        return toExcelDate(moment(l).toDate()).toString()
      }))

      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(datasets[idx].data)
    })
  })

  it('combo chart (chart that uses a different chart type per data serie)', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 2, 4]
    }, {
      label: 'Ser4',
      data: [7, 5, 2]
    }, {
      label: 'Ser5',
      data: [6, 5, 4]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'combo-chart.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const barChart = doc.getElementsByTagName('c:barChart')[0]
    const lineChart = doc.getElementsByTagName('c:lineChart')[0]

    const barChartDataElements = nodeListToArray(barChart.getElementsByTagName('c:ser'))
    const lineChartDataElements = nodeListToArray(lineChart.getElementsByTagName('c:ser'))

    barChartDataElements.should.have.length(2)
    lineChartDataElements.should.have.length(3)

    barChartDataElements.forEach((dataEl, idx) => {
      const currentDatasets = datasets.slice(0, 2)
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(currentDatasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(currentDatasets[idx].data)
    })

    lineChartDataElements.forEach((dataEl, idx) => {
      const currentDatasets = datasets.slice(2)
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(currentDatasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(currentDatasets[idx].data)
    })
  })

  it('waterfall chart (chartex)', async () => {
    const labels = [
      'Cat 1',
      'Cat 2',
      'Cat 3',
      'Cat 4',
      'Cat 5',
      'Cat 5',
      'Cat 6',
      'Cat 8',
      'Cat 9'
    ]

    const datasets = [{
      label: 'Water Fall',
      data: [
        9702.0,
        -210.3,
        -24.0,
        -674.0,
        19.4,
        -1406.9,
        352.9,
        2707.5,
        10466.5
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'waterfall-chart.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chartEx1.xml').data.toString()
    )

    const labelElement = (
      doc.getElementsByTagName('cx:series')[0]
        .getElementsByTagName('cx:txData')[0]
        .getElementsByTagName('cx:v')[0]
    )

    const dataElement = doc.getElementsByTagName('cx:data')[0]

    labelElement.textContent.should.be.eql(datasets[0].label)

    const strDimElement = dataElement.getElementsByTagName('cx:strDim')[0]
    const numDimElement = dataElement.getElementsByTagName('cx:numDim')[0]

    strDimElement.getAttribute('type').should.be.eql('cat')
    numDimElement.getAttribute('type').should.be.eql('val')

    nodeListToArray(
      strDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      dataEl.textContent.should.be.eql(labels[idx])
    })

    nodeListToArray(
      numDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      parseFloat(dataEl.textContent).should.be.eql(datasets[0].data[idx])
    })
  })

  it('funnel chart (chartex)', async () => {
    const labels = [
      'Cat 1',
      'Cat 2',
      'Cat 3',
      'Cat 4',
      'Cat 5',
      'Cat 6'
    ]

    const datasets = [{
      label: 'Funnel',
      data: [
        3247,
        5729,
        1395,
        2874,
        6582,
        1765
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'funnel-chart.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chartEx1.xml').data.toString()
    )

    const labelElement = (
      doc.getElementsByTagName('cx:series')[0]
        .getElementsByTagName('cx:txData')[0]
        .getElementsByTagName('cx:v')[0]
    )

    const dataElement = doc.getElementsByTagName('cx:data')[0]

    labelElement.textContent.should.be.eql(datasets[0].label)

    const strDimElement = dataElement.getElementsByTagName('cx:strDim')[0]
    const numDimElement = dataElement.getElementsByTagName('cx:numDim')[0]

    strDimElement.getAttribute('type').should.be.eql('cat')
    numDimElement.getAttribute('type').should.be.eql('val')

    nodeListToArray(
      strDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      dataEl.textContent.should.be.eql(labels[idx])
    })

    nodeListToArray(
      numDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      parseFloat(dataEl.textContent).should.be.eql(datasets[0].data[idx])
    })
  })

  it('treemap chart (chartex)', async () => {
    const labels = [
      [
        'Rama 1',
        'Rama 1',
        'Rama 1',
        'Rama 1',
        'Rama 1',
        'Rama 2',
        'Rama 2',
        'Rama 3'
      ],
      [
        'Tallo 1',
        'Tallo 1',
        'Tallo 1',
        'Tallo 2',
        'Tallo 2',
        'Tallo 2',
        'Tallo 3',
        'Tallo 3'
      ],
      [
        'Hoja 1',
        'Hoja 2',
        'Hoja 3',
        'Hoja 4',
        'Hoja 5',
        'Hoja 6',
        'Hoja 7',
        'Hoja 8'
      ]
    ]

    const datasets = [{
      label: 'Treemap',
      data: [
        52,
        43,
        56,
        76,
        91,
        49,
        31,
        81
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'treemap-chart.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chartEx1.xml').data.toString()
    )

    const labelElement = (
      doc.getElementsByTagName('cx:series')[0]
        .getElementsByTagName('cx:txData')[0]
        .getElementsByTagName('cx:v')[0]
    )

    const dataElement = doc.getElementsByTagName('cx:data')[0]

    labelElement.textContent.should.be.eql(datasets[0].label)

    const strDimElement = dataElement.getElementsByTagName('cx:strDim')[0]
    const numDimElement = dataElement.getElementsByTagName('cx:numDim')[0]

    strDimElement.getAttribute('type').should.be.eql('cat')
    numDimElement.getAttribute('type').should.be.eql('size')

    nodeListToArray(
      strDimElement.getElementsByTagName('cx:lvl')
    ).forEach((lvlEl, idx) => {
      const targetLabels = labels.reverse()[idx]

      nodeListToArray(lvlEl.getElementsByTagName('cx:pt')).forEach((dataEl, ydx) => {
        dataEl.textContent.should.be.eql(targetLabels[ydx])
      })
    })

    nodeListToArray(
      numDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      parseFloat(dataEl.textContent).should.be.eql(datasets[0].data[idx])
    })
  })

  it('sunburst chart (chartex)', async () => {
    const labels = [
      [
        'Rama 1',
        'Rama 1',
        'Rama 1',
        'Rama 2',
        'Rama 2',
        'Rama 2',
        'Rama 2',
        'Rama 3'
      ],
      [
        'Tallo 1',
        'Tallo 1',
        'Tallo 1',
        'Tallo 2',
        'Tallo 2',
        'Tallo 2',
        'Hoja 6',
        'Hoja 7'
      ],
      [
        'Hoja 1',
        'Hoja 2',
        'Hoja 3',
        'Hoja 4',
        'Hoja 5',
        null,
        null,
        'Hoja 8'
      ]
    ]

    const datasets = [{
      label: 'Sunburst',
      data: [
        32,
        68,
        83,
        72,
        75,
        84,
        52,
        34
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'sunburst-chart.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chartEx1.xml').data.toString()
    )

    const labelElement = (
      doc.getElementsByTagName('cx:series')[0]
        .getElementsByTagName('cx:txData')[0]
        .getElementsByTagName('cx:v')[0]
    )

    const dataElement = doc.getElementsByTagName('cx:data')[0]

    labelElement.textContent.should.be.eql(datasets[0].label)

    const strDimElement = dataElement.getElementsByTagName('cx:strDim')[0]
    const numDimElement = dataElement.getElementsByTagName('cx:numDim')[0]

    strDimElement.getAttribute('type').should.be.eql('cat')
    numDimElement.getAttribute('type').should.be.eql('size')

    nodeListToArray(
      strDimElement.getElementsByTagName('cx:lvl')
    ).forEach((lvlEl, idx) => {
      const targetLabels = labels.reverse()[idx]

      nodeListToArray(lvlEl.getElementsByTagName('cx:pt')).forEach((dataEl, ydx) => {
        dataEl.textContent.should.be.eql(targetLabels[ydx] || '')
      })
    })

    nodeListToArray(
      numDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      parseFloat(dataEl.textContent).should.be.eql(datasets[0].data[idx])
    })
  })

  it('clusteredColumn (chartex)', async () => {
    const labels = [null]

    const datasets = [{
      label: 'clusteredColumn',
      data: [
        1,
        3,
        3,
        3,
        7,
        7,
        7,
        7,
        9,
        9,
        9,
        10,
        10,
        13,
        13,
        14,
        15,
        15,
        15,
        18,
        18,
        18,
        19,
        19,
        21,
        21,
        22,
        22,
        24,
        25
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'clusteredColumn-chart.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chartEx1.xml').data.toString()
    )

    const labelElement = (
      doc.getElementsByTagName('cx:series')[0]
        .getElementsByTagName('cx:txData')[0]
        .getElementsByTagName('cx:v')[0]
    )

    const dataElement = doc.getElementsByTagName('cx:data')[0]

    labelElement.textContent.should.be.eql(datasets[0].label)

    const strDimElement = dataElement.getElementsByTagName('cx:strDim')[0]
    const numDimElement = dataElement.getElementsByTagName('cx:numDim')[0]

    should(strDimElement).be.not.ok()
    numDimElement.getAttribute('type').should.be.eql('val')

    nodeListToArray(
      numDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      parseFloat(dataEl.textContent).should.be.eql(datasets[0].data[idx])
    })
  })

  it('chart with multiple definition on single drawing', async () => {
    const labels = ['Jan', 'Feb', 'March', 'Apr']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1, 2]
    }, {
      label: 'Ser2',
      data: [2, 3, 5, 6]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            // the duplicated charts in this sample can be reproduced by copy and pasting the chart
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-multiple-in-single-drawing.xlsx'))
          }
        }
      },
      data: {
        chartData1: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const chart1Doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const chart2Doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart2.xml').data.toString()
    )

    for (const doc of [chart1Doc, chart2Doc]) {
      const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

      dataElements.forEach((dataEl, idx) => {
        dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)
        nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
        nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(datasets[idx].data)
      })
    }
  })

  it('chart error message when no data', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(path.join(xlsxDirPath, 'chart-error-data.xlsx'))
            }
          }
        },
        data: {
          chartData: null
        }
      })
      .should.be.rejectedWith(/requires data parameter to be set/)
  })

  it('chart error message when no data.labels', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(path.join(xlsxDirPath, 'chart-error-data.xlsx'))
            }
          }
        },
        data: {
          chartData: {}
        }
      })
      .should.be.rejectedWith(/requires data parameter with labels to be set/)
  })

  it('chart error message when no data.datasets', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(path.join(xlsxDirPath, 'chart-error-data.xlsx'))
            }
          }
        },
        data: {
          chartData: {
            labels: ['Jan', 'Feb', 'March'],
            datasets: null
          }
        }
      })
      .should.be.rejectedWith(/requires data parameter with datasets to be set/)
  })

  it('chart should keep style defined in serie', async () => {
    const labels = ['Q1', 'Q2', 'Q3', 'Q4']
    const datasets = [{
      label: 'Apples',
      data: [100, 50, 10, 70]
    }, {
      label: 'Oranges',
      data: [20, 30, 20, 40]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-serie-style.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      should(dataEl.getElementsByTagName('c:spPr')[0]).be.not.undefined()
    })
  })

  it('chart should keep number format defined in serie', async () => {
    const labels = ['Q1', 'Q2', 'Q3', 'Q4']
    const datasets = [{
      label: 'Apples',
      data: [10000.0, 50000.45, 10000.45, 70000.546]
    }, {
      label: 'Oranges',
      data: [20000.3, 30000.2, 20000.4, 40000.4]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(xlsxDirPath, 'chart-serie-number-format.xlsx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      should(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:formatCode')[0].textContent).be.eql('#,##0.0')
    })
  })

  it('chart with source configured to table generated by loop', async () => {
    const data = [{
      category: 'Apples',
      serie1: 20,
      serie2: 40
    }, {
      category: 'Oranges',
      serie1: 13,
      serie2: 36
    }, {
      category: 'Pineapples',
      serie1: 51,
      serie2: 29
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'chart-with-dynamic-table-as-source.xlsx')
            )
          }
        }
      },
      data: {
        data
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C22.v).be.eql(data[0].category)
    should(sheet.D22.v).be.eql(data[0].serie1)
    should(sheet.E22.v).be.eql(data[0].serie2)
    should(sheet.C23.v).be.eql(data[1].category)
    should(sheet.D23.v).be.eql(data[1].serie1)
    should(sheet.E23.v).be.eql(data[1].serie2)
    should(sheet.C24.v).be.eql(data[2].category)
    should(sheet.D24.v).be.eql(data[2].serie1)
    should(sheet.E24.v).be.eql(data[2].serie2)
  })

  it('chartex with source configured to table generated by loop', async () => {
    const data = [{
      category: 'Category1',
      value: 20
    }, {
      category: 'Category2',
      value: 36
    }, {
      category: 'Category3',
      value: -29
    }, {
      category: 'Category4',
      value: 42
    }, {
      category: 'Category5',
      value: -18
    }, {
      category: 'Category6',
      value: 33
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'chartex-with-dynamic-table-as-source.xlsx')
            )
          }
        }
      },
      data: {
        data
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C22.v).be.eql(data[0].category)
    should(sheet.D22.v).be.eql(data[0].value)
    should(sheet.C23.v).be.eql(data[1].category)
    should(sheet.D23.v).be.eql(data[1].value)
    should(sheet.C24.v).be.eql(data[2].category)
    should(sheet.D24.v).be.eql(data[2].value)
    should(sheet.C25.v).be.eql(data[3].category)
    should(sheet.D25.v).be.eql(data[3].value)
    should(sheet.C26.v).be.eql(data[4].category)
    should(sheet.D26.v).be.eql(data[4].value)
    should(sheet.C27.v).be.eql(data[5].category)
    should(sheet.D27.v).be.eql(data[5].value)
  })
})
