require('should')
const util = require('util')
const path = require('path')
const fs = require('fs')
const XlsxPopulate = require('xlsx-populate')
const jsreport = require('@jsreport/jsreport-core')
const readFileAsync = util.promisify(fs.readFile)

describe('html to xlsx', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport().use(require('../')()).use(require('@jsreport/jsreport-handlebars')())
    return reporter.init()
  })

  afterEach(() => {
    if (reporter) {
      return reporter.close()
    }
  })

  it('should not fail when rendering', async () => {
    const request = {
      template: {
        content: '<table><tr><td>a</td></tr></table>',
        recipe: 'html-to-xlsx',
        engine: 'none',
        htmlToXlsx: {
          htmlEngine: 'chrome'
        }
      }
    }

    const response = await reporter.render(request)
    response.content.toString().should.containEql('PK')
  })

  it('should use default htmlEngine', async () => {
    const request = {
      template: {
        content: '<table><tr><td>a</td></tr></table>',
        recipe: 'html-to-xlsx',
        engine: 'none'
      }
    }

    const response = await reporter.render(request)
    response.content.toString().should.containEql('PK')
  })

  it('should use Calibri as default font-family', async () => {
    const request = {
      template: {
        content: `
        <table>
          <tr>
              <td data-cell-type="number">1</td>
          </tr>
        </table>
        `,
        recipe: 'html-to-xlsx',
        engine: 'none'
      }
    }

    const response = await reporter.render(request)
    const workbook = await XlsxPopulate.fromDataAsync(response.content)

    workbook.sheets().length.should.be.eql(1)
    workbook.sheets()[0].cell(1, 1).style('fontFamily').should.be.eql('Calibri')
  })

  it('should insert into xlsx template', async () => {
    const xlsxTemplateBuf = await readFileAsync(path.join(__dirname, 'sum-template.xlsx'))

    const request = {
      template: {
        content: `
        <table name="Data">
          <tr>
              <td data-cell-type="number">1</td>
          </tr>
          <tr>
              <td data-cell-type="number">2</td>
          </tr>
          <tr>
              <td data-cell-type="number">3</td>
          </tr>
          <tr>
              <td data-cell-type="number">4</td>
          </tr>
          <tr>
              <td data-cell-type="number">5</td>
          </tr>
          <tr>
              <td data-cell-type="number">6</td>
          </tr>
        </table>
        `,
        recipe: 'html-to-xlsx',
        engine: 'none',
        htmlToXlsx: {
          templateAsset: {
            content: xlsxTemplateBuf
          }
        }
      }
    }

    const response = await reporter.render(request)
    const workbook = await XlsxPopulate.fromDataAsync(response.content)

    workbook.sheets().length.should.be.eql(2)
    workbook.sheets()[1].name().should.be.eql('Data')
    workbook.sheets()[1].cell(1, 1).value().should.be.eql(1)
    workbook.sheets()[1].cell(2, 1).value().should.be.eql(2)
    workbook.sheets()[1].cell(3, 1).value().should.be.eql(3)
    workbook.sheets()[1].cell(4, 1).value().should.be.eql(4)
    workbook.sheets()[1].cell(5, 1).value().should.be.eql(5)
    workbook.sheets()[1].cell(6, 1).value().should.be.eql(6)
  })

  it('should replace sheet when insert into xlsx template gets into duplicated sheet name', async () => {
    const xlsxTemplateBuf = await readFileAsync(path.join(__dirname, 'duplicate-template.xlsx'))

    const request = {
      template: {
        content: `
        <table name="Data">
          <tr>
              <td data-cell-type="number">1</td>
          </tr>
        </table>
        `,
        recipe: 'html-to-xlsx',
        engine: 'none',
        htmlToXlsx: {
          templateAsset: {
            content: xlsxTemplateBuf
          }
        }
      }
    }

    const response = await reporter.render(request)
    const workbook = await XlsxPopulate.fromDataAsync(response.content)

    workbook.sheets().length.should.be.eql(2)
    workbook.sheets()[1].name().should.be.eql('Data')
    workbook.sheets()[1].cell(1, 1).value().should.be.eql(1)
  })

  it('should not throw error when replacing sheet in excel that contains only one sheet', async () => {
    const xlsxTemplateBuf = await readFileAsync(path.join(__dirname, 'only-one-sheet-template.xlsx'))

    const request = {
      template: {
        content: `
        <table name="Main">
          <tr>
              <td data-cell-type="number">1</td>
          </tr>
        </table>
        `,
        recipe: 'html-to-xlsx',
        engine: 'none',
        htmlToXlsx: {
          templateAsset: {
            content: xlsxTemplateBuf
          }
        }
      }
    }

    const response = await reporter.render(request)
    const workbook = await XlsxPopulate.fromDataAsync(response.content)

    workbook.sheets().length.should.be.eql(1)
    workbook.sheets()[0].name().should.be.eql('Main')
    workbook.sheets()[0].cell(1, 1).value().should.be.eql(1)
  })

  it('should keep styles when insert into xlsx template', async () => {
    const xlsxTemplateBuf = await readFileAsync(path.join(__dirname, 'sum-template.xlsx'))

    const request = {
      template: {
        content: `
        <style>
          td {
            background-color: yellow;
            color: green;
            border: 1px solid blue;
          }
        </style>
        <table name="Data">
          <tr>
              <td data-cell-type="number">1</td>
          </tr>
        </table>
        `,
        recipe: 'html-to-xlsx',
        engine: 'none',
        htmlToXlsx: {
          templateAsset: {
            content: xlsxTemplateBuf
          }
        }
      }
    }

    const response = await reporter.render(request)
    const workbook = await XlsxPopulate.fromDataAsync(response.content)

    workbook.sheets().length.should.be.eql(2)
    workbook.sheets()[1].name().should.be.eql('Data')

    workbook.sheets()[1].cell(1, 1).style('fill').should.be.eql({
      type: 'solid',
      color: {
        rgb: 'FFFFFF00'.toLowerCase()
      }
    })

    workbook.sheets()[1].cell(1, 1).style('fontColor').should.be.eql({
      rgb: 'FF008000'.toLowerCase()
    })

    workbook.sheets()[1].cell(1, 1).style('leftBorderStyle').should.be.eql('thin')

    workbook.sheets()[1].cell(1, 1).style('leftBorderColor').should.be.eql({
      rgb: 'FF0000FF'.toLowerCase()
    })

    workbook.sheets()[1].cell(1, 1).style('rightBorderStyle').should.be.eql('thin')

    workbook.sheets()[1].cell(1, 1).style('rightBorderColor').should.be.eql({
      rgb: 'FF0000FF'.toLowerCase()
    })

    workbook.sheets()[1].cell(1, 1).style('topBorderStyle').should.be.eql('thin')

    workbook.sheets()[1].cell(1, 1).style('topBorderColor').should.be.eql({
      rgb: 'FF0000FF'.toLowerCase()
    })

    workbook.sheets()[1].cell(1, 1).style('bottomBorderStyle').should.be.eql('thin')

    workbook.sheets()[1].cell(1, 1).style('bottomBorderColor').should.be.eql({
      rgb: 'FF0000FF'.toLowerCase()
    })
  })

  it('should keep merged cells when insert into xlsx template', async () => {
    const xlsxTemplateBuf = await readFileAsync(path.join(__dirname, 'sum-template.xlsx'))

    const request = {
      template: {
        content: `
        <style>
          td {
            background-color: yellow;
            color: green;
            border: 1px solid blue;
          }
        </style>
        <table name="Data">
          <tr>
            <td data-cell-type="number">1</td>
            <td colspan="2" data-cell-type="number">5</td>
          </tr>
          <tr>
            <td rowspan="2" data-cell-type="number">2</td>
            <td data-cell-type="number">3</td>
            <td data-cell-type="number">1</td>
          </tr>
          <tr>
            <td data-cell-type="number">7</td>
            <td data-cell-type="number">8</td>
          </tr>
        </table>
        `,
        recipe: 'html-to-xlsx',
        engine: 'none',
        htmlToXlsx: {
          templateAsset: {
            content: xlsxTemplateBuf
          }
        }
      }
    }

    const response = await reporter.render(request)
    const workbook = await XlsxPopulate.fromDataAsync(response.content)

    workbook.sheets().length.should.be.eql(2)
    workbook.sheets()[1].name().should.be.eql('Data')
    workbook.sheets()[1].range('B1:C1').merged().should.be.eql(true)
    workbook.sheets()[1].range('A2:A3').merged().should.be.eql(true)
  })

  it('should keep formulas when insert into xlsx template', async () => {
    const xlsxTemplateBuf = await readFileAsync(path.join(__dirname, 'sum-template.xlsx'))

    const request = {
      template: {
        content: `
        <table name="Data">
          <tr>
            <td data-cell-type="number">1</td>
            <td data-cell-type="number">5</td>
            <td data-cell-type="formula">=SUM(A1, B1)</td>
          </tr>
        </table>
        `,
        recipe: 'html-to-xlsx',
        engine: 'none',
        htmlToXlsx: {
          templateAsset: {
            content: xlsxTemplateBuf
          }
        }
      }
    }

    const response = await reporter.render(request)
    const workbook = await XlsxPopulate.fromDataAsync(response.content)

    workbook.sheets().length.should.be.eql(2)
    workbook.sheets()[1].name().should.be.eql('Data')
    workbook.sheets()[1].cell(1, 3).formula().should.be.eql('=SUM(A1, B1)')
  })

  it('should keep column width and row height when insert into xlsx template', async () => {
    const xlsxTemplateBuf = await readFileAsync(path.join(__dirname, 'sum-template.xlsx'))

    const request = {
      template: {
        content: `
        <style>
          td {
            width: 120px;
            height: 50px;
          }
        </style>
        <table name="Data">
          <tr>
            <td data-cell-type="number">1</td>
            <td data-cell-type="number">5</td>
          </tr>
          <tr>
            <td data-cell-type="number">3</td>
            <td data-cell-type="number">3</td>
          </tr>
        </table>
        `,
        recipe: 'html-to-xlsx',
        engine: 'none',
        htmlToXlsx: {
          templateAsset: {
            content: xlsxTemplateBuf
          }
        }
      }
    }

    const response = await reporter.render(request)
    const workbook = await XlsxPopulate.fromDataAsync(response.content)

    workbook.sheets().length.should.be.eql(2)
    workbook.sheets()[1].name().should.be.eql('Data')
    parseInt(workbook.sheets()[1].column(1).width()).should.be.eql(17)
    parseInt(workbook.sheets()[1].row(1).height()).should.be.eql(37)
  })

  it('should propagate line number to error in helper', async () => {
    const request = {
      template: {
        content: '<table><tr><td>{{foo}}</td></tr></table>',
        helpers: `
          function foo() {
            zzz
          }
        `,
        recipe: 'html-to-xlsx',
        engine: 'none',
        htmlToXlsx: {
          htmlEngine: 'chrome'
        }
      }
    }

    try {
      await reporter.render(request)
    } catch (err) {
      err.lineNumber.should.be.eql(3)
    }
  })

  it('should work when using htmlToXlsxEachRows helper', async () => {
    const request = {
      template: {
        content: `
          <table>
            {{#htmlToXlsxEachRows people}}
              <tr>
                <td>{{name}}</td>
                <td>{{address}}</td>
              </tr>
            {{/htmlToXlsxEachRows}}
          </table>
        `,
        recipe: 'html-to-xlsx',
        engine: 'handlebars',
        htmlToXlsx: {
          htmlEngine: 'chrome'
        }
      },
      data: {
        people: [{
          name: 'Joe',
          address: 'test'
        }, {
          name: 'Kurt',
          address: 'test2'
        }]
      }
    }

    const response = await reporter.render(request)
    response.content.toString().should.containEql('PK')
  })
})
