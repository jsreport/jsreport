const path = require('path')
const fs = require('fs')
const should = require('should')
const { DOMParser } = require('@xmldom/xmldom')
const jsreport = require('@jsreport/jsreport-core')
const { decompress } = require('@jsreport/office')
const xlsx = require('xlsx')
const { parseCell } = require('xlsx-coordinates')
const { nodeListToArray } = require('../../lib/utils')

const dataDirPath = path.join(__dirname, '../data')
const xlsxDirPath = path.join(__dirname, '../xlsx')
const outputPath = path.join(__dirname, '../../out.xlsx')

describe('xlsx generation - loops', () => {
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

  const modes = ['row', 'block']
  it('inner loop', async () => {
    const items = [{
      name: 'Alexander'
    }, {
      name: 'John'
    }, {
      name: 'Jane'
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'inner-loop.xlsx')
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

    should(sheet.C2.v).be.eql('Names')
    should(sheet.C3.v).be.eql(`${items[0].name}${items[1].name}${items[2].name}`)
  })

  for (const mode of modes) {
    it(`${mode} loop should keep the row empty if array have 0 items`, async () => {
      const items = []

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')
        should(sheet.C3.v).be.eql('')
        should(sheet.D3.v).be.eql('')
        should(sheet.E3.v).be.eql('')
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql('')
        should(sheet.D4.v).be.eql('')
        should(sheet.E4.v).be.eql('')
        should(sheet.B6.v).be.eql('')
      }
    })

    it(`${mode} loop should generate new rows`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].age)
        should(sheet.C4.v).be.eql(items[1].name)
        should(sheet.D4.v).be.eql(items[1].lastname)
        should(sheet.E4.v).be.eql(items[1].age)
        should(sheet.C5.v).be.eql(items[2].name)
        should(sheet.D5.v).be.eql(items[2].lastname)
        should(sheet.E5.v).be.eql(items[2].age)
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.E13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)
      }
    })

    it(`${mode} loop should keep the same row if array have 1 item`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].age)
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
      }
    })

    it(`${mode} loop should generate new rows and update existing rows/cells`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-and-existing-cells.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')
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
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)

        should(sheet.B8).be.not.ok()

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.E13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)

        should(sheet.B18.v).be.eql('another')
        should(sheet.C18.v).be.eql('content')
        should(sheet.D18.v).be.eql('here')
      }
    })

    it(`${mode} loop should not generate new row and keep existing rows/cells if array have 0 items`, async () => {
      const items = []

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-and-existing-cells.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')
        should(sheet.C3.v).be.eql('')
        should(sheet.D3.v).be.eql('')
        should(sheet.E3.v).be.eql('')
        should(sheet.B5.v).be.eql('another')
        should(sheet.C5.v).be.eql('content')
        should(sheet.D5.v).be.eql('here')
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql('')
        should(sheet.D4.v).be.eql('')
        should(sheet.E4.v).be.eql('')

        should(sheet.B8.v).be.eql('another')
        should(sheet.C8.v).be.eql('content')
        should(sheet.D8.v).be.eql('here')
      }
    })

    it(`${mode} loop should not generate new row and keep existing rows/cells if array have 1 item`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-and-existing-cells.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].age)
        should(sheet.B5.v).be.eql('another')
        should(sheet.C5.v).be.eql('content')
        should(sheet.D5.v).be.eql('here')
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)

        should(sheet.B8.v).be.eql('another')
        should(sheet.C8.v).be.eql('content')
        should(sheet.D8.v).be.eql('here')
      }
    })

    it(`${mode} loop should work with inner loop`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        colors: [{ name: 'red' }, { name: 'black' }],
        age: 32
      }, {
        name: 'John',
        lastname: 'Doe',
        colors: [{ name: 'blue' }, { name: 'yellow' }, { name: 'green' }],
        age: 29
      }, {
        name: 'Jane',
        lastname: 'Montana',
        colors: [{ name: 'black' }],
        age: 23
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-and-inner-loop.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Colors')
        should(sheet.F2.v).be.eql('Age')
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].colors.map((item) => item.name).join(''))
        should(sheet.F3.v).be.eql(items[0].age)
        should(sheet.C4.v).be.eql(items[1].name)
        should(sheet.D4.v).be.eql(items[1].lastname)
        should(sheet.E4.v).be.eql(items[1].colors.map((item) => item.name).join(''))
        should(sheet.F4.v).be.eql(items[1].age)
        should(sheet.C5.v).be.eql(items[2].name)
        should(sheet.D5.v).be.eql(items[2].lastname)
        should(sheet.E5.v).be.eql(items[2].colors.map((item) => item.name).join(''))
        should(sheet.F5.v).be.eql(items[2].age)
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Colors')
        should(sheet.F3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].colors.map((item) => item.name).join(''))
        should(sheet.F4.v).be.eql(items[0].age)

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Colors')
        should(sheet.F8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].colors.map((item) => item.name).join(''))
        should(sheet.F9.v).be.eql(items[1].age)

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.E13.v).be.eql('Colors')
        should(sheet.F13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].colors.map((item) => item.name).join(''))
        should(sheet.F14.v).be.eql(items[2].age)
      }
    })

    it(`${mode} loop should generate new rows when there are siblings loop`, async () => {
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
        name: 'Emma',
        lastname: 'Johnson',
        age: 27
      }, {
        name: 'William',
        lastname: 'Garcia',
        age: 35
      }]

      const items3 = [{
        name: 'Oliver',
        lastname: 'Taylor',
        age: 28
      }, {
        name: 'Ava',
        lastname: 'Martinez',
        age: 33
      }, {
        name: 'Lucas',
        lastname: 'Ramirez',
        age: 25
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-siblings.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].age)
        should(sheet.C4.v).be.eql(items[1].name)
        should(sheet.D4.v).be.eql(items[1].lastname)
        should(sheet.E4.v).be.eql(items[1].age)
        should(sheet.C5.v).be.eql(items[2].name)
        should(sheet.D5.v).be.eql(items[2].lastname)
        should(sheet.E5.v).be.eql(items[2].age)

        should(sheet.C7.v).be.eql('Name')
        should(sheet.D7.v).be.eql('Lastname')
        should(sheet.E7.v).be.eql('Age')
        should(sheet.C8.v).be.eql(items2[0].name)
        should(sheet.D8.v).be.eql(items2[0].lastname)
        should(sheet.E8.v).be.eql(items2[0].age)
        should(sheet.C9.v).be.eql(items2[1].name)
        should(sheet.D9.v).be.eql(items2[1].lastname)
        should(sheet.E9.v).be.eql(items2[1].age)

        should(sheet.C11.v).be.eql('Name')
        should(sheet.D11.v).be.eql('Lastname')
        should(sheet.E11.v).be.eql('Age')
        should(sheet.C12.v).be.eql(items3[0].name)
        should(sheet.D12.v).be.eql(items3[0].lastname)
        should(sheet.E12.v).be.eql(items3[0].age)
        should(sheet.C13.v).be.eql(items3[1].name)
        should(sheet.D13.v).be.eql(items3[1].lastname)
        should(sheet.E13.v).be.eql(items3[1].age)
        should(sheet.C14.v).be.eql(items3[2].name)
        should(sheet.D14.v).be.eql(items3[2].lastname)
        should(sheet.E14.v).be.eql(items3[2].age)
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.E13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)

        should(sheet.C19.v).be.eql('Name')
        should(sheet.D19.v).be.eql('Lastname')
        should(sheet.E19.v).be.eql('Age')
        should(sheet.C20.v).be.eql(items2[0].name)
        should(sheet.D20.v).be.eql(items2[0].lastname)
        should(sheet.E20.v).be.eql(items2[0].age)

        should(sheet.C24.v).be.eql('Name')
        should(sheet.D24.v).be.eql('Lastname')
        should(sheet.E24.v).be.eql('Age')
        should(sheet.C25.v).be.eql(items2[1].name)
        should(sheet.D25.v).be.eql(items2[1].lastname)
        should(sheet.E25.v).be.eql(items2[1].age)

        should(sheet.C30.v).be.eql('Name')
        should(sheet.D30.v).be.eql('Lastname')
        should(sheet.E30.v).be.eql('Age')
        should(sheet.C31.v).be.eql(items3[0].name)
        should(sheet.D31.v).be.eql(items3[0].lastname)
        should(sheet.E31.v).be.eql(items3[0].age)

        should(sheet.C35.v).be.eql('Name')
        should(sheet.D35.v).be.eql('Lastname')
        should(sheet.E35.v).be.eql('Age')
        should(sheet.C36.v).be.eql(items3[1].name)
        should(sheet.D36.v).be.eql(items3[1].lastname)
        should(sheet.E36.v).be.eql(items3[1].age)

        should(sheet.C40.v).be.eql('Name')
        should(sheet.D40.v).be.eql('Lastname')
        should(sheet.E40.v).be.eql('Age')
        should(sheet.C41.v).be.eql(items3[2].name)
        should(sheet.D41.v).be.eql(items3[2].lastname)
        should(sheet.E41.v).be.eql(items3[2].age)
      }
    })

    it(`${mode} loop should generate new rows when there are mixed siblings loop`, async () => {
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
        name: 'Emma',
        lastname: 'Johnson',
        age: 27
      }, {
        name: 'William',
        lastname: 'Garcia',
        age: 35
      }]

      const items3 = [{
        name: 'Oliver',
        lastname: 'Taylor',
        age: 28
      }, {
        name: 'Ava',
        lastname: 'Martinez',
        age: 33
      }, {
        name: 'Lucas',
        lastname: 'Ramirez',
        age: 25
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-mixed-siblings.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].age)
        should(sheet.C4.v).be.eql(items[1].name)
        should(sheet.D4.v).be.eql(items[1].lastname)
        should(sheet.E4.v).be.eql(items[1].age)
        should(sheet.C5.v).be.eql(items[2].name)
        should(sheet.D5.v).be.eql(items[2].lastname)
        should(sheet.E5.v).be.eql(items[2].age)

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items2[0].name)
        should(sheet.D9.v).be.eql(items2[0].lastname)
        should(sheet.E9.v).be.eql(items2[0].age)
        should(sheet.C12.v).be.eql('Name')
        should(sheet.D12.v).be.eql('Lastname')
        should(sheet.E12.v).be.eql('Age')
        should(sheet.C13.v).be.eql(items2[1].name)
        should(sheet.D13.v).be.eql(items2[1].lastname)
        should(sheet.E13.v).be.eql(items2[1].age)

        should(sheet.C16.v).be.eql('Name')
        should(sheet.D16.v).be.eql('Lastname')
        should(sheet.E16.v).be.eql('Age')
        should(sheet.C17.v).be.eql(items3[0].name)
        should(sheet.D17.v).be.eql(items3[0].lastname)
        should(sheet.E17.v).be.eql(items3[0].age)
        should(sheet.C18.v).be.eql(items3[1].name)
        should(sheet.D18.v).be.eql(items3[1].lastname)
        should(sheet.E18.v).be.eql(items3[1].age)
        should(sheet.C19.v).be.eql(items3[2].name)
        should(sheet.D19.v).be.eql(items3[2].lastname)
        should(sheet.E19.v).be.eql(items3[2].age)
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.E13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)

        should(sheet.C18.v).be.eql('Name')
        should(sheet.D18.v).be.eql('Lastname')
        should(sheet.E18.v).be.eql('Age')
        should(sheet.C19.v).be.eql(items2[0].name)
        should(sheet.D19.v).be.eql(items2[0].lastname)
        should(sheet.E19.v).be.eql(items2[0].age)
        should(sheet.C20.v).be.eql(items2[1].name)
        should(sheet.D20.v).be.eql(items2[1].lastname)
        should(sheet.E20.v).be.eql(items2[1].age)

        should(sheet.C23.v).be.eql('Name')
        should(sheet.D23.v).be.eql('Lastname')
        should(sheet.E23.v).be.eql('Age')
        should(sheet.C24.v).be.eql(items3[0].name)
        should(sheet.D24.v).be.eql(items3[0].lastname)
        should(sheet.E24.v).be.eql(items3[0].age)

        should(sheet.C28.v).be.eql('Name')
        should(sheet.D28.v).be.eql('Lastname')
        should(sheet.E28.v).be.eql('Age')
        should(sheet.C29.v).be.eql(items3[1].name)
        should(sheet.D29.v).be.eql(items3[1].lastname)
        should(sheet.E29.v).be.eql(items3[1].age)

        should(sheet.C33.v).be.eql('Name')
        should(sheet.D33.v).be.eql('Lastname')
        should(sheet.E33.v).be.eql('Age')
        should(sheet.C34.v).be.eql(items3[2].name)
        should(sheet.D34.v).be.eql(items3[2].lastname)
        should(sheet.E34.v).be.eql(items3[2].age)
      }
    })

    // TODO: add tests when there is text next (left/right) to (inside same cell) the start/end cell of loop [preserve{{#each}}], [{{/#each}}preserve]?
    // use loop-left-preserve-cell-text.xlsx file for the test

    it(`${mode} loop should preserve the content of cells that are not in the loop (left) but in the same row`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-left-preserve.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')

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
      } else {
        should(sheet.A2.v).be.eql('preserve')
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)

        should(sheet.B8).be.not.ok()

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.E13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)
      }
    })

    it(`${mode} loop should preserve the content of cells that are not in the loop (left) but in the same row, the cells should not have access to data from the loop`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-left-preserve-without-context.xlsx`)
              )
            }
          }
        },
        data: {
          name: 'test',
          items
        }
      })

      fs.writeFileSync(outputPath, result.content)
      const workbook = xlsx.read(result.content)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      if (mode === 'row') {
        should(sheet.D2.v).be.eql('Name')
        should(sheet.E2.v).be.eql('Lastname')
        should(sheet.F2.v).be.eql('Age')

        // preserving the cells on the left of the loop
        should(sheet.A3.v).be.eql('')
        should(sheet.B3.v).be.eql('test')
        should(sheet.C3.v).be.eql('')
        should(sheet.D3.v).be.eql(items[0].name)
        should(sheet.E3.v).be.eql(items[0].lastname)
        should(sheet.F3.v).be.eql(items[0].age)
        should(sheet.A4).be.not.ok()
        should(sheet.B4).be.not.ok()
        should(sheet.C4).be.not.ok()
        should(sheet.D4.v).be.eql(items[1].name)
        should(sheet.E4.v).be.eql(items[1].lastname)
        should(sheet.F4.v).be.eql(items[1].age)
        should(sheet.A5).be.not.ok()
        should(sheet.B5).be.not.ok()
        should(sheet.C5).be.not.ok()
        should(sheet.D5.v).be.eql(items[2].name)
        should(sheet.E5.v).be.eql(items[2].lastname)
        should(sheet.F5.v).be.eql(items[2].age)
      } else {
        should(sheet.A2.v).be.eql('')
        should(sheet.B2.v).be.eql('test')
        should(sheet.C2.v).be.eql('')
        should(sheet.D2.v).be.eql('')
        should(sheet.D6.v).be.eql('')

        should(sheet.E3.v).be.eql('Name')
        should(sheet.F3.v).be.eql('Lastname')
        should(sheet.G3.v).be.eql('Age')
        should(sheet.E4.v).be.eql(items[0].name)
        should(sheet.F4.v).be.eql(items[0].lastname)
        should(sheet.G4.v).be.eql(items[0].age)

        should(sheet.D8).be.not.ok()

        should(sheet.E8.v).be.eql('Name')
        should(sheet.F8.v).be.eql('Lastname')
        should(sheet.G8.v).be.eql('Age')
        should(sheet.E9.v).be.eql(items[1].name)
        should(sheet.F9.v).be.eql(items[1].lastname)
        should(sheet.G9.v).be.eql(items[1].age)

        should(sheet.E13.v).be.eql('Name')
        should(sheet.F13.v).be.eql('Lastname')
        should(sheet.G13.v).be.eql('Age')
        should(sheet.E14.v).be.eql(items[2].name)
        should(sheet.F14.v).be.eql(items[2].lastname)
        should(sheet.G14.v).be.eql(items[2].age)
      }
    })

    it(`${mode} loop should preserve the content of cells that are not in the loop (right) but in the same row`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-right-preserve.xlsx`)
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

      if (mode === 'row') {
        // preserving the cells on the left of the loop
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')
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
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)

        should(sheet.B8).be.not.ok()

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.E13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)

        should(sheet.C16.v).be.eql('preserve')
        should(sheet.D16.v).be.eql('preserve2')
      }
    })

    it(`${mode} loop should preserve the content of cells that are not in the loop (right) but in the same row, the cells should not have access to data from the loop`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-right-preserve-without-context.xlsx`)
              )
            }
          }
        },
        data: {
          name: 'test',
          items
        }
      })

      fs.writeFileSync(outputPath, result.content)
      const workbook = xlsx.read(result.content)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      if (mode === 'row') {
        // preserving the cells on the left of the loop
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].age)
        should(sheet.F3.v).be.eql('')
        should(sheet.G3.v).be.eql('test')
        should(sheet.H3.v).be.eql('')
        should(sheet.C4.v).be.eql(items[1].name)
        should(sheet.D4.v).be.eql(items[1].lastname)
        should(sheet.E4.v).be.eql(items[1].age)
        should(sheet.F4).be.not.ok()
        should(sheet.G4).be.not.ok()
        should(sheet.H4).be.not.ok()
        should(sheet.C5.v).be.eql(items[2].name)
        should(sheet.D5.v).be.eql(items[2].lastname)
        should(sheet.E5.v).be.eql(items[2].age)
        should(sheet.F5).be.not.ok()
        should(sheet.G5).be.not.ok()
        should(sheet.H5).be.not.ok()
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)

        should(sheet.B8).be.not.ok()

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.E13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)

        should(sheet.C16.v).be.eql('')
        should(sheet.D16.v).be.eql('test')
        should(sheet.E16.v).be.eql('')
      }
    })

    it(`${mode} loop should preserve the content of cells that are not in the loop (left, right) but in the same row`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-left-right-preserve.xlsx`)
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

      if (mode === 'row') {
        // preserving the cells on the left of the loop
        should(sheet.A3.v).be.eql('preserve')
        should(sheet.B3.v).be.eql('preserve2')
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')
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
      } else {
        should(sheet.A2.v).be.eql('preserve')
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)

        should(sheet.B8).be.not.ok()

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.E13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)

        should(sheet.C16.v).be.eql('preserve2')
        should(sheet.D16.v).be.eql('preserve3')
      }
    })

    it(`${mode} loop should preserve the content of cells that are not in the loop (left, right) but in the same row, the cells should not have access to data from the loop`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-left-right-preserve-without-context.xlsx`)
              )
            }
          }
        },
        data: {
          name: 'test',
          items
        }
      })

      fs.writeFileSync(outputPath, result.content)
      const workbook = xlsx.read(result.content)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      if (mode === 'row') {
        should(sheet.D2.v).be.eql('Name')
        should(sheet.E2.v).be.eql('Lastname')
        should(sheet.F2.v).be.eql('Age')

        // preserving the cells on the left of the loop
        should(sheet.A3.v).be.eql('')
        should(sheet.B3.v).be.eql('test')
        should(sheet.C3.v).be.eql('')
        should(sheet.D3.v).be.eql(items[0].name)
        should(sheet.E3.v).be.eql(items[0].lastname)
        should(sheet.F3.v).be.eql(items[0].age)
        should(sheet.G3.v).be.eql('')
        should(sheet.H3.v).be.eql('test')
        should(sheet.I3.v).be.eql('')
        should(sheet.A4).be.not.ok()
        should(sheet.B4).be.not.ok()
        should(sheet.C4).be.not.ok()
        should(sheet.D4.v).be.eql(items[1].name)
        should(sheet.E4.v).be.eql(items[1].lastname)
        should(sheet.F4.v).be.eql(items[1].age)
        should(sheet.G4).be.not.ok()
        should(sheet.H4).be.not.ok()
        should(sheet.I4).be.not.ok()
        should(sheet.A5).be.not.ok()
        should(sheet.B5).be.not.ok()
        should(sheet.C5).be.not.ok()
        should(sheet.D5.v).be.eql(items[2].name)
        should(sheet.E5.v).be.eql(items[2].lastname)
        should(sheet.F5.v).be.eql(items[2].age)
        should(sheet.G5).be.not.ok()
        should(sheet.H5).be.not.ok()
        should(sheet.I5).be.not.ok()
      } else {
        should(sheet.A2.v).be.eql('')
        should(sheet.B2.v).be.eql('test')
        should(sheet.C2.v).be.eql('')
        should(sheet.D2.v).be.eql('')
        should(sheet.D6.v).be.eql('')

        should(sheet.E3.v).be.eql('Name')
        should(sheet.F3.v).be.eql('Lastname')
        should(sheet.G3.v).be.eql('Age')
        should(sheet.E4.v).be.eql(items[0].name)
        should(sheet.F4.v).be.eql(items[0].lastname)
        should(sheet.G4.v).be.eql(items[0].age)

        should(sheet.D8).be.not.ok()

        should(sheet.E8.v).be.eql('Name')
        should(sheet.F8.v).be.eql('Lastname')
        should(sheet.G8.v).be.eql('Age')
        should(sheet.E9.v).be.eql(items[1].name)
        should(sheet.F9.v).be.eql(items[1].lastname)
        should(sheet.G9.v).be.eql(items[1].age)

        should(sheet.E13.v).be.eql('Name')
        should(sheet.F13.v).be.eql('Lastname')
        should(sheet.G13.v).be.eql('Age')
        should(sheet.E14.v).be.eql(items[2].name)
        should(sheet.F14.v).be.eql(items[2].lastname)
        should(sheet.G14.v).be.eql(items[2].age)

        should(sheet.E16.v).be.eql('')
        should(sheet.F16.v).be.eql('test')
        should(sheet.G16.v).be.eql('')
      }
    })

    it(`${mode} loop multiple loops should generate new rows and update existing rows/cells`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'multiple' : 'multiple-row'}-loops.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')
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
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)

        should(sheet.B8).be.not.ok()

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.E13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)

        should(sheet.B18.v).be.eql('another')
        should(sheet.C18.v).be.eql('content')
        should(sheet.D18.v).be.eql('here')

        should(sheet.B10).be.not.ok()
        should(sheet.B14).be.not.ok()

        should(sheet.C21.v).be.eql('Name')
        should(sheet.D21.v).be.eql('Lastname')
        should(sheet.E21.v).be.eql('Age')
        should(sheet.C22.v).be.eql(items[0].name)
        should(sheet.D22.v).be.eql(items[0].lastname)
        should(sheet.E22.v).be.eql(items[0].age)

        should(sheet.C26.v).be.eql('Name')
        should(sheet.D26.v).be.eql('Lastname')
        should(sheet.E26.v).be.eql('Age')
        should(sheet.C27.v).be.eql(items[1].name)
        should(sheet.D27.v).be.eql(items[1].lastname)
        should(sheet.E27.v).be.eql(items[1].age)

        should(sheet.C31.v).be.eql('Name')
        should(sheet.D31.v).be.eql('Lastname')
        should(sheet.E31.v).be.eql('Age')
        should(sheet.C32.v).be.eql(items[2].name)
        should(sheet.D32.v).be.eql(items[2].lastname)
        should(sheet.E32.v).be.eql(items[2].age)

        should(sheet.B36.v).be.eql('another2')
        should(sheet.C36.v).be.eql('content2')
        should(sheet.D36.v).be.eql('here2')

        should(sheet.B22).be.not.ok()

        should(sheet.C39.v).be.eql('Name')
        should(sheet.D39.v).be.eql('Lastname')
        should(sheet.E39.v).be.eql('Age')
        should(sheet.C40.v).be.eql(items[0].name)
        should(sheet.D40.v).be.eql(items[0].lastname)
        should(sheet.E40.v).be.eql(items[0].age)

        should(sheet.C44.v).be.eql('Name')
        should(sheet.D44.v).be.eql('Lastname')
        should(sheet.E44.v).be.eql('Age')
        should(sheet.C45.v).be.eql(items[1].name)
        should(sheet.D45.v).be.eql(items[1].lastname)
        should(sheet.E45.v).be.eql(items[1].age)

        should(sheet.C49.v).be.eql('Name')
        should(sheet.D49.v).be.eql('Lastname')
        should(sheet.E49.v).be.eql('Age')
        should(sheet.C50.v).be.eql(items[2].name)
        should(sheet.D50.v).be.eql(items[2].lastname)
        should(sheet.E50.v).be.eql(items[2].age)
      }
    })

    it(`${mode} loop should update dimension information in sheet after loop`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet['!ref']).be.eql(`C2:E${2 + items.length}`)
      } else {
        should(sheet['!ref']).be.eql(`B2:E${1 + (5 * items.length)}`)
      }
    })

    it(`${mode} loop update existing merged cells after loop`, async () => {
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
                path.join(xlsxDirPath, `update-merged-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.B1.v).be.eql('merged')
        should(mergeCellExists(sheet, 'B1:C1')).be.True()
        should(sheet.B7.v).be.eql('merged2')
        should(mergeCellExists(sheet, 'B7:C7')).be.True()
        should(sheet.E7.v).be.eql('merged3')
        should(mergeCellExists(sheet, 'E7:G7')).be.True()
      } else {
        should(sheet.B1.v).be.eql('merged')
        should(mergeCellExists(sheet, 'B1:C1')).be.True()
        should(sheet.B18.v).be.eql('merged2')
        should(mergeCellExists(sheet, 'B18:C18')).be.True()
        should(sheet.E18.v).be.eql('merged3')
        should(mergeCellExists(sheet, 'E18:G18')).be.True()
      }
    })

    it(`${mode} loop not update existing merged cells after loop if array have 0 items`, async () => {
      const items = []

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `update-merged-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.B1.v).be.eql('merged')
        should(mergeCellExists(sheet, 'B1:C1')).be.True()
        should(sheet.B5.v).be.eql('merged2')
        should(mergeCellExists(sheet, 'B5:C5')).be.True()
        should(sheet.E5.v).be.eql('merged3')
        should(mergeCellExists(sheet, 'E5:G5')).be.True()
      } else {
        should(sheet.B1.v).be.eql('merged')
        should(mergeCellExists(sheet, 'B1:C1')).be.True()
        should(sheet.B8.v).be.eql('merged2')
        should(mergeCellExists(sheet, 'B8:C8')).be.True()
        should(sheet.E8.v).be.eql('merged3')
        should(mergeCellExists(sheet, 'E8:G8')).be.True()
      }
    })

    it(`${mode} loop not update existing merged cells after loop if array have 1 item`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `update-merged-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.B1.v).be.eql('merged')
        should(mergeCellExists(sheet, 'B1:C1')).be.True()
        should(sheet.B5.v).be.eql('merged2')
        should(mergeCellExists(sheet, 'B5:C5')).be.True()
        should(sheet.E5.v).be.eql('merged3')
        should(mergeCellExists(sheet, 'E5:G5')).be.True()
      } else {
        should(sheet.B1.v).be.eql('merged')
        should(mergeCellExists(sheet, 'B1:C1')).be.True()
        should(sheet.B8.v).be.eql('merged2')
        should(mergeCellExists(sheet, 'B8:C8')).be.True()
        should(sheet.E8.v).be.eql('merged3')
        should(mergeCellExists(sheet, 'E8:G8')).be.True()
      }
    })

    it(`${mode} loop create new merged cells from loop`, async () => {
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
                path.join(xlsxDirPath, `new-merged-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.F2.v).be.eql('Age')
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.F3.v).be.eql(items[0].age)
        should(mergeCellExists(sheet, 'D3:E3')).be.True()
        should(sheet.C4.v).be.eql(items[1].name)
        should(sheet.D4.v).be.eql(items[1].lastname)
        should(sheet.F4.v).be.eql(items[1].age)
        should(mergeCellExists(sheet, 'D4:E4')).be.True()
        should(sheet.C5.v).be.eql(items[2].name)
        should(sheet.D5.v).be.eql(items[2].lastname)
        should(sheet.F5.v).be.eql(items[2].age)
        should(mergeCellExists(sheet, 'D5:E5')).be.True()
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.F3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.F4.v).be.eql(items[0].age)
        should(mergeCellExists(sheet, 'D4:E4')).be.True()

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.F8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.F9.v).be.eql(items[1].age)
        should(mergeCellExists(sheet, 'D9:E9')).be.True()

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.F13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.F14.v).be.eql(items[2].age)
        should(mergeCellExists(sheet, 'D14:E14')).be.True()
      }
    })

    it(`${mode} loop create new multiple merged cells from loop`, async () => {
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
                path.join(xlsxDirPath, `new-multiple-merged-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.F2.v).be.eql('Job')
        should(sheet.H2.v).be.eql('Age')
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.F3.v).be.eql(items[0].job)
        should(sheet.H3.v).be.eql(items[0].age)
        should(mergeCellExists(sheet, 'D3:E3')).be.True()
        should(mergeCellExists(sheet, 'F3:G3')).be.True()
        should(sheet.C4.v).be.eql(items[1].name)
        should(sheet.D4.v).be.eql(items[1].lastname)
        should(sheet.F4.v).be.eql(items[1].job)
        should(sheet.H4.v).be.eql(items[1].age)
        should(mergeCellExists(sheet, 'D4:E4')).be.True()
        should(mergeCellExists(sheet, 'F4:G4')).be.True()
        should(sheet.C5.v).be.eql(items[2].name)
        should(sheet.D5.v).be.eql(items[2].lastname)
        should(sheet.F5.v).be.eql(items[2].job)
        should(sheet.H5.v).be.eql(items[2].age)
        should(mergeCellExists(sheet, 'D5:E5')).be.True()
        should(mergeCellExists(sheet, 'F5:G5')).be.True()
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.F3.v).be.eql('Job')
        should(sheet.H3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.F4.v).be.eql(items[0].job)
        should(sheet.H4.v).be.eql(items[0].age)
        should(mergeCellExists(sheet, 'D4:E4')).be.True()
        should(mergeCellExists(sheet, 'F4:G4')).be.True()

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.F8.v).be.eql('Job')
        should(sheet.H8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.F9.v).be.eql(items[1].job)
        should(sheet.H9.v).be.eql(items[1].age)
        should(mergeCellExists(sheet, 'D9:E9')).be.True()
        should(mergeCellExists(sheet, 'F9:G9')).be.True()

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.F13.v).be.eql('Job')
        should(sheet.H13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.F14.v).be.eql(items[2].job)
        should(sheet.H14.v).be.eql(items[2].age)
        should(mergeCellExists(sheet, 'D14:E14')).be.True()
        should(mergeCellExists(sheet, 'F14:G14')).be.True()
      }
    })

    it(`${mode} create new merged cells from loop and update existing`, async () => {
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
                path.join(xlsxDirPath, `merged-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(mergeCellExists(sheet, 'B1:C1')).be.True()
        should(sheet.B1.v).be.eql('merged')

        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.F2.v).be.eql('Age')

        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.F3.v).be.eql(items[0].age)
        should(mergeCellExists(sheet, 'D3:E3')).be.True()
        should(sheet.C4.v).be.eql(items[1].name)
        should(sheet.D4.v).be.eql(items[1].lastname)
        should(sheet.F4.v).be.eql(items[1].age)
        should(mergeCellExists(sheet, 'D4:E4')).be.True()
        should(sheet.C5.v).be.eql(items[2].name)
        should(sheet.D5.v).be.eql(items[2].lastname)
        should(sheet.F5.v).be.eql(items[2].age)
        should(mergeCellExists(sheet, 'D5:E5')).be.True()

        should(sheet.B7.v).be.eql('merged2')
        should(mergeCellExists(sheet, 'B7:C7')).be.True()
        should(sheet.E7.v).be.eql('merged3')
        should(mergeCellExists(sheet, 'E7:G7')).be.True()
      } else {
        should(sheet.B1.v).be.eql('merged')
        should(mergeCellExists(sheet, 'B1:C1')).be.True()

        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.F3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.F4.v).be.eql(items[0].age)
        should(mergeCellExists(sheet, 'D4:E4')).be.True()

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.F8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.F9.v).be.eql(items[1].age)
        should(mergeCellExists(sheet, 'D9:E9')).be.True()

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.F13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.F14.v).be.eql(items[2].age)
        should(mergeCellExists(sheet, 'D14:E14')).be.True()

        should(sheet.B18.v).be.eql('merged2')
        should(mergeCellExists(sheet, 'B18:C18')).be.True()
        should(sheet.E18.v).be.eql('merged3')
        should(mergeCellExists(sheet, 'E18:G18')).be.True()
      }
    })

    it(`${mode} should not create new merged cells from loop and not update existing if array have 0 items`, async () => {
      const items = []

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `merged-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(mergeCellExists(sheet, 'B1:C1')).be.True()
        should(sheet.B1.v).be.eql('merged')

        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.F2.v).be.eql('Age')

        should(sheet.C3.v).be.eql('')
        should(sheet.D3.v).be.eql('')
        should(sheet.F3.v).be.eql('')
        should(mergeCellExists(sheet, 'D3:E3')).be.True()

        should(sheet.B5.v).be.eql('merged2')
        should(mergeCellExists(sheet, 'B5:C5')).be.True()
        should(sheet.E5.v).be.eql('merged3')
        should(mergeCellExists(sheet, 'E5:G5')).be.True()
      } else {
        should(sheet.B1.v).be.eql('merged')
        should(mergeCellExists(sheet, 'B1:C1')).be.True()

        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.F3.v).be.eql('Age')
        should(sheet.C4.v).be.eql('')
        should(sheet.D4.v).be.eql('')
        should(sheet.F4.v).be.eql('')
        should(mergeCellExists(sheet, 'D4:E4')).be.True()

        should(sheet.B8.v).be.eql('merged2')
        should(mergeCellExists(sheet, 'B8:C8')).be.True()
        should(sheet.E8.v).be.eql('merged3')
        should(mergeCellExists(sheet, 'E8:G8')).be.True()
      }
    })

    it(`${mode} should not create new merged cells from loop and not update existing if array have 1 item`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `merged-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(mergeCellExists(sheet, 'B1:C1')).be.True()
        should(sheet.B1.v).be.eql('merged')

        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.F2.v).be.eql('Age')

        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.F3.v).be.eql(items[0].age)
        should(mergeCellExists(sheet, 'D3:E3')).be.True()

        should(sheet.B5.v).be.eql('merged2')
        should(mergeCellExists(sheet, 'B5:C5')).be.True()
        should(sheet.E5.v).be.eql('merged3')
        should(mergeCellExists(sheet, 'E5:G5')).be.True()
      } else {
        should(sheet.B1.v).be.eql('merged')
        should(mergeCellExists(sheet, 'B1:C1')).be.True()

        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.F3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.F4.v).be.eql(items[0].age)
        should(mergeCellExists(sheet, 'D4:E4')).be.True()

        should(sheet.B8.v).be.eql('merged2')
        should(mergeCellExists(sheet, 'B8:C8')).be.True()
        should(sheet.E8.v).be.eql('merged3')
        should(mergeCellExists(sheet, 'E8:G8')).be.True()
      }
    })

    it(`${mode} loop should preserve the content of merged cells that are not in the loop (left) but in the same row`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-left-merge-cell-preserve.xlsx`)
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

      if (mode === 'row') {
        should(sheet.F2.v).be.eql('Name')
        should(sheet.G2.v).be.eql('Lastname')
        should(sheet.H2.v).be.eql('Age')

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
      } else {
        should(sheet.F2.v).be.eql('')
        should(sheet.F6.v).be.eql('')

        should(sheet.G3.v).be.eql('Name')
        should(sheet.H3.v).be.eql('Lastname')
        should(sheet.I3.v).be.eql('Age')
        should(sheet.G4.v).be.eql(items[0].name)
        should(sheet.H4.v).be.eql(items[0].lastname)
        should(sheet.I4.v).be.eql(items[0].age)
        should(sheet.A2.v).be.eql('preserve')
        should(mergeCellExists(sheet, 'A2:B2')).be.True()
        should(sheet.D2.v).be.eql('preserve2')
        should(mergeCellExists(sheet, 'D2:E2')).be.True()

        should(sheet.G8.v).be.eql('Name')
        should(sheet.H8.v).be.eql('Lastname')
        should(sheet.I8.v).be.eql('Age')
        should(sheet.G9.v).be.eql(items[1].name)
        should(sheet.H9.v).be.eql(items[1].lastname)
        should(sheet.I9.v).be.eql(items[1].age)
        should(sheet.A7).be.not.ok()
        should(mergeCellExists(sheet, 'A7:B7')).be.False()
        should(sheet.D7).be.not.ok()
        should(mergeCellExists(sheet, 'D7:E7')).be.False()

        should(sheet.G13.v).be.eql('Name')
        should(sheet.H13.v).be.eql('Lastname')
        should(sheet.I13.v).be.eql('Age')
        should(sheet.G14.v).be.eql(items[2].name)
        should(sheet.H14.v).be.eql(items[2].lastname)
        should(sheet.I14.v).be.eql(items[2].age)
        should(sheet.A12).be.not.ok()
        should(mergeCellExists(sheet, 'A12:B12')).be.False()
        should(sheet.D12).be.not.ok()
        should(mergeCellExists(sheet, 'D12:E12')).be.False()

        should(sheet['!merges']).have.length(2)
      }
    })

    it(`${mode} loop should preserve the content of merged cells that are not in the loop (right) but in the same row`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-right-merge-cell-preserve.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C2.v).be.eql('Name')
        should(sheet.D2.v).be.eql('Lastname')
        should(sheet.E2.v).be.eql('Age')

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
      } else {
        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.D6).be.not.ok()
        should(mergeCellExists(sheet, 'D6:E6')).be.False()
        should(sheet.G6).be.not.ok()
        should(mergeCellExists(sheet, 'G6:H6')).be.False()

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)
        should(sheet.D11).be.not.ok()
        should(mergeCellExists(sheet, 'D11:E11')).be.False()
        should(sheet.G11).be.not.ok()
        should(mergeCellExists(sheet, 'G11:H11')).be.False()

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.E13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)
        should(sheet.D16.v).be.eql('preserve')
        should(mergeCellExists(sheet, 'D16:E16')).be.True()
        should(sheet.G16.v).be.eql('preserve2')
        should(mergeCellExists(sheet, 'G16:H16')).be.True()

        should(sheet['!merges']).have.length(2)
      }
    })

    it(`${mode} loop should preserve the content of merged cells that are not in the loop (left, right) but in the same row`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-left-right-merge-cell-preserve.xlsx`)
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

      if (mode === 'row') {
        should(sheet.F2.v).be.eql('Name')
        should(sheet.G2.v).be.eql('Lastname')
        should(sheet.H2.v).be.eql('Age')

        // preserving the cells on the left of the loop
        should(sheet.A3.v).be.eql('preserve')
        should(mergeCellExists(sheet, 'A3:B3')).be.True()
        should(sheet.D3.v).be.eql('preserve2')
        should(mergeCellExists(sheet, 'D3:E3')).be.True()
        should(sheet.F3.v).be.eql(items[0].name)
        should(sheet.G3.v).be.eql(items[0].lastname)
        should(sheet.H3.v).be.eql(items[0].age)
        should(sheet.I3.v).be.eql('preserve3')
        // preserving the cells on the right of the loop
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
      } else {
        should(sheet.F2.v).be.eql('')
        should(sheet.F6.v).be.eql('')

        should(sheet.G3.v).be.eql('Name')
        should(sheet.H3.v).be.eql('Lastname')
        should(sheet.I3.v).be.eql('Age')
        should(sheet.G4.v).be.eql(items[0].name)
        should(sheet.H4.v).be.eql(items[0].lastname)
        should(sheet.I4.v).be.eql(items[0].age)
        // preserving the cells on the left of the loop
        should(sheet.A2.v).be.eql('preserve')
        should(mergeCellExists(sheet, 'A2:B2')).be.True()
        should(sheet.D2.v).be.eql('preserve2')
        should(mergeCellExists(sheet, 'D2:E2')).be.True()
        should(sheet.H6).be.not.ok()
        should(mergeCellExists(sheet, 'H6:I6')).be.False()
        should(sheet.K6).be.not.ok()
        should(mergeCellExists(sheet, 'K6:L6')).be.False()

        should(sheet.G8.v).be.eql('Name')
        should(sheet.H8.v).be.eql('Lastname')
        should(sheet.I8.v).be.eql('Age')
        should(sheet.G9.v).be.eql(items[1].name)
        should(sheet.H9.v).be.eql(items[1].lastname)
        should(sheet.I9.v).be.eql(items[1].age)
        should(sheet.A7).be.not.ok()
        should(mergeCellExists(sheet, 'A7:B7')).be.False()
        should(sheet.D7).be.not.ok()
        should(mergeCellExists(sheet, 'D7:E7')).be.False()
        should(sheet.H11).be.not.ok()
        should(mergeCellExists(sheet, 'H11:I11')).be.False()
        should(sheet.K11).be.not.ok()
        should(mergeCellExists(sheet, 'K11:L11')).be.False()

        should(sheet.G13.v).be.eql('Name')
        should(sheet.H13.v).be.eql('Lastname')
        should(sheet.I13.v).be.eql('Age')
        should(sheet.G14.v).be.eql(items[2].name)
        should(sheet.H14.v).be.eql(items[2].lastname)
        should(sheet.I14.v).be.eql(items[2].age)
        should(sheet.A12).be.not.ok()
        should(mergeCellExists(sheet, 'A12:B12')).be.False()
        should(sheet.D12).be.not.ok()
        should(mergeCellExists(sheet, 'D12:E12')).be.False()
        // preserving the cells on the right of the loop
        should(sheet.H16.v).be.eql('preserve3')
        should(mergeCellExists(sheet, 'H16:I16')).be.True()
        should(sheet.K16.v).be.eql('preserve4')
        should(mergeCellExists(sheet, 'K16:L16')).be.True()

        should(sheet['!merges']).have.length(4)
      }
    })

    // TODO: add tests (start/end) when just one part (or even all the parts surpasses the loop edges)
    // of vertical merged cell is part of block/row loop
    it.skip(`${mode} loop vertical merged cells from loop only matches partially (from start)`, async () => {
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
                path.join(xlsxDirPath, 'partial-start-vertical-merged-cells-loop-multiple-rows.xlsx')
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

      // should(sheet.C3.v).be.eql('Name')
      // should(sheet.D3.v).be.eql('Lastname')
      // should(sheet.E3.v).be.eql('Age')
      // should(sheet.C4.v).be.eql(items[0].name)
      // should(sheet.D4.v).be.eql(items[0].lastname)
      // should(sheet.E4.v).be.eql(items[0].age)
      // should(mergeCellExists(sheet, 'D4:D5')).be.True()

      // should(sheet.C8.v).be.eql('Name')
      // should(sheet.D8.v).be.eql('Lastname')
      // should(sheet.E8.v).be.eql('Age')
      // should(sheet.C9.v).be.eql(items[1].name)
      // should(sheet.D9.v).be.eql(items[1].lastname)
      // should(sheet.E9.v).be.eql(items[1].age)
      // should(mergeCellExists(sheet, 'D9:D10')).be.True()

      // should(sheet.C13.v).be.eql('Name')
      // should(sheet.D13.v).be.eql('Lastname')
      // should(sheet.E13.v).be.eql('Age')
      // should(sheet.C14.v).be.eql(items[2].name)
      // should(sheet.D14.v).be.eql(items[2].lastname)
      // should(sheet.E14.v).be.eql(items[2].age)
      // should(mergeCellExists(sheet, 'D14:D15')).be.True()
    })

    if (mode === 'block') {
      it(`${mode} loop create new vertical merged cells from loop`, async () => {
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
                  path.join(xlsxDirPath, 'new-vertical-merged-cells-loop-multiple-rows.xlsx')
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
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(mergeCellExists(sheet, 'D4:D5')).be.True()

        should(sheet.C8.v).be.eql('Name')
        should(sheet.D8.v).be.eql('Lastname')
        should(sheet.E8.v).be.eql('Age')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)
        should(mergeCellExists(sheet, 'D9:D10')).be.True()

        should(sheet.C13.v).be.eql('Name')
        should(sheet.D13.v).be.eql('Lastname')
        should(sheet.E13.v).be.eql('Age')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)
        should(mergeCellExists(sheet, 'D14:D15')).be.True()
      })
    }

    it(`${mode} loop should generate workbook with full recalculation of formulas on load`, async () => {
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
                path.join(xlsxDirPath, `update-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.E5?.f).be.not.ok()
        should(sheet.E6?.f).be.not.ok()
        should(sheet.E7?.f).be.not.ok()
        should(sheet.E8?.f).be.not.ok()
        should(sheet.E9.f).be.eql('SUM(E7:E8)')
        should(sheet.E10.f).be.eql('AVERAGE(E7:E8)')
        should(sheet.E11?.f).be.not.ok()
      } else {
        should(sheet.E8?.f).be.not.ok()
        should(sheet.E9?.f).be.not.ok()
        should(sheet.E10?.f).be.not.ok()
        should(sheet.E11?.f).be.not.ok()
        should(sheet.E20.f).be.eql('SUM(E18:E19)')
        should(sheet.E21.f).be.eql('AVERAGE(E18:E19)')
        should(sheet.E22?.f).be.not.ok()
      }
    })

    it(`${mode} loop update existing formulas after loop`, async () => {
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
                path.join(xlsxDirPath, `update-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.E5?.f).be.not.ok()
        should(sheet.E6?.f).be.not.ok()
        should(sheet.E7?.f).be.not.ok()
        should(sheet.E8?.f).be.not.ok()
        should(sheet.E9.f).be.eql('SUM(E7:E8)')
        should(sheet.E10.f).be.eql('AVERAGE(E7:E8)')
        should(sheet.E11?.f).be.not.ok()
      } else {
        should(sheet.E8?.f).be.not.ok()
        should(sheet.E9?.f).be.not.ok()
        should(sheet.E10?.f).be.not.ok()
        should(sheet.E11?.f).be.not.ok()
        should(sheet.E20.f).be.eql('SUM(E18:E19)')
        should(sheet.E21.f).be.eql('AVERAGE(E18:E19)')
        should(sheet.E22?.f).be.not.ok()
      }
    })

    it(`${mode} loop not update existing formulas after loop if array have 0 items`, async () => {
      const items = []

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `update-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.E5.v).be.ok()
        should(sheet.E6.v).be.ok()
        should(sheet.E7.f).be.eql('SUM(E5:E6)')
        should(sheet.E8.f).be.eql('AVERAGE(E5:E6)')
      } else {
        should(sheet.E8.v).be.ok()
        should(sheet.E9.v).be.ok()
        should(sheet.E10.f).be.eql('SUM(E8:E9)')
        should(sheet.E11.f).be.eql('AVERAGE(E8:E9)')
      }
    })

    it(`${mode} loop not update existing formulas after loop if array have 1 item`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `update-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.E5.v).be.ok()
        should(sheet.E6.v).be.ok()
        should(sheet.E7.f).be.eql('SUM(E5:E6)')
        should(sheet.E8.f).be.eql('AVERAGE(E5:E6)')
      } else {
        should(sheet.E8.v).be.ok()
        should(sheet.E9.v).be.ok()
        should(sheet.E10.f).be.eql('SUM(E8:E9)')
        should(sheet.E11.f).be.eql('AVERAGE(E8:E9)')
      }
    })

    it(`${mode} loop update calcChain info of formulas after loop`, async () => {
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
                path.join(xlsxDirPath, `update-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(cellExists('E5', cellEls)).be.False()
        should(cellExists('E6', cellEls)).be.False()
        should(cellExists('E7', cellEls)).be.False()
        should(cellExists('E8', cellEls)).be.False()
        should(cellExists('E9', cellEls)).be.True()
        should(cellExists('E10', cellEls)).be.True()
        should(cellExists('E11', cellEls)).be.False()
        should(cellEls).have.length(2)
      } else {
        should(cellExists('E8', cellEls)).be.False()
        should(cellExists('E9', cellEls)).be.False()
        should(cellExists('E10', cellEls)).be.False()
        should(cellExists('E11', cellEls)).be.False()
        should(cellExists('E20', cellEls)).be.True()
        should(cellExists('E21', cellEls)).be.True()
        should(cellExists('E22', cellEls)).be.False()
      }
    })

    it(`${mode} loop update existing formulas after loop (formula start in loop and formula end points to one cell bellow loop)`, async () => {
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
                path.join(xlsxDirPath, `update-formula-cells-(end-bellow)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.E5?.f).be.not.ok()
        should(sheet.E6?.f).be.not.ok()
        should(sheet.E7.f).be.eql('SUM(E3:E6)')
        should(sheet.E8.f).be.eql('AVERAGE(E3:E6)')
        should(sheet.E9.f).be.eql('MIN(E3:E6)')
        should(sheet.E10.f).be.eql('MAX(E3:E6)')
        should(sheet.E11.f).be.eql('SUM(E9,E10)')
      } else {
        should(sheet.E8?.f).be.not.ok()
        should(sheet.E9?.f).be.not.ok()
        should(sheet.E10?.f).be.not.ok()
        should(sheet.E11?.f).be.not.ok()
        should(sheet.E12?.f).be.not.ok()
        should(sheet.E18.f).be.eql('SUM(E4:E17)')
        should(sheet.E19.f).be.eql('AVERAGE(E4:E17)')
        should(sheet.E20.f).be.eql('MIN(E4:E17)')
        should(sheet.E21.f).be.eql('MAX(E4:E17)')
        should(sheet.E22.f).be.eql('SUM(E20,E21)')
      }
    })

    it(`${mode} loop not update existing formulas after loop (formula start in loop and formula end points to one cell bellow loop) if array have 0 items`, async () => {
      const items = []

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `update-formula-cells-(end-bellow)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.E5.f).be.eql('SUM(E3:E4)')
        should(sheet.E6.f).be.eql('AVERAGE(E3:E4)')
        should(sheet.E7.f).be.eql('MIN(E3:E4)')
        should(sheet.E8.f).be.eql('MAX(E3:E4)')
        should(sheet.E9.f).be.eql('SUM(E7,E8)')
      } else {
        should(sheet.E8.f).be.eql('SUM(E4:E7)')
        should(sheet.E9.f).be.eql('AVERAGE(E4:E7)')
        should(sheet.E10.f).be.eql('MIN(E4:E7)')
        should(sheet.E11.f).be.eql('MAX(E4:E7)')
        should(sheet.E12.f).be.eql('SUM(E10,E11)')
      }
    })

    it(`${mode} loop not update existing formulas after loop (formula start in loop and formula end points to one cell bellow loop) if array have 1 item`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `update-formula-cells-(end-bellow)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.E5.f).be.eql('SUM(E3:E4)')
        should(sheet.E6.f).be.eql('AVERAGE(E3:E4)')
        should(sheet.E7.f).be.eql('MIN(E3:E4)')
        should(sheet.E8.f).be.eql('MAX(E3:E4)')
        should(sheet.E9.f).be.eql('SUM(E7,E8)')
      } else {
        should(sheet.E8.f).be.eql('SUM(E4:E7)')
        should(sheet.E9.f).be.eql('AVERAGE(E4:E7)')
        should(sheet.E10.f).be.eql('MIN(E4:E7)')
        should(sheet.E11.f).be.eql('MAX(E4:E7)')
        should(sheet.E12.f).be.eql('SUM(E10,E11)')
      }
    })

    it(`${mode} loop update calcChain info of formulas after loop (formula start in loop and formula end points to one cell bellow loop)`, async () => {
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
                path.join(xlsxDirPath, `update-formula-cells-(end-bellow)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(cellExists('E5', cellEls)).be.False()
        should(cellExists('E6', cellEls)).be.False()
        should(cellExists('E7', cellEls)).be.True()
        should(cellExists('E8', cellEls)).be.True()
        should(cellExists('E9', cellEls)).be.True()
        should(cellExists('E10', cellEls)).be.True()
        should(cellExists('E11', cellEls)).be.True()
        should(cellExists('E12', cellEls)).be.False()
        should(cellEls).have.length(5)
      } else {
        should(cellExists('E8', cellEls)).be.False()
        should(cellExists('E9', cellEls)).be.False()
        should(cellExists('E10', cellEls)).be.False()
        should(cellExists('E11', cellEls)).be.False()
        should(cellExists('E12', cellEls)).be.False()
        should(cellExists('E18', cellEls)).be.True()
        should(cellExists('E19', cellEls)).be.True()
        should(cellExists('E20', cellEls)).be.True()
        should(cellExists('E21', cellEls)).be.True()
        should(cellExists('E22', cellEls)).be.True()
        should(cellEls).have.length(5)
      }
    })

    it(`${mode} loop update existing formulas after loop (formula start and end points to cell in loop)`, async () => {
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
                path.join(xlsxDirPath, `update-formula-cells-(inside)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.E5?.f).be.not.ok()
        should(sheet.E6?.f).be.not.ok()
        should(sheet.E7.f).be.eql('SUM(E3:E5)')
        should(sheet.E8.f).be.eql('AVERAGE(E3:E5)')
        should(sheet.E9.f).be.eql('MIN(E3:E5)')
        should(sheet.E10.f).be.eql('MAX(E3:E5)')
        should(sheet.E11.f).be.eql('SUM(E9,E10)')
      } else {
        should(sheet.E8?.f).be.not.ok()
        should(sheet.E9?.f).be.not.ok()
        should(sheet.E10?.f).be.not.ok()
        should(sheet.E11?.f).be.not.ok()
        should(sheet.E12?.f).be.not.ok()
        should(sheet.E18.f).be.eql('SUM(E4:E14)')
        should(sheet.E19.f).be.eql('AVERAGE(E4:E15)')
        should(sheet.E20.f).be.eql('MIN(E4:E14)')
        should(sheet.E21.f).be.eql('MAX(E4:E14)')
        should(sheet.E22.f).be.eql('SUM(E20,E21)')
      }
    })

    it(`${mode} loop not update existing formulas after loop (formula start and end points to cell in loop) if array have 0 items`, async () => {
      const items = []

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `update-formula-cells-(inside)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.E5.f).be.eql('SUM(E3:E3)')
        should(sheet.E6.f).be.eql('AVERAGE(E3:E3)')
        should(sheet.E7.f).be.eql('MIN(E3:E3)')
        should(sheet.E8.f).be.eql('MAX(E3:E3)')
        should(sheet.E9.f).be.eql('SUM(E7,E8)')
      } else {
        should(sheet.E8.f).be.eql('SUM(E4:E4)')
        should(sheet.E9.f).be.eql('AVERAGE(E4:E5)')
        should(sheet.E10.f).be.eql('MIN(E4:E4)')
        should(sheet.E11.f).be.eql('MAX(E4:E4)')
        should(sheet.E12.f).be.eql('SUM(E10,E11)')
      }
    })

    it(`${mode} loop not update existing formulas after loop (formula start and end points to cell in loop) if array have 1 item`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `update-formula-cells-(inside)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.E5.f).be.eql('SUM(E3:E3)')
        should(sheet.E6.f).be.eql('AVERAGE(E3:E3)')
        should(sheet.E7.f).be.eql('MIN(E3:E3)')
        should(sheet.E8.f).be.eql('MAX(E3:E3)')
        should(sheet.E9.f).be.eql('SUM(E7,E8)')
      } else {
        should(sheet.E8.f).be.eql('SUM(E4:E4)')
        should(sheet.E9.f).be.eql('AVERAGE(E4:E5)')
        should(sheet.E10.f).be.eql('MIN(E4:E4)')
        should(sheet.E11.f).be.eql('MAX(E4:E4)')
        should(sheet.E12.f).be.eql('SUM(E10,E11)')
      }
    })

    it(`${mode} loop update calcChain info of formulas after loop (formula start and end points to cell in loop)`, async () => {
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
                path.join(xlsxDirPath, `update-formula-cells-(inside)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(cellExists('E5', cellEls)).be.False()
        should(cellExists('E6', cellEls)).be.False()
        should(cellExists('E7', cellEls)).be.True()
        should(cellExists('E8', cellEls)).be.True()
        should(cellExists('E9', cellEls)).be.True()
        should(cellExists('E10', cellEls)).be.True()
        should(cellExists('E11', cellEls)).be.True()
        should(cellExists('E12', cellEls)).be.False()
        should(cellEls).have.length(5)
      } else {
        should(cellExists('E8', cellEls)).be.False()
        should(cellExists('E9', cellEls)).be.False()
        should(cellExists('E10', cellEls)).be.False()
        should(cellExists('E11', cellEls)).be.False()
        should(cellExists('E12', cellEls)).be.False()
        should(cellExists('E18', cellEls)).be.True()
        should(cellExists('E19', cellEls)).be.True()
        should(cellExists('E20', cellEls)).be.True()
        should(cellExists('E21', cellEls)).be.True()
        should(cellExists('E22', cellEls)).be.True()
        should(cellEls).have.length(5)
      }
    })

    it(`${mode} loop create new formula cells from loop`, async () => {
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
                path.join(xlsxDirPath, `new-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
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
      } else {
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.F4.v).be.eql(items[0].rate)
        should(sheet.G4.v).be.eql(items[0].hours)
        should(sheet.H4.f).be.eql('F4*G4')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)
        should(sheet.F9.v).be.eql(items[1].rate)
        should(sheet.G9.v).be.eql(items[1].hours)
        should(sheet.H9.f).be.eql('F9*G9')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)
        should(sheet.F14.v).be.eql(items[2].rate)
        should(sheet.G14.v).be.eql(items[2].hours)
        should(sheet.H14.f).be.eql('F14*G14')
      }
    })

    it(`${mode} loop not create new formula cells from loop if array have 0 items`, async () => {
      const items = []

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `new-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C3.v).be.eql('')
        should(sheet.D3.v).be.eql('')
        should(sheet.E3.v).be.eql('')
        should(sheet.F3.v).be.eql('')
        should(sheet.G3.v).be.eql('')
        should(sheet.H3.f).be.eql('F3*G3')
        should(sheet.C4).be.not.ok()
        should(sheet.D4).be.not.ok()
        should(sheet.E4).be.not.ok()
        should(sheet.F4).be.not.ok()
        should(sheet.G4).be.not.ok()
        should(sheet.H4).be.not.ok()
      } else {
        should(sheet.C4.v).be.eql('')
        should(sheet.D4.v).be.eql('')
        should(sheet.E4.v).be.eql('')
        should(sheet.F4.v).be.eql('')
        should(sheet.G4.v).be.eql('')
        should(sheet.H4.f).be.eql('F4*G4')
      }
    })

    it(`${mode} loop not create new formula cells from loop if array have 1 item`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        age: 32,
        rate: 22,
        hours: 122
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `new-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].age)
        should(sheet.F3.v).be.eql(items[0].rate)
        should(sheet.G3.v).be.eql(items[0].hours)
        should(sheet.H3.f).be.eql('F3*G3')
        should(sheet.C4).be.not.ok()
        should(sheet.D4).be.not.ok()
        should(sheet.E4).be.not.ok()
        should(sheet.F4).be.not.ok()
        should(sheet.G4).be.not.ok()
        should(sheet.H4).be.not.ok()
      } else {
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.F4.v).be.eql(items[0].rate)
        should(sheet.G4.v).be.eql(items[0].hours)
        should(sheet.H4.f).be.eql('F4*G4')
      }
    })

    it(`${mode} loop update calcChain info of formulas after loop created new formula cells`, async () => {
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
                path.join(xlsxDirPath, `new-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(cellExists('H3', cellEls)).be.True()
        should(cellExists('H4', cellEls)).be.True()
        should(cellExists('H5', cellEls)).be.True()
        should(cellEls).have.length(3)
      } else {
        should(cellExists('H4', cellEls)).be.True()
        should(cellExists('H9', cellEls)).be.True()
        should(cellExists('H14', cellEls)).be.True()
        should(cellEls).have.length(3)
      }
    })

    if (mode === 'block') {
      it(`${mode} loop create new formula cells (vertical) from loop`, async () => {
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
                  path.join(xlsxDirPath, 'new-vertical-formula-cells-loop-multiple-rows.xlsx')
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

        should(sheet.D3.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.D5.v).be.eql(items[0].age)
        should(sheet.D6.v).be.eql(items[0].rate)
        should(sheet.D7.v).be.eql(items[0].hours)
        should(sheet.D8.f).be.eql('D6*D7')
        should(sheet.D12.v).be.eql(items[1].name)
        should(sheet.D13.v).be.eql(items[1].lastname)
        should(sheet.D14.v).be.eql(items[1].age)
        should(sheet.D15.v).be.eql(items[1].rate)
        should(sheet.D16.v).be.eql(items[1].hours)
        should(sheet.D17.f).be.eql('D15*D16')
        should(sheet.D21.v).be.eql(items[2].name)
        should(sheet.D22.v).be.eql(items[2].lastname)
        should(sheet.D23.v).be.eql(items[2].age)
        should(sheet.D24.v).be.eql(items[2].rate)
        should(sheet.D25.v).be.eql(items[2].hours)
        should(sheet.D26.f).be.eql('D24*D25')
      })

      it(`${mode} loop update calcChain info of formulas after loop created new formula cells (vertical)`, async () => {
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
                  path.join(xlsxDirPath, 'new-vertical-formula-cells-loop-multiple-rows.xlsx')
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

        should(cellExists('D8', cellEls)).be.True()
        should(cellExists('D17', cellEls)).be.True()
        should(cellExists('D26', cellEls)).be.True()
        should(cellEls).have.length(3)
      })
    }

    it(`${mode} loop create new multiple formula cells from loop`, async () => {
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
                path.join(xlsxDirPath, `new-multiple-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
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
      } else {
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.F4.v).be.eql(items[0].rate)
        should(sheet.G4.v).be.eql(items[0].hours)
        should(sheet.H4.f).be.eql('F4*G4')
        should(sheet.I4.f).be.eql('H4*100')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)
        should(sheet.F9.v).be.eql(items[1].rate)
        should(sheet.G9.v).be.eql(items[1].hours)
        should(sheet.H9.f).be.eql('F9*G9')
        should(sheet.I9.f).be.eql('H9*100')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)
        should(sheet.F14.v).be.eql(items[2].rate)
        should(sheet.G14.v).be.eql(items[2].hours)
        should(sheet.H14.f).be.eql('F14*G14')
        should(sheet.I14.f).be.eql('H14*100')
      }
    })

    it(`${mode} loop not create new multiple formula cells from loop if array have 0 items`, async () => {
      const items = []

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `new-multiple-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C3.v).be.eql('')
        should(sheet.D3.v).be.eql('')
        should(sheet.E3.v).be.eql('')
        should(sheet.F3.v).be.eql('')
        should(sheet.G3.v).be.eql('')
        should(sheet.H3.f).be.eql('F3*G3')
        should(sheet.I3.f).be.eql('H3*100')
        should(sheet.C4).be.not.ok()
        should(sheet.D4).be.not.ok()
        should(sheet.E4).be.not.ok()
        should(sheet.F4).be.not.ok()
        should(sheet.G4).be.not.ok()
        should(sheet.H4).be.not.ok()
        should(sheet.I4).be.not.ok()
      } else {
        should(sheet.C4.v).be.eql('')
        should(sheet.D4.v).be.eql('')
        should(sheet.E4.v).be.eql('')
        should(sheet.F4.v).be.eql('')
        should(sheet.G4.v).be.eql('')
        should(sheet.H4.f).be.eql('F4*G4')
        should(sheet.I4.f).be.eql('H4*100')
      }
    })

    it(`${mode} loop not create new multiple formula cells from loop if array have 1 item`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        age: 32,
        rate: 22,
        hours: 122
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `new-multiple-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].age)
        should(sheet.F3.v).be.eql(items[0].rate)
        should(sheet.G3.v).be.eql(items[0].hours)
        should(sheet.H3.f).be.eql('F3*G3')
        should(sheet.I3.f).be.eql('H3*100')
        should(sheet.C4).be.not.ok()
        should(sheet.D4).be.not.ok()
        should(sheet.E4).be.not.ok()
        should(sheet.F4).be.not.ok()
        should(sheet.G4).be.not.ok()
        should(sheet.H4).be.not.ok()
        should(sheet.I4).be.not.ok()
      } else {
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.F4.v).be.eql(items[0].rate)
        should(sheet.G4.v).be.eql(items[0].hours)
        should(sheet.H4.f).be.eql('F4*G4')
        should(sheet.I4.f).be.eql('H4*100')
      }
    })

    it(`${mode} loop update calcChain info of formulas after loop created new multiple formula cells`, async () => {
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
                path.join(xlsxDirPath, `new-multiple-formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(cellExists('H3', cellEls)).be.True()
        should(cellExists('I3', cellEls)).be.True()
        should(cellExists('H4', cellEls)).be.True()
        should(cellExists('I4', cellEls)).be.True()
        should(cellExists('H5', cellEls)).be.True()
        should(cellExists('I5', cellEls)).be.True()
        should(cellEls).have.length(6)
      } else {
        should(cellExists('H4', cellEls)).be.True()
        should(cellExists('I4', cellEls)).be.True()
        should(cellExists('H9', cellEls)).be.True()
        should(cellExists('I9', cellEls)).be.True()
        should(cellExists('H14', cellEls)).be.True()
        should(cellExists('I14', cellEls)).be.True()
        should(cellEls).have.length(6)
      }
    })

    it(`${mode} loop create new formula cells from loop (increment range)`, async () => {
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
                path.join(xlsxDirPath, `new-formula-cells-(range)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
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
      } else {
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.F4.v).be.eql(items[0].rate)
        should(sheet.G4.v).be.eql(items[0].hours)
        should(sheet.H4.f).be.eql('SUM(F4:G4)')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)
        should(sheet.F9.v).be.eql(items[1].rate)
        should(sheet.G9.v).be.eql(items[1].hours)
        should(sheet.H9.f).be.eql('SUM(F9:G9)')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)
        should(sheet.F14.v).be.eql(items[2].rate)
        should(sheet.G14.v).be.eql(items[2].hours)
        should(sheet.H14.f).be.eql('SUM(F14:G14)')
      }
    })

    // TODO: add test for "loop create new formula cells from loop (increment range)" but
    // with the formula cell before the evaluated cells (Total | Rate | Hours)

    it(`${mode} loop not create new formula cells from loop (increment range) if array have 0 items`, async () => {
      const items = []

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `new-formula-cells-(range)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C3.v).be.eql('')
        should(sheet.D3.v).be.eql('')
        should(sheet.E3.v).be.eql('')
        should(sheet.F3.v).be.eql('')
        should(sheet.G3.v).be.eql('')
        should(sheet.H3.f).be.eql('SUM(F3:G3)')
        should(sheet.C4).not.be.ok()
        should(sheet.D4).not.be.ok()
        should(sheet.E4).not.be.ok()
        should(sheet.F4).not.be.ok()
        should(sheet.G4).not.be.ok()
        should(sheet.H4).not.be.ok()
      } else {
        should(sheet.C4.v).be.eql('')
        should(sheet.D4.v).be.eql('')
        should(sheet.E4.v).be.eql('')
        should(sheet.F4.v).be.eql('')
        should(sheet.G4.v).be.eql('')
        should(sheet.H4.f).be.eql('SUM(F4:G4)')
      }
    })

    it(`${mode} loop not create new formula cells from loop (increment range) if array have 1 item`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        age: 32,
        rate: 22,
        hours: 122
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `new-formula-cells-(range)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].age)
        should(sheet.F3.v).be.eql(items[0].rate)
        should(sheet.G3.v).be.eql(items[0].hours)
        should(sheet.H3.f).be.eql('SUM(F3:G3)')
        should(sheet.C4).not.be.ok()
        should(sheet.D4).not.be.ok()
        should(sheet.E4).not.be.ok()
        should(sheet.F4).not.be.ok()
        should(sheet.G4).not.be.ok()
        should(sheet.H4).not.be.ok()
      } else {
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.F4.v).be.eql(items[0].rate)
        should(sheet.G4.v).be.eql(items[0].hours)
        should(sheet.H4.f).be.eql('SUM(F4:G4)')
      }
    })

    it(`${mode} loop update calcChain info of formulas after loop created new formula cells (increment range)`, async () => {
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
                path.join(xlsxDirPath, `new-formula-cells-(range)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(cellExists('H3', cellEls)).be.True()
        should(cellExists('H4', cellEls)).be.True()
        should(cellExists('H5', cellEls)).be.True()
        should(cellEls).have.length(3)
      } else {
        should(cellExists('H4', cellEls)).be.True()
        should(cellExists('H9', cellEls)).be.True()
        should(cellExists('H14', cellEls)).be.True()
        should(cellEls).have.length(3)
      }
    })

    it(`${mode} loop create new formula cells from loop (increment standard cells but don't do it for cell using absolute reference for row $)`, async () => {
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
                path.join(xlsxDirPath, `new-formula-cells-(row-absolute-reference)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
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
      } else {
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.F4.v).be.eql(items[0].rate)
        should(sheet.G4.v).be.eql(items[0].hours)
        should(sheet.H4.f).be.eql('A$1*F4*G4')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)
        should(sheet.F9.v).be.eql(items[1].rate)
        should(sheet.G9.v).be.eql(items[1].hours)
        should(sheet.H9.f).be.eql('A$1*F9*G9')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)
        should(sheet.F14.v).be.eql(items[2].rate)
        should(sheet.G14.v).be.eql(items[2].hours)
        should(sheet.H14.f).be.eql('A$1*F14*G14')
      }
    })

    it(`${mode} loop not create new formula cells from loop (increment standard cells but don't do it for cell using absolute reference for row $) if array have 0 items`, async () => {
      const items = []

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `new-formula-cells-(row-absolute-reference)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C3.v).be.eql('')
        should(sheet.D3.v).be.eql('')
        should(sheet.E3.v).be.eql('')
        should(sheet.F3.v).be.eql('')
        should(sheet.G3.v).be.eql('')
        should(sheet.H3.f).be.eql('A$1*F3*G3')
        should(sheet.C4).not.be.ok()
        should(sheet.D4).not.be.ok()
        should(sheet.E4).not.be.ok()
        should(sheet.F4).not.be.ok()
        should(sheet.G4).not.be.ok()
        should(sheet.H4).not.be.ok()
      } else {
        should(sheet.C4.v).be.eql('')
        should(sheet.D4.v).be.eql('')
        should(sheet.E4.v).be.eql('')
        should(sheet.F4.v).be.eql('')
        should(sheet.G4.v).be.eql('')
        should(sheet.H4.f).be.eql('A$1*F4*G4')
      }
    })

    it(`${mode} loop not create new formula cells from loop (increment standard cells but don't do it for cell using absolute reference for row $) if array have 1 item`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        age: 32,
        rate: 22,
        hours: 122
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `new-formula-cells-(row-absolute-reference)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].age)
        should(sheet.F3.v).be.eql(items[0].rate)
        should(sheet.G3.v).be.eql(items[0].hours)
        should(sheet.H3.f).be.eql('A$1*F3*G3')
        should(sheet.C4).not.be.ok()
        should(sheet.D4).not.be.ok()
        should(sheet.E4).not.be.ok()
        should(sheet.F4).not.be.ok()
        should(sheet.G4).not.be.ok()
        should(sheet.H4).not.be.ok()
      } else {
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.F4.v).be.eql(items[0].rate)
        should(sheet.G4.v).be.eql(items[0].hours)
        should(sheet.H4.f).be.eql('A$1*F4*G4')
      }
    })

    // TODO: add more tests for formulas using absolute references (test formula that references a cell after loop, and also inside a loop)

    it(`${mode} loop update calcChain info of formulas after loop created new formula cells (increment standard cells but don't do it for cell using absolute reference $)`, async () => {
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
                path.join(xlsxDirPath, `new-formula-cells-(row-absolute-reference)-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(cellExists('H3', cellEls)).be.True()
        should(cellExists('H4', cellEls)).be.True()
        should(cellExists('H5', cellEls)).be.True()
        should(cellEls).have.length(3)
      } else {
        should(cellExists('H4', cellEls)).be.True()
        should(cellExists('H9', cellEls)).be.True()
        should(cellExists('H14', cellEls)).be.True()
        should(cellEls).have.length(3)
      }
    })

    it(`${mode} loop create new formula cells from loop and update existing`, async () => {
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
                path.join(xlsxDirPath, `formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
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
      } else {
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.F4.v).be.eql(items[0].rate)
        should(sheet.G4.v).be.eql(items[0].hours)
        should(sheet.H4.f).be.eql('F4*G4')
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)
        should(sheet.F9.v).be.eql(items[1].rate)
        should(sheet.G9.v).be.eql(items[1].hours)
        should(sheet.H9.f).be.eql('F9*G9')
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)
        should(sheet.F14.v).be.eql(items[2].rate)
        should(sheet.G14.v).be.eql(items[2].hours)
        should(sheet.H14.f).be.eql('F14*G14')

        should(sheet.E8?.f).be.not.ok()
        should(sheet.E9?.f).be.not.ok()
        should(sheet.E10?.f).be.not.ok()
        should(sheet.E11?.f).be.not.ok()
        should(sheet.E20.f).be.eql('SUM(E18:E19)')
        should(sheet.E21.f).be.eql('AVERAGE(E18:E19)')
        should(sheet.E22?.f).be.not.ok()
      }
    })

    it(`${mode} loop not create new formula cells from loop and not update existing if array have 0 items`, async () => {
      const items = []

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C3.v).be.eql('')
        should(sheet.D3.v).be.eql('')
        should(sheet.E3.v).be.eql('')
        should(sheet.F3.v).be.eql('')
        should(sheet.G3.v).be.eql('')
        should(sheet.H3.f).be.eql('F3*G3')
        should(sheet.C4).not.be.ok()
        should(sheet.D4).not.be.ok()
        should(sheet.E4).not.be.ok()
        should(sheet.F4).not.be.ok()
        should(sheet.G4).not.be.ok()
        should(sheet.H4).not.be.ok()

        should(sheet.E5).be.ok()
        should(sheet.E6).be.ok()
        should(sheet.E7.f).be.eql('SUM(E5:E6)')
        should(sheet.E8.f).be.eql('AVERAGE(E5:E6)')
      } else {
        should(sheet.C4.v).be.eql('')
        should(sheet.D4.v).be.eql('')
        should(sheet.E4.v).be.eql('')
        should(sheet.F4.v).be.eql('')
        should(sheet.G4.v).be.eql('')
        should(sheet.H4.f).be.eql('F4*G4')

        should(sheet.E8).be.ok()
        should(sheet.E9).be.ok()
        should(sheet.E10.f).be.eql('SUM(E8:E9)')
        should(sheet.E11.f).be.eql('AVERAGE(E8:E9)')
      }
    })

    it(`${mode} loop not create new formula cells from loop and not update existing if array have 1 item`, async () => {
      const items = [{
        name: 'Alexander',
        lastname: 'Smith',
        age: 32,
        rate: 22,
        hours: 122
      }]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].age)
        should(sheet.F3.v).be.eql(items[0].rate)
        should(sheet.G3.v).be.eql(items[0].hours)
        should(sheet.H3.f).be.eql('F3*G3')
        should(sheet.C4).not.be.ok()
        should(sheet.D4).not.be.ok()
        should(sheet.E4).not.be.ok()
        should(sheet.F4).not.be.ok()
        should(sheet.G4).not.be.ok()
        should(sheet.H4).not.be.ok()

        should(sheet.E5).be.ok()
        should(sheet.E6).be.ok()
        should(sheet.E7.f).be.eql('SUM(E5:E6)')
        should(sheet.E8.f).be.eql('AVERAGE(E5:E6)')
      } else {
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.F4.v).be.eql(items[0].rate)
        should(sheet.G4.v).be.eql(items[0].hours)
        should(sheet.H4.f).be.eql('F4*G4')

        should(sheet.E8).be.ok()
        should(sheet.E9).be.ok()
        should(sheet.E10.f).be.eql('SUM(E8:E9)')
        should(sheet.E11.f).be.eql('AVERAGE(E8:E9)')
      }
    })

    it(`${mode} loop update calcChain info of formulas after loop created new formula and updated existing cells`, async () => {
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
                path.join(xlsxDirPath, `formula-cells-${mode === 'row' ? 'loop' : 'loop-multiple-rows'}.xlsx`)
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

      if (mode === 'row') {
        should(cellExists('H3', cellEls)).be.True()
        should(cellExists('H4', cellEls)).be.True()
        should(cellExists('H5', cellEls)).be.True()
        should(cellExists('E9', cellEls)).be.True()
        should(cellExists('E10', cellEls)).be.True()
        should(cellEls).have.length(5)
      } else {
        should(cellExists('H4', cellEls)).be.True()
        should(cellExists('H9', cellEls)).be.True()
        should(cellExists('H14', cellEls)).be.True()
        should(cellExists('E20', cellEls)).be.True()
        should(cellExists('E21', cellEls)).be.True()
        should(cellEls).have.length(5)
      }
    })

    it(`${mode} loop should preserve the content of formula cells that are not in the loop (left) but in the same row`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-left-formula-cell-preserve.xlsx`)
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

      if (mode === 'row') {
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
      } else {
        // preserving the cells on the left of the loop
        should(sheet.A3.f).be.eql('A1*2')
        should(sheet.B3.f).be.eql('A1*3')
        should(sheet.D5.v).be.eql(items[0].name)
        should(sheet.E5.v).be.eql(items[0].lastname)
        should(sheet.F5.v).be.eql(items[0].age)
        should(sheet.A10).be.not.ok()
        should(sheet.B10).be.not.ok()
        should(sheet.D10.v).be.eql(items[1].name)
        should(sheet.E10.v).be.eql(items[1].lastname)
        should(sheet.F10.v).be.eql(items[1].age)
        should(sheet.A15).be.not.ok()
        should(sheet.B15).be.not.ok()
        should(sheet.D15.v).be.eql(items[2].name)
        should(sheet.E15.v).be.eql(items[2].lastname)
        should(sheet.F15.v).be.eql(items[2].age)
      }
    })

    it(`${mode} loop should preserve the content of formula cells that are not in the loop (right) but in the same row`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-right-formula-cell-preserve.xlsx`)
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

      if (mode === 'row') {
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
      } else {
        // preserving the cells on the right of the loop
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.C6).be.not.ok()
        should(sheet.D6).be.not.ok()
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.v).be.eql(items[1].age)
        should(sheet.C11).be.not.ok()
        should(sheet.D11).be.not.ok()
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.v).be.eql(items[2].age)
        should(sheet.C16.f).be.eql('A1*2')
        should(sheet.D16.f).be.eql('A1*3')
      }
    })

    it(`${mode} loop should preserve the content of formula cells that are not in the loop (left, right) but in the same row`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-left-right-formula-cell-preserve.xlsx`)
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

      if (mode === 'row') {
        // preserving the cells on the left of the loop
        should(sheet.A3.f).be.eql('A1*2')
        should(sheet.B3.f).be.eql('A1*3')
        should(sheet.C3.v).be.eql(items[0].name)
        should(sheet.D3.v).be.eql(items[0].lastname)
        should(sheet.E3.v).be.eql(items[0].age)
        // preserving the cells on the right of the loop
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
      } else {
        // preserving the cells on the left of the loop
        should(sheet.A3.f).be.eql('A1*2')
        should(sheet.B3.f).be.eql('A1*3')
        should(sheet.D5.v).be.eql(items[0].name)
        should(sheet.E5.v).be.eql(items[0].lastname)
        should(sheet.F5.v).be.eql(items[0].age)
        should(sheet.D7).be.not.ok()
        should(sheet.E7).be.not.ok()
        should(sheet.A8).be.not.ok()
        should(sheet.B8).be.not.ok()
        should(sheet.D10.v).be.eql(items[1].name)
        should(sheet.E10.v).be.eql(items[1].lastname)
        should(sheet.F10.v).be.eql(items[1].age)
        should(sheet.D12).be.not.ok()
        should(sheet.E12).be.not.ok()
        should(sheet.A13).be.not.ok()
        should(sheet.B13).be.not.ok()
        should(sheet.D15.v).be.eql(items[2].name)
        should(sheet.E15.v).be.eql(items[2].lastname)
        should(sheet.F15.v).be.eql(items[2].age)
        // preserving the cells on the right of the loop
        should(sheet.D17.f).be.eql('A1*4')
        should(sheet.E17.f).be.eql('A1*5')
      }
    })

    it(`${mode} loop should not break shared formulas`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-shared-formulas.xlsx`)
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

      if (mode === 'row') {
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
      } else {
        should(sheet.C3.v).be.eql('ID')
        should(sheet.D3.v).be.eql('Name')
        should(sheet.E3.v).be.eql('Value1')
        should(sheet.F3.v).be.eql('Value2')
        should(sheet.G3.v).be.eql('Value3')
        should(sheet.H3.v).be.eql('Value4')
        should(sheet.I3.v).be.eql('Value5')
        should(sheet.J3.v).be.eql('Value6')
        should(sheet.K3.v).be.eql('Value7')
        should(sheet.L3.v).be.eql('Value8')
        should(sheet.M3.v).be.eql('Value9')
        should(sheet.N3.v).be.eql('Value10')
        should(sheet.O3.v).be.eql('Value11')
        should(sheet.P3.v).be.eql('Value12')
        should(sheet.Q3.v).be.eql('Value13')
        should(sheet.R3.v).be.eql('Value14')
        should(sheet.S3.v).be.eql('Value15')
        should(sheet.T3.v).be.eql('Value16')
        should(sheet.U3.v).be.eql('Value17')
        should(sheet.V3.v).be.eql('Value18')
        should(sheet.W3.v).be.eql('Value19')
        should(sheet.X3.v).be.eql('Value20')

        should(sheet.C4.v).be.eql(items[0].ID)
        should(sheet.C4.t).be.eql('n')
        should(sheet.D4.v).be.eql(items[0].Name)
        should(sheet.E4.v).be.eql(items[0].Value1)
        should(sheet.E4.t).be.eql('n')
        should(sheet.F4.v).be.eql(items[0].Value2)
        should(sheet.F4.t).be.eql('n')
        should(sheet.G4.v).be.eql(items[0].Value3)
        should(sheet.G4.t).be.eql('n')
        should(sheet.H4.v).be.eql(items[0].Value4)
        should(sheet.H4.t).be.eql('n')
        should(sheet.I4.v).be.eql(items[0].Value5)
        should(sheet.I4.t).be.eql('n')
        should(sheet.J4.v).be.eql(items[0].Value6)
        should(sheet.J4.t).be.eql('n')
        should(sheet.K4.v).be.eql(items[0].Value7)
        should(sheet.K4.t).be.eql('n')
        should(sheet.L4.v).be.eql(items[0].Value8)
        should(sheet.L4.t).be.eql('n')
        should(sheet.M4.v).be.eql(items[0].Value9)
        should(sheet.M4.t).be.eql('n')
        should(sheet.N4.v).be.eql(items[0].Value10)
        should(sheet.N4.t).be.eql('n')
        should(sheet.O4.v).be.eql(items[0].Value11)
        should(sheet.O4.t).be.eql('n')
        should(sheet.P4.v).be.eql(items[0].Value12)
        should(sheet.P4.t).be.eql('n')
        should(sheet.Q4.v).be.eql(items[0].Value13)
        should(sheet.Q4.t).be.eql('n')
        should(sheet.R4.v).be.eql(items[0].Value14)
        should(sheet.R4.t).be.eql('n')
        should(sheet.S4.v).be.eql(items[0].Value15)
        should(sheet.S4.t).be.eql('n')
        should(sheet.T4.v).be.eql(items[0].Value16)
        should(sheet.T4.t).be.eql('n')
        should(sheet.U4.v).be.eql(items[0].Value17)
        should(sheet.U4.t).be.eql('n')
        should(sheet.V4.v).be.eql(items[0].Value18)
        should(sheet.V4.t).be.eql('n')
        should(sheet.W4.v).be.eql(items[0].Value19)
        should(sheet.W4.t).be.eql('n')
        should(sheet.X4.v).be.eql(items[0].Value20)
        should(sheet.X4.t).be.eql('n')

        should(sheet.C8.v).be.eql('ID')
        should(sheet.D8.v).be.eql('Name')
        should(sheet.E8.v).be.eql('Value1')
        should(sheet.F8.v).be.eql('Value2')
        should(sheet.G8.v).be.eql('Value3')
        should(sheet.H8.v).be.eql('Value4')
        should(sheet.I8.v).be.eql('Value5')
        should(sheet.J8.v).be.eql('Value6')
        should(sheet.K8.v).be.eql('Value7')
        should(sheet.L8.v).be.eql('Value8')
        should(sheet.M8.v).be.eql('Value9')
        should(sheet.N8.v).be.eql('Value10')
        should(sheet.O8.v).be.eql('Value11')
        should(sheet.P8.v).be.eql('Value12')
        should(sheet.Q8.v).be.eql('Value13')
        should(sheet.R8.v).be.eql('Value14')
        should(sheet.S8.v).be.eql('Value15')
        should(sheet.T8.v).be.eql('Value16')
        should(sheet.U8.v).be.eql('Value17')
        should(sheet.V8.v).be.eql('Value18')
        should(sheet.W8.v).be.eql('Value19')
        should(sheet.X8.v).be.eql('Value20')

        should(sheet.C9.v).be.eql(items[1].ID)
        should(sheet.C9.t).be.eql('n')
        should(sheet.D9.v).be.eql(items[1].Name)
        should(sheet.E9.v).be.eql(items[1].Value1)
        should(sheet.E9.t).be.eql('n')
        should(sheet.F9.v).be.eql(items[1].Value2)
        should(sheet.F9.t).be.eql('n')
        should(sheet.G9.v).be.eql(items[1].Value3)
        should(sheet.G9.t).be.eql('n')
        should(sheet.H9.v).be.eql(items[1].Value4)
        should(sheet.H9.t).be.eql('n')
        should(sheet.I9.v).be.eql(items[1].Value5)
        should(sheet.I9.t).be.eql('n')
        should(sheet.J9.v).be.eql(items[1].Value6)
        should(sheet.J9.t).be.eql('n')
        should(sheet.K9.v).be.eql(items[1].Value7)
        should(sheet.K9.t).be.eql('n')
        should(sheet.L9.v).be.eql(items[1].Value8)
        should(sheet.L9.t).be.eql('n')
        should(sheet.M9.v).be.eql(items[1].Value9)
        should(sheet.M9.t).be.eql('n')
        should(sheet.N9.v).be.eql(items[1].Value10)
        should(sheet.N9.t).be.eql('n')
        should(sheet.O9.v).be.eql(items[1].Value11)
        should(sheet.O9.t).be.eql('n')
        should(sheet.P9.v).be.eql(items[1].Value12)
        should(sheet.P9.t).be.eql('n')
        should(sheet.Q9.v).be.eql(items[1].Value13)
        should(sheet.Q9.t).be.eql('n')
        should(sheet.R9.v).be.eql(items[1].Value14)
        should(sheet.R9.t).be.eql('n')
        should(sheet.S9.v).be.eql(items[1].Value15)
        should(sheet.S9.t).be.eql('n')
        should(sheet.T9.v).be.eql(items[1].Value16)
        should(sheet.T9.t).be.eql('n')
        should(sheet.U9.v).be.eql(items[1].Value17)
        should(sheet.U9.t).be.eql('n')
        should(sheet.V9.v).be.eql(items[1].Value18)
        should(sheet.V9.t).be.eql('n')
        should(sheet.W9.v).be.eql(items[1].Value19)
        should(sheet.W9.t).be.eql('n')
        should(sheet.X9.v).be.eql(items[1].Value20)
        should(sheet.X9.t).be.eql('n')

        should(sheet.A13).be.not.ok()
        should(sheet.B13).be.not.ok()
        should(sheet.C13).be.not.ok()
        should(sheet.D13).be.not.ok()
        should(sheet.E13.f).be.eql('SUBTOTAL(109,E4:E12)')
        should(sheet.F13.f).be.eql('SUBTOTAL(109,F4:F12)')
        should(sheet.G13.f).be.eql('SUBTOTAL(109,G4:G12)')
        should(sheet.H13.f).be.eql('SUBTOTAL(109,H4:H12)')
        should(sheet.I13.f).be.eql('SUBTOTAL(109,I4:I12)')
        should(sheet.J13.f).be.eql('SUBTOTAL(109,J4:J12)')
        should(sheet.K13.f).be.eql('SUBTOTAL(109,K4:K12)')
        should(sheet.L13.f).be.eql('SUBTOTAL(109,L4:L12)')
        should(sheet.M13.f).be.eql('SUBTOTAL(109,M4:M12)')
        should(sheet.N13.f).be.eql('SUBTOTAL(109,N4:N12)')
        should(sheet.O13.f).be.eql('SUBTOTAL(109,O4:O12)')
        should(sheet.P13.f).be.eql('SUBTOTAL(109,P4:P12)')
        should(sheet.Q13.f).be.eql('SUBTOTAL(109,Q4:Q12)')
        should(sheet.R13.f).be.eql('SUBTOTAL(109,R4:R12)')
        should(sheet.S13.f).be.eql('SUBTOTAL(109,S4:S12)')
        should(sheet.T13.f).be.eql('SUBTOTAL(109,T4:T12)')
        should(sheet.U13.f).be.eql('SUBTOTAL(109,U4:U12)')
        should(sheet.V13.f).be.eql('SUBTOTAL(109,V4:V12)')
        should(sheet.W13.f).be.eql('SUBTOTAL(109,W4:W12)')
        should(sheet.X13.f).be.eql('SUBTOTAL(109,X4:X12)')
      }
    })

    // TODO: add test for "should not break shared formulas" but shared formulas is generated in loop
    // TODO: check if shared formulas is valid for vertical ranges (verify if ms excel creates it when editing)

    it(`${mode} loop should generate cells with type according to the data rendered in each cell`, async () => {
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
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-with-content-type.xlsx`)
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

      if (mode === 'row') {
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
      } else {
        // test boolean, number and standard string types
        should(sheet.C4.v).be.eql(items[0].name)
        should(sheet.D4.v).be.eql(items[0].lastname)
        should(sheet.E4.t).be.eql('n')
        should(sheet.E4.v).be.eql(items[0].age)
        should(sheet.F4.t).be.eql('b')
        should(sheet.F4.v).be.False()
        should(sheet.C9.v).be.eql(items[1].name)
        should(sheet.D9.v).be.eql(items[1].lastname)
        should(sheet.E9.t).be.eql('n')
        should(sheet.E9.v).be.eql(items[1].age)
        should(sheet.F9.t).be.eql('b')
        should(sheet.F9.v).be.True()
        should(sheet.C14.v).be.eql(items[2].name)
        should(sheet.D14.v).be.eql(items[2].lastname)
        should(sheet.E14.t).be.eql('n')
        should(sheet.E14.v).be.eql(items[2].age)
        should(sheet.F14.t).be.eql('b')
        should(sheet.F14.v).be.False()
      }
    })

    it(`${mode} loop should generate cell numbers when using this in handlebars`, async () => {
      const numbers = [1, 2, 3, 4, 5]

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'xlsx',
          xlsx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(xlsxDirPath, `${mode === 'row' ? 'loop' : 'loop-multiple-rows'}-numbers-and-this.xlsx`)
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

      if (mode === 'row') {
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
      } else {
        should(sheet.C3.v).be.eql(numbers[0])
        should(sheet.C3.t).be.eql('n')
        should(sheet.C6.v).be.eql(numbers[1])
        should(sheet.C6.t).be.eql('n')
        should(sheet.C9.v).be.eql(numbers[2])
        should(sheet.C9.t).be.eql('n')
        should(sheet.C12.v).be.eql(numbers[3])
        should(sheet.C12.t).be.eql('n')
        should(sheet.C15.v).be.eql(numbers[4])
        should(sheet.C15.t).be.eql('n')
      }
    })
  }

  it('block loop and row loop nested', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-single-row-loop.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B3.v).be.eql(categories[0].posts[0].name)
    should(sheet.C3.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.D3.v).be.eql(categories[0].posts[0].author)
    should(sheet.B4.v).be.eql(categories[0].posts[1].name)
    should(sheet.C4.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.D4.v).be.eql(categories[0].posts[1].author)
    should(sheet.B5.v).be.eql(categories[0].posts[2].name)
    should(sheet.C5.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.D5.v).be.eql(categories[0].posts[2].author)

    should(sheet.B7.v).be.eql(categories[1].name)
    should(sheet.B8.v).be.eql(categories[1].posts[0].name)
    should(sheet.C8.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.D8.v).be.eql(categories[1].posts[0].author)
    should(sheet.B9.v).be.eql(categories[1].posts[1].name)
    should(sheet.C9.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.D9.v).be.eql(categories[1].posts[1].author)

    should(sheet.B11.v).be.eql(categories[2].name)
    should(sheet.B12.v).be.eql(categories[2].posts[0].name)
    should(sheet.C12.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.D12.v).be.eql(categories[2].posts[0].author)
    should(sheet.B13.v).be.eql(categories[2].posts[1].name)
    should(sheet.C13.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.D13.v).be.eql(categories[2].posts[1].author)
  })

  it('block loop and block loop nested', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-multiple-rows-loop.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.C4.v).be.eql(categories[0].posts[0].name)
    should(sheet.C5.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.C6.v).be.eql(categories[0].posts[0].author)
    should(sheet.C9.v).be.eql(categories[0].posts[1].name)
    should(sheet.C10.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.C11.v).be.eql(categories[0].posts[1].author)
    should(sheet.C14.v).be.eql(categories[0].posts[2].name)
    should(sheet.C15.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.C16.v).be.eql(categories[0].posts[2].author)

    should(sheet.B19.v).be.eql(categories[1].name)
    should(sheet.C21.v).be.eql(categories[1].posts[0].name)
    should(sheet.C22.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.C23.v).be.eql(categories[1].posts[0].author)
    should(sheet.C26.v).be.eql(categories[1].posts[1].name)
    should(sheet.C27.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.C28.v).be.eql(categories[1].posts[1].author)

    should(sheet.B31.v).be.eql(categories[2].name)
    should(sheet.C33.v).be.eql(categories[2].posts[0].name)
    should(sheet.C34.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.C35.v).be.eql(categories[2].posts[0].author)
    should(sheet.C38.v).be.eql(categories[2].posts[1].name)
    should(sheet.C39.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.C40.v).be.eql(categories[2].posts[1].author)
  })

  it('row loop and row loop nested', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-single-row-and-nested-single-row-loop.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B3.v).be.eql(categories[0].name)
    should(sheet.C3.v).be.eql(categories[0].posts[0].name)
    should(sheet.D3.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.E3.v).be.eql(categories[0].posts[0].author)
    should(sheet.B4.v).be.eql(categories[0].name)
    should(sheet.C4.v).be.eql(categories[0].posts[1].name)
    should(sheet.D4.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.E4.v).be.eql(categories[0].posts[1].author)
    should(sheet.B5.v).be.eql(categories[0].name)
    should(sheet.C5.v).be.eql(categories[0].posts[2].name)
    should(sheet.D5.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.E5.v).be.eql(categories[0].posts[2].author)

    should(sheet.B6.v).be.eql(categories[1].name)
    should(sheet.C6.v).be.eql(categories[1].posts[0].name)
    should(sheet.D6.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.E6.v).be.eql(categories[1].posts[0].author)
    should(sheet.B7.v).be.eql(categories[1].name)
    should(sheet.C7.v).be.eql(categories[1].posts[1].name)
    should(sheet.D7.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.E7.v).be.eql(categories[1].posts[1].author)

    should(sheet.B8.v).be.eql(categories[2].name)
    should(sheet.C8.v).be.eql(categories[2].posts[0].name)
    should(sheet.D8.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.E8.v).be.eql(categories[2].posts[0].author)
    should(sheet.C9.v).be.eql(categories[2].posts[1].name)
    should(sheet.D9.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.E9.v).be.eql(categories[2].posts[1].author)
  })

  it('block loop and siblings nested row and block loops', async () => {
    const categories = [
      {
        name: 'In',
        tags: ['a', 'b', 'c'],
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        tags: ['a', 'c'],
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        tags: ['b'],
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-siblings-nested-row-and-multiple-rows-loop.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B3.v).be.eql('Tags')
    should(sheet.B4.v).be.eql(categories[0].tags[0])
    should(sheet.B5.v).be.eql(categories[0].tags[1])
    should(sheet.B6.v).be.eql(categories[0].tags[2])

    should(sheet.B8.v).be.eql('Posts')

    should(sheet.B10.v).be.eql('Name:')
    should(sheet.C10.v).be.eql(categories[0].posts[0].name)
    should(sheet.B11.v).be.eql('Words Count:')
    should(sheet.C11.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.B12.v).be.eql('Author:')
    should(sheet.C12.v).be.eql(categories[0].posts[0].author)
    should(sheet.B15.v).be.eql('Name:')
    should(sheet.C15.v).be.eql(categories[0].posts[1].name)
    should(sheet.B16.v).be.eql('Words Count:')
    should(sheet.C16.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.B17.v).be.eql('Author:')
    should(sheet.C17.v).be.eql(categories[0].posts[1].author)
    should(sheet.B20.v).be.eql('Name:')
    should(sheet.C20.v).be.eql(categories[0].posts[2].name)
    should(sheet.B21.v).be.eql('Words Count:')
    should(sheet.C21.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.B22.v).be.eql('Author:')
    should(sheet.C22.v).be.eql(categories[0].posts[2].author)

    should(sheet.B25.v).be.eql(categories[1].name)
    should(sheet.B26.v).be.eql('Tags')
    should(sheet.B27.v).be.eql(categories[1].tags[0])
    should(sheet.B28.v).be.eql(categories[1].tags[1])

    should(sheet.B30.v).be.eql('Posts')

    should(sheet.B32.v).be.eql('Name:')
    should(sheet.C32.v).be.eql(categories[1].posts[0].name)
    should(sheet.B33.v).be.eql('Words Count:')
    should(sheet.C33.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.B34.v).be.eql('Author:')
    should(sheet.C34.v).be.eql(categories[1].posts[0].author)
    should(sheet.B37.v).be.eql('Name:')
    should(sheet.C37.v).be.eql(categories[1].posts[1].name)
    should(sheet.B38.v).be.eql('Words Count:')
    should(sheet.C38.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.B39.v).be.eql('Author:')
    should(sheet.C39.v).be.eql(categories[1].posts[1].author)

    should(sheet.B42.v).be.eql(categories[2].name)
    should(sheet.B43.v).be.eql('Tags')
    should(sheet.B44.v).be.eql(categories[2].tags[0])

    should(sheet.B46.v).be.eql('Posts')

    should(sheet.B48.v).be.eql('Name:')
    should(sheet.C48.v).be.eql(categories[2].posts[0].name)
    should(sheet.B49.v).be.eql('Words Count:')
    should(sheet.C49.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.B50.v).be.eql('Author:')
    should(sheet.C50.v).be.eql(categories[2].posts[0].author)
    should(sheet.B53.v).be.eql('Name:')
    should(sheet.C53.v).be.eql(categories[2].posts[1].name)
    should(sheet.B54.v).be.eql('Words Count:')
    should(sheet.C54.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.B55.v).be.eql('Author:')
    should(sheet.C55.v).be.eql(categories[2].posts[1].author)
  })

  it('block loop and multiple nested loops', async () => {
    const categories = [
      {
        name: 'In',
        tags: ['a', 'b', 'c'],
        maintainers: ['Olivia', 'Jacob'],
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            author: 'Collins',
            reviews: [{ name: 'Bob', message: 'A good content', stars: [{ value: 4, time: '1 day ago' }, { value: 5, time: '1 week ago' }] }, { name: 'Alice', message: 'Nice way to put it together' }]
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            author: 'Cecelia',
            reviews: [{ name: 'Sarah', message: 'Couldn\'t put it down! A must-read' }, { name: 'Christopher', message: 'Interesting perspective, but lacked depth' }]
          }
        ]
      },
      {
        name: 'Consectetur',
        tags: ['a', 'c'],
        maintainers: ['Isabella'],
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            author: 'Wood',
            reviews: [{ name: 'Emily', message: 'Enjoyed the characters and plot twists', stars: [{ value: 4, time: '2 weeks ago' }] }]
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        tags: ['b'],
        maintainers: ['Alexander', 'Mia', 'James'],
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            author: 'Jeannine',
            reviews: [{ name: 'David', message: 'Not my cup of tea, but may appeal to others' }, { name: 'Samantha', message: 'Too slow-paced for my taste' }]
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            author: 'Katy',
            reviews: [{ name: 'William', message: 'Powerful and moving. Left a lasting impression' }]
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-multiple-loops.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B3.v).be.eql('Tags:')
    should(sheet.B4.v).be.eql(categories[0].tags[0])
    should(sheet.B5.v).be.eql(categories[0].tags[1])
    should(sheet.B6.v).be.eql(categories[0].tags[2])

    should(sheet.B8.v).be.eql('Posts')

    should(sheet.B10.v).be.eql('Name:')
    should(sheet.C10.v).be.eql(categories[0].posts[0].name)
    should(sheet.B11.v).be.eql('Words Count:')
    should(sheet.C11.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.B12.v).be.eql('Author:')
    should(sheet.C12.v).be.eql(categories[0].posts[0].author)

    should(sheet.B13.v).be.eql('Reviews:')
    should(sheet.B15.v).be.eql('Name:')
    should(sheet.C15.v).be.eql(categories[0].posts[0].reviews[0].name)
    should(sheet.B16.v).be.eql('Message:')
    should(sheet.C16.v).be.eql(categories[0].posts[0].reviews[0].message)
    should(sheet.B17.v).be.eql('Stars')
    should(sheet.B18.v).be.eql(`${categories[0].posts[0].reviews[0].stars[0].value} - ${categories[0].posts[0].reviews[0].stars[0].time}`)
    should(sheet.B19.v).be.eql(`${categories[0].posts[0].reviews[0].stars[1].value} - ${categories[0].posts[0].reviews[0].stars[1].time}`)

    should(sheet.B22.v).be.eql('Name:')
    should(sheet.C22.v).be.eql(categories[0].posts[0].reviews[1].name)
    should(sheet.B23.v).be.eql('Message:')
    should(sheet.C23.v).be.eql(categories[0].posts[0].reviews[1].message)
    should(sheet.B24.v).be.eql('Stars')
    should(sheet.B25.v).be.eql(' - ')

    should(sheet.B29.v).be.eql('Name:')
    should(sheet.C29.v).be.eql(categories[0].posts[1].name)
    should(sheet.B30.v).be.eql('Words Count:')
    should(sheet.C30.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.B31.v).be.eql('Author:')
    should(sheet.C31.v).be.eql(categories[0].posts[1].author)

    should(sheet.B32.v).be.eql('Reviews:')
    should(sheet.B34.v).be.eql('Name:')
    should(sheet.C34.v).be.eql('')
    should(sheet.B35.v).be.eql('Message:')
    should(sheet.C35.v).be.eql('')
    should(sheet.B36.v).be.eql('Stars')
    should(sheet.B37.v).be.eql(' - ')

    should(sheet.B41.v).be.eql('Name:')
    should(sheet.C41.v).be.eql(categories[0].posts[2].name)
    should(sheet.B42.v).be.eql('Words Count:')
    should(sheet.C42.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.B43.v).be.eql('Author:')
    should(sheet.C43.v).be.eql(categories[0].posts[2].author)

    should(sheet.B44.v).be.eql('Reviews:')
    should(sheet.B46.v).be.eql('Name:')
    should(sheet.C46.v).be.eql(categories[0].posts[2].reviews[0].name)
    should(sheet.B47.v).be.eql('Message:')
    should(sheet.C47.v).be.eql(categories[0].posts[2].reviews[0].message)
    should(sheet.B48.v).be.eql('Stars')
    should(sheet.B49.v).be.eql(' - ')

    should(sheet.B52.v).be.eql('Name:')
    should(sheet.C52.v).be.eql(categories[0].posts[2].reviews[1].name)
    should(sheet.B53.v).be.eql('Message:')
    should(sheet.C53.v).be.eql(categories[0].posts[2].reviews[1].message)
    should(sheet.B54.v).be.eql('Stars')
    should(sheet.B55.v).be.eql(' - ')

    should(sheet.B59.v).be.eql('Maintainers:')
    should(sheet.B60.v).be.eql(categories[0].maintainers[0])
    should(sheet.B61.v).be.eql(categories[0].maintainers[1])

    should(sheet.B64.v).be.eql(categories[1].name)
    should(sheet.B65.v).be.eql('Tags:')
    should(sheet.B66.v).be.eql(categories[1].tags[0])
    should(sheet.B67.v).be.eql(categories[1].tags[1])

    should(sheet.B69.v).be.eql('Posts')

    should(sheet.B71.v).be.eql('Name:')
    should(sheet.C71.v).be.eql(categories[1].posts[0].name)
    should(sheet.B72.v).be.eql('Words Count:')
    should(sheet.C72.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.B73.v).be.eql('Author:')
    should(sheet.C73.v).be.eql(categories[1].posts[0].author)

    should(sheet.B74.v).be.eql('Reviews:')
    should(sheet.B76.v).be.eql('Name:')
    should(sheet.C76.v).be.eql(categories[1].posts[0].reviews[0].name)
    should(sheet.B77.v).be.eql('Message:')
    should(sheet.C77.v).be.eql(categories[1].posts[0].reviews[0].message)
    should(sheet.B78.v).be.eql('Stars')
    should(sheet.B79.v).be.eql(`${categories[1].posts[0].reviews[0].stars[0].value} - ${categories[1].posts[0].reviews[0].stars[0].time}`)

    should(sheet.B83.v).be.eql('Name:')
    should(sheet.C83.v).be.eql(categories[1].posts[1].name)
    should(sheet.B84.v).be.eql('Words Count:')
    should(sheet.C84.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.B85.v).be.eql('Author:')
    should(sheet.C85.v).be.eql(categories[1].posts[1].author)

    should(sheet.B86.v).be.eql('Reviews:')
    should(sheet.B88.v).be.eql('Name:')
    should(sheet.C88.v).be.eql('')
    should(sheet.B89.v).be.eql('Message:')
    should(sheet.C89.v).be.eql('')
    should(sheet.B90.v).be.eql('Stars')
    should(sheet.B91.v).be.eql(' - ')

    should(sheet.B95.v).be.eql('Maintainers:')
    should(sheet.B96.v).be.eql(categories[1].maintainers[0])

    should(sheet.B99.v).be.eql(categories[2].name)
    should(sheet.B100.v).be.eql('Tags:')
    should(sheet.B101.v).be.eql(categories[2].tags[0])

    should(sheet.B103.v).be.eql('Posts')

    should(sheet.B105.v).be.eql('Name:')
    should(sheet.C105.v).be.eql(categories[2].posts[0].name)
    should(sheet.B106.v).be.eql('Words Count:')
    should(sheet.C106.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.B107.v).be.eql('Author:')
    should(sheet.C107.v).be.eql(categories[2].posts[0].author)

    should(sheet.B108.v).be.eql('Reviews:')
    should(sheet.B110.v).be.eql('Name:')
    should(sheet.C110.v).be.eql(categories[2].posts[0].reviews[0].name)
    should(sheet.B111.v).be.eql('Message:')
    should(sheet.C111.v).be.eql(categories[2].posts[0].reviews[0].message)
    should(sheet.B112.v).be.eql('Stars')
    should(sheet.B113.v).be.eql(' - ')

    should(sheet.B116.v).be.eql('Name:')
    should(sheet.C116.v).be.eql(categories[2].posts[0].reviews[1].name)
    should(sheet.B117.v).be.eql('Message:')
    should(sheet.C117.v).be.eql(categories[2].posts[0].reviews[1].message)
    should(sheet.B118.v).be.eql('Stars')
    should(sheet.B119.v).be.eql(' - ')

    should(sheet.B123.v).be.eql('Name:')
    should(sheet.C123.v).be.eql(categories[2].posts[1].name)
    should(sheet.B124.v).be.eql('Words Count:')
    should(sheet.C124.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.B125.v).be.eql('Author:')
    should(sheet.C125.v).be.eql(categories[2].posts[1].author)

    should(sheet.B126.v).be.eql('Reviews:')
    should(sheet.B128.v).be.eql('Name:')
    should(sheet.C128.v).be.eql(categories[2].posts[1].reviews[0].name)
    should(sheet.B129.v).be.eql('Message:')
    should(sheet.C129.v).be.eql(categories[2].posts[1].reviews[0].message)
    should(sheet.B130.v).be.eql('Stars')
    should(sheet.B131.v).be.eql(' - ')

    should(sheet.B135.v).be.eql('Maintainers:')
    should(sheet.B136.v).be.eql(categories[2].maintainers[0])
    should(sheet.B137.v).be.eql(categories[2].maintainers[1])
    should(sheet.B138.v).be.eql(categories[2].maintainers[2])
  })

  // TODO: the idea to support multiple row loop nesting will be to insert <outOfLoopPlaceholder>
  // elements between loop start and row start and the <outOfLoopPlaceholder> inside <row> will
  // combine results
  // <xlsxRemove>{{#xlsxSData categories type='loop' hierarchyId='0' start=3 columnStart=2 columnEnd=12 }}</xlsxRemove>
  // <outOfLoopPlaceholder>
  //   ...NEW TYPE OF PLACEHOLDER...
  //   HERE WILL COME THE "LEFT" part
  // </outOfLoopPlaceholder>
  // <outOfLoopPlaceholder>
  //   ...NEW TYPE OF PLACEHOLDER...
  //   HERE WILL COME THE "RIGHT" part
  // </outOfLoopPlaceholder>
  // <xlsxRemove>{{#xlsxSData type='row' originalRowNumber=3}}</xlsxRemove>
  // <row r="{{xlsxSData type='rowNumber'}}" spans="2:12" x14ac:dyDescent="0.2">
  //   <outOfLoopPlaceholder>
  //     ...EXISTING TYPE OF PLACEHOLDER THAT WILL COMBINE RESULTS FROM OUTSIDE ROW (LEFT)...
  //   </outOfLoopPlaceholder>
  //   ...cells here...
  //   <outOfLoopPlaceholder>
  //     ...EXISTING TYPE OF PLACEHOLDER THAT WILL COMBINE RESULTS FROM OUTSIDE ROW (RIGHT)...
  //   </outOfLoopPlaceholder>
  // </row>
  // <xlsxRemove>{{/xlsxSData}}</xlsxRemove>
  // <xlsxRemove>{{/xlsxSData}}</xlsxRemove>
  //
  // Another approach a bit more radically can be to try to remove the usage of extra tags
  // <outOfLoopPlaceholder>, <outOfLoop> and instead just prepare everything with helper calls
  // the structure of calls will look very much the same as above but the difference will be
  // that we will insert the tags directly during handlebars processing without the need to
  // post-process, this will likely also improve performance with lot of rows
  it.skip('row loop and multiple row loops nested', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            author: 'Collins',
            reviews: [{ name: 'Bob', message: 'A good content', stars: [{ value: 4, time: '1 day ago' }, { value: 5, time: '1 week ago' }] }, { name: 'Alice', message: 'Nice way to put it together' }]
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            author: 'Cecelia',
            reviews: [{ name: 'Sarah', message: 'Couldn\'t put it down! A must-read' }, { name: 'Christopher', message: 'Interesting perspective, but lacked depth' }]
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            author: 'Wood',
            reviews: [{ name: 'Emily', message: 'Enjoyed the characters and plot twists', stars: [{ value: 4, time: '2 weeks ago' }] }]
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            author: 'Jeannine',
            reviews: [{ name: 'David', message: 'Not my cup of tea, but may appeal to others' }, { name: 'Samantha', message: 'Too slow-paced for my taste' }]
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            author: 'Katy',
            reviews: [{ name: 'William', message: 'Powerful and moving. Left a lasting impression' }]
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-and-nested-loops.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    // const workbook = xlsx.read(result.content)
    // const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // should(sheet.B2.v).be.eql(categories[0].name)
    // should(sheet.B3.v).be.eql('Tags:')
    // should(sheet.B4.v).be.eql(categories[0].tags[0])
    // should(sheet.B5.v).be.eql(categories[0].tags[1])
    // should(sheet.B6.v).be.eql(categories[0].tags[2])

    // should(sheet.B8.v).be.eql('Posts')

    // should(sheet.B10.v).be.eql('Name:')
    // should(sheet.C10.v).be.eql(categories[0].posts[0].name)
    // should(sheet.B11.v).be.eql('Words Count:')
    // should(sheet.C11.v).be.eql(categories[0].posts[0].wordsCount)
    // should(sheet.B12.v).be.eql('Author:')
    // should(sheet.C12.v).be.eql(categories[0].posts[0].author)

    // should(sheet.B13.v).be.eql('Reviews:')
    // should(sheet.B15.v).be.eql('Name:')
    // should(sheet.C15.v).be.eql(categories[0].posts[0].reviews[0].name)
    // should(sheet.B16.v).be.eql('Message:')
    // should(sheet.C16.v).be.eql(categories[0].posts[0].reviews[0].message)
    // should(sheet.B17.v).be.eql('Stars')
    // should(sheet.B18.v).be.eql(`${categories[0].posts[0].reviews[0].stars[0].value} - ${categories[0].posts[0].reviews[0].stars[0].time}`)
    // should(sheet.B19.v).be.eql(`${categories[0].posts[0].reviews[0].stars[1].value} - ${categories[0].posts[0].reviews[0].stars[1].time}`)

    // should(sheet.B22.v).be.eql('Name:')
    // should(sheet.C22.v).be.eql(categories[0].posts[0].reviews[1].name)
    // should(sheet.B23.v).be.eql('Message:')
    // should(sheet.C23.v).be.eql(categories[0].posts[0].reviews[1].message)
    // should(sheet.B24.v).be.eql('Stars')
    // should(sheet.B25.v).be.eql(' - ')

    // should(sheet.B29.v).be.eql('Name:')
    // should(sheet.C29.v).be.eql(categories[0].posts[1].name)
    // should(sheet.B30.v).be.eql('Words Count:')
    // should(sheet.C30.v).be.eql(categories[0].posts[1].wordsCount)
    // should(sheet.B31.v).be.eql('Author:')
    // should(sheet.C31.v).be.eql(categories[0].posts[1].author)

    // should(sheet.B32.v).be.eql('Reviews:')
    // should(sheet.B34.v).be.eql('Name:')
    // should(sheet.C34.v).be.eql('')
    // should(sheet.B35.v).be.eql('Message:')
    // should(sheet.C35.v).be.eql('')
    // should(sheet.B36.v).be.eql('Stars')
    // should(sheet.B37.v).be.eql(' - ')

    // should(sheet.B41.v).be.eql('Name:')
    // should(sheet.C41.v).be.eql(categories[0].posts[2].name)
    // should(sheet.B42.v).be.eql('Words Count:')
    // should(sheet.C42.v).be.eql(categories[0].posts[2].wordsCount)
    // should(sheet.B43.v).be.eql('Author:')
    // should(sheet.C43.v).be.eql(categories[0].posts[2].author)

    // should(sheet.B44.v).be.eql('Reviews:')
    // should(sheet.B46.v).be.eql('Name:')
    // should(sheet.C46.v).be.eql(categories[0].posts[2].reviews[0].name)
    // should(sheet.B47.v).be.eql('Message:')
    // should(sheet.C47.v).be.eql(categories[0].posts[2].reviews[0].message)
    // should(sheet.B48.v).be.eql('Stars')
    // should(sheet.B49.v).be.eql(' - ')

    // should(sheet.B52.v).be.eql('Name:')
    // should(sheet.C52.v).be.eql(categories[0].posts[2].reviews[1].name)
    // should(sheet.B53.v).be.eql('Message:')
    // should(sheet.C53.v).be.eql(categories[0].posts[2].reviews[1].message)
    // should(sheet.B54.v).be.eql('Stars')
    // should(sheet.B55.v).be.eql(' - ')

    // should(sheet.B59.v).be.eql('Maintainers:')
    // should(sheet.B60.v).be.eql(categories[0].maintainers[0])
    // should(sheet.B61.v).be.eql(categories[0].maintainers[1])

    // should(sheet.B64.v).be.eql(categories[1].name)
    // should(sheet.B65.v).be.eql('Tags:')
    // should(sheet.B66.v).be.eql(categories[1].tags[0])
    // should(sheet.B67.v).be.eql(categories[1].tags[1])

    // should(sheet.B69.v).be.eql('Posts')

    // should(sheet.B71.v).be.eql('Name:')
    // should(sheet.C71.v).be.eql(categories[1].posts[0].name)
    // should(sheet.B72.v).be.eql('Words Count:')
    // should(sheet.C72.v).be.eql(categories[1].posts[0].wordsCount)
    // should(sheet.B73.v).be.eql('Author:')
    // should(sheet.C73.v).be.eql(categories[1].posts[0].author)

    // should(sheet.B74.v).be.eql('Reviews:')
    // should(sheet.B76.v).be.eql('Name:')
    // should(sheet.C76.v).be.eql(categories[1].posts[0].reviews[0].name)
    // should(sheet.B77.v).be.eql('Message:')
    // should(sheet.C77.v).be.eql(categories[1].posts[0].reviews[0].message)
    // should(sheet.B78.v).be.eql('Stars')
    // should(sheet.B79.v).be.eql(`${categories[1].posts[0].reviews[0].stars[0].value} - ${categories[1].posts[0].reviews[0].stars[0].time}`)

    // should(sheet.B83.v).be.eql('Name:')
    // should(sheet.C83.v).be.eql(categories[1].posts[1].name)
    // should(sheet.B84.v).be.eql('Words Count:')
    // should(sheet.C84.v).be.eql(categories[1].posts[1].wordsCount)
    // should(sheet.B85.v).be.eql('Author:')
    // should(sheet.C85.v).be.eql(categories[1].posts[1].author)

    // should(sheet.B86.v).be.eql('Reviews:')
    // should(sheet.B88.v).be.eql('Name:')
    // should(sheet.C88.v).be.eql('')
    // should(sheet.B89.v).be.eql('Message:')
    // should(sheet.C89.v).be.eql('')
    // should(sheet.B90.v).be.eql('Stars')
    // should(sheet.B91.v).be.eql(' - ')

    // should(sheet.B95.v).be.eql('Maintainers:')
    // should(sheet.B96.v).be.eql(categories[1].maintainers[0])

    // should(sheet.B99.v).be.eql(categories[2].name)
    // should(sheet.B100.v).be.eql('Tags:')
    // should(sheet.B101.v).be.eql(categories[2].tags[0])

    // should(sheet.B103.v).be.eql('Posts')

    // should(sheet.B105.v).be.eql('Name:')
    // should(sheet.C105.v).be.eql(categories[2].posts[0].name)
    // should(sheet.B106.v).be.eql('Words Count:')
    // should(sheet.C106.v).be.eql(categories[2].posts[0].wordsCount)
    // should(sheet.B107.v).be.eql('Author:')
    // should(sheet.C107.v).be.eql(categories[2].posts[0].author)

    // should(sheet.B108.v).be.eql('Reviews:')
    // should(sheet.B110.v).be.eql('Name:')
    // should(sheet.C110.v).be.eql(categories[2].posts[0].reviews[0].name)
    // should(sheet.B111.v).be.eql('Message:')
    // should(sheet.C111.v).be.eql(categories[2].posts[0].reviews[0].message)
    // should(sheet.B112.v).be.eql('Stars')
    // should(sheet.B113.v).be.eql(' - ')

    // should(sheet.B116.v).be.eql('Name:')
    // should(sheet.C116.v).be.eql(categories[2].posts[0].reviews[1].name)
    // should(sheet.B117.v).be.eql('Message:')
    // should(sheet.C117.v).be.eql(categories[2].posts[0].reviews[1].message)
    // should(sheet.B118.v).be.eql('Stars')
    // should(sheet.B119.v).be.eql(' - ')

    // should(sheet.B123.v).be.eql('Name:')
    // should(sheet.C123.v).be.eql(categories[2].posts[1].name)
    // should(sheet.B124.v).be.eql('Words Count:')
    // should(sheet.C124.v).be.eql(categories[2].posts[1].wordsCount)
    // should(sheet.B125.v).be.eql('Author:')
    // should(sheet.C125.v).be.eql(categories[2].posts[1].author)

    // should(sheet.B126.v).be.eql('Reviews:')
    // should(sheet.B128.v).be.eql('Name:')
    // should(sheet.C128.v).be.eql(categories[2].posts[1].reviews[0].name)
    // should(sheet.B129.v).be.eql('Message:')
    // should(sheet.C129.v).be.eql(categories[2].posts[1].reviews[0].message)
    // should(sheet.B130.v).be.eql('Stars')
    // should(sheet.B131.v).be.eql(' - ')

    // should(sheet.B135.v).be.eql('Maintainers:')
    // should(sheet.B136.v).be.eql(categories[2].maintainers[0])
    // should(sheet.B137.v).be.eql(categories[2].maintainers[1])
    // should(sheet.B138.v).be.eql(categories[2].maintainers[2])
  })

  it('block loop and row loop nested - update existing merged cells after loop', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-single-row-loop-update-merged-cells.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B1.v).be.eql('merged')
    should(mergeCellExists(sheet, 'B1:C1')).be.True()
    should(sheet.B16.v).be.eql('merged2')
    should(mergeCellExists(sheet, 'B16:C16')).be.True()
    should(sheet.E16.v).be.eql('merged3')
    should(mergeCellExists(sheet, 'E16:G16')).be.True()
  })

  it('block loop and row loop nested - create new merged cells from loop', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-single-row-loop-new-merged-cells.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B3.v).be.eql(categories[0].posts[0].name)
    should(sheet.C3.v).be.eql(categories[0].posts[0].wordsCount)
    should(mergeCellExists(sheet, 'C3:D3')).be.True()
    should(sheet.E3.v).be.eql(categories[0].posts[0].author)
    should(sheet.B4.v).be.eql(categories[0].posts[1].name)
    should(sheet.C4.v).be.eql(categories[0].posts[1].wordsCount)
    should(mergeCellExists(sheet, 'C4:D4')).be.True()
    should(sheet.E4.v).be.eql(categories[0].posts[1].author)
    should(sheet.B5.v).be.eql(categories[0].posts[2].name)
    should(sheet.C5.v).be.eql(categories[0].posts[2].wordsCount)
    should(mergeCellExists(sheet, 'C5:D5')).be.True()
    should(sheet.E5.v).be.eql(categories[0].posts[2].author)

    should(sheet.B7.v).be.eql(categories[1].name)
    should(sheet.B8.v).be.eql(categories[1].posts[0].name)
    should(sheet.C8.v).be.eql(categories[1].posts[0].wordsCount)
    should(mergeCellExists(sheet, 'C8:D8')).be.True()
    should(sheet.E8.v).be.eql(categories[1].posts[0].author)
    should(sheet.B9.v).be.eql(categories[1].posts[1].name)
    should(sheet.C9.v).be.eql(categories[1].posts[1].wordsCount)
    should(mergeCellExists(sheet, 'C9:D9')).be.True()
    should(sheet.E9.v).be.eql(categories[1].posts[1].author)

    should(sheet.B11.v).be.eql(categories[2].name)
    should(sheet.B12.v).be.eql(categories[2].posts[0].name)
    should(sheet.C12.v).be.eql(categories[2].posts[0].wordsCount)
    should(mergeCellExists(sheet, 'C12:D12')).be.True()
    should(sheet.E12.v).be.eql(categories[2].posts[0].author)
    should(sheet.B13.v).be.eql(categories[2].posts[1].name)
    should(sheet.C13.v).be.eql(categories[2].posts[1].wordsCount)
    should(mergeCellExists(sheet, 'C13:D13')).be.True()
    should(sheet.E13.v).be.eql(categories[2].posts[1].author)
  })

  it('block loop and block loop nested - create new vertical merged cells from loop', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-multiple-rows-loop-vertical-merged-cells.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B4.v).be.eql('Name:')
    should(sheet.C4.v).be.eql(categories[0].posts[0].name)
    should(sheet.B5.v).be.eql('Words Count:')
    should(sheet.C5.v).be.eql(categories[0].posts[0].wordsCount)
    should(mergeCellExists(sheet, 'C5:C6')).be.True()
    should(sheet.B7.v).be.eql('Author:')
    should(sheet.C7.v).be.eql(categories[0].posts[0].author)
    should(sheet.B10.v).be.eql('Name:')
    should(sheet.C10.v).be.eql(categories[0].posts[1].name)
    should(sheet.B11.v).be.eql('Words Count:')
    should(sheet.C11.v).be.eql(categories[0].posts[1].wordsCount)
    should(mergeCellExists(sheet, 'C11:C12')).be.True()
    should(sheet.B13.v).be.eql('Author:')
    should(sheet.C13.v).be.eql(categories[0].posts[1].author)
    should(sheet.B16.v).be.eql('Name:')
    should(sheet.C16.v).be.eql(categories[0].posts[2].name)
    should(sheet.B17.v).be.eql('Words Count:')
    should(sheet.C17.v).be.eql(categories[0].posts[2].wordsCount)
    should(mergeCellExists(sheet, 'C17:C18')).be.True()
    should(sheet.B19.v).be.eql('Author:')
    should(sheet.C19.v).be.eql(categories[0].posts[2].author)

    should(sheet.B22.v).be.eql(categories[1].name)
    should(sheet.B24.v).be.eql('Name:')
    should(sheet.C24.v).be.eql(categories[1].posts[0].name)
    should(sheet.B25.v).be.eql('Words Count:')
    should(sheet.C25.v).be.eql(categories[1].posts[0].wordsCount)
    should(mergeCellExists(sheet, 'C25:C26')).be.True()
    should(sheet.B27.v).be.eql('Author:')
    should(sheet.C27.v).be.eql(categories[1].posts[0].author)
    should(sheet.B30.v).be.eql('Name:')
    should(sheet.C30.v).be.eql(categories[1].posts[1].name)
    should(sheet.B31.v).be.eql('Words Count:')
    should(sheet.C31.v).be.eql(categories[1].posts[1].wordsCount)
    should(mergeCellExists(sheet, 'C31:C32')).be.True()
    should(sheet.B33.v).be.eql('Author:')
    should(sheet.C33.v).be.eql(categories[1].posts[1].author)

    should(sheet.B36.v).be.eql(categories[2].name)
    should(sheet.B38.v).be.eql('Name:')
    should(sheet.C38.v).be.eql(categories[2].posts[0].name)
    should(sheet.B39.v).be.eql('Words Count:')
    should(sheet.C39.v).be.eql(categories[2].posts[0].wordsCount)
    should(mergeCellExists(sheet, 'C39:C40')).be.True()
    should(sheet.B41.v).be.eql('Author:')
    should(sheet.C41.v).be.eql(categories[2].posts[0].author)
    should(sheet.B44.v).be.eql('Name:')
    should(sheet.C44.v).be.eql(categories[2].posts[1].name)
    should(sheet.B45.v).be.eql('Words Count:')
    should(sheet.C45.v).be.eql(categories[2].posts[1].wordsCount)
    should(mergeCellExists(sheet, 'C45:C46')).be.True()
    should(sheet.B47.v).be.eql('Author:')
    should(sheet.C47.v).be.eql(categories[2].posts[1].author)
  })

  it('block loop and row loop nested - update existing formulas after loop', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-single-row-loop-update-formula-cells.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B3.v).be.eql(categories[0].posts[0].name)
    should(sheet.C3.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.D3.v).be.eql(categories[0].posts[0].author)
    should(sheet.B4.v).be.eql(categories[0].posts[1].name)
    should(sheet.C4.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.D4.v).be.eql(categories[0].posts[1].author)
    should(sheet.B5.v).be.eql(categories[0].posts[2].name)
    should(sheet.C5.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.D5.v).be.eql(categories[0].posts[2].author)

    should(sheet.B7.v).be.eql(categories[1].name)
    should(sheet.B8.v).be.eql(categories[1].posts[0].name)
    should(sheet.C8.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.D8.v).be.eql(categories[1].posts[0].author)
    should(sheet.B9.v).be.eql(categories[1].posts[1].name)
    should(sheet.C9.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.D9.v).be.eql(categories[1].posts[1].author)

    should(sheet.B11.v).be.eql(categories[2].name)
    should(sheet.B12.v).be.eql(categories[2].posts[0].name)
    should(sheet.C12.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.D12.v).be.eql(categories[2].posts[0].author)
    should(sheet.B13.v).be.eql(categories[2].posts[1].name)
    should(sheet.C13.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.D13.v).be.eql(categories[2].posts[1].author)

    should(sheet.D18.f).be.eql('SUM(D16:D17)')
    should(sheet.D19.f).be.eql('AVERAGE(D16:D17)')
  })

  it('block loop and row loop nested - update existing formulas after loop (formula start in loop and formula end points to one cell bellow loop)', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-single-row-loop-update-formula-cells-(end-bellow).xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B3.v).be.eql(categories[0].posts[0].name)
    should(sheet.C3.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.D3.v).be.eql(categories[0].posts[0].author)
    should(sheet.B4.v).be.eql(categories[0].posts[1].name)
    should(sheet.C4.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.D4.v).be.eql(categories[0].posts[1].author)
    should(sheet.B5.v).be.eql(categories[0].posts[2].name)
    should(sheet.C5.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.D5.v).be.eql(categories[0].posts[2].author)

    should(sheet.B7.v).be.eql(categories[1].name)
    should(sheet.B8.v).be.eql(categories[1].posts[0].name)
    should(sheet.C8.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.D8.v).be.eql(categories[1].posts[0].author)
    should(sheet.B9.v).be.eql(categories[1].posts[1].name)
    should(sheet.C9.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.D9.v).be.eql(categories[1].posts[1].author)

    should(sheet.B11.v).be.eql(categories[2].name)
    should(sheet.B12.v).be.eql(categories[2].posts[0].name)
    should(sheet.C12.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.D12.v).be.eql(categories[2].posts[0].author)
    should(sheet.B13.v).be.eql(categories[2].posts[1].name)
    should(sheet.C13.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.D13.v).be.eql(categories[2].posts[1].author)

    should(sheet.C16.f).be.eql('SUM(C3:C15)')
    should(sheet.C17.f).be.eql('AVERAGE(C3:C15)')
    should(sheet.C18.f).be.eql('MIN(C3:C15)')
    should(sheet.C19.f).be.eql('MAX(C3:C15)')
    should(sheet.C20.f).be.eql('SUM(C18,C19)')
  })

  it('block loop and row loop nested - update existing formulas after loop (formula start and end points to cell in loop)', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-single-row-loop-update-formula-cells-(inside).xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B3.v).be.eql(categories[0].posts[0].name)
    should(sheet.C3.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.D3.v).be.eql(categories[0].posts[0].author)
    should(sheet.B4.v).be.eql(categories[0].posts[1].name)
    should(sheet.C4.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.D4.v).be.eql(categories[0].posts[1].author)
    should(sheet.B5.v).be.eql(categories[0].posts[2].name)
    should(sheet.C5.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.D5.v).be.eql(categories[0].posts[2].author)

    should(sheet.B7.v).be.eql(categories[1].name)
    should(sheet.B8.v).be.eql(categories[1].posts[0].name)
    should(sheet.C8.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.D8.v).be.eql(categories[1].posts[0].author)
    should(sheet.B9.v).be.eql(categories[1].posts[1].name)
    should(sheet.C9.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.D9.v).be.eql(categories[1].posts[1].author)

    should(sheet.B11.v).be.eql(categories[2].name)
    should(sheet.B12.v).be.eql(categories[2].posts[0].name)
    should(sheet.C12.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.D12.v).be.eql(categories[2].posts[0].author)
    should(sheet.B13.v).be.eql(categories[2].posts[1].name)
    should(sheet.C13.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.D13.v).be.eql(categories[2].posts[1].author)

    should(sheet.C16.f).be.eql('SUM(C3:C13)')
    should(sheet.C17.f).be.eql('AVERAGE(C3:C13)')
    should(sheet.C18.f).be.eql('MIN(C3:C13)')
    should(sheet.C19.f).be.eql('MAX(C3:C13)')
    should(sheet.C20.f).be.eql('SUM(C18,C19)')
  })

  it('block loop and row loop nested - create new formula cells from loop', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            timePerWord: 0.4,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            timePerWord: 0.2,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            timePerWord: 0.6,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            timePerWord: 0.7,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            timePerWord: 0.9,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            timePerWord: 0.5,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            timePerWord: 0.6,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-single-row-loop-new-formula-cells.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B3.v).be.eql(categories[0].posts[0].name)
    should(sheet.C3.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.D3.v).be.eql(categories[0].posts[0].timePerWord)
    should(sheet.E3.f).be.eql('C3*D3')
    should(sheet.F3.v).be.eql(categories[0].posts[0].author)
    should(sheet.B4.v).be.eql(categories[0].posts[1].name)
    should(sheet.C4.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.D4.v).be.eql(categories[0].posts[1].timePerWord)
    should(sheet.E4.f).be.eql('C4*D4')
    should(sheet.F4.v).be.eql(categories[0].posts[1].author)
    should(sheet.B5.v).be.eql(categories[0].posts[2].name)
    should(sheet.C5.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.D5.v).be.eql(categories[0].posts[2].timePerWord)
    should(sheet.E5.f).be.eql('C5*D5')
    should(sheet.F5.v).be.eql(categories[0].posts[2].author)

    should(sheet.B7.v).be.eql(categories[1].name)
    should(sheet.B8.v).be.eql(categories[1].posts[0].name)
    should(sheet.C8.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.D8.v).be.eql(categories[1].posts[0].timePerWord)
    should(sheet.E8.f).be.eql('C8*D8')
    should(sheet.F8.v).be.eql(categories[1].posts[0].author)
    should(sheet.B9.v).be.eql(categories[1].posts[1].name)
    should(sheet.C9.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.D9.v).be.eql(categories[1].posts[1].timePerWord)
    should(sheet.E9.f).be.eql('C9*D9')
    should(sheet.F9.v).be.eql(categories[1].posts[1].author)

    should(sheet.B11.v).be.eql(categories[2].name)
    should(sheet.B12.v).be.eql(categories[2].posts[0].name)
    should(sheet.C12.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.D12.v).be.eql(categories[2].posts[0].timePerWord)
    should(sheet.E12.f).be.eql('C12*D12')
    should(sheet.F12.v).be.eql(categories[2].posts[0].author)
    should(sheet.B13.v).be.eql(categories[2].posts[1].name)
    should(sheet.C13.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.D13.v).be.eql(categories[2].posts[1].timePerWord)
    should(sheet.E13.f).be.eql('C13*D13')
    should(sheet.F13.v).be.eql(categories[2].posts[1].author)
  })

  it('block loop and block loop nested - create new formula cells (vertical) from loop', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            timePerWord: 0.4,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            timePerWord: 0.2,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            timePerWord: 0.6,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            timePerWord: 0.7,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            timePerWord: 0.9,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            timePerWord: 0.5,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            timePerWord: 0.6,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-multiple-rows-loop-new-vertical-formula-cells.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B4.v).be.eql('Name:')
    should(sheet.C4.v).be.eql(categories[0].posts[0].name)
    should(sheet.B5.v).be.eql('Words Count:')
    should(sheet.C5.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.B6.v).be.eql('Time Per Word:')
    should(sheet.C6.v).be.eql(categories[0].posts[0].timePerWord)
    should(sheet.B7.v).be.eql('Total:')
    should(sheet.C7.f).be.eql('C5*C6')
    should(sheet.B8.v).be.eql('Author:')
    should(sheet.C8.v).be.eql(categories[0].posts[0].author)
    should(sheet.B11.v).be.eql('Name:')
    should(sheet.C11.v).be.eql(categories[0].posts[1].name)
    should(sheet.B12.v).be.eql('Words Count:')
    should(sheet.C12.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.B13.v).be.eql('Time Per Word:')
    should(sheet.C13.v).be.eql(categories[0].posts[1].timePerWord)
    should(sheet.B14.v).be.eql('Total:')
    should(sheet.C14.f).be.eql('C12*C13')
    should(sheet.B15.v).be.eql('Author:')
    should(sheet.C15.v).be.eql(categories[0].posts[1].author)
    should(sheet.B18.v).be.eql('Name:')
    should(sheet.C18.v).be.eql(categories[0].posts[2].name)
    should(sheet.B19.v).be.eql('Words Count:')
    should(sheet.C19.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.B20.v).be.eql('Time Per Word:')
    should(sheet.C20.v).be.eql(categories[0].posts[2].timePerWord)
    should(sheet.B21.v).be.eql('Total:')
    should(sheet.C21.f).be.eql('C19*C20')
    should(sheet.B22.v).be.eql('Author:')
    should(sheet.C22.v).be.eql(categories[0].posts[2].author)

    should(sheet.B25.v).be.eql(categories[1].name)
    should(sheet.B27.v).be.eql('Name:')
    should(sheet.C27.v).be.eql(categories[1].posts[0].name)
    should(sheet.B28.v).be.eql('Words Count:')
    should(sheet.C28.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.B29.v).be.eql('Time Per Word:')
    should(sheet.C29.v).be.eql(categories[1].posts[0].timePerWord)
    should(sheet.B30.v).be.eql('Total:')
    should(sheet.C30.f).be.eql('C28*C29')
    should(sheet.B31.v).be.eql('Author:')
    should(sheet.C31.v).be.eql(categories[1].posts[0].author)
    should(sheet.B34.v).be.eql('Name:')
    should(sheet.C34.v).be.eql(categories[1].posts[1].name)
    should(sheet.B35.v).be.eql('Words Count:')
    should(sheet.C35.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.B36.v).be.eql('Time Per Word:')
    should(sheet.C36.v).be.eql(categories[1].posts[1].timePerWord)
    should(sheet.B37.v).be.eql('Total:')
    should(sheet.C37.f).be.eql('C35*C36')
    should(sheet.B38.v).be.eql('Author:')
    should(sheet.C38.v).be.eql(categories[1].posts[1].author)

    should(sheet.B41.v).be.eql(categories[2].name)
    should(sheet.B43.v).be.eql('Name:')
    should(sheet.C43.v).be.eql(categories[2].posts[0].name)
    should(sheet.B44.v).be.eql('Words Count:')
    should(sheet.C44.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.B45.v).be.eql('Time Per Word:')
    should(sheet.C45.v).be.eql(categories[2].posts[0].timePerWord)
    should(sheet.B46.v).be.eql('Total:')
    should(sheet.C46.f).be.eql('C44*C45')
    should(sheet.B47.v).be.eql('Author:')
    should(sheet.C47.v).be.eql(categories[2].posts[0].author)
    should(sheet.B50.v).be.eql('Name:')
    should(sheet.C50.v).be.eql(categories[2].posts[1].name)
    should(sheet.B51.v).be.eql('Words Count:')
    should(sheet.C51.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.B52.v).be.eql('Time Per Word:')
    should(sheet.C52.v).be.eql(categories[2].posts[1].timePerWord)
    should(sheet.B53.v).be.eql('Total:')
    should(sheet.C53.f).be.eql('C51*C52')
    should(sheet.B54.v).be.eql('Author:')
    should(sheet.C54.v).be.eql(categories[2].posts[1].author)
  })

  it('block loop and row loop nested - create new multiple formula cells from loop', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            timePerWord: 0.4,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            timePerWord: 0.2,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            timePerWord: 0.6,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            timePerWord: 0.7,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            timePerWord: 0.9,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            timePerWord: 0.5,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            timePerWord: 0.6,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-single-row-loop-new-multiple-formula-cells.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B3.v).be.eql(categories[0].posts[0].name)
    should(sheet.C3.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.D3.v).be.eql(categories[0].posts[0].timePerWord)
    should(sheet.E3.f).be.eql('C3*D3')
    should(sheet.F3.f).be.eql('E3*100')
    should(sheet.G3.v).be.eql(categories[0].posts[0].author)
    should(sheet.B4.v).be.eql(categories[0].posts[1].name)
    should(sheet.C4.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.D4.v).be.eql(categories[0].posts[1].timePerWord)
    should(sheet.E4.f).be.eql('C4*D4')
    should(sheet.F4.f).be.eql('E4*100')
    should(sheet.G4.v).be.eql(categories[0].posts[1].author)
    should(sheet.B5.v).be.eql(categories[0].posts[2].name)
    should(sheet.C5.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.D5.v).be.eql(categories[0].posts[2].timePerWord)
    should(sheet.E5.f).be.eql('C5*D5')
    should(sheet.F5.f).be.eql('E5*100')
    should(sheet.G5.v).be.eql(categories[0].posts[2].author)

    should(sheet.B7.v).be.eql(categories[1].name)
    should(sheet.B8.v).be.eql(categories[1].posts[0].name)
    should(sheet.C8.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.D8.v).be.eql(categories[1].posts[0].timePerWord)
    should(sheet.E8.f).be.eql('C8*D8')
    should(sheet.F8.f).be.eql('E8*100')
    should(sheet.G8.v).be.eql(categories[1].posts[0].author)
    should(sheet.B9.v).be.eql(categories[1].posts[1].name)
    should(sheet.C9.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.D9.v).be.eql(categories[1].posts[1].timePerWord)
    should(sheet.E9.f).be.eql('C9*D9')
    should(sheet.F9.f).be.eql('E9*100')
    should(sheet.G9.v).be.eql(categories[1].posts[1].author)

    should(sheet.B11.v).be.eql(categories[2].name)
    should(sheet.B12.v).be.eql(categories[2].posts[0].name)
    should(sheet.C12.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.D12.v).be.eql(categories[2].posts[0].timePerWord)
    should(sheet.E12.f).be.eql('C12*D12')
    should(sheet.F12.f).be.eql('E12*100')
    should(sheet.G12.v).be.eql(categories[2].posts[0].author)
    should(sheet.B13.v).be.eql(categories[2].posts[1].name)
    should(sheet.C13.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.D13.v).be.eql(categories[2].posts[1].timePerWord)
    should(sheet.E13.f).be.eql('C13*D13')
    should(sheet.F13.f).be.eql('E13*100')
    should(sheet.G13.v).be.eql(categories[2].posts[1].author)
  })

  it('block loop and row loop nested - create new formula cells from loop (increment range)', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            timePerWord: 0.4,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            timePerWord: 0.2,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            timePerWord: 0.6,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            timePerWord: 0.7,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            timePerWord: 0.9,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            timePerWord: 0.5,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            timePerWord: 0.6,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-single-row-loop-new-formula-cells-(range).xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B3.v).be.eql(categories[0].posts[0].name)
    should(sheet.C3.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.D3.v).be.eql(categories[0].posts[0].timePerWord)
    should(sheet.E3.f).be.eql('SUM(C3:D3)')
    should(sheet.F3.v).be.eql(categories[0].posts[0].author)
    should(sheet.B4.v).be.eql(categories[0].posts[1].name)
    should(sheet.C4.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.D4.v).be.eql(categories[0].posts[1].timePerWord)
    should(sheet.E4.f).be.eql('SUM(C4:D4)')
    should(sheet.F4.v).be.eql(categories[0].posts[1].author)
    should(sheet.B5.v).be.eql(categories[0].posts[2].name)
    should(sheet.C5.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.D5.v).be.eql(categories[0].posts[2].timePerWord)
    should(sheet.E5.f).be.eql('SUM(C5:D5)')
    should(sheet.F5.v).be.eql(categories[0].posts[2].author)

    should(sheet.B7.v).be.eql(categories[1].name)
    should(sheet.B8.v).be.eql(categories[1].posts[0].name)
    should(sheet.C8.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.D8.v).be.eql(categories[1].posts[0].timePerWord)
    should(sheet.E8.f).be.eql('SUM(C8:D8)')
    should(sheet.F8.v).be.eql(categories[1].posts[0].author)
    should(sheet.B9.v).be.eql(categories[1].posts[1].name)
    should(sheet.C9.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.D9.v).be.eql(categories[1].posts[1].timePerWord)
    should(sheet.E9.f).be.eql('SUM(C9:D9)')
    should(sheet.F9.v).be.eql(categories[1].posts[1].author)

    should(sheet.B11.v).be.eql(categories[2].name)
    should(sheet.B12.v).be.eql(categories[2].posts[0].name)
    should(sheet.C12.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.D12.v).be.eql(categories[2].posts[0].timePerWord)
    should(sheet.E12.f).be.eql('SUM(C12:D12)')
    should(sheet.F12.v).be.eql(categories[2].posts[0].author)
    should(sheet.B13.v).be.eql(categories[2].posts[1].name)
    should(sheet.C13.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.D13.v).be.eql(categories[2].posts[1].timePerWord)
    should(sheet.E13.f).be.eql('SUM(C13:D13)')
    should(sheet.F13.v).be.eql(categories[2].posts[1].author)
  })

  it('block loop and row loop nested - create new formula cells from loop (increment standard cells but don\'t do it for cell using absolute reference for row $)', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            timePerWord: 0.4,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            timePerWord: 0.2,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            timePerWord: 0.6,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            timePerWord: 0.7,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            timePerWord: 0.9,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            timePerWord: 0.5,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            timePerWord: 0.6,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-single-row-loop-new-formula-cells-(row-absolute-reference).xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B3.v).be.eql(categories[0].posts[0].name)
    should(sheet.C3.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.D3.v).be.eql(categories[0].posts[0].timePerWord)
    should(sheet.E3.f).be.eql('A$1*C3*D3')
    should(sheet.F3.v).be.eql(categories[0].posts[0].author)
    should(sheet.B4.v).be.eql(categories[0].posts[1].name)
    should(sheet.C4.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.D4.v).be.eql(categories[0].posts[1].timePerWord)
    should(sheet.E4.f).be.eql('A$1*C4*D4')
    should(sheet.F4.v).be.eql(categories[0].posts[1].author)
    should(sheet.B5.v).be.eql(categories[0].posts[2].name)
    should(sheet.C5.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.D5.v).be.eql(categories[0].posts[2].timePerWord)
    should(sheet.E5.f).be.eql('A$1*C5*D5')
    should(sheet.F5.v).be.eql(categories[0].posts[2].author)

    should(sheet.B7.v).be.eql(categories[1].name)
    should(sheet.B8.v).be.eql(categories[1].posts[0].name)
    should(sheet.C8.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.D8.v).be.eql(categories[1].posts[0].timePerWord)
    should(sheet.E8.f).be.eql('A$1*C8*D8')
    should(sheet.F8.v).be.eql(categories[1].posts[0].author)
    should(sheet.B9.v).be.eql(categories[1].posts[1].name)
    should(sheet.C9.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.D9.v).be.eql(categories[1].posts[1].timePerWord)
    should(sheet.E9.f).be.eql('A$1*C9*D9')
    should(sheet.F9.v).be.eql(categories[1].posts[1].author)

    should(sheet.B11.v).be.eql(categories[2].name)
    should(sheet.B12.v).be.eql(categories[2].posts[0].name)
    should(sheet.C12.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.D12.v).be.eql(categories[2].posts[0].timePerWord)
    should(sheet.E12.f).be.eql('A$1*C12*D12')
    should(sheet.F12.v).be.eql(categories[2].posts[0].author)
    should(sheet.B13.v).be.eql(categories[2].posts[1].name)
    should(sheet.C13.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.D13.v).be.eql(categories[2].posts[1].timePerWord)
    should(sheet.E13.f).be.eql('A$1*C13*D13')
    should(sheet.F13.v).be.eql(categories[2].posts[1].author)
  })

  it('block loop and row loop nested - create new formula cells from loop and update existing', async () => {
    const categories = [
      {
        name: 'In',
        posts: [
          {
            name: 'Anim cillum pariatur',
            wordsCount: 73,
            timePerWord: 0.4,
            author: 'Collins'
          },
          {
            name: 'Dolor minim ea',
            wordsCount: 56,
            timePerWord: 0.2,
            author: 'Wilda'
          },
          {
            name: 'Ut culpa excepteur',
            wordsCount: 75,
            timePerWord: 0.6,
            author: 'Cecelia'
          }
        ]
      },
      {
        name: 'Consectetur',
        posts: [
          {
            name: 'Fugiat irure ea',
            wordsCount: 69,
            timePerWord: 0.7,
            author: 'Wood'
          },
          {
            name: 'Irure ea ullamco',
            wordsCount: 66,
            timePerWord: 0.9,
            author: 'Karin'
          }
        ]
      },
      {
        name: 'Eu',
        posts: [
          {
            name: 'Cillum dolore aliqua',
            wordsCount: 50,
            timePerWord: 0.5,
            author: 'Jeannine'
          },
          {
            name: 'Aliquip anim laboris',
            wordsCount: 91,
            timePerWord: 0.6,
            author: 'Katy'
          }
        ]
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'loop-multiple-rows-and-nested-single-row-loop-formula-cells.xlsx')
            )
          }
        }
      },
      data: {
        categories
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet.B2.v).be.eql(categories[0].name)
    should(sheet.B3.v).be.eql(categories[0].posts[0].name)
    should(sheet.C3.v).be.eql(categories[0].posts[0].wordsCount)
    should(sheet.D3.v).be.eql(categories[0].posts[0].timePerWord)
    should(sheet.E3.f).be.eql('C3*D3')
    should(sheet.F3.v).be.eql(categories[0].posts[0].author)
    should(sheet.B4.v).be.eql(categories[0].posts[1].name)
    should(sheet.C4.v).be.eql(categories[0].posts[1].wordsCount)
    should(sheet.D4.v).be.eql(categories[0].posts[1].timePerWord)
    should(sheet.E4.f).be.eql('C4*D4')
    should(sheet.F4.v).be.eql(categories[0].posts[1].author)
    should(sheet.B5.v).be.eql(categories[0].posts[2].name)
    should(sheet.C5.v).be.eql(categories[0].posts[2].wordsCount)
    should(sheet.D5.v).be.eql(categories[0].posts[2].timePerWord)
    should(sheet.E5.f).be.eql('C5*D5')
    should(sheet.F5.v).be.eql(categories[0].posts[2].author)

    should(sheet.B7.v).be.eql(categories[1].name)
    should(sheet.B8.v).be.eql(categories[1].posts[0].name)
    should(sheet.C8.v).be.eql(categories[1].posts[0].wordsCount)
    should(sheet.D8.v).be.eql(categories[1].posts[0].timePerWord)
    should(sheet.E8.f).be.eql('C8*D8')
    should(sheet.F8.v).be.eql(categories[1].posts[0].author)
    should(sheet.B9.v).be.eql(categories[1].posts[1].name)
    should(sheet.C9.v).be.eql(categories[1].posts[1].wordsCount)
    should(sheet.D9.v).be.eql(categories[1].posts[1].timePerWord)
    should(sheet.E9.f).be.eql('C9*D9')
    should(sheet.F9.v).be.eql(categories[1].posts[1].author)

    should(sheet.B11.v).be.eql(categories[2].name)
    should(sheet.B12.v).be.eql(categories[2].posts[0].name)
    should(sheet.C12.v).be.eql(categories[2].posts[0].wordsCount)
    should(sheet.D12.v).be.eql(categories[2].posts[0].timePerWord)
    should(sheet.E12.f).be.eql('C12*D12')
    should(sheet.F12.v).be.eql(categories[2].posts[0].author)
    should(sheet.B13.v).be.eql(categories[2].posts[1].name)
    should(sheet.C13.v).be.eql(categories[2].posts[1].wordsCount)
    should(sheet.D13.v).be.eql(categories[2].posts[1].timePerWord)
    should(sheet.E13.f).be.eql('C13*D13')
    should(sheet.F13.v).be.eql(categories[2].posts[1].author)

    should(sheet.D18.f).be.eql('SUM(D16:D17)')
    should(sheet.D19.f).be.eql('AVERAGE(D16:D17)')
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
              path.join(xlsxDirPath, 'table.xlsx')
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
            content: fs.readFileSync(path.join(xlsxDirPath, 'invoice.xlsx'))
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
              path.join(xlsxDirPath, 'cols-autofit.xlsx')
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
              path.join(xlsxDirPath, 'cols-autofit-all.xlsx')
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

  it('should not hang with lot of rows', async () => {
    const data = JSON.parse(fs.readFileSync(path.join(dataDirPath, 'lot-of-rows.json')).toString())

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(xlsxDirPath, 'lot-of-rows.xlsx')
            )
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const workbook = xlsx.read(result.content)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    should(sheet['!ref']).be.eql('A1:V4228')
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
