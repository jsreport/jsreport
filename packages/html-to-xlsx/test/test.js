const should = require('should')
const util = require('util')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const xlsx = require('xlsx')
const chromePageEval = require('chrome-page-eval')
const phantomPageEval = require('phantom-page-eval')
const puppeteer = require('puppeteer')
const phantomPath = require('phantomjs').path
const tmpDir = path.join(__dirname, 'temp')

const readFileAsync = util.promisify(fs.readFile)
const writeFileAsync = util.promisify(fs.writeFile)

const extractTableScriptFn = fs.readFileSync(
  path.join(__dirname, '../lib/scripts/conversionScript.js')
).toString()

const chromeEval = chromePageEval({
  puppeteer
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
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql(10)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql(true)
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1.v).be.Number()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E1.v).be.Number()
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
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2.v).be.eql('')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2.s.bgColor.rgb).be.eql(mainBackgroundColor.slice(1))
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A2.s.fgColor.rgb).be.eql(mainBackgroundColor.slice(1))
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].A3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B1.v).be.eql('info1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B2.v).be.eql('')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].B3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C1.v).be.eql('info2')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C2.v).be.eql('')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].C3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D1.v).be.eql('info3')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D2.v).be.eql('')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].D3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E1.v).be.eql('info4')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E2.v).be.undefined()
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].E3.v).be.eql('1')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F1.v).be.eql('info5')
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].F2.v).be.eql('')
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
      should(parsedXlsx.Sheets[parsedXlsx.SheetNames[0]].K2.v).be.eql('')
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

async function createHtmlFile (html) {
  const outputPath = path.join(tmpDir, `${uuidv4()}.html`)

  await writeFileAsync(outputPath, html)

  return outputPath
}

function rmDir (dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath)
  }

  let files

  try {
    files = fs.readdirSync(dirPath)
  } catch (e) {
    return
  }

  if (files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const filePath = `${dirPath}/${files[i]}`

      try {
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath)
        }
      } catch (e) { }
    }
  }
}
