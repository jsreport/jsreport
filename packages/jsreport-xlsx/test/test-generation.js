const path = require('path')
const fs = require('fs')
const should = require('should')
const { DOMParser } = require('@xmldom/xmldom')
const moment = require('moment')
const toExcelDate = require('js-excel-date-convert').toExcelDate
const jsreport = require('@jsreport/jsreport-core')
const { decompress } = require('@jsreport/office')
const xlsx = require('xlsx')
const { parseCell } = require('xlsx-coordinates')
const { nodeListToArray } = require('../lib/utils')

const outputPath = path.join(__dirname, '../out.xlsx')

describe('xlsx generation', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      store: {
        provider: 'memory'
      }
    })
      .use(require('..')())
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

  it('variable replace', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'variable-replace.xlsx')
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
              path.join(__dirname, 'variable-replace-multi.xlsx')
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

  it('variable replace styled', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'variable-replace-styled.xlsx')
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
              path.join(__dirname, 'variable-replace-syntax-error.xlsx')
            )
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    return Promise.all([
      should(prom).be.rejectedWith(/Parse error/),
      // this text that error contains proper location of syntax error
      should(prom).be.rejectedWith(/<t>Hello world {{<\/t>/)
    ])
  })

  it('condition with helper call', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'condition-with-helper-call.xlsx')
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
              path.join(__dirname, 'variable-non-existing.xlsx')
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
              path.join(__dirname, 'content-type.xlsx')
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

  it('loop should keep the row empty if array have 0 items', async () => {
    const items = []

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C3.v).be.eql('')
    should(sheet.D3.v).be.eql('')
    should(sheet.E3.v).be.eql('')
  })

  it('loop should generate new rows', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
  })

  it('loop should generate new rows and update existing rows/cells', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-and-existing-cells.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
    should(sheet.B7.v).be.eql('another')
    should(sheet.C7.v).be.eql('content')
    should(sheet.D7.v).be.eql('here')
  })

  it('loop should preserve the content of cells that are not in the loop (left) but in the same row', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-left-preserve.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // preserving the cells on the left of the loop
    should(sheet.A3.v).be.eql('preserve')
    should(sheet.B3.v).be.eql('preserve2')
    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.A4).be.not.ok()
    should(sheet.B4).be.not.ok()
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.A5).be.not.ok()
    should(sheet.B5).be.not.ok()
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
  })

  it('loop should preserve the content of cells that are not in the loop (right) but in the same row', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-right-preserve.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // preserving the cells on the left of the loop
    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.F3.v).be.eql('preserve')
    should(sheet.G3.v).be.eql('preserve2')
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.F4).be.not.ok()
    should(sheet.G4).be.not.ok()
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
    should(sheet.F5).be.not.ok()
    should(sheet.G5).be.not.ok()
  })

  it('loop should preserve the content of cells that are not in the loop (left, right) but in the same row', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-left-right-preserve.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // preserving the cells on the left of the loop
    should(sheet.A3.v).be.eql('preserve')
    should(sheet.B3.v).be.eql('preserve2')
    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.F3.v).be.eql('preserve3')
    should(sheet.G3.v).be.eql('preserve4')
    should(sheet.A4).be.not.ok()
    should(sheet.B4).be.not.ok()
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.F4).be.not.ok()
    should(sheet.G4).be.not.ok()
    should(sheet.A5).be.not.ok()
    should(sheet.B5).be.not.ok()
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
    should(sheet.F5).be.not.ok()
    should(sheet.G5).be.not.ok()
  })

  it('multiple loops should generate new rows and update existing rows/cells', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const items2 = [{
      name: 'Robert',
      lastname: 'Hill',
      age: 49
    }, {
      name: 'Rebeca',
      lastname: 'Hilton',
      age: 22
    }, {
      name: 'Scarlet',
      lastname: 'Strange',
      age: 33
    }]

    const items3 = [{
      name: 'Mathew',
      lastname: 'Gonzales',
      age: 26
    }, {
      name: 'Esperanza',
      lastname: 'Lopez',
      age: 29
    }, {
      name: 'Lucian',
      lastname: 'Heart',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'multiple-loops.xlsx')
            )
          }
        }
      },
      data: {
        items,
        items2,
        items3
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)

    should(sheet.B7.v).be.eql('another')
    should(sheet.C7.v).be.eql('content')
    should(sheet.D7.v).be.eql('here')

    should(sheet.C10.v).be.eql(items2[0].name)
    should(sheet.D10.v).be.eql(items2[0].lastname)
    should(sheet.E10.v).be.eql(items2[0].age)
    should(sheet.C11.v).be.eql(items2[1].name)
    should(sheet.D11.v).be.eql(items2[1].lastname)
    should(sheet.E11.v).be.eql(items2[1].age)
    should(sheet.C12.v).be.eql(items2[2].name)
    should(sheet.D12.v).be.eql(items2[2].lastname)
    should(sheet.E12.v).be.eql(items2[2].age)

    should(sheet.B14.v).be.eql('another2')
    should(sheet.C14.v).be.eql('content2')
    should(sheet.D14.v).be.eql('here2')

    should(sheet.C17.v).be.eql(items3[0].name)
    should(sheet.D17.v).be.eql(items3[0].lastname)
    should(sheet.E17.v).be.eql(items3[0].age)
    should(sheet.C18.v).be.eql(items3[1].name)
    should(sheet.D18.v).be.eql(items3[1].lastname)
    should(sheet.E18.v).be.eql(items3[1].age)
    should(sheet.C19.v).be.eql(items3[2].name)
    should(sheet.D19.v).be.eql(items3[2].lastname)
    should(sheet.E19.v).be.eql(items3[2].age)
  })

  it('should update dimension information in sheet after loop', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet['!ref']).be.eql(`C2:E${2 + items.length}`)
  })

  it.skip('loop should repeat cells content that involves multiple rows', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-multiple-rows.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql('')
    should(sheet.B6.v).be.eql('')

    should(sheet.C3.v).be.eql('Name')
    should(sheet.D3.v).be.eql('Lastname')
    should(sheet.E3.v).be.eql('Age')
    should(sheet.C4.v).be.eql('Alexander')
    should(sheet.D4.v).be.eql('Smith')
    should(sheet.E4.v).be.eql(32)

    should(sheet.C8.v).be.eql('Name')
    should(sheet.D8.v).be.eql('Lastname')
    should(sheet.E8.v).be.eql('Age')
    should(sheet.C9.v).be.eql('John')
    should(sheet.D9.v).be.eql('Doe')
    should(sheet.E9.v).be.eql(29)

    should(sheet.C13.v).be.eql('Name')
    should(sheet.D13.v).be.eql('Lastname')
    should(sheet.E13.v).be.eql('Age')
    should(sheet.C14.v).be.eql('Jane')
    should(sheet.D14.v).be.eql('Montana')
    should(sheet.E14.v).be.eql(23)
  })

  it('update existing merged cells after loop', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'update-merged-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(mergeCellExists(sheet, 'B1:C1')).be.True()
    should(sheet.B1.v).be.eql('merged')
    should(mergeCellExists(sheet, 'B7:C7')).be.True()
    should(sheet.B7.v).be.eql('merged2')
    should(mergeCellExists(sheet, 'E7:G7')).be.True()
    should(sheet.E7.v).be.eql('merged3')
  })

  it('create new merged cells from loop', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'new-merged-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(mergeCellExists(sheet, 'D3:E3')).be.True()
    should(sheet.F3.v).be.eql(items[0].age)
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(mergeCellExists(sheet, 'D4:E4')).be.True()
    should(sheet.F4.v).be.eql(items[1].age)
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(mergeCellExists(sheet, 'D5:E5')).be.True()
    should(sheet.F5.v).be.eql(items[2].age)
  })

  it('create new multiple merged cells from loop', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      job: 'Developer',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      job: 'Designer',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      job: 'Lawyer',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'new-multiple-merged-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(mergeCellExists(sheet, 'D3:E3')).be.True()
    should(sheet.F3.v).be.eql(items[0].job)
    should(mergeCellExists(sheet, 'F3:G3')).be.True()
    should(sheet.H3.v).be.eql(items[0].age)
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(mergeCellExists(sheet, 'D4:E4')).be.True()
    should(sheet.F4.v).be.eql(items[1].job)
    should(mergeCellExists(sheet, 'F4:G4')).be.True()
    should(sheet.H4.v).be.eql(items[1].age)
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(mergeCellExists(sheet, 'D5:E5')).be.True()
    should(sheet.F5.v).be.eql(items[2].job)
    should(mergeCellExists(sheet, 'F5:G5')).be.True()
    should(sheet.H5.v).be.eql(items[2].age)
  })

  it('create new merged cells from loop and update existing', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'merged-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(mergeCellExists(sheet, 'B1:C1')).be.True()
    should(sheet.B1.v).be.eql('merged')

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(mergeCellExists(sheet, 'D3:E3')).be.True()
    should(sheet.F3.v).be.eql(items[0].age)
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(mergeCellExists(sheet, 'D4:E4')).be.True()
    should(sheet.F4.v).be.eql(items[1].age)
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(mergeCellExists(sheet, 'D5:E5')).be.True()
    should(sheet.F5.v).be.eql(items[2].age)

    should(mergeCellExists(sheet, 'B7:C7')).be.True()
    should(sheet.B7.v).be.eql('merged2')
    should(mergeCellExists(sheet, 'E7:G7')).be.True()
    should(sheet.E7.v).be.eql('merged3')
  })

  it('loop should preserve the content of merged cells that are not in the loop (left) but in the same row', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-left-merge-cell-preserve.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // preserving the cells on the left of the loop
    should(sheet.A3.v).be.eql('preserve')
    should(mergeCellExists(sheet, 'A3:B3')).be.True()
    should(sheet.D3.v).be.eql('preserve2')
    should(mergeCellExists(sheet, 'D3:E3')).be.True()
    should(sheet.F3.v).be.eql(items[0].name)
    should(sheet.G3.v).be.eql(items[0].lastname)
    should(sheet.H3.v).be.eql(items[0].age)
    should(sheet.A4).be.not.ok()
    should(mergeCellExists(sheet, 'A4:B4')).be.False()
    should(sheet.D4).be.not.ok()
    should(mergeCellExists(sheet, 'D4:E4')).be.False()
    should(sheet.F4.v).be.eql(items[1].name)
    should(sheet.G4.v).be.eql(items[1].lastname)
    should(sheet.H4.v).be.eql(items[1].age)
    should(sheet.A5).be.not.ok()
    should(mergeCellExists(sheet, 'A5:B5')).be.False()
    should(sheet.D5).be.not.ok()
    should(mergeCellExists(sheet, 'D5:E5')).be.False()
    should(sheet.F5.v).be.eql(items[2].name)
    should(sheet.G5.v).be.eql(items[2].lastname)
    should(sheet.H5.v).be.eql(items[2].age)
    should(sheet['!merges']).have.length(2)
  })

  it('loop should preserve the content of merged cells that are not in the loop (right) but in the same row', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-right-merge-cell-preserve.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // preserving the cells on the left of the loop
    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.F3.v).be.eql('preserve')
    should(mergeCellExists(sheet, 'F3:G3')).be.True()
    should(sheet.I3.v).be.eql('preserve2')
    should(mergeCellExists(sheet, 'I3:J3')).be.True()
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.F4).be.not.ok()
    should(mergeCellExists(sheet, 'F4:G4')).be.False()
    should(sheet.I4).be.not.ok()
    should(mergeCellExists(sheet, 'I4:J4')).be.False()
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
    should(sheet.F5).be.not.ok()
    should(mergeCellExists(sheet, 'F5:G5')).be.False()
    should(sheet.I5).be.not.ok()
    should(mergeCellExists(sheet, 'I5:J5')).be.False()
    should(sheet['!merges']).have.length(2)
  })

  it('loop should preserve the content of merged cells that are not in the loop (left, right) but in the same row', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-left-right-merge-cell-preserve.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // preserving the cells on the left of the loop

    should(sheet.A3.v).be.eql('preserve')
    should(mergeCellExists(sheet, 'A3:B3')).be.True()
    should(sheet.D3.v).be.eql('preserve2')
    should(mergeCellExists(sheet, 'D3:E3')).be.True()
    should(sheet.F3.v).be.eql(items[0].name)
    should(sheet.G3.v).be.eql(items[0].lastname)
    should(sheet.H3.v).be.eql(items[0].age)
    should(sheet.I3.v).be.eql('preserve3')
    should(mergeCellExists(sheet, 'I3:J3')).be.True()
    should(sheet.K3.v).be.eql('preserve4')
    should(mergeCellExists(sheet, 'K3:L3')).be.True()
    should(sheet.A4).be.not.ok()
    should(mergeCellExists(sheet, 'A4:B4')).be.False()
    should(sheet.D4).be.not.ok()
    should(mergeCellExists(sheet, 'D4:E4')).be.False()
    should(sheet.F4.v).be.eql(items[1].name)
    should(sheet.G4.v).be.eql(items[1].lastname)
    should(sheet.H4.v).be.eql(items[1].age)
    should(sheet.I4).be.not.ok()
    should(mergeCellExists(sheet, 'I4:J4')).be.False()
    should(sheet.K4).be.not.ok()
    should(mergeCellExists(sheet, 'K4:L4')).be.False()
    should(sheet.A5).be.not.ok()
    should(mergeCellExists(sheet, 'A5:B5')).be.False()
    should(sheet.D5).be.not.ok()
    should(mergeCellExists(sheet, 'D5:E5')).be.False()
    should(sheet.F5.v).be.eql(items[2].name)
    should(sheet.G5.v).be.eql(items[2].lastname)
    should(sheet.H5.v).be.eql(items[2].age)
    should(sheet.I5).be.not.ok()
    should(mergeCellExists(sheet, 'I5:J5')).be.False()
    should(sheet.K5).be.not.ok()
    should(mergeCellExists(sheet, 'K5:L5')).be.False()
    should(sheet['!merges']).have.length(4)
  })

  it('should generate workbook with full recalculation of formulas on load', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'update-formula-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(workbook.Workbook.CalcPr.fullCalcOnLoad).be.eql('1')

    should(sheet.E5?.f).be.not.ok()
    should(sheet.E6?.f).be.not.ok()
    should(sheet.E7?.f).be.not.ok()
    should(sheet.E8?.f).be.not.ok()
    should(sheet.E9.f).be.eql('SUM(E7:E8)')
    should(sheet.E10.f).be.eql('AVERAGE(E7:E8)')
    should(sheet.E11?.f).be.not.ok()
  })

  it('update existing formulas after loop', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'update-formula-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.E5?.f).be.not.ok()
    should(sheet.E6?.f).be.not.ok()
    should(sheet.E7?.f).be.not.ok()
    should(sheet.E8?.f).be.not.ok()
    should(sheet.E9.f).be.eql('SUM(E7:E8)')
    should(sheet.E10.f).be.eql('AVERAGE(E7:E8)')
    should(sheet.E11?.f).be.not.ok()
  })

  it('update calcChain info of formulas after loop', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'update-formula-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)

    const files = await decompress()(result.content)

    const normalizePath = (filePath) => {
      if (filePath.startsWith('/')) {
        return filePath.slice(1)
      }

      return filePath
    }

    const calcChainDoc = new DOMParser().parseFromString(
      files.find(f => f.path === normalizePath(workbook.Directory.calcchain)).data.toString()
    )

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    const cellExists = (cellRef, cellEls) => {
      return cellEls.find((el) => el.getAttribute('r') === cellRef) != null
    }

    should(cellExists('E5', cellEls)).be.False()
    should(cellExists('E6', cellEls)).be.False()
    should(cellExists('E7', cellEls)).be.False()
    should(cellExists('E8', cellEls)).be.False()
    should(cellExists('E9', cellEls)).be.True()
    should(cellExists('E10', cellEls)).be.True()
    should(cellExists('E11', cellEls)).be.False()
    should(cellEls).have.length(2)
  })

  it('update existing formulas after loop (formula start in loop and formula end points to one cell bellow loop)', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'update-formula-cells-(end-bellow)-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.E5?.f).be.not.ok()
    should(sheet.E6?.f).be.not.ok()
    should(sheet.E7.f).be.eql('SUM(E3:E6)')
    should(sheet.E8.f).be.eql('AVERAGE(E3:E6)')
    should(sheet.E9.f).be.eql('MIN(E3:E6)')
    should(sheet.E10.f).be.eql('MAX(E3:E6)')
    should(sheet.E11.f).be.eql('SUM(E9,E10)')
  })

  it('update calcChain info of formulas after loop (formula start in loop and formula end points to one cell bellow loop)', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'update-formula-cells-(end-bellow)-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)

    const files = await decompress()(result.content)

    const normalizePath = (filePath) => {
      if (filePath.startsWith('/')) {
        return filePath.slice(1)
      }

      return filePath
    }

    const calcChainDoc = new DOMParser().parseFromString(
      files.find(f => f.path === normalizePath(workbook.Directory.calcchain)).data.toString()
    )

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    const cellExists = (cellRef, cellEls) => {
      return cellEls.find((el) => el.getAttribute('r') === cellRef) != null
    }

    should(cellExists('E5', cellEls)).be.False()
    should(cellExists('E6', cellEls)).be.False()
    should(cellExists('E7', cellEls)).be.True()
    should(cellExists('E8', cellEls)).be.True()
    should(cellExists('E9', cellEls)).be.True()
    should(cellExists('E10', cellEls)).be.True()
    should(cellExists('E11', cellEls)).be.True()
    should(cellExists('E12', cellEls)).be.False()
    should(cellEls).have.length(5)
  })

  it('update existing formulas after loop (formula start and end points to cell in loop)', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'update-formula-cells-(inside)-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.E5?.f).be.not.ok()
    should(sheet.E6?.f).be.not.ok()
    should(sheet.E7.f).be.eql('SUM(E3:E5)')
    should(sheet.E8.f).be.eql('AVERAGE(E3:E5)')
    should(sheet.E9.f).be.eql('MIN(E3:E5)')
    should(sheet.E10.f).be.eql('MAX(E3:E5)')
    should(sheet.E11.f).be.eql('SUM(E9,E10)')
  })

  it('update calcChain info of formulas after loop (formula start and end points to cell in loop)', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'update-formula-cells-(inside)-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)

    const files = await decompress()(result.content)

    const normalizePath = (filePath) => {
      if (filePath.startsWith('/')) {
        return filePath.slice(1)
      }

      return filePath
    }

    const calcChainDoc = new DOMParser().parseFromString(
      files.find(f => f.path === normalizePath(workbook.Directory.calcchain)).data.toString()
    )

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    const cellExists = (cellRef, cellEls) => {
      return cellEls.find((el) => el.getAttribute('r') === cellRef) != null
    }

    should(cellExists('E5', cellEls)).be.False()
    should(cellExists('E6', cellEls)).be.False()
    should(cellExists('E7', cellEls)).be.True()
    should(cellExists('E8', cellEls)).be.True()
    should(cellExists('E9', cellEls)).be.True()
    should(cellExists('E10', cellEls)).be.True()
    should(cellExists('E11', cellEls)).be.True()
    should(cellExists('E12', cellEls)).be.False()
    should(cellEls).have.length(5)
  })

  it('create new formula cells from loop', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32,
      rate: 22,
      hours: 122
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29,
      rate: 16,
      hours: 189
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23,
      rate: 20,
      hours: 144
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'new-formula-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.F3.v).be.eql(items[0].rate)
    should(sheet.G3.v).be.eql(items[0].hours)
    should(sheet.H3.f).be.eql('F3*G3')
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.F4.v).be.eql(items[1].rate)
    should(sheet.G4.v).be.eql(items[1].hours)
    should(sheet.H4.f).be.eql('F4*G4')
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
    should(sheet.F5.v).be.eql(items[2].rate)
    should(sheet.G5.v).be.eql(items[2].hours)
    should(sheet.H5.f).be.eql('F5*G5')
  })

  it('update calcChain info of formulas after loop created new formula cells', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32,
      rate: 22,
      hours: 122
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29,
      rate: 16,
      hours: 189
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23,
      rate: 20,
      hours: 144
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'new-formula-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)

    const files = await decompress()(result.content)

    const normalizePath = (filePath) => {
      if (filePath.startsWith('/')) {
        return filePath.slice(1)
      }

      return filePath
    }

    const calcChainDoc = new DOMParser().parseFromString(
      files.find(f => f.path === normalizePath(workbook.Directory.calcchain)).data.toString()
    )

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    const cellExists = (cellRef, cellEls) => {
      return cellEls.find((el) => el.getAttribute('r') === cellRef) != null
    }

    should(cellExists('H3', cellEls)).be.True()
    should(cellExists('H4', cellEls)).be.True()
    should(cellExists('H5', cellEls)).be.True()
    should(cellEls).have.length(3)
  })

  it('create new multiple formula cells from loop', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32,
      rate: 22,
      hours: 122
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29,
      rate: 16,
      hours: 189
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23,
      rate: 20,
      hours: 144
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'new-multiple-formula-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.F3.v).be.eql(items[0].rate)
    should(sheet.G3.v).be.eql(items[0].hours)
    should(sheet.H3.f).be.eql('F3*G3')
    should(sheet.I3.f).be.eql('H3*100')
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.F4.v).be.eql(items[1].rate)
    should(sheet.G4.v).be.eql(items[1].hours)
    should(sheet.H4.f).be.eql('F4*G4')
    should(sheet.I4.f).be.eql('H4*100')
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
    should(sheet.F5.v).be.eql(items[2].rate)
    should(sheet.G5.v).be.eql(items[2].hours)
    should(sheet.H5.f).be.eql('F5*G5')
    should(sheet.I5.f).be.eql('H5*100')
  })

  it('update calcChain info of formulas after loop created new multiple formula cells', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32,
      rate: 22,
      hours: 122
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29,
      rate: 16,
      hours: 189
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23,
      rate: 20,
      hours: 144
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'new-multiple-formula-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)

    const files = await decompress()(result.content)

    const normalizePath = (filePath) => {
      if (filePath.startsWith('/')) {
        return filePath.slice(1)
      }

      return filePath
    }

    const calcChainDoc = new DOMParser().parseFromString(
      files.find(f => f.path === normalizePath(workbook.Directory.calcchain)).data.toString()
    )

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    const cellExists = (cellRef, cellEls) => {
      return cellEls.find((el) => el.getAttribute('r') === cellRef) != null
    }

    should(cellExists('H3', cellEls)).be.True()
    should(cellExists('I3', cellEls)).be.True()
    should(cellExists('H4', cellEls)).be.True()
    should(cellExists('I4', cellEls)).be.True()
    should(cellExists('H5', cellEls)).be.True()
    should(cellExists('I5', cellEls)).be.True()
    should(cellEls).have.length(6)
  })

  it('create new formula cells from loop (increment range)', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32,
      rate: 22,
      hours: 122
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29,
      rate: 16,
      hours: 189
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23,
      rate: 20,
      hours: 144
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'new-formula-cells-(range)-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.F3.v).be.eql(items[0].rate)
    should(sheet.G3.v).be.eql(items[0].hours)
    should(sheet.H3.f).be.eql('SUM(F3:G3)')
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.F4.v).be.eql(items[1].rate)
    should(sheet.G4.v).be.eql(items[1].hours)
    should(sheet.H4.f).be.eql('SUM(F4:G4)')
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
    should(sheet.F5.v).be.eql(items[2].rate)
    should(sheet.G5.v).be.eql(items[2].hours)
    should(sheet.H5.f).be.eql('SUM(F5:G5)')
  })

  it('update calcChain info of formulas after loop created new formula cells (increment range)', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32,
      rate: 22,
      hours: 122
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29,
      rate: 16,
      hours: 189
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23,
      rate: 20,
      hours: 144
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'new-formula-cells-(range)-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)

    const files = await decompress()(result.content)

    const normalizePath = (filePath) => {
      if (filePath.startsWith('/')) {
        return filePath.slice(1)
      }

      return filePath
    }

    const calcChainDoc = new DOMParser().parseFromString(
      files.find(f => f.path === normalizePath(workbook.Directory.calcchain)).data.toString()
    )

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    const cellExists = (cellRef, cellEls) => {
      return cellEls.find((el) => el.getAttribute('r') === cellRef) != null
    }

    should(cellExists('H3', cellEls)).be.True()
    should(cellExists('H4', cellEls)).be.True()
    should(cellExists('H5', cellEls)).be.True()
    should(cellEls).have.length(3)
  })

  it('create new formula cells from loop (increment standard cells but don\'t do it for cell using absolute reference for row $)', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32,
      rate: 22,
      hours: 122
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29,
      rate: 16,
      hours: 189
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23,
      rate: 20,
      hours: 144
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'new-formula-cells-(row-absolute-reference)-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.F3.v).be.eql(items[0].rate)
    should(sheet.G3.v).be.eql(items[0].hours)
    should(sheet.H3.f).be.eql('A$1*F3*G3')
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.F4.v).be.eql(items[1].rate)
    should(sheet.G4.v).be.eql(items[1].hours)
    should(sheet.H4.f).be.eql('A$1*F4*G4')
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
    should(sheet.F5.v).be.eql(items[2].rate)
    should(sheet.G5.v).be.eql(items[2].hours)
    should(sheet.H5.f).be.eql('A$1*F5*G5')
  })

  it('update calcChain info of formulas after loop created new formula cells (increment standard cells but don\'t do it for cell using absolute reference $)', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32,
      rate: 22,
      hours: 122
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29,
      rate: 16,
      hours: 189
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23,
      rate: 20,
      hours: 144
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'new-formula-cells-(row-absolute-reference)-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)

    const files = await decompress()(result.content)

    const normalizePath = (filePath) => {
      if (filePath.startsWith('/')) {
        return filePath.slice(1)
      }

      return filePath
    }

    const calcChainDoc = new DOMParser().parseFromString(
      files.find(f => f.path === normalizePath(workbook.Directory.calcchain)).data.toString()
    )

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    const cellExists = (cellRef, cellEls) => {
      return cellEls.find((el) => el.getAttribute('r') === cellRef) != null
    }

    should(cellExists('H3', cellEls)).be.True()
    should(cellExists('H4', cellEls)).be.True()
    should(cellExists('H5', cellEls)).be.True()
    should(cellEls).have.length(3)
  })

  it('create new formula cells from loop and update existing', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32,
      rate: 22,
      hours: 122
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29,
      rate: 16,
      hours: 189
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23,
      rate: 20,
      hours: 144
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'formula-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.F3.v).be.eql(items[0].rate)
    should(sheet.G3.v).be.eql(items[0].hours)
    should(sheet.H3.f).be.eql('F3*G3')
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.F4.v).be.eql(items[1].rate)
    should(sheet.G4.v).be.eql(items[1].hours)
    should(sheet.H4.f).be.eql('F4*G4')
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
    should(sheet.F5.v).be.eql(items[2].rate)
    should(sheet.G5.v).be.eql(items[2].hours)
    should(sheet.H5.f).be.eql('F5*G5')

    should(sheet.E5?.f).be.not.ok()
    should(sheet.E6?.f).be.not.ok()
    should(sheet.E7?.f).be.not.ok()
    should(sheet.E8?.f).be.not.ok()
    should(sheet.E9.f).be.eql('SUM(E7:E8)')
    should(sheet.E10.f).be.eql('AVERAGE(E7:E8)')
    should(sheet.E11?.f).be.not.ok()
  })

  it('update calcChain info of formulas after loop created new formula and updated existing cells', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32,
      rate: 22,
      hours: 122
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29,
      rate: 16,
      hours: 189
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23,
      rate: 20,
      hours: 144
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'formula-cells-loop.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)

    const files = await decompress()(result.content)

    const normalizePath = (filePath) => {
      if (filePath.startsWith('/')) {
        return filePath.slice(1)
      }

      return filePath
    }

    const calcChainDoc = new DOMParser().parseFromString(
      files.find(f => f.path === normalizePath(workbook.Directory.calcchain)).data.toString()
    )

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    const cellExists = (cellRef, cellEls) => {
      return cellEls.find((el) => el.getAttribute('r') === cellRef) != null
    }

    should(cellExists('H3', cellEls)).be.True()
    should(cellExists('H4', cellEls)).be.True()
    should(cellExists('H5', cellEls)).be.True()
    should(cellExists('E9', cellEls)).be.True()
    should(cellExists('E10', cellEls)).be.True()
    should(cellEls).have.length(5)
  })

  it('loop should preserve the content of formula cells that are not in the loop (left) but in the same row', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-left-formula-cell-preserve.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // preserving the cells on the left of the loop
    should(sheet.A3.f).be.eql('A1*2')
    should(sheet.B3.f).be.eql('A1*3')
    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.A4).be.not.ok()
    should(sheet.B4).be.not.ok()
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.A5).be.not.ok()
    should(sheet.B5).be.not.ok()
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
  })

  it('loop should preserve the content of formula cells that are not in the loop (right) but in the same row', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-right-formula-cell-preserve.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // preserving the cells on the right of the loop
    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.F3.f).be.eql('A1*2')
    should(sheet.G3.f).be.eql('A1*3')
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.F4).be.not.ok()
    should(sheet.G4).be.not.ok()
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
    should(sheet.F5).be.not.ok()
    should(sheet.G5).be.not.ok()
  })

  it('loop should preserve the content of formula cells that are not in the loop (left, right) but in the same row', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-left-right-formula-cell-preserve.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // preserving the cells on the left of the loop
    should(sheet.A3.f).be.eql('A1*2')
    should(sheet.B3.f).be.eql('A1*3')
    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.F3.f).be.eql('A1*4')
    should(sheet.G3.f).be.eql('A1*5')
    should(sheet.A4).be.not.ok()
    should(sheet.B4).be.not.ok()
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.F4).be.not.ok()
    should(sheet.G4).be.not.ok()
    should(sheet.A5).be.not.ok()
    should(sheet.B5).be.not.ok()
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)
    should(sheet.F5).be.not.ok()
    should(sheet.G5).be.not.ok()
  })

  it('loop should not break shared formulas', async () => {
    const items = [
      {
        ID: 1,
        Name: 'Test 1',
        Value1: 1,
        Value2: 2,
        Value3: 3,
        Value4: 4,
        Value5: 5,
        Value6: 6,
        Value7: 7,
        Value8: 8,
        Value9: 9,
        Value10: 10,
        Value11: 11,
        Value12: 12,
        Value13: 13,
        Value14: 14,
        Value15: 15,
        Value16: 16,
        Value17: 17,
        Value18: 18,
        Value19: 19,
        Value20: 20
      },
      {
        ID: 2,
        Name: 'Test 2',
        Value1: 1,
        Value2: 2,
        Value3: 3,
        Value4: 4,
        Value5: 5,
        Value6: 6,
        Value7: 7,
        Value8: 8,
        Value9: 9,
        Value10: 10,
        Value11: 11,
        Value12: 12,
        Value13: 13,
        Value14: 14,
        Value15: 15,
        Value16: 16,
        Value17: 17,
        Value18: 18,
        Value19: 19,
        Value20: 20
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        helpers: 'function toNumber(val) { return Number(val) }',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-shared-formulas.xlsx')
            )
          }
        }
      },
      data: {
        Data: items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.A1.v).be.eql('ID')
    should(sheet.B1.v).be.eql('Name')
    should(sheet.C1.v).be.eql('Value1')
    should(sheet.D1.v).be.eql('Value2')
    should(sheet.E1.v).be.eql('Value3')
    should(sheet.F1.v).be.eql('Value4')
    should(sheet.G1.v).be.eql('Value5')
    should(sheet.H1.v).be.eql('Value6')
    should(sheet.I1.v).be.eql('Value7')
    should(sheet.J1.v).be.eql('Value8')
    should(sheet.K1.v).be.eql('Value9')
    should(sheet.L1.v).be.eql('Value10')
    should(sheet.M1.v).be.eql('Value11')
    should(sheet.N1.v).be.eql('Value12')
    should(sheet.O1.v).be.eql('Value13')
    should(sheet.P1.v).be.eql('Value14')
    should(sheet.Q1.v).be.eql('Value15')
    should(sheet.R1.v).be.eql('Value16')
    should(sheet.S1.v).be.eql('Value17')
    should(sheet.T1.v).be.eql('Value18')
    should(sheet.U1.v).be.eql('Value19')
    should(sheet.V1.v).be.eql('Value20')

    should(sheet.A2.v).be.eql(items[0].ID)
    should(sheet.A2.t).be.eql('n')
    should(sheet.B2.v).be.eql(items[0].Name)
    should(sheet.C2.v).be.eql(items[0].Value1)
    should(sheet.C2.t).be.eql('n')
    should(sheet.D2.v).be.eql(items[0].Value2)
    should(sheet.D2.t).be.eql('n')
    should(sheet.E2.v).be.eql(items[0].Value3)
    should(sheet.E2.t).be.eql('n')
    should(sheet.F2.v).be.eql(items[0].Value4)
    should(sheet.F2.t).be.eql('n')
    should(sheet.G2.v).be.eql(items[0].Value5)
    should(sheet.G2.t).be.eql('n')
    should(sheet.H2.v).be.eql(items[0].Value6)
    should(sheet.H2.t).be.eql('n')
    should(sheet.I2.v).be.eql(items[0].Value7)
    should(sheet.I2.t).be.eql('n')
    should(sheet.J2.v).be.eql(items[0].Value8)
    should(sheet.J2.t).be.eql('n')
    should(sheet.K2.v).be.eql(items[0].Value9)
    should(sheet.K2.t).be.eql('n')
    should(sheet.L2.v).be.eql(items[0].Value10)
    should(sheet.L2.t).be.eql('n')
    should(sheet.M2.v).be.eql(items[0].Value11)
    should(sheet.M2.t).be.eql('n')
    should(sheet.N2.v).be.eql(items[0].Value12)
    should(sheet.N2.t).be.eql('n')
    should(sheet.O2.v).be.eql(items[0].Value13)
    should(sheet.O2.t).be.eql('n')
    should(sheet.P2.v).be.eql(items[0].Value14)
    should(sheet.P2.t).be.eql('n')
    should(sheet.Q2.v).be.eql(items[0].Value15)
    should(sheet.Q2.t).be.eql('n')
    should(sheet.R2.v).be.eql(items[0].Value16)
    should(sheet.R2.t).be.eql('n')
    should(sheet.S2.v).be.eql(items[0].Value17)
    should(sheet.S2.t).be.eql('n')
    should(sheet.T2.v).be.eql(items[0].Value18)
    should(sheet.T2.t).be.eql('n')
    should(sheet.U2.v).be.eql(items[0].Value19)
    should(sheet.U2.t).be.eql('n')
    should(sheet.V2.v).be.eql(items[0].Value20)
    should(sheet.V2.t).be.eql('n')

    should(sheet.A3.v).be.eql(items[1].ID)
    should(sheet.A3.t).be.eql('n')
    should(sheet.B3.v).be.eql(items[1].Name)
    should(sheet.C3.v).be.eql(items[1].Value1)
    should(sheet.C3.t).be.eql('n')
    should(sheet.D3.v).be.eql(items[1].Value2)
    should(sheet.D3.t).be.eql('n')
    should(sheet.E3.v).be.eql(items[1].Value3)
    should(sheet.E3.t).be.eql('n')
    should(sheet.F3.v).be.eql(items[1].Value4)
    should(sheet.F3.t).be.eql('n')
    should(sheet.G3.v).be.eql(items[1].Value5)
    should(sheet.G3.t).be.eql('n')
    should(sheet.H3.v).be.eql(items[1].Value6)
    should(sheet.H3.t).be.eql('n')
    should(sheet.I3.v).be.eql(items[1].Value7)
    should(sheet.I3.t).be.eql('n')
    should(sheet.J3.v).be.eql(items[1].Value8)
    should(sheet.J3.t).be.eql('n')
    should(sheet.K3.v).be.eql(items[1].Value9)
    should(sheet.K3.t).be.eql('n')
    should(sheet.L3.v).be.eql(items[1].Value10)
    should(sheet.L3.t).be.eql('n')
    should(sheet.M3.v).be.eql(items[1].Value11)
    should(sheet.M3.t).be.eql('n')
    should(sheet.N3.v).be.eql(items[1].Value12)
    should(sheet.N3.t).be.eql('n')
    should(sheet.O3.v).be.eql(items[1].Value13)
    should(sheet.O3.t).be.eql('n')
    should(sheet.P3.v).be.eql(items[1].Value14)
    should(sheet.P3.t).be.eql('n')
    should(sheet.Q3.v).be.eql(items[1].Value15)
    should(sheet.Q3.t).be.eql('n')
    should(sheet.R3.v).be.eql(items[1].Value16)
    should(sheet.R3.t).be.eql('n')
    should(sheet.S3.v).be.eql(items[1].Value17)
    should(sheet.S3.t).be.eql('n')
    should(sheet.T3.v).be.eql(items[1].Value18)
    should(sheet.T3.t).be.eql('n')
    should(sheet.U3.v).be.eql(items[1].Value19)
    should(sheet.U3.t).be.eql('n')
    should(sheet.V3.v).be.eql(items[1].Value20)
    should(sheet.V3.t).be.eql('n')

    should(sheet.A4).be.not.ok()
    should(sheet.B4).be.not.ok()
    should(sheet.C4).be.not.ok()
    should(sheet.D4).be.not.ok()
    should(sheet.E4).be.not.ok()
    should(sheet.F4).be.not.ok()
    should(sheet.G4).be.not.ok()
    should(sheet.H4).be.not.ok()
    should(sheet.I4).be.not.ok()
    should(sheet.J4).be.not.ok()
    should(sheet.K4).be.not.ok()
    should(sheet.L4).be.not.ok()
    should(sheet.M4).be.not.ok()
    should(sheet.N4).be.not.ok()
    should(sheet.O4).be.not.ok()
    should(sheet.P4).be.not.ok()
    should(sheet.Q4).be.not.ok()
    should(sheet.R4).be.not.ok()
    should(sheet.S4).be.not.ok()
    should(sheet.T4).be.not.ok()
    should(sheet.U4).be.not.ok()
    should(sheet.V4).be.not.ok()

    should(sheet.A5).be.not.ok()
    should(sheet.B5).be.not.ok()
    should(sheet.C5.f).be.eql('SUBTOTAL(109,C2:C4)')
    should(sheet.D5.f).be.eql('SUBTOTAL(109,D2:D4)')
    should(sheet.E5.f).be.eql('SUBTOTAL(109,E2:E4)')
    should(sheet.F5.f).be.eql('SUBTOTAL(109,F2:F4)')
    should(sheet.G5.f).be.eql('SUBTOTAL(109,G2:G4)')
    should(sheet.H5.f).be.eql('SUBTOTAL(109,H2:H4)')
    should(sheet.I5.f).be.eql('SUBTOTAL(109,I2:I4)')
    should(sheet.J5.f).be.eql('SUBTOTAL(109,J2:J4)')
    should(sheet.K5.f).be.eql('SUBTOTAL(109,K2:K4)')
    should(sheet.L5.f).be.eql('SUBTOTAL(109,L2:L4)')
    should(sheet.M5.f).be.eql('SUBTOTAL(109,M2:M4)')
    should(sheet.N5.f).be.eql('SUBTOTAL(109,N2:N4)')
    should(sheet.O5.f).be.eql('SUBTOTAL(109,O2:O4)')
    should(sheet.P5.f).be.eql('SUBTOTAL(109,P2:P4)')
    should(sheet.Q5.f).be.eql('SUBTOTAL(109,Q2:Q4)')
    should(sheet.R5.f).be.eql('SUBTOTAL(109,R2:R4)')
    should(sheet.S5.f).be.eql('SUBTOTAL(109,S2:S4)')
    should(sheet.T5.f).be.eql('SUBTOTAL(109,T2:T4)')
    should(sheet.U5.f).be.eql('SUBTOTAL(109,U2:U4)')
    should(sheet.V5.f).be.eql('SUBTOTAL(109,V2:V4)')
  })

  it('loop should generate cells with type according to the data rendered in each cell', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32,
      working: false
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29,
      working: true
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23,
      working: false
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-with-content-type.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // test boolean, number and standard string types
    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.t).be.eql('n')
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.F3.t).be.eql('b')
    should(sheet.F3.v).be.False()
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.t).be.eql('n')
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.F4.t).be.eql('b')
    should(sheet.F4.v).be.True()
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.t).be.eql('n')
    should(sheet.E5.v).be.eql(items[2].age)
    should(sheet.F5.t).be.eql('b')
    should(sheet.F5.v).be.False()
  })

  it('loop should generate cell numbers when using this in handlebars', async () => {
    const numbers = [1, 2, 3, 4, 5]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'loop-numbers-and-this.xlsx')
            )
          }
        }
      },
      data: {
        numbers
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.A1.v).be.eql(numbers[0])
    should(sheet.A1.t).be.eql('n')
    should(sheet.A2.v).be.eql(numbers[1])
    should(sheet.A2.t).be.eql('n')
    should(sheet.A3.v).be.eql(numbers[2])
    should(sheet.A3.t).be.eql('n')
    should(sheet.A4.v).be.eql(numbers[3])
    should(sheet.A4.t).be.eql('n')
    should(sheet.A5.v).be.eql(numbers[4])
    should(sheet.A5.t).be.eql('n')
  })

  it('table generated with loop', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith',
      age: 32
    }, {
      name: 'John',
      lastname: 'Doe',
      age: 29
    }, {
      name: 'Jane',
      lastname: 'Montana',
      age: 23
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'table.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    const files = await decompress()(result.content)

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[0].lastname)
    should(sheet.E3.v).be.eql(items[0].age)
    should(sheet.C4.v).be.eql(items[1].name)
    should(sheet.D4.v).be.eql(items[1].lastname)
    should(sheet.E4.v).be.eql(items[1].age)
    should(sheet.C5.v).be.eql(items[2].name)
    should(sheet.D5.v).be.eql(items[2].lastname)
    should(sheet.E5.v).be.eql(items[2].age)

    const tableDoc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/tables/table1.xml').data.toString()
    )

    const tableRef = tableDoc.documentElement.getAttribute('ref')
    const autoFilterRef = tableDoc.getElementsByTagName('autoFilter')[0]?.getAttribute('ref')

    should(tableRef).be.eql('C2:E5')
    should(autoFilterRef).be.eql('C2:E5')
  })

  it('invoice', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'invoice.xlsx'))
          }
        }
      },
      data: {
        invoiceNumber: 'T-123',
        company: {
          name: 'jsreport',
          address: 'Prague 345',
          email: 'foo',
          phone: 'phone'
        },
        date: '07/02/22',
        items: [
          {
            name: 'Product 1',
            taxed: false,
            amount: 2375
          },
          {
            name: 'Service 1',
            taxed: true,
            amount: 235
          }
        ]
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // should have updated cells as expected
    should(sheet.A9.v).be.eql('Product 1')
    should(sheet.E9.v).be.eql('')
    // this also test that the cell value is number
    should(sheet.F9.t).be.eql('n')
    should(sheet.F9.v).be.eql(2375)
    should(sheet.A10.v).be.eql('Service 1')
    should(sheet.E10.v).be.eql('X')
    // this also test that the cell value is number
    should(sheet.F10.t).be.eql('n')
    should(sheet.F10.v).be.eql(235)
    should(sheet.F13.f).startWith('SUM(')

    // preserve merge cell in starting  loop
    should(mergeCellExists(sheet, 'A9:C9')).be.True()
    // merge cell created in the loop
    should(mergeCellExists(sheet, 'A10:C10')).be.True()
    should(mergeCellExists(sheet, 'A11:C11')).be.False()
    should(mergeCellExists(sheet, 'A12:C12')).be.False()
    should(mergeCellExists(sheet, 'A13:C13')).be.False()
    should(mergeCellExists(sheet, 'A14:C14')).be.False()
    // merge cell that should be pushed one row down
    should(mergeCellExists(sheet, 'A15:C15')).be.True()
    should(mergeCellExists(sheet, 'A16:C16')).be.True()
    should(mergeCellExists(sheet, 'A17:C17')).be.True()
    should(mergeCellExists(sheet, 'A18:C18')).be.True()
    should(mergeCellExists(sheet, 'A19:C19')).be.False()

    // updated cell references in formula cells
    should(sheet.F13.f).be.eql('SUM(F9:F12)')
    should(sheet.F14.f).be.eql('SUMIF(E9:E12,"=x",F9:F12)')
    should(sheet.F16.f).be.eql('ROUND(F14*F15,2)')
    should(sheet.F18.f).be.eql('F13+F16+F17')
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
            content: fs.readFileSync(path.join(__dirname, 'chart.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-data-series.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-data-series.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-data-series.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-options-axis.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-options-axis.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-options-axis.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-options-axis.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-options-axis.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'basic-scatter-chart-datalabels.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-with-no-style-colors-xml-files.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-with-title.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-with-dynamic-title.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'scatter-chart.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'bubble-chart.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'stock-chart.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'combo-chart.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'waterfall-chart.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'funnel-chart.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'treemap-chart.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'sunburst-chart.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'clusteredColumn-chart.xlsx'))
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

  it('chart error message when no data', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'chart-error-data.xlsx'))
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
              content: fs.readFileSync(path.join(__dirname, 'chart-error-data.xlsx'))
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
              content: fs.readFileSync(path.join(__dirname, 'chart-error-data.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-serie-style.xlsx'))
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
            content: fs.readFileSync(path.join(__dirname, 'chart-serie-number-format.xlsx'))
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

  it('should autofit cols if configured', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith'
    }, {
      name: 'John',
      lastname: 'Doe'
    }, {
      name: 'Jane',
      lastname: 'Montana'
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'cols-autofit.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const vmlDrawingDoc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/drawings/vmlDrawing1.vml').data.toString()
    )

    const commentsDoc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/comments1.xml').data.toString()
    )

    const workbook = xlsx.read(result.content, {
      cellStyles: true
    })

    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.A5.v).be.eql(items[0].name)
    should(sheet.B5.v).be.eql(items[0].lastname)
    should(sheet.A6.v).be.eql(items[1].name)
    should(sheet.B6.v).be.eql(items[1].lastname)
    should(sheet.A7.v).be.eql(items[2].name)
    should(sheet.B7.v).be.eql(items[2].lastname)

    should(sheet['!cols']).be.Array()

    sheet['!cols'][0].customwidth.should.be.eql('1')
    sheet['!cols'][0].width.should.be.Number()
    sheet['!cols'][3].customwidth.should.be.eql('1')
    sheet['!cols'][3].width.should.be.Number()

    // verify that the comment containing the {{xlsxColAutofit}} was removed
    const commentEls = nodeListToArray(commentsDoc.getElementsByTagName('comment'))

    should(commentEls).not.matchAny((el) => {
      el.getAttribute('ref').should.be.eql('A1')
    })

    should(commentEls).not.matchAny((el) => {
      el.getAttribute('ref').should.be.eql('D1')
    })

    const shapeEls = nodeListToArray(vmlDrawingDoc.getElementsByTagName('v:shape'))

    should(shapeEls).not.matchAny((el) => {
      const clientDataEl = el.getElementsByTagName('x:ClientData')[0]
      clientDataEl.getAttribute('ObjectType').should.be.eql('Note')
      const clientRowEl = clientDataEl.getElementsByTagName('x:Row')[0]
      clientRowEl.textContent.should.be.eql('0')
      const clientColumnEl = clientDataEl.getElementsByTagName('x:Column')[0]
      clientColumnEl.textContent.should.be.eql('0')
    })

    should(shapeEls).not.matchAny((el) => {
      const clientDataEl = el.getElementsByTagName('x:ClientData')[0]
      clientDataEl.getAttribute('ObjectType').should.be.eql('Note')
      const clientRowEl = clientDataEl.getElementsByTagName('x:Row')[0]
      clientRowEl.textContent.should.be.eql('0')
      const clientColumnEl = clientDataEl.getElementsByTagName('x:Column')[0]
      clientColumnEl.textContent.should.be.eql('3')
    })
  })

  it('should autofit all cols if configured', async () => {
    const items = [{
      name: 'Alexander',
      lastname: 'Smith'
    }, {
      name: 'John',
      lastname: 'Doe'
    }, {
      name: 'Jane',
      lastname: 'Montana'
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'cols-autofit-all.xlsx')
            )
          }
        }
      },
      data: {
        items
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)

    const vmlDrawingDoc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/drawings/vmlDrawing1.vml').data.toString()
    )

    const commentsDoc = new DOMParser().parseFromString(
      files.find(f => f.path === 'xl/comments1.xml').data.toString()
    )

    const workbook = xlsx.read(result.content, {
      cellStyles: true
    })

    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.A5.v).be.eql(items[0].name)
    should(sheet.B5.v).be.eql(items[0].lastname)
    should(sheet.A6.v).be.eql(items[1].name)
    should(sheet.B6.v).be.eql(items[1].lastname)
    should(sheet.A7.v).be.eql(items[2].name)
    should(sheet.B7.v).be.eql(items[2].lastname)

    should(sheet['!cols']).be.Array()

    sheet['!cols'][0].customwidth.should.be.eql('1')
    sheet['!cols'][0].width.should.be.Number()
    sheet['!cols'][1].customwidth.should.be.eql('1')
    sheet['!cols'][1].width.should.be.Number()
    sheet['!cols'][3].customwidth.should.be.eql('1')
    sheet['!cols'][3].width.should.be.Number()

    // verify that the comment containing the {{xlsxColAutofit}} was removed
    const commentEls = nodeListToArray(commentsDoc.getElementsByTagName('comment'))

    should(commentEls).not.matchAny((el) => {
      el.getAttribute('ref').should.be.eql('A1')
    })

    const shapeEls = nodeListToArray(vmlDrawingDoc.getElementsByTagName('v:shape'))

    should(shapeEls).not.matchAny((el) => {
      const clientDataEl = el.getElementsByTagName('x:ClientData')[0]
      clientDataEl.getAttribute('ObjectType').should.be.eql('Note')
      const clientRowEl = clientDataEl.getElementsByTagName('x:Row')[0]
      clientRowEl.textContent.should.be.eql('0')
      const clientColumnEl = clientDataEl.getElementsByTagName('x:Column')[0]
      clientColumnEl.textContent.should.be.eql('0')
    })
  })
})

function mergeCellExists (sheet, cellRange) {
  const cellRangeParts = cellRange.split(':')
  const parsedStart = parseCell(cellRangeParts[0])
  const parsedEnd = parseCell(cellRangeParts[1])

  let found = false

  found = sheet['!merges'].find((item) => (
    item.s.r === parsedStart[1] &&
    item.s.c === parsedStart[0] &&
    item.e.r === parsedEnd[1] &&
    item.e.c === parsedEnd[0]
  )) != null

  return found
}

function findChildNode (nodeName, targetNode, allNodes = false) {
  const result = []

  for (let i = 0; i < targetNode.childNodes.length; i++) {
    let found = false
    const childNode = targetNode.childNodes[i]

    if (childNode.nodeName === nodeName) {
      found = true
      result.push(childNode)
    }

    if (found && !allNodes) {
      break
    }
  }

  return allNodes ? result : result[0]
}
