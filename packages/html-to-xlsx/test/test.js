const should = require('should')
const util = require('util')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const xlsx = require('xlsx')
const { parseCell, num2col } = require('xlsx-coordinates')
const chromePageEval = require('chrome-page-eval')
const phantomPageEval = require('phantom-page-eval')
const puppeteer = require('puppeteer')
const phantomPath = require('phantomjs-prebuilt').path
const { getDocumentsFromXlsxBuf } = require('./utils')

const tmpDir = path.join(__dirname, 'temp')

const readFileAsync = util.promisify(fs.readFile)
const writeFileAsync = util.promisify(fs.writeFile)

const outputPath = path.join(__dirname, '../out.xlsx')

const extractTableScriptFn = fs.readFileSync(
  path.join(__dirname, '../lib/scripts/conversionScript.js')
).toString()

const chromeEval = chromePageEval({
  puppeteer,
  launchOptions: {
    args: ['--no-sandbox']
  }
})

const phantomEval = phantomPageEval({
  phantomPath,
  tmpDir,
  clean: false
})

describe('html extraction', () => {
  beforeEach(() => {
    rmDir(tmpDir)
  })

  const extractImplementation = (pageEval) => {
    return async (html) => {
      const htmlPath = await createHtmlFile(html)

      return pageEval({
        html: htmlPath,
        scriptFn: extractTableScriptFn
      })
    }
  }

  describe('chrome-strategy', () => {
    common(extractImplementation(chromeEval))
  })

  describe('phantom-strategy', () => {
    common(extractImplementation(phantomEval))
  })

  function common (pageEval) {
    it('should parse simple table', async () => {
      const table = await pageEval(`
        <table>
          <tr>
            <td>1</td>
          </tr>
        </table>
      `)

      table.rows.should.have.length(1)
      table.rows[0].should.have.length(1)
      table.rows[0][0].value.should.be.eql('1')
    })

    it('should parse value', async () => {
      const table = await pageEval(`
        <table>
          <tr>
            <td>node.js & javascript</td>
          </tr>
        </table>
      `)

      table.rows.should.have.length(1)
      table.rows[0].should.have.length(1)
      table.rows[0][0].value.should.be.eql('node.js &amp; javascript')
    })

    it('should parse un-escaped value', async () => {
      const table = await pageEval(`
        <table>
          <tr>
            <td>node.js & javascript</td>
          </tr>
        </table>
      `)

      table.rows.should.have.length(1)
      table.rows[0].should.have.length(1)
      table.rows[0][0].valueText.should.be.eql('node.js & javascript')
    })

    it('should parse cell data type', async () => {
      const table = await pageEval(`
        <table>
          <tr>
            <td data-cell-type="number">10</td>
            <td data-cell-type="boolean">1</td>
            <td data-cell-type="date">2019-01-22</td>
            <td data-cell-type="datetime">2019-01-22T17:31:36.242Z</td>
            <td data-cell-type="formula">=SUM(A1, B1)</td>
          </tr>
        </table>
      `)

      table.rows.should.have.length(1)
      table.rows[0].should.have.length(5)
      table.rows[0][0].type = 'number'
      table.rows[0][1].type = 'boolean'
      table.rows[0][2].type = 'date'
      table.rows[0][3].type = 'datetime'
      table.rows[0][4].type = 'formula'
    })

    it('should parse format str and enum', async () => {
      const table = await pageEval(`
        <table>
          <tr>
            <td data-cell-type="number" data-cell-format-str="0.00">10</td>
            <td data-cell-type="number" data-cell-format-enum="3">100000</td>
          </tr>
        </table>
      `)

      table.rows.should.have.length(1)
      table.rows[0][0].formatStr = '0.00'
      table.rows[0][1].formatEnum = 3
    })

    it('should parse background color', async () => {
      const table = await pageEval('<table><tr><td style="background-color:red">1</td></tr></table>')

      table.rows[0][0].backgroundColor[0].should.be.eql('255')
    })

    it('should parse foregorund color', async () => {
      const table = await pageEval('<table><tr><td style="color:red">1</td></tr></table>')

      table.rows[0][0].foregroundColor[0].should.be.eql('255')
    })

    it('should parse fontFamily', async () => {
      const table = await pageEval(`
        <table>
          <tr>
            <td style='font-family:Calibri'>1</td>
            <td style='font-family: "Times New Roman"'>2</td>
          </tr>
        </table>
      `)

      table.rows[0][0].fontFamily.should.be.eql('Calibri')
      table.rows[0][1].fontFamily.should.be.eql('Times New Roman')
    })

    it('should parse fontsize', async () => {
      const table = await pageEval('<table><tr><td style="font-size:19px">1</td></tr></table>')

      table.rows[0][0].fontSize.should.be.eql('19px')
    })

    it('should parse transform', async () => {
      const table = await pageEval('<table><tr><td style="transform: rotate(45deg)">1</td></tr></table>')

      table.rows[0][0].transform.should.be.eql('rotate(45deg)')
    })

    it('should parse writingMode', async () => {
      const table = await pageEval('<table><tr><td style="writing-mode: vertical-lr">1</td></tr></table>')

      table.rows[0][0].writingMode.should.be.eql('vertical-lr')
    })

    it('should parse textOrientation', async () => {
      const table = await pageEval('<table><tr><td style="text-orientation: upright">1</td></tr></table>')

      table.rows[0][0].textOrientation.should.be.eql('upright')
    })

    it('should parse verticalAlign', async () => {
      const table = await pageEval('<table><tr><td style="vertical-align:bottom">1</td></tr></table>')

      table.rows[0][0].verticalAlign.should.be.eql('bottom')
    })

    it('should parse horizontal align', async () => {
      const table = await pageEval('<table><tr><td style="text-align:left">1</td></tr></table>')

      table.rows[0][0].horizontalAlign.should.be.eql('left')
    })

    it('should parse width', async () => {
      const table = await pageEval('<table><tr><td style="width:19px">1</td></tr></table>')

      table.rows[0][0].width.should.be.ok()
    })

    it('should parse height', async () => {
      const table = await pageEval('<table><tr><td style="height:19px">1</td></tr></table>')

      table.rows[0][0].height.should.be.ok()
    })

    it('should parse border', async () => {
      const table = await pageEval(`
        <table>
          <tr>
            <td style='border-style:solid;'>1</td>
          </tr>
        </table>
      `)

      table.rows[0][0].border.left.should.be.eql('solid')
      table.rows[0][0].border.right.should.be.eql('solid')
      table.rows[0][0].border.bottom.should.be.eql('solid')
      table.rows[0][0].border.top.should.be.eql('solid')
    })

    it('should parse complex border', async () => {
      const table = await pageEval(`
        <table>
          <tr>
            <td style='border-left: 1px solid red;'>1</td>
          </tr>
        </table>
      `)

      table.rows[0][0].border.leftColor.should.be.eql(['255', '0', '0'])
      table.rows[0][0].border.leftWidth.should.be.eql('1px')
      table.rows[0][0].border.leftStyle.should.be.eql('solid')
    })

    it('should parse overflow', async () => {
      const table = await pageEval('<table><tr><td style="overflow:scroll;">1234567789012345678912457890</td></tr></table>')

      table.rows[0][0].wrapText.should.be.eql('scroll')
    })

    it('should parse textDecoration', async () => {
      const table = await pageEval(`
        <table>
          <tr>
            <td style='text-decoration: underline'>
              1234
            </td>
          </tr>
        </table>
      `)

      table.rows[0][0].textDecoration.line.should.be.eql('underline')
    })

    it('should parse background color from styles with line endings', async () => {
      const table = await pageEval('<style> td { \n background-color: red \n } </style><table><tr><td>1</td></tr></table>')

      table.rows[0][0].backgroundColor[0].should.be.eql('255')
    })

    it('should work for long tables', async function () {
      let rows = ''

      for (let i = 0; i < 10000; i++) {
        rows += '<tr><td>1</td></tr>'
      }

      const table = await pageEval(`<table>${rows}</table>`)

      table.rows.should.have.length(10000)
    })

    it('should parse colspan', async () => {
      const table = await pageEval('<table><tr><td colspan="6"></td><td>Column 7</td></tr></table>')

      table.rows[0][0].colspan.should.be.eql(6)
      table.rows[0][1].value.should.be.eql('Column 7')
    })

    it('should parse rowspan', async () => {
      const table = await pageEval('<table><tr><td rowspan="2">Col 1</td><td>Col 2</td></tr></table>')

      table.rows[0][0].rowspan.should.be.eql(2)
      table.rows[0][0].value.should.be.eql('Col 1')
      table.rows[0][1].value.should.be.eql('Col 2')
    })

    it('should parse complex rowspan', async () => {
      const table = await pageEval(`
        <table>
          <tr>
            <td rowspan='3'>Row 1 Col 1</td>
            <td>Row 1 Col 2</td>
            <td>Row 1 Col 3</td>
            <td>Row 1 Col 4</td>
          </tr>
          <tr>
            <td rowspan='2'>Row 2 Col 1</td>
            <td rowspan='2'>Row 2 Col 2</td>
            <td>Row 2 Col 3</td>
          </tr>
          <tr>
            <td>Row 3 Col 3</td>
          </tr>
        </table>
      `)

      table.rows[0][0].rowspan.should.be.eql(3)
      table.rows[0][0].value.should.be.eql('Row 1 Col 1')
      table.rows[1][1].value.should.be.eql('Row 2 Col 2')
    })

    it('should parse th elements', async () => {
      const table = await pageEval(`
        <table>
          <tr>
            <th>col1</th>
            <th>col2</th>
          </tr>
          <tr>
            <td>1</td>
            <td>2</td>
          </tr>
        </table>
      `)

      table.rows.should.have.length(2)
      table.rows[0][0].value.should.be.eql('col1')
      table.rows[0][1].value.should.be.eql('col2')
      table.rows[1][0].value.should.be.eql('1')
      table.rows[1][1].value.should.be.eql('2')
    })
  }
})

describe('html to xlsx conversion with strategy', () => {
  const extractImplementation = (pageEval) => {
    return async ({ html, ...restOptions }) => {
      const htmlPath = await createHtmlFile(html)

      const result = await pageEval({
        ...restOptions,
        html: htmlPath,
        scriptFn: extractTableScriptFn
      })

      const tables = Array.isArray(result) ? result : [result]

      return tables.map((table) => ({
        name: table.name,
        getRows: async (rowCb) => {
          table.rows.forEach((row) => {
            rowCb(row)
          })
        },
        rowsCount: table.rows.length
      }))
    }
  }

  describe('chrome-strategy', () => {
    commonConversion(extractImplementation(chromeEval))
  })

  // describe('phantom-strategy', () => {
  //   commonConversion(extractImplementation(phantomEval))
  // })

  function commonConversion (pageEval) {
    let conversion

    beforeEach(function () {
      rmDir(tmpDir)

      conversion = require('../')({
        tmpDir,
        extract: pageEval
      })
    })

    it('should not fail', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td>hello</td>
          </tr>
        </table
      `)

      stream.should.have.property('readable')
    })

    it('default sheet name should be Sheet1', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td>hello</td>
          </tr>
        </table
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.SheetNames[0]).be.eql('Sheet1')
    })

    it('should be able to set custom sheet name', async () => {
      const parseXlsx = (xlsxStream) => {
        return new Promise((resolve, reject) => {
          const bufs = []

          xlsxStream.on('error', reject)
          xlsxStream.on('data', (d) => { bufs.push(d) })

          xlsxStream.on('end', () => {
            const buf = Buffer.concat(bufs)
            resolve(xlsx.read(buf))
          })
        })
      }

      let stream = await conversion(`
        <table name="custom">
          <tr>
            <td>1</td>
          </tr>
        </table>
      `)

      let parsedXlsx = await parseXlsx(stream)

      should(parsedXlsx.SheetNames[0]).be.eql('custom')

      stream = await conversion(`
        <table data-sheet-name="custom2">
          <tr>
            <td>1</td>
          </tr>
        </table>
      `)

      parsedXlsx = await parseXlsx(stream)

      should(parsedXlsx.SheetNames[0]).be.eql('custom2')
    })

    it('should be able to set cell with datatypes', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td data-cell-type="number">10</td>
            <td data-cell-type="number">10</td>
            <td data-cell-type="boolean">1</td>
            <td data-cell-type="date">2019-01-22</td>
            <td data-cell-type="datetime">2019-01-22T17:31:36.000-05:00</td>
            <td data-cell-type="formula">=SUM(A1, B1)</td>
          </tr>
        </table>
      `)

      let outputBuf

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          outputBuf = buf
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql(10)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql(10)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql(true)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1.v).be.Number()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E1.v).be.Number()

      const [sheetDoc] = await getDocumentsFromXlsxBuf(outputBuf, ['xl/worksheets/sheet1.xml'], { strict: true })

      const cellEls = nodeListToArray(sheetDoc.getElementsByTagName('c'))
      const formulaCellEl = cellEls.find((c) => c.getAttribute('r') === 'F1')

      should(formulaCellEl.getElementsByTagName('f')[0].textContent).be.eql('=SUM(A1, B1)')
    })

    it('should generate empty cells if html cells are empty', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td>TESTABC123 CURR MONTH REPORT</td>
            <td></td>
            <td></td>
            <td data-cell-type="number">10</td>
            <td data-cell-type="number">10</td>
            <td data-cell-type="boolean">1</td>
            <td data-cell-type="formula">=SUM(D1, E1)</td>
          </tr>
        </table>
      `)

      let outputBuf

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          outputBuf = buf
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('TESTABC123 CURR MONTH REPORT')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1).be.not.ok()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1).be.not.ok()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1.v).be.eql(10)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E1.v).be.eql(10)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F1.v).be.eql(true)

      const [sheetDoc] = await getDocumentsFromXlsxBuf(outputBuf, ['xl/worksheets/sheet1.xml'], { strict: true })

      const cellEls = nodeListToArray(sheetDoc.getElementsByTagName('c'))

      const emptyCells = cellEls.filter((c) => c.getAttribute('r') === 'B1' || c.getAttribute('r') === 'C1')

      should(emptyCells).have.length(2)

      should(emptyCells[0].hasChildNodes()).be.False()
      should(emptyCells[1].hasChildNodes()).be.False()

      const formulaCellEl = cellEls.find((c) => c.getAttribute('r') === 'G1')

      should(formulaCellEl.getElementsByTagName('f')[0].textContent).be.eql('=SUM(D1, E1)')
    })

    it('should be able to set cell format', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td data-cell-type="number" data-cell-format-str="0.00">10</td>
            <td data-cell-type="number" data-cell-format-enum="3">100000</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql(10)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.w).be.eql('10.00')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql(100000)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.w).be.eql('100,000')
    })

    it('should work with th elements', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <th>col1</th>
            <th>col2</th>
          </tr>
          <tr>
            <td>1</td>
            <td>2</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('col1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('col2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2.v).be.eql('2')
    })

    it('should be able to modify text orientation with transform (in different units)', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td style="transform: rotate(90deg)">col1-1</td>
            <td style="transform: rotate(100grad)">col1-2</td>
            <td style="transform: rotate(0.25turn)">col1-3</td>
            <td style="transform: rotate(1.5707963268rad)">col1-4</td>
          </tr>
        </table>
      `)

      const resultBuf = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(buf)
        })
      })

      fs.writeFileSync(outputPath, resultBuf)

      const [sheetDoc, stylesDoc] = await getDocumentsFromXlsxBuf(resultBuf, ['xl/worksheets/sheet1.xml', 'xl/styles.xml'], { strict: true })

      should(getCell(sheetDoc, 'A1', 'v')).be.eql('col1-1')
      should(getStyle(sheetDoc, stylesDoc, 'A1', 'tr')).be.eql('180')
      should(getCell(sheetDoc, 'B1', 'v')).be.eql('col1-2')
      should(getStyle(sheetDoc, stylesDoc, 'B1', 'tr')).be.eql('180')
      should(getCell(sheetDoc, 'C1', 'v')).be.eql('col1-3')
      should(getStyle(sheetDoc, stylesDoc, 'C1', 'tr')).be.eql('180')
      should(getCell(sheetDoc, 'D1', 'v')).be.eql('col1-4')
      should(getStyle(sheetDoc, stylesDoc, 'D1', 'tr')).be.eql('180')
    })

    it('should ignore text orientation with transform with value not supported in xlsx', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td style="transform: rotate(180deg)">col1-1</td>
          </tr>
        </table>
      `)

      const resultBuf = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(buf)
        })
      })

      fs.writeFileSync(outputPath, resultBuf)

      const [sheetDoc, stylesDoc] = await getDocumentsFromXlsxBuf(resultBuf, ['xl/worksheets/sheet1.xml', 'xl/styles.xml'], { strict: true })

      should(getCell(sheetDoc, 'A1', 'v')).be.eql('col1-1')
      should(getStyle(sheetDoc, stylesDoc, 'A1', 'tr')).be.eql('')
    })

    it('should be able to modify text orientation with writing-mode and text-orientation', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td style="writing-mode: sideways-lr; text-orientation: upright">col1-1</td>
            <td style="writing-mode: sideways-rl; text-orientation: upright">col1-2</td>
            <td style="writing-mode: vertical-lr; text-orientation: upright">col1-3</td>
            <td style="writing-mode: vertical-rl; text-orientation: upright">col1-4</td>
            <td style="writing-mode: sideways-lr; text-orientation: mixed">col1-5</td>
            <td style="writing-mode: sideways-rl; text-orientation: mixed">col1-6</td>
            <td style="writing-mode: vertical-lr; text-orientation: mixed">col1-7</td>
            <td style="writing-mode: vertical-rl; text-orientation: mixed">col1-8</td>
            <td style="writing-mode: sideways-lr; text-orientation: sideways">col1-9</td>
            <td style="writing-mode: sideways-rl; text-orientation: sideways">col1-10</td>
            <td style="writing-mode: vertical-lr; text-orientation: sideways">col1-11</td>
            <td style="writing-mode: vertical-rl; text-orientation: sideways">col1-12</td>
            <td style="writing-mode: sideways-lr; text-orientation: sideways-right">col1-13</td>
            <td style="writing-mode: sideways-rl; text-orientation: sideways-right">col1-14</td>
            <td style="writing-mode: vertical-lr; text-orientation: sideways-right">col1-15</td>
            <td style="writing-mode: vertical-rl; text-orientation: sideways-right">col1-16</td>
          </tr>
        </table>
      `)

      const resultBuf = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(buf)
        })
      })

      fs.writeFileSync(outputPath, resultBuf)

      const [sheetDoc, stylesDoc] = await getDocumentsFromXlsxBuf(resultBuf, ['xl/worksheets/sheet1.xml', 'xl/styles.xml'], { strict: true })

      should(getCell(sheetDoc, 'A1', 'v')).be.eql('col1-1')
      should(getStyle(sheetDoc, stylesDoc, 'A1', 'tr')).be.eql('90')
      should(getCell(sheetDoc, 'B1', 'v')).be.eql('col1-2')
      should(getStyle(sheetDoc, stylesDoc, 'B1', 'tr')).be.eql('180')
      should(getCell(sheetDoc, 'C1', 'v')).be.eql('col1-3')
      should(getStyle(sheetDoc, stylesDoc, 'C1', 'tr')).be.eql('255')
      should(getCell(sheetDoc, 'D1', 'v')).be.eql('col1-4')
      should(getStyle(sheetDoc, stylesDoc, 'D1', 'tr')).be.eql('255')
      should(getCell(sheetDoc, 'E1', 'v')).be.eql('col1-5')
      should(getStyle(sheetDoc, stylesDoc, 'E1', 'tr')).be.eql('90')
      should(getCell(sheetDoc, 'F1', 'v')).be.eql('col1-6')
      should(getStyle(sheetDoc, stylesDoc, 'F1', 'tr')).be.eql('180')
      should(getCell(sheetDoc, 'G1', 'v')).be.eql('col1-7')
      should(getStyle(sheetDoc, stylesDoc, 'G1', 'tr')).be.eql('180')
      should(getCell(sheetDoc, 'H1', 'v')).be.eql('col1-8')
      should(getStyle(sheetDoc, stylesDoc, 'H1', 'tr')).be.eql('180')
      should(getCell(sheetDoc, 'I1', 'v')).be.eql('col1-9')
      should(getStyle(sheetDoc, stylesDoc, 'I1', 'tr')).be.eql('90')
      should(getCell(sheetDoc, 'J1', 'v')).be.eql('col1-10')
      should(getStyle(sheetDoc, stylesDoc, 'J1', 'tr')).be.eql('180')
      should(getCell(sheetDoc, 'K1', 'v')).be.eql('col1-11')
      should(getStyle(sheetDoc, stylesDoc, 'K1', 'tr')).be.eql('180')
      should(getCell(sheetDoc, 'L1', 'v')).be.eql('col1-12')
      should(getStyle(sheetDoc, stylesDoc, 'L1', 'tr')).be.eql('180')
      should(getCell(sheetDoc, 'M1', 'v')).be.eql('col1-13')
      should(getStyle(sheetDoc, stylesDoc, 'M1', 'tr')).be.eql('90')
      should(getCell(sheetDoc, 'N1', 'v')).be.eql('col1-14')
      should(getStyle(sheetDoc, stylesDoc, 'N1', 'tr')).be.eql('180')
      should(getCell(sheetDoc, 'O1', 'v')).be.eql('col1-15')
      should(getStyle(sheetDoc, stylesDoc, 'O1', 'tr')).be.eql('180')
      should(getCell(sheetDoc, 'P1', 'v')).be.eql('col1-16')
      should(getStyle(sheetDoc, stylesDoc, 'P1', 'tr')).be.eql('180')
    })

    it('should not fail when last cell of a row has rowspan', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td rowspan="2">Cell RowSpan</td>
          </tr>
          <tr>
            <td>Foo</td>
          </tr>
        </table>
      `)

      stream.should.have.property('readable')
    })

    it('should work when using special rowspan layout #1 (row with just one cell)', async () => {
      const stream = await conversion(`
        <table>
          <tr>
              <td rowspan="3">ROWSPAN 3</td>
          </tr>
          <tr>
              <td>Ipsum</td>
              <td>Data</td>
          </tr>
          <tr>
              <td>Hello</td>
              <td>World</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('ROWSPAN 3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('Ipsum')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('Data')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2.v).be.eql('Hello')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2.v).be.eql('World')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(0)
    })

    it('should work when using special rowspan layout #2 (row with just one cell, more rows)', async () => {
      const stream = await conversion(`
        <table>
          <tr>
              <td rowspan="3">ROWSPAN 3</td>
          </tr>
          <tr>
              <td>Ipsum</td>
              <td>Data</td>
          </tr>
          <tr>
              <td>Hello</td>
              <td>World</td>
          </tr>
          <tr>
              <td>Something</td>
              <td>Else</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('ROWSPAN 3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('Ipsum')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('Data')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2.v).be.eql('Hello')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2.v).be.eql('World')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A3.v).be.eql('Something')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3.v).be.eql('Else')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(0)
    })

    it('should work when using special rowspan layout #3 (row with normal cells and first cell with rowspan)', async () => {
      const stream = await conversion(`
        <table>
          <tr>
              <td rowspan="3">ROWSPAN 3</td>
              <td>Header 2</td>
              <td>Header 3</td>
          </tr>
          <tr>
              <td>Ipsum</td>
              <td>Data</td>
          </tr>
          <tr>
              <td>Hello</td>
              <td>World</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('ROWSPAN 3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('Header 2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('Header 3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2.v).be.eql('Ipsum')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2.v).be.eql('Data')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3.v).be.eql('Hello')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3.v).be.eql('World')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(0)
    })

    it('should work when using special rowspan layout #4 (row with all cells using rowspan)', async () => {
      const stream = await conversion(`
        <table>
          <tr>
              <td rowspan="3">NRO1</td>
              <td rowspan="3">NRO2</td>
              <td rowspan="3">NRO3</td>
              <td rowspan="3">NRO4</td>
          </tr>
          <tr>
              <td>Doc1.</td>
          </tr>
          <tr>
              <td>Doc2.</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('NRO1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('NRO2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('NRO3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1.v).be.eql('NRO4')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E1.v).be.eql('Doc1.')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E2.v).be.eql('Doc2.')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(0)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.c).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.c).be.eql(1)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.c).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.c).be.eql(2)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.c).be.eql(3)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.c).be.eql(3)
    })

    it('should work when using special rowspan layout #5 (row with lot of cells using rowspan but last one without it)', async () => {
      const stream = await conversion(`
        <table>
          <tr>
              <td rowspan="3">NRO1</td>
              <td rowspan="3">NRO2</td>
              <td rowspan="3">NRO3</td>
              <td>NRO4</td>
          </tr>
          <tr>
              <td>Doc1.</td>
          </tr>
          <tr>
              <td>Doc2.</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('NRO1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('NRO2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('NRO3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1.v).be.eql('NRO4')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D2.v).be.eql('Doc1.')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D3.v).be.eql('Doc2.')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(0)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.c).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.c).be.eql(1)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.c).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.c).be.eql(2)
    })

    it('should work when using special rowspan layout #6 (row with lot of cells using rowspan but last one using colspan)', async () => {
      const stream = await conversion(`
        <table>
          <tr>
              <td rowspan="3">NRO1</td>
              <td rowspan="3">Text1</td>
              <td rowspan="3">Text2</td>
              <td colspan="3">Receip</td>
          </tr>
          <tr>
              <td>Doc.</td>
              <td colspan="2">Information</td>
          </tr>
          <tr>
              <td>Text3</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('NRO1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('Text1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('Text2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1.v).be.eql('Receip')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D2.v).be.eql('Doc.')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E2.v).be.eql('Information')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D3.v).be.eql('Text3')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(0)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.c).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.c).be.eql(1)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.c).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.c).be.eql(2)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.c).be.eql(3)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.c).be.eql(5)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].s.c).be.eql(4)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].e.c).be.eql(5)
    })

    it('should work when using special rowspan layout #7 (row with only one cell that uses rowspan greater than available rows)', async () => {
      const stream = await conversion(`
        <table>
          <tr>
              <td rowspan="3">ROWSPAN 3</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('ROWSPAN 3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges']).be.undefined()
    })

    it('should work when using special rowspan layout #8 (complex calendar like layout)', async () => {
      const stream = await conversion(`
        <table border="1" style="border-collapse:collapse;">
          <tr>
            <td rowspan="2" colspan="2">corner</td>
            <td colspan="5">2015</td>
            <td colspan="5">2016</td>
            <td colspan="5">Summary</td>
          </tr>
          <tr>
            <td>Amount 1</td>
            <td>Amount 2</td>
            <td>Amount 3</td>
            <td>Amount 4</td>
            <td>Amount 5</td>
            <td>Amount 1</td>
            <td>Amount 2</td>
            <td>Amount 3</td>
            <td>Amount 4</td>
            <td>Amount 5</td>
            <td>Total Amount 1</td>
            <td>Total Amount 2</td>
            <td>Total Amount 3</td>
            <td>Total Amount 4</td>
            <td>Total Amount 5</td>
          </tr>
          <tr>
            <td rowspan="2" >Buffer</td>
            <td>Jane Doe</td>
            <td>10</td>
            <td>15</td>
            <td>20</td>
            <td>25</td>
            <td>30</td>
            <td>2</td>
            <td>4</td>
            <td>6</td>
            <td>8</td>
            <td>10</td>
            <td>12</td>
            <td>19</td>
            <td>26</td>
            <td>32</td>
            <td>40</td>
          </tr>
          <tr>
            <td>Thomas Smith</td>
            <td>0</td>
            <td>25</td>
            <td>20</td>
            <td>15</td>
            <td>10</td>
            <td>5</td>
            <td>3</td>
            <td>6</td>
            <td>9</td>
            <td>12</td>
            <td>15</td>
            <td>5</td>
            <td>28</td>
            <td>26</td>
            <td>22</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('corner')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('2015')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H1.v).be.eql('2016')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].L1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].M1.v).be.eql('Summary')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].N1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].O1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].P1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].Q1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2.v).be.eql('Amount 1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D2.v).be.eql('Amount 2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E2.v).be.eql('Amount 3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F2.v).be.eql('Amount 4')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G2.v).be.eql('Amount 5')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H2.v).be.eql('Amount 1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I2.v).be.eql('Amount 2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J2.v).be.eql('Amount 3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K2.v).be.eql('Amount 4')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].L2.v).be.eql('Amount 5')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].M2.v).be.eql('Total Amount 1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].N2.v).be.eql('Total Amount 2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].O2.v).be.eql('Total Amount 3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].P2.v).be.eql('Total Amount 4')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].Q2.v).be.eql('Total Amount 5')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A3.v).be.eql('Buffer')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3.v).be.eql('Jane Doe')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3.v).be.eql('10')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D3.v).be.eql('15')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E3.v).be.eql('20')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F3.v).be.eql('25')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G3.v).be.eql('30')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H3.v).be.eql('2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I3.v).be.eql('4')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J3.v).be.eql('6')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K3.v).be.eql('8')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].L3.v).be.eql('10')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].M3.v).be.eql('12')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].N3.v).be.eql('19')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].O3.v).be.eql('26')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].P3.v).be.eql('32')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].Q3.v).be.eql('40')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B4.v).be.eql('Thomas Smith')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C4.v).be.eql('0')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D4.v).be.eql('25')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E4.v).be.eql('20')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F4.v).be.eql('15')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G4.v).be.eql('10')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H4.v).be.eql('5')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I4.v).be.eql('3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J4.v).be.eql('6')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K4.v).be.eql('9')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].L4.v).be.eql('12')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].M4.v).be.eql('15')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].N4.v).be.eql('5')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].O4.v).be.eql('28')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].P4.v).be.eql('26')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].Q4.v).be.eql('22')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(1)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.c).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.c).be.eql(6)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.c).be.eql(7)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.c).be.eql(11)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.c).be.eql(12)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.c).be.eql(16)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].s.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].e.r).be.eql(3)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].e.c).be.eql(0)
    })

    it('should work when using special rowspan layout #9 (using rowspan in different rows)', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td rowspan='3'>Row 1 Col 1</td>
            <td>Row 1 Col 2</td>
            <td>Row 1 Col 3</td>
            <td>Row 1 Col 4</td>
          </tr>
          <tr>
            <td rowspan='2'>Row 2 Col 1</td>
            <td rowspan='2'>Row 2 Col 2</td>
            <td>Row 2 Col 3</td>
          </tr>
          <tr>
            <td>Row 3 Col 3</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('Row 1 Col 1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('Row 1 Col 2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2.v).be.eql('Row 2 Col 1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('Row 1 Col 3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2.v).be.eql('Row 2 Col 2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1.v).be.eql('Row 1 Col 4')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D2.v).be.eql('Row 2 Col 3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D3.v).be.eql('Row 3 Col 3')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(0)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.c).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.c).be.eql(1)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.c).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.c).be.eql(1)
    })

    it('should work when using special rowspan layout #10 (using rowspan and colspan in one row leaving a hole in cells for next row)', async () => {
      const stream = await conversion(`
        <style>
            * {
                font-family: Arial;
            }

            td {
                padding: 15px;
                font-size: 10px;
                text-align: center;
            }

            .title {
                font-size: 18px;
                font-weight: bold;
                text-align: left;
            }

            .line-break {
                overflow: scroll;
            }

            .cell-titles td {
                font-weight: bold;
                color: #fff;
            }

            .project-name {
                background-color: #2F5596;
            }

            .timeline {
                background-color: #4472C4;
            }

            .timeline-child {
                background-color: #5B9CD5;
            }

            .number-of-team-members {
                background-color: #732DE0;
            }

            .budget {
                background-color: #31AF4F;
            }

            .budget-child {
                background-color: #92D050;
            }

            .risks {
                background-color: #C01800;
            }

            .risks-child {
                background-color: #F42100;
            }

            .open {
                background-color: #EC7D00;
            }

            .open-child {
                background-color: #F1B93C;
            }

            .pending-actions {
                background-color: #BF8F00;
            }
        </style>
        <table name="Extra">
            <tr>
                <td class="title" colspan="10">PROJECT PORTFOLIO DATA</td>
            </tr>
            <tr class="cell-titles">
                <td class="project-name" rowspan="2">PROJECT NAME</td>
                <td class="timeline" colspan="4">TIMELINE</td>
                <td class="number-of-team-members line-break" rowspan="2">NUMBER<br />OF TEAM<br />MEMBERS</td>
            </tr>
            <tr class="cell-titles">
                <td class="timeline-child">CALENDAR</td>
                <td class="timeline-child">BEGIN</td>
                <td class="timeline-child">FINISH</td>
                <td class="timeline-child"># of DAYS</td>
            </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('PROJECT PORTFOLIO DATA')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2.v).be.eql('PROJECT NAME')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2.v).be.eql('TIMELINE')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3.v).be.eql('CALENDAR')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3.v).be.eql('BEGIN')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D3.v).be.eql('FINISH')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E3.v).be.eql('# of DAYS')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F2.v).be.eql('NUMBER\nOF TEAM\nMEMBERS')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(9)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.c).be.eql(0)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.c).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.c).be.eql(4)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.c).be.eql(5)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.c).be.eql(5)
    })

    it('should work when using special rowspan layout #11 (using rowspan and colspan in one row leaving one set of holes in cells for next row and covering more cells than the available holes)', async () => {
      const stream = await conversion(`
        <style>
            * {
                font-family: Arial;
            }

            td {
                padding: 15px;
                font-size: 10px;
                text-align: center;
            }

            .title {
                font-size: 18px;
                font-weight: bold;
                text-align: left;
            }

            .line-break {
                overflow: scroll;
            }

            .cell-titles td {
                font-weight: bold;
                color: #fff;
            }

            .project-name {
                background-color: #2F5596;
            }

            .timeline {
                background-color: #4472C4;
            }

            .timeline-child {
                background-color: #5B9CD5;
            }

            .number-of-team-members {
                background-color: #732DE0;
            }

            .budget {
                background-color: #31AF4F;
            }

            .budget-child {
                background-color: #92D050;
            }

            .risks {
                background-color: #C01800;
            }

            .risks-child {
                background-color: #F42100;
            }

            .open {
                background-color: #EC7D00;
            }

            .open-child {
                background-color: #F1B93C;
            }

            .pending-actions {
                background-color: #BF8F00;
            }
        </style>
        <table name="Extra">
            <tr>
                <td class="title" colspan="10">PROJECT PORTFOLIO DATA</td>
            </tr>
            <tr class="cell-titles">
                <td class="project-name" rowspan="2">PROJECT NAME</td>
                <td class="timeline" colspan="4">TIMELINE</td>
                <td class="number-of-team-members line-break" rowspan="2">NUMBER<br />OF TEAM<br />MEMBERS</td>
            </tr>
            <tr class="cell-titles">
                <td class="timeline-child">CALENDAR</td>
                <td class="timeline-child">BEGIN</td>
                <td class="timeline-child">FINISH</td>
                <td class="timeline-child"># of DAYS</td>
                <td class="budget-child">PROJECTED</td>
                <td class="budget-child">ACTUAL</td>
            </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('PROJECT PORTFOLIO DATA')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2.v).be.eql('PROJECT NAME')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2.v).be.eql('TIMELINE')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3.v).be.eql('CALENDAR')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3.v).be.eql('BEGIN')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D3.v).be.eql('FINISH')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E3.v).be.eql('# of DAYS')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F2.v).be.eql('NUMBER\nOF TEAM\nMEMBERS')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G3.v).be.eql('PROJECTED')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H3.v).be.eql('ACTUAL')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(9)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.c).be.eql(0)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.c).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.c).be.eql(4)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.c).be.eql(5)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.c).be.eql(5)
    })

    it('should work when using special rowspan layout #12 (using two rowspan and colspan in one row leaving two sets of holes in cells for next row)', async () => {
      const stream = await conversion(`
        <style>
            * {
                font-family: Arial;
            }

            td {
                padding: 15px;
                font-size: 10px;
                text-align: center;
            }

            .title {
                font-size: 18px;
                font-weight: bold;
                text-align: left;
            }

            .line-break {
                overflow: scroll;
            }

            .cell-titles td {
                font-weight: bold;
                color: #fff;
            }

            .project-name {
                background-color: #2F5596;
            }

            .timeline {
                background-color: #4472C4;
            }

            .timeline-child {
                background-color: #5B9CD5;
            }

            .number-of-team-members {
                background-color: #732DE0;
            }

            .budget {
                background-color: #31AF4F;
            }

            .budget-child {
                background-color: #92D050;
            }

            .risks {
                background-color: #C01800;
            }

            .risks-child {
                background-color: #F42100;
            }

            .open {
                background-color: #EC7D00;
            }

            .open-child {
                background-color: #F1B93C;
            }

            .pending-actions {
                background-color: #BF8F00;
            }
        </style>
        <table name="Extra">
            <tr>
                <td class="title" colspan="10">PROJECT PORTFOLIO DATA</td>
            </tr>
            <tr class="cell-titles">
                <td class="project-name" rowspan="2">PROJECT NAME</td>
                <td class="timeline" colspan="4">TIMELINE</td>
                <td class="number-of-team-members line-break" rowspan="2">NUMBER<br />OF TEAM<br />MEMBERS</td>
                <td class="budget" colspan="3">BUDGET</td>
                <td class="risks" colspan="3">RISKS</td>
                <td class="open" colspan="2">OPEN</td>
                <td class="pending-actions line-break" rowspan="2">PENDING<br />ACTIONS</td>
            </tr>
            <tr class="cell-titles">
                <td class="timeline-child">CALENDAR</td>
                <td class="timeline-child">BEGIN</td>
                <td class="timeline-child">FINISH</td>
                <td class="timeline-child"># of DAYS</td>
                <td class="budget-child">PROJECTED</td>
                <td class="budget-child">ACTUAL</td>
                <td class="budget-child">REMAINDER</td>
                <td class="risks-child">HIGH</td>
                <td class="risks-child">MEDIUM</td>
                <td class="risks-child">LOW</td>
                <td class="open-child">ISSUES</td>
                <td class="open-child">REVISIONS</td>
            </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('PROJECT PORTFOLIO DATA')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2.v).be.eql('PROJECT NAME')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2.v).be.eql('TIMELINE')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3.v).be.eql('CALENDAR')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3.v).be.eql('BEGIN')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D3.v).be.eql('FINISH')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E3.v).be.eql('# of DAYS')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F2.v).be.eql('NUMBER\nOF TEAM\nMEMBERS')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G2.v).be.eql('BUDGET')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G3.v).be.eql('PROJECTED')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H3.v).be.eql('ACTUAL')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I3.v).be.eql('REMAINDER')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J2.v).be.eql('RISKS')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J3.v).be.eql('HIGH')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K3.v).be.eql('MEDIUM')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].L3.v).be.eql('LOW')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].M2.v).be.eql('OPEN')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].M3.v).be.eql('ISSUES')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].N3.v).be.eql('REVISIONS')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].O2.v).be.eql('PENDING\nACTIONS')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(9)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.c).be.eql(0)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.c).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.c).be.eql(4)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.c).be.eql(5)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.c).be.eql(5)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].s.c).be.eql(6)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].e.c).be.eql(8)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][5].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][5].s.c).be.eql(9)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][5].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][5].e.c).be.eql(11)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][6].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][6].s.c).be.eql(12)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][6].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][6].e.c).be.eql(13)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][7].s.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][7].s.c).be.eql(14)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][7].e.r).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][7].e.c).be.eql(14)
    })

    it('should work when using special rowspan layout #13 (using multiple rowspan in one row and then continuing with cells in next row)', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <th rowspan="2">Date</th>
            <th rowspan="2">info1 </th>
            <th colspan="2">group1</th>
            <th colspan="2">group2</th>
            <th rowspan="2">info8</th>
            <th rowspan="2">info9</th>
            <th rowspan="2">info10</th>
            <th rowspan="2">info11</th>
          </tr>
          <tr>
            <th>test1</th>
            <th>test2</th>
            <th>test3</th>
            <th>test4</th>
          </tr>
          <tr>
            <td>01022021</td>
            <td>i1</td>
            <td>g11</td>
            <td>g12</td>
            <td>g21</td>
            <td>g22</td>
            <td>i8</td>
            <td>i9</td>
            <td>i10</td>
            <td>i11</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('Date')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A3.v).be.eql('01022021')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('info1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3.v).be.eql('i1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('group1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2.v).be.eql('test1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3.v).be.eql('g11')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D2.v).be.eql('test2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D3.v).be.eql('g12')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E1.v).be.eql('group2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E2.v).be.eql('test3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E3.v).be.eql('g21')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F2.v).be.eql('test4')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F3.v).be.eql('g22')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G1.v).be.eql('info8')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G3.v).be.eql('i8')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H1.v).be.eql('info9')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H3.v).be.eql('i9')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I1.v).be.eql('info10')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I3.v).be.eql('i10')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J1.v).be.eql('info11')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J3.v).be.eql('i11')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(0)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.c).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.c).be.eql(1)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.c).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.c).be.eql(3)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.c).be.eql(4)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.c).be.eql(5)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].s.c).be.eql(6)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].e.c).be.eql(6)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][5].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][5].s.c).be.eql(7)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][5].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][5].e.c).be.eql(7)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][6].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][6].s.c).be.eql(8)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][6].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][6].e.c).be.eql(8)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][7].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][7].s.c).be.eql(9)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][7].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][7].e.c).be.eql(9)
    })

    it('should work when using special rowspan layout #14 (using multiple rowspan and colspan in one row leaving holes in cells for next row)', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <th rowspan="2">Date</th>
            <th rowspan="2">info1 </th>
            <th colspan="2">group1</th>
            <th colspan="2">group2</th>
            <th rowspan="2">info8</th>
            <th rowspan="2">info9</th>
            <th colspan="2">group3</th>
            <th rowspan="2">info11</th>
          </tr>
          <tr>
            <th>test1</th>
            <th>test2</th>
            <th>test3</th>
            <th>test4</th>
            <th>test5</th>
            <th>test6</th>
          </tr>
          <tr>
            <td>01022021</td>
            <td>i1</td>
            <td>g11</td>
            <td>g12</td>
            <td>g21</td>
            <td>g22</td>
            <td>i8</td>
            <td>i9</td>
            <td>g31</td>
            <td>g32</td>
            <td>i11</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('Date')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A3.v).be.eql('01022021')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('info1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3.v).be.eql('i1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('group1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2.v).be.eql('test1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3.v).be.eql('g11')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D2.v).be.eql('test2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D3.v).be.eql('g12')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E1.v).be.eql('group2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E2.v).be.eql('test3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E3.v).be.eql('g21')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F2.v).be.eql('test4')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F3.v).be.eql('g22')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G1.v).be.eql('info8')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G3.v).be.eql('i8')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H1.v).be.eql('info9')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H3.v).be.eql('i9')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I1.v).be.eql('group3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I2.v).be.eql('test5')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I3.v).be.eql('g31')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J2.v).be.eql('test6')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J3.v).be.eql('g32')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K1.v).be.eql('info11')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K3.v).be.eql('i11')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(0)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.c).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.c).be.eql(1)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].s.c).be.eql(2)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][2].e.c).be.eql(3)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].s.c).be.eql(4)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][3].e.c).be.eql(5)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].s.c).be.eql(6)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][4].e.c).be.eql(6)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][5].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][5].s.c).be.eql(7)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][5].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][5].e.c).be.eql(7)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][6].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][6].s.c).be.eql(8)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][6].e.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][6].e.c).be.eql(9)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][7].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][7].s.c).be.eql(10)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][7].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][7].e.c).be.eql(10)
    })

    it('should work when using special rowspan layout #15 (using multiple rowspan in one row and then continuing with empty cells in next row should preserve background color)', async () => {
      const mainBackgroundColor = '#2a6fe6'

      const stream = await conversion(`
        <style>
          table {
            border-collapse: collapse;
          }

          table.list tr:nth-child(even) {
            background-color: #84a8ce9e;
          }

          table.list th {
            background-color: ${mainBackgroundColor};
            color: white;
            padding-left: 2px;
            padding-right: 2px;
            padding-top: 1px;
            padding-bottom: 1px;
            vertical-align: top;
          }

          table.list td {
            border: 1px solid ${mainBackgroundColor};
            padding-left: 5px;
            padding-right: 5px;
            padding-top: 1px;
            padding-bottom: 2px;
            margin-top: 1px;
            margin-bottom: 1px;
            height: 10px;
          }

          table.header {
            table-layout: auto;
          }
        </style>
        <table class="list">
          <thead>
            <tr>
              <th>Date</th>
              <th>info1</th>
              <th>info2</th>
              <th>info3</th>
              <th rowspan=2>info4</th>
              <th>info5</th>
              <th>info6</th>
              <th>info7</th>
              <th rowspan=2>info8</th>
              <th>info9</th>
              <th>info10</th>
            </tr>
            <tr>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              <th>info11</th>
              <th>info12</th>
              <th>info13</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>1</td>
              <td>1</td>
              <td>1</td>
              <td>1</td>
              <td>1</td>
              <td>1</td>
              <td>1</td>
              <td>1</td>
              <td>1</td>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf, { cellStyles: true }))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('Date')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2.v).be.not.ok()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2.s.bgColor.rgb).be.eql(mainBackgroundColor.slice(1))
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2.s.fgColor.rgb).be.eql(mainBackgroundColor.slice(1))
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('info1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2.v).be.not.ok()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('info2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2.v).be.not.ok()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1.v).be.eql('info3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D2.v).be.not.ok()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E1.v).be.eql('info4')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E2.v).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F1.v).be.eql('info5')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F2.v).be.not.ok()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G1.v).be.eql('info6')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G2.v).be.eql('info11')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H1.v).be.eql('info7')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H2.v).be.eql('info12')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I1.v).be.eql('info8')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I2.v).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J1.v).be.eql('info9')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J2.v).be.eql('info13')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K1.v).be.eql('info10')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K2.v).be.not.ok()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K3.v).be.eql('1')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].s.c).be.eql(4)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][0].e.c).be.eql(4)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.r).be.eql(0)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].s.c).be.eql(8)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.r).be.eql(1)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges'][1].e.c).be.eql(8)
    })

    it('should work when using special rowspan layout #16 (using rowspan and colspan in different rows and leaving holes)', async function () {
      const stream = await conversion(`
        <style>
          td {
            border: 1px solid black;
          }
        </style>
        <table>
          <tbody>
            <tr>
              <td rowspan="5">Root A</td>
              <td rowspan="5">Root B</td>
              <td colspan="21">Sub 1</td>
            </tr>
            <tr>
              <td rowspan="4">Sub 1.A</td>
              <td rowspan="4">Sub 1.B</td>
              <td rowspan="4">Sub 1.C</td>
              <td rowspan="4">Sub 1.D</td>
              <td rowspan="4">Sub 1.E</td>
              <td rowspan="4">Sub 1.F</td>
              <td colspan="15">Sub 1.1</td>
            </tr>
            <tr>
              <td colspan="2">Sub 1.1.1</td>
              <td rowspan="3">Sub 1.1.B</td>
              <td rowspan="3">Sub 1.1.C</td>
              <td rowspan="3">Sub 1.1.D</td>
              <td colspan="4">Sub 1.1.2</td>
              <td colspan="4">Sub 1.1.3</td>
              <td rowspan="3">Sub 1.1.E</td>
              <td rowspan="3">Sub 1.1.F</td>
            </tr>
            <tr>
              <td rowspan="2">Sub 1.1.1.A</td>
              <td rowspan="2">Sub 1.1.1.B</td>
              <td rowspan="2">Sub 1.1.2.A</td>
              <td rowspan="2">Sub 1.1.2.B</td>
              <td rowspan="2">Sub 1.1.2.C</td>
              <td rowspan="2">Sub 1.1.2.D</td>
              <td colspan="4">Sub 1.1.3.1</td>
            </tr>
            <tr>
              <td>Sub 1.1.3.1.A</td>
              <td>Sub 1.1.3.1.B</td>
              <td>Sub 1.1.3.1.C</td>
              <td>Sub 1.1.3.1.D</td>
            </tr>
          </tbody>
        </table>
      `)

      const { parsedXlsx, outputBuf } = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve({
            parsedXlsx: xlsx.read(buf),
            outputBuf: buf
          })
        })
      })

      fs.writeFileSync(outputPath, outputBuf)

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('Root A')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('Root B')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('Sub 1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].L1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].M1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].N1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].O1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].P1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].Q1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].R1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].S1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].T1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].U1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].V1).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].W1).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2.v).be.eql('Sub 1.A')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D2.v).be.eql('Sub 1.B')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E2.v).be.eql('Sub 1.C')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F2.v).be.eql('Sub 1.D')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G2.v).be.eql('Sub 1.E')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].G5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H2.v).be.eql('Sub 1.F')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].H5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I2.v).be.eql('Sub 1.1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].L2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].M2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].N2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].O2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].P2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].Q2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].R2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].S2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].T2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].U2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].V2).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].W2).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I3.v).be.eql('Sub 1.1.1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J3).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I4.v).be.eql('Sub 1.1.1.A')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].I5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J4.v).be.eql('Sub 1.1.1.B')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].J5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K3.v).be.eql('Sub 1.1.B')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].L3.v).be.eql('Sub 1.1.C')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].L4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].L5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].M3.v).be.eql('Sub 1.1.D')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].M4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].M5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].N3.v).be.eql('Sub 1.1.2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].O3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].P3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].Q3).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].N4.v).be.eql('Sub 1.1.2.A')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].N5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].O4.v).be.eql('Sub 1.1.2.B')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].O5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].P4.v).be.eql('Sub 1.1.2.C')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].P5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].Q4.v).be.eql('Sub 1.1.2.D')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].Q5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].R3.v).be.eql('Sub 1.1.3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].S3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].T3).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].U3).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].R4.v).be.eql('Sub 1.1.3.1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].S4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].T4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].U4).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].R5.v).be.eql('Sub 1.1.3.1.A')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].S5.v).be.eql('Sub 1.1.3.1.B')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].T5.v).be.eql('Sub 1.1.3.1.C')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].U5.v).be.eql('Sub 1.1.3.1.D')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].V3.v).be.eql('Sub 1.1.E')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].V4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].V5).be.undefined()

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].W3.v).be.eql('Sub 1.1.F')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].W4).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].W5).be.undefined()

      const mergedCells = parsedXlsx.Sheets[parsedXlsx.SheetNames[0]]['!merges']

      const expectedMergeCells = [
        ['A1', 'A5'],
        ['B1', 'B5'],
        ['C1', 'W1'],
        ['C2', 'C5'],
        ['D2', 'D5'],
        ['E2', 'E5'],
        ['F2', 'F5'],
        ['G2', 'G5'],
        ['H2', 'H5'],
        ['I2', 'W2'],
        ['I3', 'J3'],
        ['I4', 'I5'],
        ['J4', 'J5'],
        ['K3', 'K5'],
        ['L3', 'L5'],
        ['M3', 'M5'],
        ['N3', 'Q3'],
        ['N4', 'N5'],
        ['O4', 'O5'],
        ['P4', 'P5'],
        ['Q4', 'Q5'],
        ['R3', 'U3'],
        ['R4', 'U4'],
        ['V3', 'V5'],
        ['W3', 'W5']
      ]

      should(mergedCells.length).be.eql(
        expectedMergeCells.length,
        `Expected number of expected merged cells ${expectedMergeCells.length} to match with the merged cells in output ${mergedCells.length}`
      )

      for (const [startCellRef, endCellRef] of expectedMergeCells) {
        const parsedStart = parseCell(startCellRef)
        const parsedEnd = parseCell(endCellRef)

        const foundMerge = mergedCells.find((merge) => {
          const startCol = parsedStart[0]
          const startRow = parsedStart[1]
          const endCol = parsedEnd[0]
          const endRow = parsedEnd[1]

          return (
            merge.s.r === startRow && merge.s.c === startCol &&
            merge.e.r === endRow && merge.e.c === endCol
          )
        })

        should(foundMerge != null).be.True(`Expected merge from ${startCellRef} to ${endCellRef} be found`)
      }
    })

    it('should work when using cell border collapsing styles', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td style="border: 2px solid red">col1-1</td>
            <td>col1-2</td>
            <td>col1-3</td>
          </tr>
          <tr>
            <td>col2-1</td>
            <td style="border: 2px solid red">col2-2</td>
            <td>col2-3</td>
          </tr>
          <tr>
            <td>col3-1</td>
            <td>col3-2</td>
            <td style="border: 2px solid red">col3-3</td>
          </tr>
        </table>
      `)

      const resultBuf = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(buf)
        })
      })

      fs.writeFileSync(outputPath, resultBuf)

      const [sheetDoc, stylesDoc] = await getDocumentsFromXlsxBuf(resultBuf, ['xl/worksheets/sheet1.xml', 'xl/styles.xml'], { strict: true })

      should(getCell(sheetDoc, 'A1', 'v')).be.eql('col1-1')

      const cellA1Border = getStyle(sheetDoc, stylesDoc, 'A1', 'b')

      should(cellA1Border.left.style).be.eql('thin')
      should(cellA1Border.left.color).be.eql('ffff0000')
      should(cellA1Border.top.style).be.eql('thin')
      should(cellA1Border.top.color).be.eql('ffff0000')
      should(cellA1Border.right.style).be.eql('thin')
      should(cellA1Border.right.color).be.eql('ffff0000')
      should(cellA1Border.bottom.style).be.eql('thin')
      should(cellA1Border.bottom.color).be.eql('ffff0000')

      should(getCell(sheetDoc, 'B1', 'v')).be.eql('col1-2')
      should(getStyle(sheetDoc, stylesDoc, 'B1', 'b')).be.not.ok()

      should(getCell(sheetDoc, 'C1', 'v')).be.eql('col1-3')
      should(getStyle(sheetDoc, stylesDoc, 'C1', 'b')).be.not.ok()

      should(getCell(sheetDoc, 'A2', 'v')).be.eql('col2-1')
      should(getStyle(sheetDoc, stylesDoc, 'A2', 'b')).be.not.ok()

      should(getCell(sheetDoc, 'B2', 'v')).be.eql('col2-2')

      const cellB2Border = getStyle(sheetDoc, stylesDoc, 'B2', 'b')

      should(cellB2Border.left.style).be.eql('thin')
      should(cellB2Border.left.color).be.eql('ffff0000')
      should(cellB2Border.top.style).be.eql('thin')
      should(cellB2Border.top.color).be.eql('ffff0000')
      should(cellB2Border.right.style).be.eql('thin')
      should(cellB2Border.right.color).be.eql('ffff0000')
      should(cellB2Border.bottom.style).be.eql('thin')
      should(cellB2Border.bottom.color).be.eql('ffff0000')

      should(getCell(sheetDoc, 'C2', 'v')).be.eql('col2-3')
      should(getStyle(sheetDoc, stylesDoc, 'C2', 'b')).be.not.ok()

      should(getCell(sheetDoc, 'A3', 'v')).be.eql('col3-1')
      should(getStyle(sheetDoc, stylesDoc, 'A3', 'b')).be.not.ok()

      should(getCell(sheetDoc, 'B3', 'v')).be.eql('col3-2')
      should(getStyle(sheetDoc, stylesDoc, 'B3', 'b')).be.not.ok()

      should(getCell(sheetDoc, 'C3', 'v')).be.eql('col3-3')

      const cellC3Border = getStyle(sheetDoc, stylesDoc, 'C3', 'b')

      should(cellC3Border.left.style).be.eql('thin')
      should(cellC3Border.left.color).be.eql('ffff0000')
      should(cellC3Border.top.style).be.eql('thin')
      should(cellC3Border.top.color).be.eql('ffff0000')
      should(cellC3Border.right.style).be.eql('thin')
      should(cellC3Border.right.color).be.eql('ffff0000')
      should(cellC3Border.bottom.style).be.eql('thin')
      should(cellC3Border.bottom.color).be.eql('ffff0000')
    })

    it('should work when using cell border collapsing styles and last row does not have same number of cols of previos row', async () => {
      const stream = await conversion(`
        <table  style="line-height: 0;">
            <thead>
                <tr>
                <td>Employee Data</td>
                </tr>
                    <tr>
                    <td style="height:25px;font-size:14px;width:120px;background-color:#7FB1DE;color:white;font-weight:bold;border-color:#000000  ;border-width:1px ;border-style:solid ;">Rank</td>
                    <td style="height:25px;font-size:14px;width:120px;background-color:#7FB1DE;color:white;font-weight:bold;text-align:center;border-color:#000000  ;border-width:1px ;border-style:solid ;">ID</td>
                    <td style="height:25px;font-size:14px;width:150px;background-color:#7FB1DE;color:white;font-weight:bold;border-color:#000000  ;border-width:1px ;border-style:solid ; ">Name</td>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="font-size:14px;height:25px;width:120px;background-color:#7FB1DE ;color: #FFFFFF ;font-weight: bold;border-color:#000000  ;border-width:1px ;border-style:solid ; ">Master SDPO</td>
                    <td style="font-size:14px;height:25px;width:120px;font-weight: normal;text-align:center;border-color:#000000  ;border-width:1px ;border-style:solid ; " >0101</td>
                    <td style="font-size:14px;height:25px;width:150px;font-weight: normal;border-color:#000000  ;border-width:1px ;border-style:solid ;" >ABC DEF</td>
                </tr>
                <tr>
                    <td style="font-size:14px;height:25px;width:120px;background-color:#7FB1DE ;color: #FFFFFF ;font-weight: bold;border-color:#000000  ;border-width:1px ;border-style:solid ; ">Master</td>
                    <td style="font-size:14px;height:25px;width:120px;font-weight: normal;text-align:center;border-color:#000000  ;border-width:1px ;border-style:solid ; " >0102</td>
                    <td style="font-size:14px;height:25px;width:150px;font-weight: normal;border-color:#000000  ;border-width:1px ;border-style:solid ;" >ABCD .</td>
                </tr>
                <tr>
                    <td style="font-size:14px;height:25px;width:120px;background-color:#7FB1DE ;color: #FFFFFF ;font-weight: bold;border-color:#000000  ;border-width:1px ;border-style:solid ; ">Master</td>
                    <td style="font-size:14px;height:25px;width:120px;font-weight: normal;text-align:center;border-color:#000000  ;border-width:1px ;border-style:solid ; " >0103</td>
                    <td style="font-size:14px;height:25px;width:150px;font-weight: normal;border-color:#000000  ;border-width:1px ;border-style:solid ;" >ABCD Abc</td>
                </tr>
                <tr>
                    <td>Doc Data</td>
                </tr>
            </tbody>
        </table>
      `)

      const resultBuf = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(buf)
        })
      })

      fs.writeFileSync(outputPath, resultBuf)

      const [sheetDoc, stylesDoc] = await getDocumentsFromXlsxBuf(resultBuf, ['xl/worksheets/sheet1.xml', 'xl/styles.xml'], { strict: true })

      should(getCell(sheetDoc, 'A1', 'v')).be.eql('Employee Data')
      should(getStyle(sheetDoc, stylesDoc, 'A1', 'b')).be.not.ok()

      should(getCell(sheetDoc, 'A2', 'v')).be.eql('Rank')

      const cellA2Border = getStyle(sheetDoc, stylesDoc, 'A2', 'b')

      should(cellA2Border.left.style).be.eql('thin')
      should(cellA2Border.left.color).be.eql('ff000000')
      should(cellA2Border.top.style).be.eql('thin')
      should(cellA2Border.top.color).be.eql('ff000000')
      should(cellA2Border.right.style).be.eql('thin')
      should(cellA2Border.right.color).be.eql('ff000000')
      should(cellA2Border.bottom.style).be.eql('thin')
      should(cellA2Border.bottom.color).be.eql('ff000000')

      should(getCell(sheetDoc, 'B2', 'v')).be.eql('ID')

      const cellB2Border = getStyle(sheetDoc, stylesDoc, 'B2', 'b')

      should(cellB2Border.left).be.not.ok()
      should(cellB2Border.top.style).be.eql('thin')
      should(cellB2Border.top.color).be.eql('ff000000')
      should(cellB2Border.right.style).be.eql('thin')
      should(cellB2Border.right.color).be.eql('ff000000')
      should(cellB2Border.bottom.style).be.eql('thin')
      should(cellB2Border.bottom.color).be.eql('ff000000')

      should(getCell(sheetDoc, 'C2', 'v')).be.eql('Name')

      const cellC2Border = getStyle(sheetDoc, stylesDoc, 'C2', 'b')

      should(cellC2Border.left).be.not.ok()
      should(cellC2Border.top.style).be.eql('thin')
      should(cellC2Border.top.color).be.eql('ff000000')
      should(cellC2Border.right.style).be.eql('thin')
      should(cellC2Border.right.color).be.eql('ff000000')
      should(cellC2Border.bottom.style).be.eql('thin')
      should(cellC2Border.bottom.color).be.eql('ff000000')

      should(getCell(sheetDoc, 'A3', 'v')).be.eql('Master SDPO')

      const cellA3Border = getStyle(sheetDoc, stylesDoc, 'A3', 'b')

      should(cellA3Border.left.style).be.eql('thin')
      should(cellA3Border.left.color).be.eql('ff000000')
      should(cellA3Border.top).be.not.ok()
      should(cellA3Border.right.style).be.eql('thin')
      should(cellA3Border.right.color).be.eql('ff000000')
      should(cellA3Border.bottom.style).be.eql('thin')
      should(cellA3Border.bottom.color).be.eql('ff000000')

      should(getCell(sheetDoc, 'B3', 'v')).be.eql('0101')

      const cellB3Border = getStyle(sheetDoc, stylesDoc, 'B3', 'b')

      should(cellB3Border.left).be.not.ok()
      should(cellB3Border.top).be.not.ok()
      should(cellB3Border.right.style).be.eql('thin')
      should(cellB3Border.right.color).be.eql('ff000000')
      should(cellB3Border.bottom.style).be.eql('thin')
      should(cellB3Border.bottom.color).be.eql('ff000000')

      should(getCell(sheetDoc, 'C3', 'v')).be.eql('ABC DEF')

      const cellC3Border = getStyle(sheetDoc, stylesDoc, 'C3', 'b')

      should(cellC3Border.left).be.not.ok()
      should(cellC3Border.top).be.not.ok()
      should(cellC3Border.right.style).be.eql('thin')
      should(cellC3Border.right.color).be.eql('ff000000')
      should(cellC3Border.bottom.style).be.eql('thin')
      should(cellC3Border.bottom.color).be.eql('ff000000')

      should(getCell(sheetDoc, 'A4', 'v')).be.eql('Master')

      const cellA4Border = getStyle(sheetDoc, stylesDoc, 'A4', 'b')

      should(cellA4Border.left.style).be.eql('thin')
      should(cellA4Border.left.color).be.eql('ff000000')
      should(cellA4Border.top).be.not.ok()
      should(cellA4Border.right.style).be.eql('thin')
      should(cellA4Border.right.color).be.eql('ff000000')
      should(cellA4Border.bottom.style).be.eql('thin')
      should(cellA4Border.bottom.color).be.eql('ff000000')

      should(getCell(sheetDoc, 'B4', 'v')).be.eql('0102')

      const cellB4Border = getStyle(sheetDoc, stylesDoc, 'B4', 'b')

      should(cellB4Border.left).be.not.ok()
      should(cellB4Border.top).be.not.ok()
      should(cellB4Border.right.style).be.eql('thin')
      should(cellB4Border.right.color).be.eql('ff000000')
      should(cellB4Border.bottom.style).be.eql('thin')
      should(cellB4Border.bottom.color).be.eql('ff000000')

      should(getCell(sheetDoc, 'C4', 'v')).be.eql('ABCD .')

      const cellC4Border = getStyle(sheetDoc, stylesDoc, 'C4', 'b')

      should(cellC4Border.left).be.not.ok()
      should(cellC4Border.top).be.not.ok()
      should(cellC4Border.right.style).be.eql('thin')
      should(cellC4Border.right.color).be.eql('ff000000')
      should(cellC4Border.bottom.style).be.eql('thin')
      should(cellC4Border.bottom.color).be.eql('ff000000')

      should(getCell(sheetDoc, 'A5', 'v')).be.eql('Master')

      const cellA5Border = getStyle(sheetDoc, stylesDoc, 'A5', 'b')

      should(cellA5Border.left.style).be.eql('thin')
      should(cellA5Border.left.color).be.eql('ff000000')
      should(cellA5Border.top).be.not.ok()
      should(cellA5Border.right.style).be.eql('thin')
      should(cellA5Border.right.color).be.eql('ff000000')
      should(cellA5Border.bottom.style).be.eql('thin')
      should(cellA5Border.bottom.color).be.eql('ff000000')

      should(getCell(sheetDoc, 'B5', 'v')).be.eql('0103')

      const cellB5Border = getStyle(sheetDoc, stylesDoc, 'B5', 'b')

      should(cellB5Border.left).be.not.ok()
      should(cellB5Border.top).be.not.ok()
      should(cellB5Border.right.style).be.eql('thin')
      should(cellB5Border.right.color).be.eql('ff000000')
      should(cellB5Border.bottom.style).be.eql('thin')
      should(cellB5Border.bottom.color).be.eql('ff000000')

      should(getCell(sheetDoc, 'C5', 'v')).be.eql('ABCD Abc')

      const cellC5Border = getStyle(sheetDoc, stylesDoc, 'C5', 'b')

      should(cellC5Border.left).be.not.ok()
      should(cellC5Border.top).be.not.ok()
      should(cellC5Border.right.style).be.eql('thin')
      should(cellC5Border.right.color).be.eql('ff000000')
      should(cellC5Border.bottom.style).be.eql('thin')
      should(cellC5Border.bottom.color).be.eql('ff000000')

      should(getCell(sheetDoc, 'A6', 'v')).be.eql('Doc Data')
      should(getStyle(sheetDoc, stylesDoc, 'A6', 'b')).be.not.ok()
    })

    it('should work when using cell border collapsing styles #2', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">1.1</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">1.2</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">1.3</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">2.1</td>
            <td style="border: 1px solid red; padding-left: 25px; padding-right: 25px; text-align: center;">2.2</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">2.3</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">3.1</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">3.2</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">3.3</td>
          </tr>
        </table>
      `)

      const resultBuf = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(buf)
        })
      })

      fs.writeFileSync(outputPath, resultBuf)

      const [sheetDoc, stylesDoc] = await getDocumentsFromXlsxBuf(resultBuf, ['xl/worksheets/sheet1.xml', 'xl/styles.xml'], { strict: true })

      const expectedBlackBorder = {
        style: 'thin',
        color: 'ff000000'
      }

      const expectedRedBorder = {
        style: 'thin',
        color: 'ffff0000'
      }

      should(getCell(sheetDoc, 'A1', 'v')).be.eql('1.1')

      const cellA1Border = getStyle(sheetDoc, stylesDoc, 'A1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B1', 'v')).be.eql('1.2')

      const cellB1Border = getStyle(sheetDoc, stylesDoc, 'B1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB1Border[side]).be.not.ok()
          continue
        }

        should(cellB1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C1', 'v')).be.eql('1.3')

      const cellC1Border = getStyle(sheetDoc, stylesDoc, 'C1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellC1Border[side]).be.not.ok()
          continue
        }

        should(cellC1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A2', 'v')).be.eql('2.1')

      const cellA2Border = getStyle(sheetDoc, stylesDoc, 'A2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'top') {
          should(cellA2Border[side]).be.not.ok()
          continue
        }

        should(cellA2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B2', 'v')).be.eql('2.2')

      const cellB2Border = getStyle(sheetDoc, stylesDoc, 'B2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellB2Border[side]).be.not.ok()
          continue
        }

        should(cellB2Border[side].style).be.eql(expectedRedBorder.style)
        should(cellB2Border[side].color).be.eql(expectedRedBorder.color)
      }

      should(getCell(sheetDoc, 'C2', 'v')).be.eql('2.3')

      const cellC2Border = getStyle(sheetDoc, stylesDoc, 'C2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellC2Border[side]).be.not.ok()
          continue
        }

        should(cellC2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A3', 'v')).be.eql('3.1')

      const cellA3Border = getStyle(sheetDoc, stylesDoc, 'A3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'top') {
          should(cellA3Border[side]).be.not.ok()
          continue
        }

        should(cellA3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B3', 'v')).be.eql('3.2')

      const cellB3Border = getStyle(sheetDoc, stylesDoc, 'B3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellB3Border[side]).be.not.ok()
          continue
        }

        should(cellB3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C3', 'v')).be.eql('3.3')

      const cellC3Border = getStyle(sheetDoc, stylesDoc, 'C3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellC3Border[side]).be.not.ok()
          continue
        }

        should(cellC3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC3Border[side].color).be.eql(expectedBlackBorder.color)
      }
    })

    it('should work when using cell border collapsing styles (with merge cell) #3', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">1.1</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">1.2</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">1.3</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">1.4</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">2.1</td>
            <td colspan="2" style="border: 1px solid red; padding-left: 25px; padding-right: 25px; text-align: center;">2.2</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">2.3</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">3.1</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">3.2</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">3.3</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">3.4</td>
          </tr>
        </table>
      `)

      const resultBuf = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(buf)
        })
      })

      fs.writeFileSync(outputPath, resultBuf)

      const [sheetDoc, stylesDoc] = await getDocumentsFromXlsxBuf(resultBuf, ['xl/worksheets/sheet1.xml', 'xl/styles.xml'], { strict: true })

      const expectedBlackBorder = {
        style: 'thin',
        color: 'ff000000'
      }

      const expectedRedBorder = {
        style: 'thin',
        color: 'ffff0000'
      }

      should(getCell(sheetDoc, 'A1', 'v')).be.eql('1.1')

      const cellA1Border = getStyle(sheetDoc, stylesDoc, 'A1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B1', 'v')).be.eql('1.2')

      const cellB1Border = getStyle(sheetDoc, stylesDoc, 'B1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB1Border[side]).be.not.ok()
          continue
        }

        should(cellB1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C1', 'v')).be.eql('1.3')

      const cellC1Border = getStyle(sheetDoc, stylesDoc, 'C1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellC1Border[side]).be.not.ok()
          continue
        }

        should(cellC1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D1', 'v')).be.eql('1.4')

      const cellD1Border = getStyle(sheetDoc, stylesDoc, 'D1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellD1Border[side]).be.not.ok()
          continue
        }

        should(cellD1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A2', 'v')).be.eql('2.1')

      const cellA2Border = getStyle(sheetDoc, stylesDoc, 'A2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'top') {
          should(cellA2Border[side]).be.not.ok()
          continue
        }

        should(cellA2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B2', 'v')).be.eql('2.2')

      const cellB2Border = getStyle(sheetDoc, stylesDoc, 'B2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellB2Border[side]).be.not.ok()
          continue
        }

        should(cellB2Border[side].style).be.eql(expectedRedBorder.style)
        should(cellB2Border[side].color).be.eql(expectedRedBorder.color)
      }

      should(getCell(sheetDoc, 'D2', 'v')).be.eql('2.3')

      const cellD2Border = getStyle(sheetDoc, stylesDoc, 'D2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellD2Border[side]).be.not.ok()
          continue
        }

        if (side === 'top') {
          should(cellD2Border[side]).be.not.ok()
          continue
        }

        should(cellD2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A3', 'v')).be.eql('3.1')

      const cellA3Border = getStyle(sheetDoc, stylesDoc, 'A3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'top') {
          should(cellA3Border[side]).be.not.ok()
          continue
        }

        should(cellA3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B3', 'v')).be.eql('3.2')

      const cellB3Border = getStyle(sheetDoc, stylesDoc, 'B3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellB3Border[side]).be.not.ok()
          continue
        }

        should(cellB3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C3', 'v')).be.eql('3.3')

      const cellC3Border = getStyle(sheetDoc, stylesDoc, 'C3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellC3Border[side]).be.not.ok()
          continue
        }

        should(cellC3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D3', 'v')).be.eql('3.4')

      const cellD3Border = getStyle(sheetDoc, stylesDoc, 'D3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellD3Border[side]).be.not.ok()
          continue
        }

        should(cellD3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD3Border[side].color).be.eql(expectedBlackBorder.color)
      }
    })

    it('should work when using cell border collapsing styles (with merge cell) #4', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">1.1</td>
            <td style="border: 1px solid blue; padding-left: 25px; padding-right: 25px; text-align: center;">1.2</td>
            <td style="border: 1px solid green; padding-left: 25px; padding-right: 25px; text-align: center;">1.3</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">1.4</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">2.1</td>
            <td colspan="2" style="border: 1px solid red; padding-left: 25px; padding-right: 25px; text-align: center;">2.2</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">2.3</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">3.1</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">3.2</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">3.3</td>
            <td style="border: 1px solid black; padding-left: 25px; padding-right: 25px; text-align: center;">3.4</td>
          </tr>
        </table>
      `)

      const resultBuf = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(buf)
        })
      })

      fs.writeFileSync(outputPath, resultBuf)

      const [sheetDoc, stylesDoc] = await getDocumentsFromXlsxBuf(resultBuf, ['xl/worksheets/sheet1.xml', 'xl/styles.xml'], { strict: true })

      const expectedBlackBorder = {
        style: 'thin',
        color: 'ff000000'
      }

      const expectedBlueBorder = {
        style: 'thin',
        color: 'ff0000ff'
      }

      const expectedGreenBorder = {
        style: 'thin',
        color: 'ff008000'
      }

      const expectedRedBorder = {
        style: 'thin',
        color: 'ffff0000'
      }

      should(getCell(sheetDoc, 'A1', 'v')).be.eql('1.1')

      const cellA1Border = getStyle(sheetDoc, stylesDoc, 'A1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B1', 'v')).be.eql('1.2')

      const cellB1Border = getStyle(sheetDoc, stylesDoc, 'B1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB1Border[side]).be.not.ok()
          continue
        }

        should(cellB1Border[side].style).be.eql(expectedBlueBorder.style)
        should(cellB1Border[side].color).be.eql(expectedBlueBorder.color)
      }

      should(getCell(sheetDoc, 'C1', 'v')).be.eql('1.3')

      const cellC1Border = getStyle(sheetDoc, stylesDoc, 'C1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellC1Border[side]).be.not.ok()
          continue
        }

        should(cellC1Border[side].style).be.eql(expectedGreenBorder.style)
        should(cellC1Border[side].color).be.eql(expectedGreenBorder.color)
      }

      should(getCell(sheetDoc, 'D1', 'v')).be.eql('1.4')

      const cellD1Border = getStyle(sheetDoc, stylesDoc, 'D1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellD1Border[side]).be.not.ok()
          continue
        }

        should(cellD1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A2', 'v')).be.eql('2.1')

      const cellA2Border = getStyle(sheetDoc, stylesDoc, 'A2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'top') {
          should(cellA2Border[side]).be.not.ok()
          continue
        }

        should(cellA2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B2', 'v')).be.eql('2.2')

      const cellB2Border = getStyle(sheetDoc, stylesDoc, 'B2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellB2Border[side]).be.not.ok()
          continue
        }

        should(cellB2Border[side].style).be.eql(expectedRedBorder.style)
        should(cellB2Border[side].color).be.eql(expectedRedBorder.color)
      }

      should(getCell(sheetDoc, 'D2', 'v')).be.eql('2.3')

      const cellD2Border = getStyle(sheetDoc, stylesDoc, 'D2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellD2Border[side]).be.not.ok()
          continue
        }

        should(cellD2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A3', 'v')).be.eql('3.1')

      const cellA3Border = getStyle(sheetDoc, stylesDoc, 'A3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'top') {
          should(cellA3Border[side]).be.not.ok()
          continue
        }

        should(cellA3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B3', 'v')).be.eql('3.2')

      const cellB3Border = getStyle(sheetDoc, stylesDoc, 'B3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellB3Border[side]).be.not.ok()
          continue
        }

        should(cellB3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C3', 'v')).be.eql('3.3')

      const cellC3Border = getStyle(sheetDoc, stylesDoc, 'C3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellC3Border[side]).be.not.ok()
          continue
        }

        should(cellC3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D3', 'v')).be.eql('3.4')

      const cellD3Border = getStyle(sheetDoc, stylesDoc, 'D3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellD3Border[side]).be.not.ok()
          continue
        }

        should(cellD3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD3Border[side].color).be.eql(expectedBlackBorder.color)
      }
    })

    it('should work when using cell border collapsing styles (with merge cell) #5', async () => {
      const stream = await conversion(`
        <style>
            table {
                border-collapse: collapse;
            }

            td.head {
                border: 1px solid black;
                padding-left: 25px;
                padding-right: 25px;
                text-align: center;
            }
            td.data {
                border: 1px solid black;
                padding-left: 25px;
                padding-right: 25px;
                text-align: center;
            }
            td.data_highlight {
                border: 1px solid red;
                padding-left: 25px;
                padding-right: 25px;
                text-align: center;
            }
        </style>
        <table name="MissingData">
            <tr>
              <td class="data" rowspan="6">2</td>
              <td class="data" rowspan="6">Account Name 2</td>
              <td class="data">Test First Name 1</td>
              <td class="data">Last Name 1</td>
              <td class="data">Another note</td>
              <td class="data" rowspan="6">Main City 1</td>
              <td class="data" rowspan="6">Main State 1</td>
              <td class="data" rowspan="6">Home City</td>
              <td class="data" rowspan="6">Home State</td>
            </tr>
            <tr>
              <td class="data">First Name 2</td>
              <td class="data">Last Name 2</td>
              <td class="data">&nbsp;</td>
            </tr>
            <tr>
              <td class="data" rowspan="2">First Name 3</td>
              <td class="data" rowspan="2">Last Name 3</td>
              <td class="data">3 - one</td>
            </tr>
            <tr>
              <td class="data_highlight">3 - two</td>
            </tr>
            <tr>
              <td class="data">First Name 4</td>
              <td class="data">Last Name 4</td>
              <td class="data">&nbsp;</td>
            </tr>
            <tr>
              <td class="data">First Name 5</td>
              <td class="data">Last Name 5</td>
              <td class="data">&nbsp;</td>
            </tr>
        </table>
      `)

      const resultBuf = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(buf)
        })
      })

      fs.writeFileSync(outputPath, resultBuf)

      const [sheetDoc, stylesDoc] = await getDocumentsFromXlsxBuf(resultBuf, ['xl/worksheets/sheet1.xml', 'xl/styles.xml'], { strict: true })

      const expectedBlackBorder = {
        style: 'thin',
        color: 'ff000000'
      }

      const expectedRedBorder = {
        style: 'thin',
        color: 'ffff0000'
      }

      should(getCell(sheetDoc, 'A1', 'v')).be.eql('2')

      const cellA1Border = getStyle(sheetDoc, stylesDoc, 'A1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B1', 'v')).be.eql('Account Name 2')

      const cellB1Border = getStyle(sheetDoc, stylesDoc, 'B1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB1Border[side]).be.not.ok()
          continue
        }

        should(cellB1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C1', 'v')).be.eql('Test First Name 1')

      const cellC1Border = getStyle(sheetDoc, stylesDoc, 'C1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellC1Border[side]).be.not.ok()
          continue
        }

        should(cellC1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D1', 'v')).be.eql('Last Name 1')

      const cellD1Border = getStyle(sheetDoc, stylesDoc, 'D1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellD1Border[side]).be.not.ok()
          continue
        }

        should(cellD1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'E1', 'v')).be.eql('Another note')

      const cellE1Border = getStyle(sheetDoc, stylesDoc, 'E1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellE1Border[side]).be.not.ok()
          continue
        }

        should(cellE1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellE1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'F1', 'v')).be.eql('Main City 1')

      const cellF1Border = getStyle(sheetDoc, stylesDoc, 'F1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellF1Border[side]).be.not.ok()
          continue
        }

        should(cellF1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellF1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'G1', 'v')).be.eql('Main State 1')

      const cellG1Border = getStyle(sheetDoc, stylesDoc, 'G1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellG1Border[side]).be.not.ok()
          continue
        }

        should(cellG1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellG1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'H1', 'v')).be.eql('Home City')

      const cellH1Border = getStyle(sheetDoc, stylesDoc, 'H1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellH1Border[side]).be.not.ok()
          continue
        }

        should(cellH1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellH1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'I1', 'v')).be.eql('Home State')

      const cellI1Border = getStyle(sheetDoc, stylesDoc, 'I1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellI1Border[side]).be.not.ok()
          continue
        }

        should(cellI1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellI1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A2', 'v')).be.not.ok()

      const cellA2Border = getStyle(sheetDoc, stylesDoc, 'A2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B2', 'v')).be.not.ok()

      const cellB2Border = getStyle(sheetDoc, stylesDoc, 'B2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB2Border[side]).be.not.ok()
          continue
        }

        should(cellB2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C2', 'v')).be.eql('First Name 2')

      const cellC2Border = getStyle(sheetDoc, stylesDoc, 'C2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellC2Border[side]).be.not.ok()
          continue
        }

        should(cellC2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D2', 'v')).be.eql('Last Name 2')

      const cellD2Border = getStyle(sheetDoc, stylesDoc, 'D2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellD2Border[side]).be.not.ok()
          continue
        }

        should(cellD2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'E2', 'v')).be.eql(' ')

      const cellE2Border = getStyle(sheetDoc, stylesDoc, 'E2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellE2Border[side]).be.not.ok()
          continue
        }

        should(cellE2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellE2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'F2', 'v')).be.not.ok()

      const cellF2Border = getStyle(sheetDoc, stylesDoc, 'F2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellF2Border[side]).be.not.ok()
          continue
        }

        should(cellF2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellF2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'G2', 'v')).be.not.ok()

      const cellG2Border = getStyle(sheetDoc, stylesDoc, 'G2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellG2Border[side]).be.not.ok()
          continue
        }

        should(cellG2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellG2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'H2', 'v')).be.not.ok()

      const cellH2Border = getStyle(sheetDoc, stylesDoc, 'H2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellH2Border[side]).be.not.ok()
          continue
        }

        should(cellH2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellH2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'I2', 'v')).be.not.ok()

      const cellI2Border = getStyle(sheetDoc, stylesDoc, 'I2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellI2Border[side]).be.not.ok()
          continue
        }

        should(cellI2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellI2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A3', 'v')).be.not.ok()

      const cellA3Border = getStyle(sheetDoc, stylesDoc, 'A3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B3', 'v')).be.not.ok()

      const cellB3Border = getStyle(sheetDoc, stylesDoc, 'B3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB3Border[side]).be.not.ok()
          continue
        }

        should(cellB3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C3', 'v')).be.eql('First Name 3')

      const cellC3Border = getStyle(sheetDoc, stylesDoc, 'C3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellC3Border[side]).be.not.ok()
          continue
        }

        should(cellC3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D3', 'v')).be.eql('Last Name 3')

      const cellD3Border = getStyle(sheetDoc, stylesDoc, 'D3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellD3Border[side]).be.not.ok()
          continue
        }

        should(cellD3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'E3', 'v')).be.eql('3 - one')

      const cellE3Border = getStyle(sheetDoc, stylesDoc, 'E3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellE3Border[side]).be.not.ok()
          continue
        }

        should(cellE3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellE3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'F3', 'v')).be.not.ok()

      const cellF3Border = getStyle(sheetDoc, stylesDoc, 'F3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellF3Border[side]).be.not.ok()
          continue
        }

        should(cellF3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellF3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'G3', 'v')).be.not.ok()

      const cellG3Border = getStyle(sheetDoc, stylesDoc, 'G3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellG3Border[side]).be.not.ok()
          continue
        }

        should(cellG3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellG3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'H3', 'v')).be.not.ok()

      const cellH3Border = getStyle(sheetDoc, stylesDoc, 'H3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellH3Border[side]).be.not.ok()
          continue
        }

        should(cellH3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellH3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'I3', 'v')).be.not.ok()

      const cellI3Border = getStyle(sheetDoc, stylesDoc, 'I3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellI3Border[side]).be.not.ok()
          continue
        }

        should(cellI3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellI3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A4', 'v')).be.not.ok()

      const cellA4Border = getStyle(sheetDoc, stylesDoc, 'A4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B4', 'v')).be.not.ok()

      const cellB4Border = getStyle(sheetDoc, stylesDoc, 'B4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB4Border[side]).be.not.ok()
          continue
        }

        should(cellB4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C4', 'v')).be.not.ok()

      const cellC4Border = getStyle(sheetDoc, stylesDoc, 'C4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellC4Border[side]).be.not.ok()
          continue
        }

        should(cellC4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D4', 'v')).be.not.ok()

      const cellD4Border = getStyle(sheetDoc, stylesDoc, 'D4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellD4Border[side]).be.not.ok()
          continue
        }

        should(cellD4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'E4', 'v')).be.eql('3 - two')

      const cellE4Border = getStyle(sheetDoc, stylesDoc, 'E4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellE4Border[side]).be.not.ok()
          continue
        }

        if (side === 'bottom') {
          should(cellE4Border[side].style).be.eql(expectedRedBorder.style)
        } else {
          should(cellE4Border[side].color).be.eql(expectedBlackBorder.color)
        }
      }

      should(getCell(sheetDoc, 'F4', 'v')).be.not.ok()

      const cellF4Border = getStyle(sheetDoc, stylesDoc, 'F4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellF4Border[side]).be.not.ok()
          continue
        }

        should(cellF4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellF4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'G4', 'v')).be.not.ok()

      const cellG4Border = getStyle(sheetDoc, stylesDoc, 'G4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellG4Border[side]).be.not.ok()
          continue
        }

        should(cellG4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellG4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'H4', 'v')).be.not.ok()

      const cellH4Border = getStyle(sheetDoc, stylesDoc, 'H4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellH4Border[side]).be.not.ok()
          continue
        }

        should(cellH4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellH4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'I4', 'v')).be.not.ok()

      const cellI4Border = getStyle(sheetDoc, stylesDoc, 'I4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellI4Border[side]).be.not.ok()
          continue
        }

        should(cellI4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellI4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A5', 'v')).be.not.ok()

      const cellA5Border = getStyle(sheetDoc, stylesDoc, 'A5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B5', 'v')).be.not.ok()

      const cellB5Border = getStyle(sheetDoc, stylesDoc, 'B5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB5Border[side]).be.not.ok()
          continue
        }

        should(cellB5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C5', 'v')).be.eql('First Name 4')

      const cellC5Border = getStyle(sheetDoc, stylesDoc, 'C5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellC5Border[side]).be.not.ok()
          continue
        }

        should(cellC5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D5', 'v')).be.eql('Last Name 4')

      const cellD5Border = getStyle(sheetDoc, stylesDoc, 'D5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellD5Border[side]).be.not.ok()
          continue
        }

        should(cellD5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'E5', 'v')).be.eql(' ')

      const cellE5Border = getStyle(sheetDoc, stylesDoc, 'E5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellE5Border[side]).be.not.ok()
          continue
        }

        should(cellE5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellE5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'F5', 'v')).be.not.ok()

      const cellF5Border = getStyle(sheetDoc, stylesDoc, 'F5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellF5Border[side]).be.not.ok()
          continue
        }

        should(cellF5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellF5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'G5', 'v')).be.not.ok()

      const cellG5Border = getStyle(sheetDoc, stylesDoc, 'G5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellG5Border[side]).be.not.ok()
          continue
        }

        should(cellG5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellG5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'H5', 'v')).be.not.ok()

      const cellH5Border = getStyle(sheetDoc, stylesDoc, 'H5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellH5Border[side]).be.not.ok()
          continue
        }

        should(cellH5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellH5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'I5', 'v')).be.not.ok()

      const cellI5Border = getStyle(sheetDoc, stylesDoc, 'I5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellI5Border[side]).be.not.ok()
          continue
        }

        should(cellI5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellI5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A6', 'v')).be.not.ok()

      const cellA6Border = getStyle(sheetDoc, stylesDoc, 'A6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B6', 'v')).be.not.ok()

      const cellB6Border = getStyle(sheetDoc, stylesDoc, 'B6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB6Border[side]).be.not.ok()
          continue
        }

        should(cellB6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C6', 'v')).be.eql('First Name 5')

      const cellC6Border = getStyle(sheetDoc, stylesDoc, 'C6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellC6Border[side]).be.not.ok()
          continue
        }

        should(cellC6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D6', 'v')).be.eql('Last Name 5')

      const cellD6Border = getStyle(sheetDoc, stylesDoc, 'D6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellD6Border[side]).be.not.ok()
          continue
        }

        should(cellD6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'E6', 'v')).be.eql(' ')

      const cellE6Border = getStyle(sheetDoc, stylesDoc, 'E6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellE6Border[side]).be.not.ok()
          continue
        }

        should(cellE6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellE6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'F6', 'v')).be.not.ok()

      const cellF6Border = getStyle(sheetDoc, stylesDoc, 'F6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellF6Border[side]).be.not.ok()
          continue
        }

        should(cellF6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellF6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'G6', 'v')).be.not.ok()

      const cellG6Border = getStyle(sheetDoc, stylesDoc, 'G6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellG6Border[side]).be.not.ok()
          continue
        }

        should(cellG6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellG6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'H6', 'v')).be.not.ok()

      const cellH6Border = getStyle(sheetDoc, stylesDoc, 'H6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellH6Border[side]).be.not.ok()
          continue
        }

        should(cellH6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellH6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'I6', 'v')).be.not.ok()

      const cellI6Border = getStyle(sheetDoc, stylesDoc, 'I6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellI6Border[side]).be.not.ok()
          continue
        }

        should(cellI6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellI6Border[side].color).be.eql(expectedBlackBorder.color)
      }
    })

    it('should work when using cell border collapsing styles (with merge cell) #6', async () => {
      const stream = await conversion(`
        <style>
          table {
            border-collapse: collapse;
          }

          td.head {
            border: 1px solid black;
            padding-left: 25px;
            padding-right: 25px;
            text-align: center;
          }
          td.data {
            border: 1px solid black;
            padding-left: 25px;
            padding-right: 25px;
            text-align: center;
          }
          td.data_highlight {
            border: 1px solid red;
            padding-left: 25px;
            padding-right: 25px;
            text-align: center;
          }
        </style>
        <table name="DataAppears">
          <tr>
            <td class="data" rowspan="6">2</td>
            <td class="data" rowspan="6">Account Name 2</td>
            <td class="data" rowspan="6">Main City 1</td>
            <td class="data" rowspan="6">Main State 1</td>
            <td class="data" rowspan="6">Home City</td>
            <td class="data" rowspan="6">Home State</td>
            <td class="data">Test First Name 1</td>
            <td class="data">Last Name 1</td>
            <td class="data">Another note</td>
          </tr>
          <tr>
            <td class="data">First Name 2</td>
            <td class="data">Last Name 2</td>
            <td class="data">&nbsp;</td>
          </tr>
          <tr>
            <td class="data" rowspan="2">First Name 3</td>
            <td class="data" rowspan="2">Last Name 3</td>
            <td class="data">3 - one</td>
          </tr>
          <tr>
            <td class="data_highlight">3 - two</td>
          </tr>
          <tr>
            <td class="data">First Name 4</td>
            <td class="data">Last Name 4</td>
            <td class="data">&nbsp;</td>
          </tr>
          <tr>
            <td class="data">First Name 5</td>
            <td class="data">Last Name 5</td>
            <td class="data">&nbsp;</td>
          </tr>
        </table>
      `)

      const resultBuf = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(buf)
        })
      })

      fs.writeFileSync(outputPath, resultBuf)

      const [sheetDoc, stylesDoc] = await getDocumentsFromXlsxBuf(resultBuf, ['xl/worksheets/sheet1.xml', 'xl/styles.xml'], { strict: true })

      const expectedBlackBorder = {
        style: 'thin',
        color: 'ff000000'
      }

      const expectedRedBorder = {
        style: 'thin',
        color: 'ffff0000'
      }

      should(getCell(sheetDoc, 'A1', 'v')).be.eql('2')

      const cellA1Border = getStyle(sheetDoc, stylesDoc, 'A1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B1', 'v')).be.eql('Account Name 2')

      const cellB1Border = getStyle(sheetDoc, stylesDoc, 'B1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB1Border[side]).be.not.ok()
          continue
        }

        should(cellB1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C1', 'v')).be.eql('Main City 1')

      const cellC1Border = getStyle(sheetDoc, stylesDoc, 'C1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellC1Border[side]).be.not.ok()
          continue
        }

        should(cellC1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D1', 'v')).be.eql('Main State 1')

      const cellD1Border = getStyle(sheetDoc, stylesDoc, 'D1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellD1Border[side]).be.not.ok()
          continue
        }

        should(cellD1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'E1', 'v')).be.eql('Home City')

      const cellE1Border = getStyle(sheetDoc, stylesDoc, 'E1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellE1Border[side]).be.not.ok()
          continue
        }

        should(cellE1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellE1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'F1', 'v')).be.eql('Home State')

      const cellF1Border = getStyle(sheetDoc, stylesDoc, 'F1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellF1Border[side]).be.not.ok()
          continue
        }

        should(cellF1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellF1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'G1', 'v')).be.eql('Test First Name 1')

      const cellG1Border = getStyle(sheetDoc, stylesDoc, 'G1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellG1Border[side]).be.not.ok()
          continue
        }

        should(cellG1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellG1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'H1', 'v')).be.eql('Last Name 1')

      const cellH1Border = getStyle(sheetDoc, stylesDoc, 'H1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellH1Border[side]).be.not.ok()
          continue
        }

        should(cellH1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellH1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'I1', 'v')).be.eql('Another note')

      const cellI1Border = getStyle(sheetDoc, stylesDoc, 'I1', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellI1Border[side]).be.not.ok()
          continue
        }

        should(cellI1Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellI1Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A2', 'v')).be.not.ok()

      const cellA2Border = getStyle(sheetDoc, stylesDoc, 'A2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B2', 'v')).be.not.ok()

      const cellB2Border = getStyle(sheetDoc, stylesDoc, 'B2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB2Border[side]).be.not.ok()
          continue
        }

        should(cellB2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C2', 'v')).be.not.ok()

      const cellC2Border = getStyle(sheetDoc, stylesDoc, 'C2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellC2Border[side]).be.not.ok()
          continue
        }

        should(cellC2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D2', 'v')).be.not.ok()

      const cellD2Border = getStyle(sheetDoc, stylesDoc, 'D2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellD2Border[side]).be.not.ok()
          continue
        }

        should(cellD2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'E2', 'v')).be.not.ok()

      const cellE2Border = getStyle(sheetDoc, stylesDoc, 'E2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellE2Border[side]).be.not.ok()
          continue
        }

        should(cellE2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellE2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'F2', 'v')).be.not.ok()

      const cellF2Border = getStyle(sheetDoc, stylesDoc, 'F2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellF2Border[side]).be.not.ok()
          continue
        }

        should(cellF2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellF2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'G2', 'v')).be.eql('First Name 2')

      const cellG2Border = getStyle(sheetDoc, stylesDoc, 'G2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellG2Border[side]).be.not.ok()
          continue
        }

        should(cellG2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellG2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'H2', 'v')).be.eql('Last Name 2')

      const cellH2Border = getStyle(sheetDoc, stylesDoc, 'H2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellH2Border[side]).be.not.ok()
          continue
        }

        should(cellH2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellH2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'I2', 'v')).be.eql(' ')

      const cellI2Border = getStyle(sheetDoc, stylesDoc, 'I2', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellI2Border[side]).be.not.ok()
          continue
        }

        should(cellI2Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellI2Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A3', 'v')).be.not.ok()

      const cellA3Border = getStyle(sheetDoc, stylesDoc, 'A3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B3', 'v')).be.not.ok()

      const cellB3Border = getStyle(sheetDoc, stylesDoc, 'B3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB3Border[side]).be.not.ok()
          continue
        }

        should(cellB3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C3', 'v')).be.not.ok()

      const cellC3Border = getStyle(sheetDoc, stylesDoc, 'C3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellC3Border[side]).be.not.ok()
          continue
        }

        should(cellC3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D3', 'v')).be.not.ok()

      const cellD3Border = getStyle(sheetDoc, stylesDoc, 'D3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellD3Border[side]).be.not.ok()
          continue
        }

        should(cellD3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'E3', 'v')).be.not.ok()

      const cellE3Border = getStyle(sheetDoc, stylesDoc, 'E3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellE3Border[side]).be.not.ok()
          continue
        }

        should(cellE3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellE3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'F3', 'v')).be.not.ok()

      const cellF3Border = getStyle(sheetDoc, stylesDoc, 'F3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellF3Border[side]).be.not.ok()
          continue
        }

        should(cellF3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellF3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'G3', 'v')).be.eql('First Name 3')

      const cellG3Border = getStyle(sheetDoc, stylesDoc, 'G3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellG3Border[side]).be.not.ok()
          continue
        }

        should(cellG3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellG3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'H3', 'v')).be.eql('Last Name 3')

      const cellH3Border = getStyle(sheetDoc, stylesDoc, 'H3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellH3Border[side]).be.not.ok()
          continue
        }

        should(cellH3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellH3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'I3', 'v')).be.eql('3 - one')

      const cellI3Border = getStyle(sheetDoc, stylesDoc, 'I3', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellI3Border[side]).be.not.ok()
          continue
        }

        should(cellI3Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellI3Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A4', 'v')).be.not.ok()

      const cellA4Border = getStyle(sheetDoc, stylesDoc, 'A4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B4', 'v')).be.not.ok()

      const cellB4Border = getStyle(sheetDoc, stylesDoc, 'B4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB4Border[side]).be.not.ok()
          continue
        }

        should(cellB4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C4', 'v')).be.not.ok()

      const cellC4Border = getStyle(sheetDoc, stylesDoc, 'C4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellC4Border[side]).be.not.ok()
          continue
        }

        should(cellC4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D4', 'v')).be.not.ok()

      const cellD4Border = getStyle(sheetDoc, stylesDoc, 'D4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellD4Border[side]).be.not.ok()
          continue
        }

        should(cellD4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'E4', 'v')).be.not.ok()

      const cellE4Border = getStyle(sheetDoc, stylesDoc, 'E4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellE4Border[side]).be.not.ok()
          continue
        }

        should(cellE4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellE4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'F4', 'v')).be.not.ok()

      const cellF4Border = getStyle(sheetDoc, stylesDoc, 'F4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellF4Border[side]).be.not.ok()
          continue
        }

        should(cellF4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellF4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'G4', 'v')).be.not.ok()

      const cellG4Border = getStyle(sheetDoc, stylesDoc, 'G4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellG4Border[side]).be.not.ok()
          continue
        }

        should(cellG4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellG4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'H4', 'v')).be.not.ok()

      const cellH4Border = getStyle(sheetDoc, stylesDoc, 'H4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellH4Border[side]).be.not.ok()
          continue
        }

        should(cellH4Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellH4Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'I4', 'v')).be.eql('3 - two')

      const cellI4Border = getStyle(sheetDoc, stylesDoc, 'I4', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellI4Border[side]).be.not.ok()
          continue
        }

        should(cellI4Border[side].style).be.eql(expectedRedBorder.style)
        should(cellI4Border[side].color).be.eql(expectedRedBorder.color)
      }

      should(getCell(sheetDoc, 'A5', 'v')).be.not.ok()

      const cellA5Border = getStyle(sheetDoc, stylesDoc, 'A5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B5', 'v')).be.not.ok()

      const cellB5Border = getStyle(sheetDoc, stylesDoc, 'B5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB5Border[side]).be.not.ok()
          continue
        }

        should(cellB5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C5', 'v')).be.not.ok()

      const cellC5Border = getStyle(sheetDoc, stylesDoc, 'C5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellC5Border[side]).be.not.ok()
          continue
        }

        should(cellC5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D5', 'v')).be.not.ok()

      const cellD5Border = getStyle(sheetDoc, stylesDoc, 'D5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellD5Border[side]).be.not.ok()
          continue
        }

        should(cellD5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'E5', 'v')).be.not.ok()

      const cellE5Border = getStyle(sheetDoc, stylesDoc, 'E5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellE5Border[side]).be.not.ok()
          continue
        }

        should(cellE5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellE5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'F5', 'v')).be.not.ok()

      const cellF5Border = getStyle(sheetDoc, stylesDoc, 'F5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellF5Border[side]).be.not.ok()
          continue
        }

        should(cellF5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellF5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'G5', 'v')).be.eql('First Name 4')

      const cellG5Border = getStyle(sheetDoc, stylesDoc, 'G5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellG5Border[side]).be.not.ok()
          continue
        }

        should(cellG5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellG5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'H5', 'v')).be.eql('Last Name 4')

      const cellH5Border = getStyle(sheetDoc, stylesDoc, 'H5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellH5Border[side]).be.not.ok()
          continue
        }

        should(cellH5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellH5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'I5', 'v')).be.eql(' ')

      const cellI5Border = getStyle(sheetDoc, stylesDoc, 'I5', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellI5Border[side]).be.not.ok()
          continue
        }

        should(cellI5Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellI5Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'A6', 'v')).be.not.ok()

      const cellA6Border = getStyle(sheetDoc, stylesDoc, 'A6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        should(cellA6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellA6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'B6', 'v')).be.not.ok()

      const cellB6Border = getStyle(sheetDoc, stylesDoc, 'B6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellB6Border[side]).be.not.ok()
          continue
        }

        should(cellB6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellB6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'C6', 'v')).be.not.ok()

      const cellC6Border = getStyle(sheetDoc, stylesDoc, 'C6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellC6Border[side]).be.not.ok()
          continue
        }

        should(cellC6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellC6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'D6', 'v')).be.not.ok()

      const cellD6Border = getStyle(sheetDoc, stylesDoc, 'D6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellD6Border[side]).be.not.ok()
          continue
        }

        should(cellD6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellD6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'E6', 'v')).be.not.ok()

      const cellE6Border = getStyle(sheetDoc, stylesDoc, 'E6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellE6Border[side]).be.not.ok()
          continue
        }

        should(cellE6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellE6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'F6', 'v')).be.not.ok()

      const cellF6Border = getStyle(sheetDoc, stylesDoc, 'F6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left') {
          should(cellF6Border[side]).be.not.ok()
          continue
        }

        should(cellF6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellF6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'G6', 'v')).be.eql('First Name 5')

      const cellG6Border = getStyle(sheetDoc, stylesDoc, 'G6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellG6Border[side]).be.not.ok()
          continue
        }

        should(cellG6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellG6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'H6', 'v')).be.eql('Last Name 5')

      const cellH6Border = getStyle(sheetDoc, stylesDoc, 'H6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellH6Border[side]).be.not.ok()
          continue
        }

        should(cellH6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellH6Border[side].color).be.eql(expectedBlackBorder.color)
      }

      should(getCell(sheetDoc, 'I6', 'v')).be.eql(' ')

      const cellI6Border = getStyle(sheetDoc, stylesDoc, 'I6', 'b')

      for (const side of ['left', 'top', 'right', 'bottom']) {
        if (side === 'left' || side === 'top') {
          should(cellI6Border[side]).be.not.ok()
          continue
        }

        should(cellI6Border[side].style).be.eql(expectedBlackBorder.style)
        should(cellI6Border[side].color).be.eql(expectedBlackBorder.color)
      }
    })

    it('should work when using cell border collapsing styles (with merge cell) #7', async () => {
      const stream = await conversion(`
        <style>
          :root {
            --cell-width: 28px;
          }

          table {
            table-layout: fixed;
            border-collapse: collapse;
          }

          td {
            border: 1px solid #000;
            height: 22px;
          }

          td[colspan="4"] {
            width: calc(var(--cell-width) * 4);
          }

          td[colspan="17"] {
            width: calc(var(--cell-width) * 17);
          }

          td[colspan="21"] {
            width: calc(var(--cell-width) * 21);
          }
        </style>

        <table>
          <tbody>
            <tr>
              <td colspan="21"></td>
            </tr>
            <tr>
              <td colspan="4"></td>
              <td colspan="17"></td>
            </tr>
            <tr>
              <td colspan="4"></td>
              <td colspan="17"></td>
            </tr>
            <tr>
              <td colspan="4"></td>
              <td colspan="17"></td>
            </tr>
            <tr>
              <td colspan="4"></td>
              <td colspan="17"></td>
            </tr>
            <tr>
              <td colspan="4"></td>
              <td colspan="17"></td>
            </tr>
            <tr>
              <td colspan="4"></td>
              <td colspan="17"></td>
            </tr>
            <tr>
              <td colspan="4"></td>
              <td colspan="17"></td>
            </tr>
            <tr>
              <td colspan="4"></td>
              <td colspan="17"></td>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      `)

      const resultBuf = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(buf)
        })
      })

      fs.writeFileSync(outputPath, resultBuf)

      const [sheetDoc, stylesDoc] = await getDocumentsFromXlsxBuf(resultBuf, ['xl/worksheets/sheet1.xml', 'xl/styles.xml'], { strict: true })

      const expectedBlackBorder = {
        style: 'thin',
        color: 'ff000000'
      }

      for (let index = 0; index < 21; index++) {
        const cellRef = `${num2col(index)}1`
        should(getCell(sheetDoc, cellRef, 'v')).be.not.ok()

        const cellBorder = getStyle(sheetDoc, stylesDoc, cellRef, 'b')

        for (const side of ['left', 'top', 'right', 'bottom']) {
          should(cellBorder[side].style).be.eql(expectedBlackBorder.style)
          should(cellBorder[side].color).be.eql(expectedBlackBorder.color)
        }
      }

      for (let rowNumber = 2; rowNumber < 10; rowNumber++) {
        for (let index = 0; index < 21; index++) {
          const cellRef = `${num2col(index)}${rowNumber}`
          should(getCell(sheetDoc, cellRef, 'v')).be.not.ok()

          const cellBorder = getStyle(sheetDoc, stylesDoc, cellRef, 'b')

          for (const side of ['left', 'top', 'right', 'bottom']) {
            const explicitSides = ['right', 'bottom']

            if (index < 4) {
              explicitSides.push('left')
            }

            if (explicitSides.includes(side)) {
              should(cellBorder[side].style).be.eql(expectedBlackBorder.style)
              should(cellBorder[side].color).be.eql(expectedBlackBorder.color)
            } else {
              should(cellBorder[side]).be.not.ok()
            }
          }
        }
      }

      for (let index = 0; index < 21; index++) {
        const cellRef = `${num2col(index)}10`
        should(getCell(sheetDoc, cellRef, 'v')).be.not.ok()

        const cellBorder = getStyle(sheetDoc, stylesDoc, cellRef, 'b')

        for (const side of ['left', 'top', 'right', 'bottom']) {
          const explicitSides = ['right', 'bottom']

          if (index === 0) {
            explicitSides.push('left')
          }

          if (explicitSides.includes(side)) {
            should(cellBorder[side].style).be.eql(expectedBlackBorder.style)
            should(cellBorder[side].color).be.eql(expectedBlackBorder.color)
          } else {
            should(cellBorder[side]).be.not.ok()
          }
        }
      }
    })

    it('should be able to set fontFamily', async () => {
      const stream = await conversion(`
        <style>
          * {
            font-family: Verdana
          }
        </style>
        <table>
          <tr>
            <td style="font-size: 34px">Hello</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Styles.Fonts).matchAny((font) => should(font.name).be.eql('Verdana'))
    })

    it('should wait for JS trigger', async () => {
      const stream = await conversion(`
        <table id="main">
        </table>
        <script>
          setTimeout(function () {
            var table = document.getElementById('main')
            var row = document.createElement('tr')
            var cell = document.createElement('td')

            cell.innerHTML = 'Hello'
            row.appendChild(cell)
            table.appendChild(row)

            window.CHROME_PAGE_EVAL_READY = true
            window.PHANTOM_PAGE_EVAL_READY = true
          }, 500)
        </script>
      `, {
        waitForJS: true
      })

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('Hello')
    })

    it('should wait for JS trigger (custom var name)', async () => {
      const stream = await conversion(`
        <table id="main">
        </table>
        <script>
          setTimeout(function () {
            var table = document.getElementById('main')
            var row = document.createElement('tr')
            var cell = document.createElement('td')

            cell.innerHTML = 'Hello'
            row.appendChild(cell)
            table.appendChild(row)

            window.READY_TO_START = true
          }, 500)
        </script>
      `, {
        waitForJS: true,
        waitForJSVarName: 'READY_TO_START'
      })

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('Hello')
    })

    it('should generate multiple sheets when there are multiple tables in html', async () => {
      const stream = await conversion(`
        <table name="Data1">
          <tr>
            <td>1</td>
            <td>2</td>
            <td>3</td>
            <td>4</td>
          </tr>
        </table>
        <table name="Data2">
          <tr>
            <td>1</td>
            <td>2</td>
            <td>3</td>
            <td>4</td>
          </tr>
        </table>
      `)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A1.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1.v).be.eql('4')

      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[1]].A1.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[1]].B1.v).be.eql('2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[1]].C1.v).be.eql('3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[1]].D1.v).be.eql('4')
    })

    it('should be able to parse xlsx', async () => {
      const stream = await conversion('<table><tr><td>hello</td></tr>')

      const bufs = []

      stream.on('data', (d) => { bufs.push(d) })
      stream.on('end', () => {
        const buf = Buffer.concat(bufs)
        const doc = xlsx.read(buf)
        doc.Sheets.Sheet1.A1.v.should.be.eql('hello')
      })
    })

    it('should be able to process emoji xlsx', async () => {
      const stream = await conversion('<table><tr><td>hello 😃</td></tr>')

      const bufs = []

      stream.on('data', (d) => { bufs.push(d) })
      stream.on('end', () => {
        const buf = Buffer.concat(bufs)
        const doc = xlsx.read(buf)
        doc.Sheets.Sheet1.A1.v.should.be.eql('hello 😃')
      })
    })

    it('should not error when input contains invalid characters', async () => {
      return (
        conversion(`
          <table>
            <tr>
              <td></td>
            </tr>
          </table>
        `)
      ).should.be.not.rejected()
    })

    it('should translate ampersands', async () => {
      const stream = await conversion(`
        <table>
          <tr>
            <td>& &</td>
          </tr>
        </table>
      `)

      const bufs = []

      await new Promise((resolve, reject) => {
        stream.on('data', (d) => { bufs.push(d) })
        stream.on('error', reject)
        stream.on('end', () => {
          try {
            const buf = Buffer.concat(bufs)
            const doc = xlsx.read(buf)
            doc.Sheets.Sheet1.A1.v.should.be.eql('& &')
            resolve()
          } catch (e) {
            reject(e)
          }
        })
      })
    })

    it('should callback error when row doesn\'t contain cells', async () => {
      return (
        conversion('<table><tr>Hello</tr></table>')
      ).should.be.rejected()
    })

    it('should work with base template and keep existing sheet', async () => {
      const baseTemplateBuf = await readFileAsync(path.join(__dirname, 'base.xlsx'))

      const stream = await conversion(`
        <table name="Main">
          <tr>
            <td>
              a
            </td>
          </tr>
        </table>
      `, {}, baseTemplateBuf)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      parsedXlsx.SheetNames.includes('Base').should.be.True()

      parsedXlsx.Sheets.Base.A1.v.should.be.eql(1)
      parsedXlsx.Sheets.Base.B1.v.should.be.eql(2)
      parsedXlsx.Sheets.Base.C1.v.should.be.eql(3)

      parsedXlsx.SheetNames.includes('Another').should.be.True()

      parsedXlsx.Sheets.Another.A1.v.should.be.eql(4)
      parsedXlsx.Sheets.Another.B1.v.should.be.eql(5)
      parsedXlsx.Sheets.Another.C1.v.should.be.eql(6)
    })

    it('should work with base template and add sheet', async () => {
      const baseTemplateBuf = await readFileAsync(path.join(__dirname, 'base.xlsx'))

      const stream = await conversion(`
        <table name="Main">
          <tr>
            <td>
              foo
            </td>
            <td>
              bar
            </td>
          </tr>
        </table>
      `, {}, baseTemplateBuf)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      parsedXlsx.SheetNames.includes('Base').should.be.True()
      parsedXlsx.SheetNames.includes('Another').should.be.True()

      parsedXlsx.SheetNames.includes('Main').should.be.True()

      parsedXlsx.Sheets.Main.A1.v.should.be.eql('foo')
      parsedXlsx.Sheets.Main.B1.v.should.be.eql('bar')
    })

    it('should work with base template and replace sheet', async () => {
      const baseTemplateBuf = await readFileAsync(path.join(__dirname, 'base.xlsx'))

      const stream = await conversion(`
        <table name="Another">
          <tr>
            <td>
              foo
            </td>
            <td>
              bar
            </td>
          </tr>
        </table>
      `, {}, baseTemplateBuf)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      parsedXlsx.SheetNames.includes('Base').should.be.True()

      parsedXlsx.SheetNames.includes('Another').should.be.True()

      parsedXlsx.Sheets.Another.A1.v.should.be.eql('foo')
      parsedXlsx.Sheets.Another.B1.v.should.be.eql('bar')
    })

    it('should work with base template and add multiple sheets', async () => {
      const baseTemplateBuf = await readFileAsync(path.join(__dirname, 'base.xlsx'))

      const stream = await conversion(`
        <table name="Data">
          <tr>
            <td>
              foo
            </td>
            <td>
              bar
            </td>
          </tr>
        </table>
        <table name="Data1">
          <tr>
            <td>
              foo2
            </td>
            <td>
              bar2
            </td>
          </tr>
        </table>
        <table name="Data2">
          <tr>
            <td>
              foo3
            </td>
            <td>
              bar3
            </td>
          </tr>
        </table>
      `, {}, baseTemplateBuf)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      parsedXlsx.SheetNames.includes('Base').should.be.True()
      parsedXlsx.SheetNames.includes('Another').should.be.True()

      parsedXlsx.SheetNames.includes('Data').should.be.True()

      parsedXlsx.Sheets.Data.A1.v.should.be.eql('foo')
      parsedXlsx.Sheets.Data.B1.v.should.be.eql('bar')

      parsedXlsx.SheetNames.includes('Data1').should.be.True()

      parsedXlsx.Sheets.Data1.A1.v.should.be.eql('foo2')
      parsedXlsx.Sheets.Data1.B1.v.should.be.eql('bar2')

      parsedXlsx.SheetNames.includes('Data2').should.be.True()

      parsedXlsx.Sheets.Data2.A1.v.should.be.eql('foo3')
      parsedXlsx.Sheets.Data2.B1.v.should.be.eql('bar3')
    })

    it('should work with base template and add and replace multiple sheets', async () => {
      const baseTemplateBuf = await readFileAsync(path.join(__dirname, 'base.xlsx'))

      const stream = await conversion(`
        <table name="Base">
          <tr>
            <td>
              6
            </td>
            <td>
              7
            </td>
          </tr>
        </table>
        <table name="Another">
          <tr>
            <td>
              8
            </td>
            <td>
              9
            </td>
          </tr>
        </table>
        <table name="Data">
          <tr>
            <td>
              foo
            </td>
            <td>
              bar
            </td>
          </tr>
        </table>
        <table name="Data1">
          <tr>
            <td>
              foo2
            </td>
            <td>
              bar2
            </td>
          </tr>
        </table>
        <table name="Data2">
          <tr>
            <td>
              foo3
            </td>
            <td>
              bar3
            </td>
          </tr>
        </table>
      `, {}, baseTemplateBuf)

      const parsedXlsx = await new Promise((resolve, reject) => {
        const bufs = []

        stream.on('error', reject)
        stream.on('data', (d) => { bufs.push(d) })

        stream.on('end', () => {
          const buf = Buffer.concat(bufs)
          resolve(xlsx.read(buf))
        })
      })

      parsedXlsx.SheetNames.includes('Base').should.be.True()

      parsedXlsx.Sheets.Base.A1.v.should.be.eql('6')
      parsedXlsx.Sheets.Base.B1.v.should.be.eql('7')

      parsedXlsx.SheetNames.includes('Another').should.be.True()

      parsedXlsx.Sheets.Another.A1.v.should.be.eql('8')
      parsedXlsx.Sheets.Another.B1.v.should.be.eql('9')

      parsedXlsx.SheetNames.includes('Data').should.be.True()

      parsedXlsx.Sheets.Data.A1.v.should.be.eql('foo')
      parsedXlsx.Sheets.Data.B1.v.should.be.eql('bar')

      parsedXlsx.SheetNames.includes('Data1').should.be.True()

      parsedXlsx.Sheets.Data1.A1.v.should.be.eql('foo2')
      parsedXlsx.Sheets.Data1.B1.v.should.be.eql('bar2')

      parsedXlsx.SheetNames.includes('Data2').should.be.True()

      parsedXlsx.Sheets.Data2.A1.v.should.be.eql('foo3')
      parsedXlsx.Sheets.Data2.B1.v.should.be.eql('bar3')
    })
  }
})

function getStyle (sheetDoc, styleDoc, cellAddress, property) {
  const cell = getCell(sheetDoc, cellAddress)

  if (!cell) {
    return null
  }

  const styleId = cell.getAttribute('s')
  const style = styleDoc.getElementsByTagName('cellXfs')[0].getElementsByTagName('xf')[styleId]

  const validProperties = ['b', 'tr']

  if (!validProperties.includes(property)) {
    throw new Error(`Not supported property: ${property}`)
  }

  let result

  switch (property) {
    case 'b': {
      const parsedStyleId = parseInt(styleId, 10)
      let borderId = style.getAttribute('borderId')

      if (parsedStyleId === 0) {
        borderId = style.getAttribute('borderId')
      } else if (parsedStyleId > 0 && style.getAttribute('applyBorder') === '1') {
        borderId = style.getAttribute('borderId')
      }

      if (borderId == null) {
        break
      }

      const border = styleDoc.getElementsByTagName('borders')[0].getElementsByTagName('border')[borderId]

      if (border == null) {
        break
      }

      const parsedBorder = nodeListToArray(border.childNodes).filter((node) => (
        node.nodeName === 'left' || node.nodeName === 'right' ||
        node.nodeName === 'top' || node.nodeName === 'bottom'
      )).reduce((acc, node) => {
        const props = {}
        const borderStyle = node.getAttribute('style')
        const color = nodeListToArray(node.childNodes).find((n) => n.nodeName === 'color')?.getAttribute('rgb')

        if (borderStyle != null && borderStyle !== '') {
          props.style = borderStyle
        }

        if (color != null && color !== '') {
          props.color = color
        }

        if (Object.keys(props).length > 0) {
          acc[node.nodeName] = props
        }

        return acc
      }, {})

      if (Object.keys(parsedBorder).length > 0) {
        result = parsedBorder
      }

      break
    }

    case 'tr': {
      const alignment = style.getElementsByTagName('alignment')[0]

      if (alignment == null) {
        break
      }

      result = alignment.getAttribute('textRotation')

      break
    }

    default:
      throw new Error(`Property not implemented: ${property}`)
  }

  return result
}

function getCell (sheetDoc, cellAddress, property) {
  const [, rowIdx] = parseCell(cellAddress)
  const row = nodeListToArray(sheetDoc.getElementsByTagName('row')).find((row) => row.getAttribute('r') === `${rowIdx + 1}`)

  if (!row) {
    return null
  }

  const cell = nodeListToArray(row.getElementsByTagName('c')).find((cell) => cell.getAttribute('r') === cellAddress)

  if (property == null) {
    return cell
  }

  const validProperties = ['v']

  if (!validProperties.includes(property)) {
    throw new Error(`Not supported property: ${property}`)
  }

  let result

  switch (property) {
    case 'v':
      result = cell.getElementsByTagName('v')?.[0]?.textContent
      break
    default:
      throw new Error(`Property not implemented: ${property}`)
  }

  return result
}

function nodeListToArray (nodes) {
  const arr = []
  for (let i = 0; i < nodes.length; i++) {
    arr.push(nodes[i])
  }
  return arr
}

async function createHtmlFile (html) {
  const outputPath = path.join(tmpDir, `${uuidv4()}.html`)

  await writeFileAsync(outputPath, html)

  return outputPath
}

function rmDir (dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 5 })
  fs.mkdirSync(dirPath, { recursive: true })
}
