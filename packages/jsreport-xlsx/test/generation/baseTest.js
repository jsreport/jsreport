const path = require('path')
const fs = require('fs')
const should = require('should')
const jsreport = require('@jsreport/jsreport-core')
const xlsx = require('xlsx')
const { getDocumentsFromXlsxBuf } = require('../utils')

const xlsxDirPath = path.join(__dirname, '../xlsx')
const outputPath = path.join(__dirname, '../../out.xlsx')

describe('xlsx generation - base', () => {
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

  it('accept buffer as base64 string by default', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'variable-replace.xlsx')
            ).toString('base64')
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('accept buffer as string with explicit encoding', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'variable-replace.xlsx')
            ).toString('binary'),
            encoding: 'binary'
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('throw clear error when template fails to be parsed as xlsx', async () => {
    return reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'variable-replace.xlsx')
            ).toString('utf8'),
            encoding: 'utf8'
          }
        }
      },
      data: {
        name: 'John'
      }
    }).should.be.rejectedWith(/Failed to parse xlsx template input/i)
  })

  it('ignore parsing cell of pivot table calculated field marked with error', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'pivot-calculated-field-with-error.xlsx')
            )
          }
        }
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[2]]
    should(sheet.E4.t).be.eql('e')
    should(sheet.E4.w).be.eql('#DIV/0!')
    should(sheet.E5.t).be.eql('e')
    should(sheet.E5.w).be.eql('#DIV/0!')
  })

  it('variable replace', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'variable-replace.xlsx')
            )
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('variable replace multi', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'variable-replace-multi.xlsx')
            )
          }
        }
      },
      data: {
        name: 'John',
        lastname: 'Wick'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.A1.v).be.eql('Hello world John developer')
    should(sheet.A2.v).be.eql('Another lines John developer with Wick as lastname')
  })

  it('variable replace multi should keep escaping cell values when there was intention to do it {{expr}}', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'variable-replace-multi.xlsx')
            )
          }
        }
      },
      data: {
        name: 'Boris&Junior',
        lastname: 'Matos&Morillo'
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [sheetDoc] = await getDocumentsFromXlsxBuf(result.content, ['xl/worksheets/sheet1.xml'])
    const cellEls = sheetDoc.getElementsByTagName('c')

    should(cellEls.length).be.eql(2)
    should(cellEls[0].toString()).containEql('Boris&amp;Junior')
    should(cellEls[1].toString()).containEql('Boris&amp;Junior')
    should(cellEls[1].toString()).containEql('Matos&amp;Morillo')

    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.A1.v).be.eql('Hello world Boris&Junior developer')
    should(sheet.A2.v).be.eql('Another lines Boris&Junior developer with Matos&Morillo as lastname')
  })

  it('variable replace styled', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'variable-replace-styled.xlsx')
            )
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('variable replace syntax error', () => {
    const prom = reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'variable-replace-syntax-error.xlsx')
            )
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    return Promise.all([
      should(prom).be.rejectedWith(/Parse error/i),
      // this text that error contains proper location of syntax error
      should(prom).be.rejectedWith(/<t>Hello world {{<\/t>/)
    ])
  })

  it('variable replace should keep escaping cell values when there was intention to do it {{expr}}', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'variable-replace.xlsx')
            )
          }
        }
      },
      data: {
        name: 'Boris&Junior'
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [sheetDoc] = await getDocumentsFromXlsxBuf(result.content, ['xl/worksheets/sheet1.xml'])
    const cellEls = sheetDoc.getElementsByTagName('c')

    should(cellEls.length).be.eql(1)
    should(cellEls[0].toString()).containEql('Boris&amp;Junior')

    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.A1.v).be.eql('Hello world Boris&Junior')
  })

  it('handlebars partials', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        helpers: `
          const h = require('handlebars')

          h.registerPartial('test', '{{name}}')
        `,
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'partial.xlsx')
            )
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('condition with helper call', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'condition-with-helper-call.xlsx')
            )
          }
        },
        helpers: `
          function moreThan2(users) {
            return users.length > 2
          }
        `
      },
      data: {
        users: [1, 2, 3]
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.A1.v).be.eql('More than 2 users')
  })

  it('work with non existing variable', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'variable-non-existing.xlsx')
            )
          }
        }
      },
      data: {
        lastname: 'Hockins',
        job: {}
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql('')
    should(sheet.C2.v).be.eql('Hockins')
    should(sheet.D2.v).be.eql('')
  })

  it('work normally with NUL character (should remove it)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'variable-replace.xlsx')
            )
          }
        }
      },
      data: {
        name: 'John\u0000'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('work normally with VERTICAL TAB character (should remove it)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'variable-replace.xlsx')
            )
          }
        }
      },
      data: {
        name: 'John\u000b'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('generate cells with type according to the data rendered in each cell', async () => {
    const data = {
      name: 'Alexander',
      lastname: 'Smith',
      age: 23,
      working: true
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'content-type.xlsx')
            )
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // test boolean, number and standard string types
    should(sheet.C3.v).be.eql(data.name)
    should(sheet.D3.v).be.eql(data.lastname)
    should(sheet.E3.t).be.eql('n')
    should(sheet.E3.v).be.eql(data.age)
    should(sheet.F3.t).be.eql('b')
    should(sheet.F3.v).be.True()
  })

  it('existing formulas that reference to cells above, same or bellow level should work', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'existing-formula-cell-reference-for-different-levels.xlsx')
            )
          }
        }
      },
      data: {}
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const sheet2 = workbook.Sheets[workbook.SheetNames[1]]
    const sheet3 = workbook.Sheets[workbook.SheetNames[2]]

    should(sheet.B2.v).be.eql(10)
    should(sheet.B3.v).be.eql(20)
    should(sheet.B4.f).be.eql('SUM(B2,B3)')

    should(sheet2.B2.f).be.eql('SUM(C2,D2)')
    should(sheet2.C2.v).be.eql(10)
    should(sheet2.D2.v).be.eql(20)

    should(sheet3.B2.f).be.eql('SUM(B3,B4)')
    should(sheet3.B3.v).be.eql(10)
    should(sheet3.B4.v).be.eql(20)
  })

  it('existing formulas that reference cells from other sheets should be preserved', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'existing-formula-cross-sheet-reference.xlsx')
            )
          }
        }
      },
      data: {}
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.A2.v).be.eql(20)
    should(sheet.B2.f).be.eql('A2+B!A1')
    should(sheet.A3.v).be.eql(30)
    should(sheet.B3.f).be.eql('A3+B!A3')
    should(sheet.A4.v).be.eql(40)
    should(sheet.B4.f).be.eql('A4+B!A5')
  })

  it('existing formulas that reference cells from other sheets with name stored with \' string delimiters should be handled', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'existing-formula-cross-sheet-reference-with-name-string-delimiter.xlsx')
            )
          }
        }
      },
      data: {}
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    should(sheet.B2.f).be.eql("'Raw Data'!$B$2")
    should(sheet.A9.f).be.eql('RawData!$A$15')
  })
})
