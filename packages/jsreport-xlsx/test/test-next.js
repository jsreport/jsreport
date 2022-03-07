const path = require('path')
const fs = require('fs')
const should = require('should')
const { DOMParser } = require('@xmldom/xmldom')
const jsreport = require('@jsreport/jsreport-core')
const { decompress } = require('@jsreport/office')
const xlsx = require('xlsx')
const { parseCell } = require('xlsx-coordinates')
const { nodeListToArray } = require('../lib/utils')

const outputPath = path.join(__dirname, '../out.xlsx')

describe('xlsx-next', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      store: {
        provider: 'memory'
      }
    })
      .use(require('../')())
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
        recipe: 'xlsx-next',
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
