const should = require('should')
const jsreport = require('@jsreport/jsreport-core')
const { calcChainCellExists, createAssertMode, createRender, mergeCellExists } = require('../utils')
const { nodeListToArray } = require('../../lib/utils')

describe('xlsx generation - conditions', () => {
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

  const render = createRender(() => reporter, { modesPrefix: 'condition' })

  // #region basic features and options

  it('inner condition - should render cells when true', async () => {
    const { sheet } = await render('inner-condition', { showLastname: true, lastname: 'Matos' })

    should(sheet['!ref']).be.eql('C2:E3')

    should(sheet.C2.v).be.eql('Name')
    should(sheet.C3.v).be.eql('Boris Matos')
  })

  it('inner condition - should render cells when false', async () => {
    const { sheet } = await render('inner-condition', { showLastname: false, lastname: 'Matos' })

    should(sheet['!ref']).be.eql('C2:E3')

    should(sheet.C2.v).be.eql('Name')
    should(sheet.C3.v).be.eql('Boris')
  })

  it('condition should render cells when true with includeZero', async () => {
    const { sheet } = await render('condition-include-zero', { count: 0 })

    should(sheet.A2.v).be.eql(0)
    should(sheet.A3.v).be.eql('items')
    should(sheet.A4.v).be.eql('End')
  })

  it('condition should remove cells when false with includeZero', async () => {
    const { sheet } = await render('condition-include-zero', {})

    should(sheet.A2.v).be.eql('End')
    should(sheet.A3).be.undefined()
  })

  it('condition should empty the cells when false and keepCells option from data is true', async () => {
    const { sheet } = await render('condition-keep-cells-from-data', { show: false, keep: true, x: 'X', y: 'Y' })

    // the cells of the condition are kept (empty), the cells after it are not moved
    should(sheet.B3.v).be.eql('')
    should(sheet.C3.v).be.eql('')
    should(sheet.D3.v).be.eql('Note')
  })

  it('condition should remove cells when false and keepCells option from data is false', async () => {
    const { sheet } = await render('condition-keep-cells-from-data', { show: false, keep: false, x: 'X', y: 'Y' })

    // the cells of the condition are removed, the cells after it are moved left
    should(sheet.B3.v).be.eql('Note')
    should(sheet.C3).be.not.ok()
    should(sheet.D3).be.not.ok()
  })

  it('condition should remove cells when false and keepCells option from data is missing', async () => {
    const { sheet } = await render('condition-keep-cells-from-data', { show: false, x: 'X', y: 'Y' })

    // a missing value is the same than not passing the option
    should(sheet.B3.v).be.eql('Note')
    should(sheet.C3).be.not.ok()
    should(sheet.D3).be.not.ok()
  })

  it('condition should throw error when keepCells option is not a boolean', async () => {
    return should(render('condition-keep-cells-invalid-option', { a: true })).be.rejectedWith(/Invalid value for "keepCells" option/i)
  })

  it('condition should autofit cols with the content of the cells when true', async () => {
    const data = { show: true, text: 'a long text from the data of the condition' }

    const { sheet } = await render('condition-cols-autofit', data, { parseOptions: { cellStyles: true } })

    should(sheet['!ref']).be.eql('A2:C4')
    should(sheet.A3.v).be.eql(data.text)
    should(sheet.B3.v).be.eql('a long static text inside the condition')

    should(sheet['!cols'][0].customwidth).be.eql('1')
    should(sheet['!cols'][0].width).be.above(sheet['!cols'][2].width)
    should(sheet['!cols'][1].customwidth).be.eql('1')
    should(sheet['!cols'][1].width).be.above(sheet['!cols'][2].width)
  })

  it('condition should autofit cols without the content of the removed cells when false', async () => {
    const data = { show: false, text: 'a long text from the data of the condition' }

    const { sheet } = await render('condition-cols-autofit', data, { parseOptions: { cellStyles: true } })

    should(sheet['!ref']).be.eql('A2:C2')
    should(sheet.A3).be.not.ok()
    should(sheet.B3).be.not.ok()

    // the removed cells (from data and static) do not affect the width of the columns
    should(sheet['!cols'][0].customwidth).be.eql('1')
    should(sheet['!cols'][0].width).be.eql(sheet['!cols'][2].width)
    should(sheet['!cols'][1].customwidth).be.eql('1')
    should(sheet['!cols'][1].width).be.eql(sheet['!cols'][2].width)
  })

  it('condition (keepCells) should autofit cols without the content of the emptied cells when false', async () => {
    const data = { show: false, keep: true, text: 'a long text from the data of the condition' }

    const { sheet } = await render('condition-cols-autofit', data, { parseOptions: { cellStyles: true } })

    should(sheet['!ref']).be.eql('A2:C4')
    should(sheet.A3.v).be.eql('')
    should(sheet.B3.v).be.eql('')

    // the emptied cells (from data and static) do not affect the width of the columns
    should(sheet['!cols'][0].customwidth).be.eql('1')
    should(sheet['!cols'][0].width).be.eql(sheet['!cols'][2].width)
    should(sheet['!cols'][1].customwidth).be.eql('1')
    should(sheet['!cols'][1].width).be.eql(sheet['!cols'][2].width)
  })

  // #endregion basic features and options

  const modes = process.env.XLSX_MODE != null ? process.env.XLSX_MODE.split(',') : ['row', 'block', 'vertical']

  const assertMode = createAssertMode(modes)

  for (const mode of modes) {
    // #region cells

    it(`${mode} condition should render cells when true`, async () => {
      const data = { show: true, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:D3')

          should(sheet.B3.v).be.eql(data.name)
          should(sheet.C3.v).be.eql(data.lastname)
          should(sheet.D3.v).be.eql(data.age)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E6')

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:E4')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4.v).be.eql(data.age)
        }
      })
    })

    it(`${mode} condition should remove cells when false`, async () => {
      const data = { show: false, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:D3')

          should(sheet.B3).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E6')

          should(sheet.B2).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.E3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.D4).be.not.ok()
          should(sheet.E4).be.not.ok()
          should(sheet.B6).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:D4')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2).be.not.ok()
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3).be.not.ok()
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4).be.not.ok()
        }
      })
    })

    it(`${mode} condition (unless) should render cells when false`, async () => {
      const data = { hide: false, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode, name: '-unless' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:D3')

          should(sheet.B3.v).be.eql(data.name)
          should(sheet.C3.v).be.eql(data.lastname)
          should(sheet.D3.v).be.eql(data.age)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E6')

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:E4')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4.v).be.eql(data.age)
        }
      })
    })

    it(`${mode} condition (unless) should remove cells when true`, async () => {
      const data = { hide: true, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode, name: '-unless' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:D3')

          should(sheet.B3).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E6')

          should(sheet.B2).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.E3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.D4).be.not.ok()
          should(sheet.E4).be.not.ok()
          should(sheet.B6).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:D4')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2).be.not.ok()
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3).be.not.ok()
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4).be.not.ok()
        }
      })
    })

    it(`${mode} condition (keepCells) should render cells when true`, async () => {
      const data = { show: true, showPrice: true, x: 'X', y: 'Y', z: 'Z', name: 'Alice', price: 10, qty: 3 }
      const { sheet } = await render({ mode, name: '-keep-cells' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A3:D4')

          should(sheet.A3.v).be.eql('Label')
          should(sheet.B3.v).be.eql(data.x)
          should(sheet.C3.v).be.eql(data.y)
          should(sheet.D3.v).be.eql('Note')
          should(sheet.B4.v).be.eql(data.z)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A3:A5')

          should(sheet.A3.v).be.eql(data.x)
          should(sheet.A4.v).be.eql(data.y)
          should(sheet.A5.v).be.eql('Total')
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('A1:C2')

          should(sheet.A1.v).be.eql('Name')
          should(sheet.B1.v).be.eql('Price')
          should(sheet.C1.v).be.eql('Qty')
          should(sheet.A2.v).be.eql(data.name)
          should(sheet.B2.v).be.eql(data.price)
          should(sheet.C2.v).be.eql(data.qty)
        }
      })
    })

    it(`${mode} condition (keepCells) should empty the cells when false and not move anything`, async () => {
      const data = { show: false, showPrice: false, x: 'X', y: 'Y', z: 'Z', name: 'Alice', price: 10, qty: 3 }

      const { sheet, documents: [sheetDoc] } = await render({ mode, name: '-keep-cells' }, data, {
        files: ['xl/worksheets/sheet1.xml']
      })

      // the cells of the condition are kept (empty) so the content after the condition is not moved
      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A3:D4')

          should(sheet.A3.v).be.eql('Label')
          should(sheet.B3.v).be.eql('')
          should(sheet.C3.v).be.eql('')
          should(sheet.D3.v).be.eql('Note')
          should(sheet.B4.v).be.eql(data.z)

          // the style of the cell is preserved
          const cellEl = nodeListToArray(sheetDoc.getElementsByTagName('c')).find((el) => el.getAttribute('r') === 'B3')
          should(cellEl.getAttribute('s')).be.eql('1')
        },
        block: () => {
          should(sheet['!ref']).be.eql('A3:A5')

          should(sheet.A3.v).be.eql('')
          should(sheet.A4.v).be.eql('')
          should(sheet.A5.v).be.eql('Total')
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('A1:C2')

          should(sheet.A1.v).be.eql('Name')
          should(sheet.B1.v).be.eql('')
          should(sheet.C1.v).be.eql('Qty')
          should(sheet.A2.v).be.eql(data.name)
          should(sheet.B2.v).be.eql('')
          should(sheet.C2.v).be.eql(data.qty)
        }
      })
    })

    it(`${mode} condition should render cells when true (with styled text)`, async () => {
      const data = { show: true, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet, documents: [sheetDoc] } = await render({ mode, name: '-styled' }, data, { files: ['xl/worksheets/sheet1.xml'] })
      const cellEls = nodeListToArray(sheetDoc.getElementsByTagName('c'))

      let styledCellRef

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:D3')

          should(sheet.B3.v).be.eql(data.name)
          should(sheet.C3.v).be.eql(data.lastname + ' - L')
          should(sheet.D3.v).be.eql(data.age)

          styledCellRef = 'C3'
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E6')

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname + ' - L')
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')

          styledCellRef = 'D4'
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:E4')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname + ' - L')
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4.v).be.eql(data.age)

          styledCellRef = 'D3'
        }
      })

      const styledCell = cellEls.find((c) => c.getAttribute('r') === styledCellRef)

      should(styledCell).be.ok()

      const colorEl = styledCell.getElementsByTagName('color')[0]

      should(colorEl).be.ok()
      should(colorEl.getAttribute('rgb')).be.eql('FFFF0000')

      const bEl = styledCell.getElementsByTagName('b')[0]
      should(bEl).be.ok()
    })

    it(`${mode} condition should remove cells when false (with styled text)`, async () => {
      const data = { show: false, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet, documents: [sheetDoc] } = await render({ mode, name: '-styled' }, data, { files: ['xl/worksheets/sheet1.xml'] })
      const cellEls = nodeListToArray(sheetDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:D3')

          should(sheet.B3).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E6')

          should(sheet.B2).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.E3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.D4).be.not.ok()
          should(sheet.E4).be.not.ok()
          should(sheet.B6).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:D4')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2).be.not.ok()
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3).be.not.ok()
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4).be.not.ok()
        }
      })

      // the styled text is part of the content of the condition, so it should not exist
      const styledCells = cellEls.filter((c) => (
        c.getElementsByTagName('color').length > 0 ||
        c.getElementsByTagName('b').length > 0
      ))

      should(styledCells).be.empty()

      const cellsWithStyledText = Object.keys(sheet).filter((key) => (
        !key.startsWith('!') && String(sheet[key].v).includes('- L')
      ))

      should(cellsWithStyledText).be.empty()
    })

    it(`${mode} condition should render cells when true (with content from async helpers)`, async () => {
      const data = { show: true, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode, name: '-with-async-helper' }, data, {
        helpers: `
          async function asyncUppercase (text) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(text.toUpperCase())
              }, 200)
            })
          }
        `
      })

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:D3')

          should(sheet.B3.v).be.eql(data.name)
          should(sheet.C3.v).be.eql(data.lastname.toUpperCase())
          should(sheet.D3.v).be.eql(data.age)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E6')

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname.toUpperCase())
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:E4')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname.toUpperCase())
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4.v).be.eql(data.age)
        }
      })
    })

    it(`${mode} condition should remove cells when false (with content from async helpers)`, async () => {
      const data = { show: false, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode, name: '-with-async-helper' }, data, {
        helpers: `
          async function asyncUppercase (text) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(text.toUpperCase())
              }, 200)
            })
          }
        `
      })

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:D3')

          should(sheet.B3).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E6')

          should(sheet.B2).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.E3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.D4).be.not.ok()
          should(sheet.E4).be.not.ok()
          should(sheet.B6).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:D4')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2).be.not.ok()
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3).be.not.ok()
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4).be.not.ok()
        }
      })

      // the content from the async helper is part of the condition, so it should not exist
      const cellsWithAsyncContent = Object.keys(sheet).filter((key) => (
        !key.startsWith('!') && String(sheet[key].v).includes(data.lastname.toUpperCase())
      ))

      should(cellsWithAsyncContent).be.empty()
    })

    it(`${mode} condition should render cells when true and keep existing rows/cells`, async () => {
      const data = { show: true, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode, name: '-and-existing-cells' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:D5')

          should(sheet.B3.v).be.eql(data.name)
          should(sheet.C3.v).be.eql(data.lastname)
          should(sheet.D3.v).be.eql(data.age)
          should(sheet.B5.v).be.eql('another')
          should(sheet.C5.v).be.eql('content')
          should(sheet.D5.v).be.eql('here')
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E8')

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')
          should(sheet.B8.v).be.eql('another')
          should(sheet.C8.v).be.eql('content')
          should(sheet.D8.v).be.eql('here')
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C1:F4')

          should(sheet.F1.v).be.eql('another')
          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.F2.v).be.eql('content')
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.F3.v).be.eql('here')
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4.v).be.eql(data.age)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update existing rows/cells`, async () => {
      const data = { show: false, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode, name: '-and-existing-cells' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B4:D4')

          should(sheet.B3).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          // the existing cells after the condition are moved up
          should(sheet.B4.v).be.eql('another')
          should(sheet.C4.v).be.eql('content')
          should(sheet.D4.v).be.eql('here')
          should(sheet.B5).be.not.ok()
          should(sheet.C5).be.not.ok()
          should(sheet.D5).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B3:D3')

          should(sheet.B2).be.not.ok()
          // the existing cells after the condition are moved up
          should(sheet.B3.v).be.eql('another')
          should(sheet.C3.v).be.eql('content')
          should(sheet.D3.v).be.eql('here')
          should(sheet.E3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.D4).be.not.ok()
          should(sheet.E4).be.not.ok()
          should(sheet.B6).be.not.ok()
          should(sheet.B8).be.not.ok()
          should(sheet.C8).be.not.ok()
          should(sheet.D8).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C1:F4')

          // the existing cells in rows that are not part of the condition are not moved
          should(sheet.F1.v).be.eql('another')
          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2).be.not.ok()
          // the existing cells after the condition in the same row are moved left
          should(sheet.E2.v).be.eql('content')
          should(sheet.F2).be.not.ok()
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3).be.not.ok()
          should(sheet.E3.v).be.eql('here')
          should(sheet.F3).be.not.ok()
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4).be.not.ok()
        }
      })
    })

    it(`${mode} condition should preserve the content of cells that are not in the condition (left) but in the same row when true`, async () => {
      const data = { show: true, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode, name: '-left-preserve' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A3:E3')

          // preserving the cells on the left of the condition
          should(sheet.A3.v).be.eql('preserve')
          should(sheet.B3.v).be.eql('preserve2')
          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.E3.v).be.eql(data.age)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A2:E6')

          // preserving the cells on the left of the condition
          should(sheet.A2.v).be.eql('preserve')
          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C1:D5')

          // preserving the cells on the left (above) of the condition
          should(sheet.D1.v).be.eql('preserve')
          should(sheet.D2.v).be.eql('preserve2')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql(data.name)
          should(sheet.C4.v).be.eql('Lastname')
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.C5.v).be.eql('Age')
          should(sheet.D5.v).be.eql(data.age)
        }
      })
    })

    it(`${mode} condition should preserve the content of cells that are not in the condition (left) but in the same row when false`, async () => {
      const data = { show: false, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode, name: '-left-preserve' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A3:B3')

          // preserving the cells on the left of the condition, the row is kept
          should(sheet.A3.v).be.eql('preserve')
          should(sheet.B3.v).be.eql('preserve2')
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.E3).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('A2')

          // preserving the cells on the left of the condition, the start row is kept
          should(sheet.A2.v).be.eql('preserve')
          should(sheet.B2).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.B6).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C1:D5')

          // preserving the cells on the left (above) of the condition
          should(sheet.D1.v).be.eql('preserve')
          should(sheet.D2.v).be.eql('preserve2')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3).be.not.ok()
          should(sheet.C4.v).be.eql('Lastname')
          should(sheet.D4).be.not.ok()
          should(sheet.C5.v).be.eql('Age')
          should(sheet.D5).be.not.ok()
        }
      })
    })

    it(`${mode} condition should preserve the content of cells that are not in the condition (right) but in the same row when true`, async () => {
      const data = { show: true, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode, name: '-right-preserve' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:F3')

          // preserving the cells on the right of the condition
          should(sheet.B3.v).be.eql(data.name)
          should(sheet.C3.v).be.eql(data.lastname)
          should(sheet.D3.v).be.eql(data.age)
          should(sheet.E3.v).be.eql('preserve')
          should(sheet.F3.v).be.eql('preserve2')
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E6')

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')

          // preserving the cells on the right of the condition
          should(sheet.C6.v).be.eql('preserve')
          should(sheet.D6.v).be.eql('preserve2')
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:D6')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4.v).be.eql(data.age)

          // preserving the cells on the right (below) of the condition
          should(sheet.D5.v).be.eql('preserve')
          should(sheet.D6.v).be.eql('preserve2')
        }
      })
    })

    it(`${mode} condition should preserve the content of cells that are not in the condition (right) but in the same row when false`, async () => {
      const data = { show: false, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode, name: '-right-preserve' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:C3')

          // preserving the cells on the right of the condition, the row is kept
          // and the cells are moved left
          should(sheet.B3.v).be.eql('preserve')
          should(sheet.C3.v).be.eql('preserve2')
          should(sheet.D3).be.not.ok()
          should(sheet.E3).be.not.ok()
          should(sheet.F3).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:C2')

          // preserving the cells on the right of the condition, the end row is kept
          // (moved up) and the cells are moved left
          should(sheet.B2.v).be.eql('preserve')
          should(sheet.C2.v).be.eql('preserve2')
          should(sheet.C3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.B6).be.not.ok()
          should(sheet.C6).be.not.ok()
          should(sheet.D6).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:D6')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2).be.not.ok()
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3).be.not.ok()
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4).be.not.ok()

          // preserving the cells on the right (below) of the condition
          should(sheet.D5.v).be.eql('preserve')
          should(sheet.D6.v).be.eql('preserve2')
        }
      })
    })

    it(`${mode} condition should preserve the content of cells that are not in the condition (left, right) but in the same row when true`, async () => {
      const data = { show: true, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode, name: '-left-right-preserve' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A3:G3')

          // preserving the cells on the left and right of the condition
          should(sheet.A3.v).be.eql('preserve')
          should(sheet.B3.v).be.eql('preserve2')
          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.E3.v).be.eql(data.age)
          should(sheet.F3.v).be.eql('preserve3')
          should(sheet.G3.v).be.eql('preserve4')
        },
        block: () => {
          should(sheet['!ref']).be.eql('A2:E6')

          // preserving the cells on the left and right of the condition
          should(sheet.A2.v).be.eql('preserve')
          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')
          should(sheet.C6.v).be.eql('preserve2')
          should(sheet.D6.v).be.eql('preserve3')
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C1:D7')

          // preserving the cells on the left (above) and right (below) of the condition
          should(sheet.D1.v).be.eql('preserve')
          should(sheet.D2.v).be.eql('preserve2')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql(data.name)
          should(sheet.C4.v).be.eql('Lastname')
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.C5.v).be.eql('Age')
          should(sheet.D5.v).be.eql(data.age)
          should(sheet.D6.v).be.eql('preserve3')
          should(sheet.D7.v).be.eql('preserve4')
        }
      })
    })

    it(`${mode} condition should preserve the content of cells that are not in the condition (left, right) but in the same row when false`, async () => {
      const data = { show: false, name: 'Alexander', lastname: 'Smith', age: 32 }
      const { sheet } = await render({ mode, name: '-left-right-preserve' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A3:D3')

          // preserving the cells on the left and right of the condition, the row is kept
          // and the cells on the right are moved left
          should(sheet.A3.v).be.eql('preserve')
          should(sheet.B3.v).be.eql('preserve2')
          should(sheet.C3.v).be.eql('preserve3')
          should(sheet.D3.v).be.eql('preserve4')
          should(sheet.E3).be.not.ok()
          should(sheet.F3).be.not.ok()
          should(sheet.G3).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('A2:C3')

          // preserving the cells on the left and right of the condition, the start and end rows
          // are kept (the end row is moved up) and the cells on the right are moved left
          should(sheet.A2.v).be.eql('preserve')
          should(sheet.B2).be.not.ok()
          should(sheet.B3.v).be.eql('preserve2')
          should(sheet.C3.v).be.eql('preserve3')
          should(sheet.D3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.B6).be.not.ok()
          should(sheet.C6).be.not.ok()
          should(sheet.D6).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C1:D7')

          // preserving the cells on the left (above) and right (below) of the condition
          should(sheet.D1.v).be.eql('preserve')
          should(sheet.D2.v).be.eql('preserve2')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3).be.not.ok()
          should(sheet.C4.v).be.eql('Lastname')
          should(sheet.D4).be.not.ok()
          should(sheet.C5.v).be.eql('Age')
          should(sheet.D5).be.not.ok()
          should(sheet.D6.v).be.eql('preserve3')
          should(sheet.D7.v).be.eql('preserve4')
        }
      })
    })

    if (mode === 'block') {
      it('block condition should preserve the content of cells that are not in the condition (left, right) but in the same row when true and there are only no rows definition between them', async () => {
        const data = { show: true, name: 'Alexander', lastname: 'Smith' }
        const { sheet } = await render('condition-block-left-right-preserve-middle-rows-with-no-definition', data)

        should(sheet['!ref']).be.eql('A2:C5')

        should(sheet.A2.v).be.eql('preserve')
        should(sheet.B2.v).be.eql(data.name)
        should(sheet.B5.v).be.eql(data.lastname)
        should(sheet.C5.v).be.eql('preserve2')
      })

      it('block condition should preserve the content of cells that are not in the condition (left, right) but in the same row when false and there are only no rows definition between them', async () => {
        const data = { show: false, name: 'Alexander', lastname: 'Smith' }
        const { sheet } = await render('condition-block-left-right-preserve-middle-rows-with-no-definition', data)

        should(sheet['!ref']).be.eql('A2:B3')

        // the start row is kept
        should(sheet.A2.v).be.eql('preserve')
        should(sheet.B2).be.not.ok()

        // the empty rows between are removed, the end row is kept (moved up)
        // and the cells on the right are moved left
        should(sheet.B3.v).be.eql('preserve2')
        should(sheet.C3).be.not.ok()
        should(sheet.B5).be.not.ok()
        should(sheet.C5).be.not.ok()
      })
    }

    it(`${mode} multiple conditions should render cells when true and keep existing rows/cells`, async () => {
      const data = {
        show: true,
        show2: true,
        show3: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32,
        name2: 'Robert',
        lastname2: 'Hill',
        age2: 49,
        name3: 'Mathew',
        lastname3: 'Gonzales',
        age3: 26
      }

      const { sheet } = await render({ mode, name: '-multiple' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B2:E13')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql('Lastname')
          should(sheet.E2.v).be.eql('Age')
          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.E3.v).be.eql(data.age)

          should(sheet.B5.v).be.eql('another')
          should(sheet.C5.v).be.eql('content')
          should(sheet.D5.v).be.eql('here')

          should(sheet.C7.v).be.eql('Name')
          should(sheet.D7.v).be.eql('Lastname')
          should(sheet.E7.v).be.eql('Age')
          should(sheet.C8.v).be.eql(data.name2)
          should(sheet.D8.v).be.eql(data.lastname2)
          should(sheet.E8.v).be.eql(data.age2)

          should(sheet.B10.v).be.eql('another2')
          should(sheet.C10.v).be.eql('content2')
          should(sheet.D10.v).be.eql('here2')

          should(sheet.C12.v).be.eql('Name')
          should(sheet.D12.v).be.eql('Lastname')
          should(sheet.E12.v).be.eql('Age')
          should(sheet.C13.v).be.eql(data.name3)
          should(sheet.D13.v).be.eql(data.lastname3)
          should(sheet.E13.v).be.eql(data.age3)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E22')

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')

          should(sheet.B8.v).be.eql('another')
          should(sheet.C8.v).be.eql('content')
          should(sheet.D8.v).be.eql('here')

          should(sheet.B10.v).be.eql('')
          should(sheet.C11.v).be.eql('Name')
          should(sheet.D11.v).be.eql('Lastname')
          should(sheet.E11.v).be.eql('Age')
          should(sheet.C12.v).be.eql(data.name2)
          should(sheet.D12.v).be.eql(data.lastname2)
          should(sheet.E12.v).be.eql(data.age2)
          should(sheet.B14.v).be.eql('')

          should(sheet.B16.v).be.eql('another2')
          should(sheet.C16.v).be.eql('content2')
          should(sheet.D16.v).be.eql('here2')

          should(sheet.B18.v).be.eql('')
          should(sheet.C19.v).be.eql('Name')
          should(sheet.D19.v).be.eql('Lastname')
          should(sheet.E19.v).be.eql('Age')
          should(sheet.C20.v).be.eql(data.name3)
          should(sheet.D20.v).be.eql(data.lastname3)
          should(sheet.E20.v).be.eql(data.age3)
          should(sheet.B22.v).be.eql('')
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C1:N4')

          should(sheet.F1.v).be.eql('another')
          should(sheet.K1.v).be.eql('another2')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4.v).be.eql(data.age)

          should(sheet.F2.v).be.eql('content')
          should(sheet.F3.v).be.eql('here')

          should(sheet.H2.v).be.eql('Name')
          should(sheet.I2.v).be.eql(data.name2)
          should(sheet.H3.v).be.eql('Lastname')
          should(sheet.I3.v).be.eql(data.lastname2)
          should(sheet.H4.v).be.eql('Age')
          should(sheet.I4.v).be.eql(data.age2)

          should(sheet.K2.v).be.eql('content2')
          should(sheet.K3.v).be.eql('here2')

          should(sheet.M2.v).be.eql('Name')
          should(sheet.N2.v).be.eql(data.name3)
          should(sheet.M3.v).be.eql('Lastname')
          should(sheet.N3.v).be.eql(data.lastname3)
          should(sheet.M4.v).be.eql('Age')
          should(sheet.N4.v).be.eql(data.age3)
        }
      })
    })

    it(`${mode} multiple conditions should remove cells when false and update existing rows/cells`, async () => {
      const data = {
        show: false,
        show2: true,
        show3: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32,
        name2: 'Robert',
        lastname2: 'Hill',
        age2: 49,
        name3: 'Mathew',
        lastname3: 'Gonzales',
        age3: 26
      }

      const { sheet } = await render({ mode, name: '-multiple' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B2:E11')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql('Lastname')
          should(sheet.E2.v).be.eql('Age')

          // the row of the first condition is removed, the rest is moved up
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.E3).be.not.ok()

          should(sheet.B4.v).be.eql('another')
          should(sheet.C4.v).be.eql('content')
          should(sheet.D4.v).be.eql('here')

          should(sheet.C6.v).be.eql('Name')
          should(sheet.D6.v).be.eql('Lastname')
          should(sheet.E6.v).be.eql('Age')
          should(sheet.C7.v).be.eql(data.name2)
          should(sheet.D7.v).be.eql(data.lastname2)
          should(sheet.E7.v).be.eql(data.age2)

          should(sheet.B9.v).be.eql('another2')
          should(sheet.C9.v).be.eql('content2')
          should(sheet.D9.v).be.eql('here2')

          should(sheet.C11.v).be.eql('Name')
          should(sheet.D11.v).be.eql('Lastname')
          should(sheet.E11.v).be.eql('Age')

          // the row of the last condition is removed
          should(sheet.C12).be.not.ok()
          should(sheet.D12).be.not.ok()
          should(sheet.E12).be.not.ok()
          should(sheet.C13).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B3:E11')

          // the rows of the first condition are removed, the rest is moved up
          should(sheet.B2).be.not.ok()
          should(sheet.C4).be.not.ok()

          should(sheet.B3.v).be.eql('another')
          should(sheet.C3.v).be.eql('content')
          should(sheet.D3.v).be.eql('here')

          should(sheet.B5.v).be.eql('')
          should(sheet.C6.v).be.eql('Name')
          should(sheet.D6.v).be.eql('Lastname')
          should(sheet.E6.v).be.eql('Age')
          should(sheet.C7.v).be.eql(data.name2)
          should(sheet.D7.v).be.eql(data.lastname2)
          should(sheet.E7.v).be.eql(data.age2)
          should(sheet.B9.v).be.eql('')

          should(sheet.B11.v).be.eql('another2')
          should(sheet.C11.v).be.eql('content2')
          should(sheet.D11.v).be.eql('here2')

          // the rows of the last condition are removed
          should(sheet.B13).be.not.ok()
          should(sheet.C14).be.not.ok()
          should(sheet.C15).be.not.ok()
          should(sheet.B17).be.not.ok()
          should(sheet.B18).be.not.ok()
          should(sheet.C20).be.not.ok()
          should(sheet.B22).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C1:L4')

          // the cells that are not in the rows of the conditions are not moved
          should(sheet.F1.v).be.eql('another')
          should(sheet.K1.v).be.eql('another2')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.C4.v).be.eql('Age')

          // the cells of the first condition are removed, the rest is moved left
          should(sheet.E2.v).be.eql('content')
          should(sheet.E3.v).be.eql('here')
          should(sheet.E4).be.not.ok()

          should(sheet.G2.v).be.eql('Name')
          should(sheet.H2.v).be.eql(data.name2)
          should(sheet.G3.v).be.eql('Lastname')
          should(sheet.H3.v).be.eql(data.lastname2)
          should(sheet.G4.v).be.eql('Age')
          should(sheet.H4.v).be.eql(data.age2)

          should(sheet.J2.v).be.eql('content2')
          should(sheet.J3.v).be.eql('here2')

          should(sheet.L2.v).be.eql('Name')
          should(sheet.L3.v).be.eql('Lastname')
          should(sheet.L4.v).be.eql('Age')

          // the cells of the last condition are removed
          should(sheet.M2).be.not.ok()
          should(sheet.M3).be.not.ok()
          should(sheet.M4).be.not.ok()
          should(sheet.N2).be.not.ok()
          should(sheet.N3).be.not.ok()
          should(sheet.N4).be.not.ok()
        }
      })
    })

    for (const showNickname of [true, false]) {
      it(`${mode} condition should render cells when true (with inner condition ${showNickname ? 'true' : 'false'})`, async () => {
        const data = { show: true, showNickname, name: 'Alexander', lastname: 'Smith', nickname: 'Sasha', age: 32 }
        const { sheet } = await render({ mode, name: '-and-inner-condition' }, data)

        // the inner condition only decides the content of its cell
        const nicknameValue = showNickname ? data.nickname : ''

        assertMode(mode, {
          row: () => {
            should(sheet['!ref']).be.eql('B3:E3')

            should(sheet.B3.v).be.eql(data.name)
            should(sheet.C3.v).be.eql(data.lastname)
            should(sheet.D3.v).be.eql(nicknameValue)
            should(sheet.E3.v).be.eql(data.age)
          },
          block: () => {
            should(sheet['!ref']).be.eql('B2:F6')

            should(sheet.B2.v).be.eql('')
            should(sheet.C3.v).be.eql('Name')
            should(sheet.D3.v).be.eql('Lastname')
            should(sheet.E3.v).be.eql('Nickname')
            should(sheet.F3.v).be.eql('Age')
            should(sheet.C4.v).be.eql(data.name)
            should(sheet.D4.v).be.eql(data.lastname)
            should(sheet.E4.v).be.eql(nicknameValue)
            should(sheet.F4.v).be.eql(data.age)
            should(sheet.B6.v).be.eql('')
          },
          vertical: () => {
            should(sheet['!ref']).be.eql('C2:E5')

            should(sheet.C2.v).be.eql('Name')
            should(sheet.D2.v).be.eql(data.name)
            should(sheet.C3.v).be.eql('Lastname')
            should(sheet.D3.v).be.eql(data.lastname)
            should(sheet.C4.v).be.eql('Nickname')
            should(sheet.D4.v).be.eql(nicknameValue)
            should(sheet.C5.v).be.eql('Age')
            should(sheet.D5.v).be.eql(data.age)
          }
        })
      })
    }

    it(`${mode} condition should remove cells when false (with inner condition)`, async () => {
      const data = { show: false, showNickname: true, name: 'Alexander', lastname: 'Smith', nickname: 'Sasha', age: 32 }
      const { sheet } = await render({ mode, name: '-and-inner-condition' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:E3')

          should(sheet.B3).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.E3).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:F6')

          should(sheet.B2).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.E3).be.not.ok()
          should(sheet.F3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.D4).be.not.ok()
          should(sheet.E4).be.not.ok()
          should(sheet.F4).be.not.ok()
          should(sheet.B6).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:D5')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2).be.not.ok()
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3).be.not.ok()
          should(sheet.C4.v).be.eql('Nickname')
          should(sheet.D4).be.not.ok()
          should(sheet.C5.v).be.eql('Age')
          should(sheet.D5).be.not.ok()
        }
      })

      // the inner condition is part of the content of the outer condition, so its content should not exist
      const cellsWithInnerContent = Object.keys(sheet).filter((key) => (
        !key.startsWith('!') && String(sheet[key].v).includes(data.nickname)
      ))

      should(cellsWithInnerContent).be.empty()
    })

    it(`${mode} condition should render cells when true when there are sibling conditions`, async () => {
      const data = {
        show: true,
        show2: true,
        show3: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32,
        name2: 'Emma',
        lastname2: 'Johnson',
        age2: 27,
        name3: 'Oliver',
        lastname3: 'Taylor',
        age3: 28
      }

      const { sheet } = await render({ mode, name: '-siblings' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:D7')

          should(sheet.B3.v).be.eql(data.name)
          should(sheet.C3.v).be.eql(data.lastname)
          should(sheet.D3.v).be.eql(data.age)

          should(sheet.B5.v).be.eql(data.name2)
          should(sheet.C5.v).be.eql(data.lastname2)
          should(sheet.D5.v).be.eql(data.age2)

          should(sheet.B7.v).be.eql(data.name3)
          should(sheet.C7.v).be.eql(data.lastname3)
          should(sheet.D7.v).be.eql(data.age3)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E18')

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')

          should(sheet.B8.v).be.eql('')
          should(sheet.C9.v).be.eql('Name')
          should(sheet.D9.v).be.eql('Lastname')
          should(sheet.E9.v).be.eql('Age')
          should(sheet.C10.v).be.eql(data.name2)
          should(sheet.D10.v).be.eql(data.lastname2)
          should(sheet.E10.v).be.eql(data.age2)
          should(sheet.B12.v).be.eql('')

          should(sheet.B14.v).be.eql('')
          should(sheet.C15.v).be.eql('Name')
          should(sheet.D15.v).be.eql('Lastname')
          should(sheet.E15.v).be.eql('Age')
          should(sheet.C16.v).be.eql(data.name3)
          should(sheet.D16.v).be.eql(data.lastname3)
          should(sheet.E16.v).be.eql(data.age3)
          should(sheet.B18.v).be.eql('')
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:J4')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.F2.v).be.eql('Name')
          should(sheet.G2.v).be.eql(data.name2)
          should(sheet.I2.v).be.eql('Name')
          should(sheet.J2.v).be.eql(data.name3)

          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.F3.v).be.eql('Lastname')
          should(sheet.G3.v).be.eql(data.lastname2)
          should(sheet.I3.v).be.eql('Lastname')
          should(sheet.J3.v).be.eql(data.lastname3)

          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4.v).be.eql(data.age)
          should(sheet.F4.v).be.eql('Age')
          should(sheet.G4.v).be.eql(data.age2)
          should(sheet.I4.v).be.eql('Age')
          should(sheet.J4.v).be.eql(data.age3)
        }
      })
    })

    it(`${mode} condition should remove cells when false when there are sibling conditions`, async () => {
      const data = {
        show: true,
        show2: false,
        show3: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32,
        name2: 'Emma',
        lastname2: 'Johnson',
        age2: 27,
        name3: 'Oliver',
        lastname3: 'Taylor',
        age3: 28
      }

      const { sheet } = await render({ mode, name: '-siblings' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:D6')

          should(sheet.B3.v).be.eql(data.name)
          should(sheet.C3.v).be.eql(data.lastname)
          should(sheet.D3.v).be.eql(data.age)

          should(sheet.B5).be.not.ok()
          should(sheet.C5).be.not.ok()
          should(sheet.D5).be.not.ok()

          // the next sibling is moved up
          should(sheet.B6.v).be.eql(data.name3)
          should(sheet.C6.v).be.eql(data.lastname3)
          should(sheet.D6.v).be.eql(data.age3)

          should(sheet.B7).be.not.ok()
          should(sheet.C7).be.not.ok()
          should(sheet.D7).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E13')

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')

          should(sheet.B8).be.not.ok()
          should(sheet.C9).be.not.ok()

          // the next sibling is moved up
          should(sheet.B9.v).be.eql('')
          should(sheet.C10.v).be.eql('Name')
          should(sheet.D10.v).be.eql('Lastname')
          should(sheet.E10.v).be.eql('Age')
          should(sheet.C11.v).be.eql(data.name3)
          should(sheet.D11.v).be.eql(data.lastname3)
          should(sheet.E11.v).be.eql(data.age3)
          should(sheet.B13.v).be.eql('')

          should(sheet.B14).be.not.ok()
          should(sheet.C15).be.not.ok()
          should(sheet.C16).be.not.ok()
          should(sheet.B18).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:I4')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.F2.v).be.eql('Name')
          should(sheet.G2).be.not.ok()

          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.F3.v).be.eql('Lastname')
          should(sheet.G3).be.not.ok()

          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4.v).be.eql(data.age)
          should(sheet.F4.v).be.eql('Age')
          should(sheet.G4).be.not.ok()

          // the next sibling is moved left
          should(sheet.H2.v).be.eql('Name')
          should(sheet.I2.v).be.eql(data.name3)
          should(sheet.H3.v).be.eql('Lastname')
          should(sheet.I3.v).be.eql(data.lastname3)
          should(sheet.H4.v).be.eql('Age')
          should(sheet.I4.v).be.eql(data.age3)

          should(sheet.J2).be.not.ok()
          should(sheet.J3).be.not.ok()
          should(sheet.J4).be.not.ok()
        }
      })
    })

    it(`${mode} condition should render cells when true when there are mixed sibling conditions`, async () => {
      const data = {
        show: true,
        show2: true,
        show3: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32,
        name2: 'Emma',
        lastname2: 'Johnson',
        age2: 27,
        name3: 'Oliver',
        lastname3: 'Taylor',
        age3: 28
      }

      const { sheet } = await render({ mode, name: '-mixed-siblings' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:E11')

          // row condition
          should(sheet.B3.v).be.eql(data.name)
          should(sheet.C3.v).be.eql(data.lastname)
          should(sheet.D3.v).be.eql(data.age)

          // block condition
          should(sheet.B5.v).be.eql('')
          should(sheet.C6.v).be.eql('Name')
          should(sheet.D6.v).be.eql('Lastname')
          should(sheet.E6.v).be.eql('Age')
          should(sheet.C7.v).be.eql(data.name2)
          should(sheet.D7.v).be.eql(data.lastname2)
          should(sheet.E7.v).be.eql(data.age2)
          should(sheet.B9.v).be.eql('')

          // row condition
          should(sheet.B11.v).be.eql(data.name3)
          should(sheet.C11.v).be.eql(data.lastname3)
          should(sheet.D11.v).be.eql(data.age3)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E14')

          // block condition
          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')

          // row condition
          should(sheet.B8.v).be.eql(data.name2)
          should(sheet.C8.v).be.eql(data.lastname2)
          should(sheet.D8.v).be.eql(data.age2)

          // block condition
          should(sheet.B10.v).be.eql('')
          should(sheet.C11.v).be.eql('Name')
          should(sheet.D11.v).be.eql('Lastname')
          should(sheet.E11.v).be.eql('Age')
          should(sheet.C12.v).be.eql(data.name3)
          should(sheet.D12.v).be.eql(data.lastname3)
          should(sheet.E12.v).be.eql(data.age3)
          should(sheet.B14.v).be.eql('')
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B3:G13')

          // row condition
          should(sheet.B3.v).be.eql(data.name)
          should(sheet.C3.v).be.eql(data.lastname)
          should(sheet.D3.v).be.eql(data.age)

          // vertical conditions
          should(sheet.C5.v).be.eql('Name')
          should(sheet.D5.v).be.eql(data.name2)
          should(sheet.F5.v).be.eql('Name')
          should(sheet.G5.v).be.eql(data.name2)
          should(sheet.C6.v).be.eql('Lastname')
          should(sheet.D6.v).be.eql(data.lastname2)
          should(sheet.F6.v).be.eql('Lastname')
          should(sheet.G6.v).be.eql(data.lastname2)
          should(sheet.C7.v).be.eql('Age')
          should(sheet.D7.v).be.eql(data.age2)
          should(sheet.F7.v).be.eql('Age')
          should(sheet.G7.v).be.eql(data.age2)

          // block condition
          should(sheet.B9.v).be.eql('')
          should(sheet.C10.v).be.eql('Name')
          should(sheet.D10.v).be.eql('Lastname')
          should(sheet.E10.v).be.eql('Age')
          should(sheet.C11.v).be.eql(data.name3)
          should(sheet.D11.v).be.eql(data.lastname3)
          should(sheet.E11.v).be.eql(data.age3)
          should(sheet.B13.v).be.eql('')
        }
      })
    })

    it(`${mode} condition should remove cells when false when there are mixed sibling conditions`, async () => {
      const data = {
        show: true,
        show2: false,
        show3: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32,
        name2: 'Emma',
        lastname2: 'Johnson',
        age2: 27,
        name3: 'Oliver',
        lastname3: 'Taylor',
        age3: 28
      }

      const { sheet } = await render({ mode, name: '-mixed-siblings' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:D6')

          // row condition
          should(sheet.B3.v).be.eql(data.name)
          should(sheet.C3.v).be.eql(data.lastname)
          should(sheet.D3.v).be.eql(data.age)

          // block condition is removed
          should(sheet.B5).be.not.ok()
          should(sheet.E6).be.not.ok()
          should(sheet.C7).be.not.ok()
          should(sheet.B9).be.not.ok()

          // the next sibling (row condition) is moved up
          should(sheet.B6.v).be.eql(data.name3)
          should(sheet.C6.v).be.eql(data.lastname3)
          should(sheet.D6.v).be.eql(data.age3)
          should(sheet.B11).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E13')

          // block condition
          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')

          // row condition is removed
          should(sheet.B8).be.not.ok()
          should(sheet.C8).be.not.ok()
          should(sheet.D8).be.not.ok()

          // the next sibling (block condition) is moved up
          should(sheet.B9.v).be.eql('')
          should(sheet.C10.v).be.eql('Name')
          should(sheet.D10.v).be.eql('Lastname')
          should(sheet.E10.v).be.eql('Age')
          should(sheet.C11.v).be.eql(data.name3)
          should(sheet.D11.v).be.eql(data.lastname3)
          should(sheet.E11.v).be.eql(data.age3)
          should(sheet.B13.v).be.eql('')
          should(sheet.B14).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B3:E13')

          // row condition
          should(sheet.B3.v).be.eql(data.name)
          should(sheet.C3.v).be.eql(data.lastname)
          should(sheet.D3.v).be.eql(data.age)

          // vertical conditions are removed and the cells after them in the row are moved left
          should(sheet.C5.v).be.eql('Name')
          should(sheet.D5).be.not.ok()
          should(sheet.E5.v).be.eql('Name')
          should(sheet.F5).be.not.ok()
          should(sheet.G5).be.not.ok()
          should(sheet.C6.v).be.eql('Lastname')
          should(sheet.D6).be.not.ok()
          should(sheet.E6.v).be.eql('Lastname')
          should(sheet.F6).be.not.ok()
          should(sheet.G6).be.not.ok()
          should(sheet.C7.v).be.eql('Age')
          should(sheet.D7).be.not.ok()
          should(sheet.E7.v).be.eql('Age')
          should(sheet.F7).be.not.ok()
          should(sheet.G7).be.not.ok()

          // the next sibling (block condition) is not moved
          should(sheet.B9.v).be.eql('')
          should(sheet.C10.v).be.eql('Name')
          should(sheet.D10.v).be.eql('Lastname')
          should(sheet.E10.v).be.eql('Age')
          should(sheet.C11.v).be.eql(data.name3)
          should(sheet.D11.v).be.eql(data.lastname3)
          should(sheet.E11.v).be.eql(data.age3)
          should(sheet.B13.v).be.eql('')
        }
      })
    })

    if (mode === 'block') {
      it('block condition should render cells when true and remove the sibling condition that starts in its end row', async () => {
        const { sheet } = await render('condition-sibling-conditions-shared-row', { a: true, b: false, x: 'x', y: 'y', z: 'z' })

        should(sheet.A3.v).be.eql('x')
        should(sheet.A4.v).be.eql('y')
        should(sheet.A5.v).be.eql('z')
        should(sheet.B5).be.undefined()
        should(sheet.A6.v).be.eql('End')
      })

      it('block condition should remove cells when false and keep the sibling condition that starts in its end row', async () => {
        const { sheet } = await render('condition-sibling-conditions-shared-row', { a: false, b: true, w: 'w', v: 'v' })

        should(sheet.A3.v).be.eql('w')
        should(sheet.A4.v).be.eql('v')
        should(sheet.A5.v).be.eql('End')
      })
    }

    // #endregion cells

    // #region merged cells

    it(`${mode} condition should render cells when true and keep existing merged cells`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-update-merged-cells' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B1:G5')

          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.E3.v).be.eql(data.age)

          should(sheet['!merges'].length).be.eql(3)
          should(sheet.B1.v).be.eql('merged')
          should(mergeCellExists(sheet, 'B1:C1')).be.True()
          should(sheet.B5.v).be.eql('merged2')
          should(mergeCellExists(sheet, 'B5:C5')).be.True()
          should(sheet.E5.v).be.eql('merged3')
          should(mergeCellExists(sheet, 'E5:G5')).be.True()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B1:G8')

          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)

          should(sheet['!merges'].length).be.eql(3)
          should(sheet.B1.v).be.eql('merged')
          should(mergeCellExists(sheet, 'B1:C1')).be.True()
          should(sheet.B8.v).be.eql('merged2')
          should(mergeCellExists(sheet, 'B8:C8')).be.True()
          should(sheet.E8.v).be.eql('merged3')
          should(mergeCellExists(sheet, 'E8:G8')).be.True()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B1:F6')

          should(sheet.D2.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.D4.v).be.eql(data.age)

          should(sheet['!merges'].length).be.eql(3)
          should(sheet.B1.v).be.eql('merged')
          should(mergeCellExists(sheet, 'B1:B2')).be.True()
          should(sheet.F2.v).be.eql('merged2')
          should(mergeCellExists(sheet, 'F2:F3')).be.True()
          should(sheet.F5.v).be.eql('merged3')
          should(mergeCellExists(sheet, 'F5:F6')).be.True()
        }
      })
    })

    it(`${mode} condition should remove cells when false and update existing merged cells`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-update-merged-cells' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B1:G4')

          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.E3).be.not.ok()

          should(sheet['!merges'].length).be.eql(3)
          should(sheet.B1.v).be.eql('merged')
          should(mergeCellExists(sheet, 'B1:C1')).be.True()
          // the merged cells after the condition are moved up
          should(sheet.B4.v).be.eql('merged2')
          should(mergeCellExists(sheet, 'B4:C4')).be.True()
          should(sheet.E4.v).be.eql('merged3')
          should(mergeCellExists(sheet, 'E4:G4')).be.True()
          should(sheet.B5).be.not.ok()
          should(sheet.E5).be.not.ok()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B1:G3')

          should(sheet.B2).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.B6).be.not.ok()

          should(sheet['!merges'].length).be.eql(3)
          should(sheet.B1.v).be.eql('merged')
          should(mergeCellExists(sheet, 'B1:C1')).be.True()
          // the merged cells after the condition are moved up
          should(sheet.B3.v).be.eql('merged2')
          should(mergeCellExists(sheet, 'B3:C3')).be.True()
          should(sheet.E3.v).be.eql('merged3')
          should(mergeCellExists(sheet, 'E3:G3')).be.True()
          should(sheet.B8).be.not.ok()
          should(sheet.E8).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B1:F6')

          should(sheet.D2).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.D4).be.not.ok()

          should(sheet['!merges'].length).be.eql(3)
          should(sheet.B1.v).be.eql('merged')
          should(mergeCellExists(sheet, 'B1:B2')).be.True()
          // the merged cells in the rows of the condition are moved left
          should(sheet.E2.v).be.eql('merged2')
          should(mergeCellExists(sheet, 'E2:E3')).be.True()
          // the merged cells that are not in the rows of the condition are not moved
          should(sheet.F5.v).be.eql('merged3')
          should(mergeCellExists(sheet, 'F5:F6')).be.True()
        }
      })
    })

    it(`${mode} condition should render cells when true and keep merged cells inside it`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-merged-cells-inside' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:F3')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql('Lastname')
          should(sheet.F2.v).be.eql('Age')
          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.F3.v).be.eql(data.age)

          should(sheet['!merges'].length).be.eql(1)
          should(mergeCellExists(sheet, 'D3:E3')).be.True()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:F6')

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.F3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.F4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')

          should(sheet['!merges'].length).be.eql(1)
          should(mergeCellExists(sheet, 'D4:E4')).be.True()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:D5')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.C5.v).be.eql('Age')
          should(sheet.D5.v).be.eql(data.age)

          should(sheet['!merges'].length).be.eql(1)
          should(mergeCellExists(sheet, 'D3:D4')).be.True()
        }
      })
    })

    it(`${mode} condition should remove cells when false and remove merged cells inside it`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-merged-cells-inside' }, data)

      should(sheet['!merges'] ?? []).have.length(0)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:F2')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql('Lastname')
          should(sheet.F2.v).be.eql('Age')
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.F3).be.not.ok()
        },
        block: () => {
          // all the content is in the condition, so nothing is rendered and the dimension
          // of the template is kept
          should(sheet['!ref']).be.eql('B2:F6')

          should(sheet.B2).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.B6).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:C5')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.C5.v).be.eql('Age')
          should(sheet.D2).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.D5).be.not.ok()
        }
      })
    })

    it(`${mode} condition should render cells when true and keep multiple merged cells inside it`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        job: 'Developer',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-multiple-merged-cells-inside' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:H3')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql('Lastname')
          should(sheet.F2.v).be.eql('Job')
          should(sheet.H2.v).be.eql('Age')
          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.F3.v).be.eql(data.job)
          should(sheet.H3.v).be.eql(data.age)

          should(sheet['!merges'].length).be.eql(2)
          should(mergeCellExists(sheet, 'D3:E3')).be.True()
          should(mergeCellExists(sheet, 'F3:G3')).be.True()
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:H6')

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.F3.v).be.eql('Job')
          should(sheet.H3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.F4.v).be.eql(data.job)
          should(sheet.H4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')

          should(sheet['!merges'].length).be.eql(2)
          should(mergeCellExists(sheet, 'D4:E4')).be.True()
          should(mergeCellExists(sheet, 'F4:G4')).be.True()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:D7')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.C5.v).be.eql('Job')
          should(sheet.D5.v).be.eql(data.job)
          should(sheet.C7.v).be.eql('Age')
          should(sheet.D7.v).be.eql(data.age)

          should(sheet['!merges'].length).be.eql(2)
          should(mergeCellExists(sheet, 'D3:D4')).be.True()
          should(mergeCellExists(sheet, 'D5:D6')).be.True()
        }
      })
    })

    it(`${mode} condition should remove cells when false and remove multiple merged cells inside it`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        job: 'Developer',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-multiple-merged-cells-inside' }, data)

      should(sheet['!merges'] ?? []).have.length(0)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:H2')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql('Lastname')
          should(sheet.F2.v).be.eql('Job')
          should(sheet.H2.v).be.eql('Age')
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.F3).be.not.ok()
          should(sheet.H3).be.not.ok()
        },
        block: () => {
          // all the content is in the condition, so nothing is rendered and the dimension
          // of the template is kept
          should(sheet['!ref']).be.eql('B2:H6')

          should(sheet.B2).be.not.ok()
          should(sheet.C3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.B6).be.not.ok()
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:C7')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.C5.v).be.eql('Job')
          should(sheet.C7.v).be.eql('Age')
          should(sheet.D2).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.D5).be.not.ok()
          should(sheet.D7).be.not.ok()
        }
      })
    })

    it(`${mode} condition should render cells when true and keep merged cells inside and outside it`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-merged-cells-inside-and-outside' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B1:G5')

          should(sheet.B1.v).be.eql('merged')
          should(mergeCellExists(sheet, 'B1:C1')).be.True()

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql('Lastname')
          should(sheet.F2.v).be.eql('Age')
          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.F3.v).be.eql(data.age)
          should(mergeCellExists(sheet, 'D3:E3')).be.True()

          should(sheet.B5.v).be.eql('merged2')
          should(mergeCellExists(sheet, 'B5:C5')).be.True()
          should(sheet.E5.v).be.eql('merged3')
          should(mergeCellExists(sheet, 'E5:G5')).be.True()

          should(sheet['!merges'].length).be.eql(4)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B1:G8')

          should(sheet.B1.v).be.eql('merged')
          should(mergeCellExists(sheet, 'B1:C1')).be.True()

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.F3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.F4.v).be.eql(data.age)
          should(mergeCellExists(sheet, 'D4:E4')).be.True()
          should(sheet.B6.v).be.eql('')

          should(sheet.B8.v).be.eql('merged2')
          should(mergeCellExists(sheet, 'B8:C8')).be.True()
          should(sheet.E8.v).be.eql('merged3')
          should(mergeCellExists(sheet, 'E8:G8')).be.True()

          should(sheet['!merges'].length).be.eql(4)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B1:F8')

          should(sheet.B1.v).be.eql('merged')
          should(mergeCellExists(sheet, 'B1:B2')).be.True()

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname)
          should(mergeCellExists(sheet, 'D3:D4')).be.True()
          should(sheet.C5.v).be.eql('Age')
          should(sheet.D5.v).be.eql(data.age)

          should(sheet.F2.v).be.eql('merged2')
          should(mergeCellExists(sheet, 'F2:F3')).be.True()
          should(sheet.F6.v).be.eql('merged3')
          should(mergeCellExists(sheet, 'F6:F8')).be.True()

          should(sheet['!merges'].length).be.eql(4)
        }
      })
    })

    it(`${mode} condition should remove cells when false, remove merged cells inside it and update merged cells outside it`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-merged-cells-inside-and-outside' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B1:G4')

          should(sheet.B1.v).be.eql('merged')
          should(mergeCellExists(sheet, 'B1:C1')).be.True()

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql('Lastname')
          should(sheet.F2.v).be.eql('Age')
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.F3).be.not.ok()
          should(mergeCellExists(sheet, 'D3:E3')).be.False()

          // the merged cells after the condition are moved up
          should(sheet.B4.v).be.eql('merged2')
          should(mergeCellExists(sheet, 'B4:C4')).be.True()
          should(sheet.E4.v).be.eql('merged3')
          should(mergeCellExists(sheet, 'E4:G4')).be.True()

          should(sheet['!merges'].length).be.eql(3)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B1:G3')

          should(sheet.B1.v).be.eql('merged')
          should(mergeCellExists(sheet, 'B1:C1')).be.True()

          should(sheet.B2).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.B6).be.not.ok()
          should(mergeCellExists(sheet, 'D4:E4')).be.False()

          // the merged cells after the condition are moved up
          should(sheet.B3.v).be.eql('merged2')
          should(mergeCellExists(sheet, 'B3:C3')).be.True()
          should(sheet.E3.v).be.eql('merged3')
          should(mergeCellExists(sheet, 'E3:G3')).be.True()

          should(sheet['!merges'].length).be.eql(3)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B1:F8')

          should(sheet.B1.v).be.eql('merged')
          should(mergeCellExists(sheet, 'B1:B2')).be.True()

          should(sheet.C2.v).be.eql('Name')
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.C5.v).be.eql('Age')
          should(sheet.D2).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.D5).be.not.ok()
          should(mergeCellExists(sheet, 'D3:D4')).be.False()

          // the merged cells in the rows of the condition are moved left
          should(sheet.E2.v).be.eql('merged2')
          should(mergeCellExists(sheet, 'E2:E3')).be.True()
          // the merged cells that are not in the rows of the condition are not moved
          should(sheet.F6.v).be.eql('merged3')
          should(mergeCellExists(sheet, 'F6:F8')).be.True()

          should(sheet['!merges'].length).be.eql(3)
        }
      })
    })

    it(`${mode} condition should preserve the content of merged cells that are not in the condition (left) but in the same row when true`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-left-merge-cell-preserve' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A2:H3')

          should(sheet.F2.v).be.eql('Name')
          should(sheet.G2.v).be.eql('Lastname')
          should(sheet.H2.v).be.eql('Age')

          // preserving the cells on the left of the condition
          should(sheet.A3.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'A3:B3')).be.True()
          should(sheet.D3.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D3:E3')).be.True()
          should(sheet.F3.v).be.eql(data.name)
          should(sheet.G3.v).be.eql(data.lastname)
          should(sheet.H3.v).be.eql(data.age)
          should(sheet['!merges']).have.length(2)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A2:I6')

          // preserving the cells on the left of the condition
          should(sheet.A2.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'A2:B2')).be.True()
          should(sheet.D2.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D2:E2')).be.True()

          should(sheet.F2.v).be.eql('')
          should(sheet.G3.v).be.eql('Name')
          should(sheet.H3.v).be.eql('Lastname')
          should(sheet.I3.v).be.eql('Age')
          should(sheet.G4.v).be.eql(data.name)
          should(sheet.H4.v).be.eql(data.lastname)
          should(sheet.I4.v).be.eql(data.age)
          should(sheet.F6.v).be.eql('')
          should(sheet['!merges']).have.length(2)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C1:D8')

          should(sheet.D1.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'D1:D2')).be.True()
          should(sheet.D4.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D4:D5')).be.True()

          should(sheet.C6.v).be.eql('Name')
          should(sheet.D6.v).be.eql(data.name)
          should(sheet.C7.v).be.eql('Lastname')
          should(sheet.D7.v).be.eql(data.lastname)
          should(sheet.C8.v).be.eql('Age')
          should(sheet.D8.v).be.eql(data.age)
          should(sheet['!merges']).have.length(2)
        }
      })
    })

    it(`${mode} condition should preserve the content of merged cells that are not in the condition (left) but in the same row when false`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-left-merge-cell-preserve' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A2:H3')

          should(sheet.F2.v).be.eql('Name')
          should(sheet.G2.v).be.eql('Lastname')
          should(sheet.H2.v).be.eql('Age')

          // preserving the cells on the left of the condition
          should(sheet.A3.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'A3:B3')).be.True()
          should(sheet.D3.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D3:E3')).be.True()
          should(sheet.F3).be.not.ok()
          should(sheet.G3).be.not.ok()
          should(sheet.H3).be.not.ok()
          should(sheet['!merges']).have.length(2)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A2:E2')

          // preserving the cells on the left of the condition, the start row is kept
          should(sheet.A2.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'A2:B2')).be.True()
          should(sheet.D2.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D2:E2')).be.True()

          should(sheet.F2).be.not.ok()
          should(sheet.G3).be.not.ok()
          should(sheet.G4).be.not.ok()
          should(sheet.F6).be.not.ok()
          should(sheet['!merges']).have.length(2)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C1:D8')

          should(sheet.D1.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'D1:D2')).be.True()
          should(sheet.D4.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D4:D5')).be.True()

          should(sheet.C6.v).be.eql('Name')
          should(sheet.D6).be.not.ok()
          should(sheet.C7.v).be.eql('Lastname')
          should(sheet.D7).be.not.ok()
          should(sheet.C8.v).be.eql('Age')
          should(sheet.D8).be.not.ok()
          should(sheet['!merges']).have.length(2)
        }
      })
    })

    it(`${mode} condition should preserve the content of merged cells that are not in the condition (right) but in the same row when true`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-right-merge-cell-preserve' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:J3')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql('Lastname')
          should(sheet.E2.v).be.eql('Age')

          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.E3.v).be.eql(data.age)
          // preserving the cells on the right of the condition
          should(sheet.F3.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'F3:G3')).be.True()
          should(sheet.I3.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'I3:J3')).be.True()
          should(sheet['!merges']).have.length(2)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:H6')

          should(sheet.B2.v).be.eql('')
          should(sheet.C3.v).be.eql('Name')
          should(sheet.D3.v).be.eql('Lastname')
          should(sheet.E3.v).be.eql('Age')
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.B6.v).be.eql('')

          // preserving the cells on the right of the condition
          should(sheet.D6.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'D6:E6')).be.True()
          should(sheet.G6.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'G6:H6')).be.True()
          should(sheet['!merges']).have.length(2)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:D9')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4.v).be.eql(data.age)

          should(sheet.D5.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'D5:D6')).be.True()
          should(sheet.D8.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D8:D9')).be.True()
          should(sheet['!merges']).have.length(2)
        }
      })
    })

    it(`${mode} condition should preserve the content of merged cells that are not in the condition (right) but in the same row when false`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-right-merge-cell-preserve' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:G3')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2.v).be.eql('Lastname')
          should(sheet.E2.v).be.eql('Age')

          // preserving the cells on the right of the condition, the cells are moved left
          should(sheet.C3.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'C3:D3')).be.True()
          should(sheet.F3.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'F3:G3')).be.True()
          should(sheet.I3).be.not.ok()
          should(mergeCellExists(sheet, 'I3:J3')).be.False()
          should(sheet['!merges']).have.length(2)
        },
        block: () => {
          should(sheet['!ref']).be.eql('C2:G2')

          // preserving the cells on the right of the condition, the end row is kept
          // (moved up) and the cells are moved left
          should(sheet.C2.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'C2:D2')).be.True()
          should(sheet.F2.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'F2:G2')).be.True()
          should(sheet.C3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.D6).be.not.ok()
          should(mergeCellExists(sheet, 'D6:E6')).be.False()
          should(sheet.G6).be.not.ok()
          should(mergeCellExists(sheet, 'G6:H6')).be.False()
          should(sheet['!merges']).have.length(2)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:D9')

          should(sheet.C2.v).be.eql('Name')
          should(sheet.D2).be.not.ok()
          should(sheet.C3.v).be.eql('Lastname')
          should(sheet.D3).be.not.ok()
          should(sheet.C4.v).be.eql('Age')
          should(sheet.D4).be.not.ok()

          // the merged cells that are not in the rows of the condition are not moved
          should(sheet.D5.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'D5:D6')).be.True()
          should(sheet.D8.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D8:D9')).be.True()
          should(sheet['!merges']).have.length(2)
        }
      })
    })

    it(`${mode} condition should preserve the content of merged cells that are not in the condition (left, right) but in the same row when true`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-left-right-merge-cell-preserve' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A2:L3')

          should(sheet.F2.v).be.eql('Name')
          should(sheet.G2.v).be.eql('Lastname')
          should(sheet.H2.v).be.eql('Age')

          // preserving the cells on the left of the condition
          should(sheet.A3.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'A3:B3')).be.True()
          should(sheet.D3.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D3:E3')).be.True()
          should(sheet.F3.v).be.eql(data.name)
          should(sheet.G3.v).be.eql(data.lastname)
          should(sheet.H3.v).be.eql(data.age)
          // preserving the cells on the right of the condition
          should(sheet.I3.v).be.eql('preserve3')
          should(mergeCellExists(sheet, 'I3:J3')).be.True()
          should(sheet.K3.v).be.eql('preserve4')
          should(mergeCellExists(sheet, 'K3:L3')).be.True()
          should(sheet['!merges']).have.length(4)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A2:L6')

          // preserving the cells on the left of the condition
          should(sheet.A2.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'A2:B2')).be.True()
          should(sheet.D2.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D2:E2')).be.True()

          should(sheet.F2.v).be.eql('')
          should(sheet.G3.v).be.eql('Name')
          should(sheet.H3.v).be.eql('Lastname')
          should(sheet.I3.v).be.eql('Age')
          should(sheet.G4.v).be.eql(data.name)
          should(sheet.H4.v).be.eql(data.lastname)
          should(sheet.I4.v).be.eql(data.age)
          should(sheet.F6.v).be.eql('')

          // preserving the cells on the right of the condition
          should(sheet.H6.v).be.eql('preserve3')
          should(mergeCellExists(sheet, 'H6:I6')).be.True()
          should(sheet.K6.v).be.eql('preserve4')
          should(mergeCellExists(sheet, 'K6:L6')).be.True()
          should(sheet['!merges']).have.length(4)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C1:D12')

          should(sheet.D1.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'D1:D2')).be.True()
          should(sheet.D4.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D4:D5')).be.True()

          should(sheet.C6.v).be.eql('Name')
          should(sheet.D6.v).be.eql(data.name)
          should(sheet.C7.v).be.eql('Lastname')
          should(sheet.D7.v).be.eql(data.lastname)
          should(sheet.C8.v).be.eql('Age')
          should(sheet.D8.v).be.eql(data.age)

          should(sheet.D9.v).be.eql('preserve3')
          should(mergeCellExists(sheet, 'D9:D10')).be.True()
          should(sheet.D11.v).be.eql('preserve4')
          should(mergeCellExists(sheet, 'D11:D12')).be.True()
          should(sheet['!merges']).have.length(4)
        }
      })
    })

    it(`${mode} condition should preserve the content of merged cells that are not in the condition (left, right) but in the same row when false`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet } = await render({ mode, name: '-left-right-merge-cell-preserve' }, data)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A2:I3')

          should(sheet.F2.v).be.eql('Name')
          should(sheet.G2.v).be.eql('Lastname')
          should(sheet.H2.v).be.eql('Age')

          // preserving the cells on the left of the condition
          should(sheet.A3.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'A3:B3')).be.True()
          should(sheet.D3.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D3:E3')).be.True()
          // preserving the cells on the right of the condition, the cells are moved left
          should(sheet.F3.v).be.eql('preserve3')
          should(mergeCellExists(sheet, 'F3:G3')).be.True()
          should(sheet.H3.v).be.eql('preserve4')
          should(mergeCellExists(sheet, 'H3:I3')).be.True()
          should(sheet.K3).be.not.ok()
          should(mergeCellExists(sheet, 'K3:L3')).be.False()
          should(sheet['!merges']).have.length(4)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A2:K3')

          // preserving the cells on the left of the condition, the start row is kept
          should(sheet.A2.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'A2:B2')).be.True()
          should(sheet.D2.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D2:E2')).be.True()
          should(sheet.F2).be.not.ok()

          // preserving the cells on the right of the condition, the end row is kept
          // (moved up) and the cells are moved left
          should(sheet.G3.v).be.eql('preserve3')
          should(mergeCellExists(sheet, 'G3:H3')).be.True()
          should(sheet.J3.v).be.eql('preserve4')
          should(mergeCellExists(sheet, 'J3:K3')).be.True()
          should(sheet.G4).be.not.ok()
          should(sheet.H6).be.not.ok()
          should(mergeCellExists(sheet, 'H6:I6')).be.False()
          should(sheet.K6).be.not.ok()
          should(mergeCellExists(sheet, 'K6:L6')).be.False()
          should(sheet['!merges']).have.length(4)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C1:D12')

          should(sheet.D1.v).be.eql('preserve')
          should(mergeCellExists(sheet, 'D1:D2')).be.True()
          should(sheet.D4.v).be.eql('preserve2')
          should(mergeCellExists(sheet, 'D4:D5')).be.True()

          should(sheet.C6.v).be.eql('Name')
          should(sheet.D6).be.not.ok()
          should(sheet.C7.v).be.eql('Lastname')
          should(sheet.D7).be.not.ok()
          should(sheet.C8.v).be.eql('Age')
          should(sheet.D8).be.not.ok()

          // the merged cells that are not in the rows of the condition are not moved
          should(sheet.D9.v).be.eql('preserve3')
          should(mergeCellExists(sheet, 'D9:D10')).be.True()
          should(sheet.D11.v).be.eql('preserve4')
          should(mergeCellExists(sheet, 'D11:D12')).be.True()
          should(sheet['!merges']).have.length(4)
        }
      })
    })

    if (mode === 'block') {
      it('block condition should render cells when true and keep vertical merged cells inside it', async () => {
        const data = {
          show: true,
          name: 'Alexander',
          lastname: 'Smith',
          age: 32
        }

        const { sheet } = await render('condition-block-vertical-merged-cells-inside', data)

        should(sheet['!ref']).be.eql('B2:E6')

        should(sheet.B2.v).be.eql('')
        should(sheet.B6.v).be.eql('')

        should(sheet.C3.v).be.eql('Name')
        should(sheet.D3.v).be.eql('Lastname')
        should(sheet.E3.v).be.eql('Age')
        should(sheet.C4.v).be.eql(data.name)
        should(sheet.D4.v).be.eql(data.lastname)
        should(sheet.E4.v).be.eql(data.age)
        should(mergeCellExists(sheet, 'D4:D5')).be.True()
        should(sheet['!merges']).have.length(1)
      })

      it('block condition should remove cells when false and remove vertical merged cells inside it', async () => {
        const data = {
          show: false,
          name: 'Alexander',
          lastname: 'Smith',
          age: 32
        }

        const { sheet } = await render('condition-block-vertical-merged-cells-inside', data)

        // all the content is in the condition, so nothing is rendered and the dimension
        // of the template is kept
        should(sheet['!ref']).be.eql('B2:E6')

        should(sheet.B2).be.not.ok()
        should(sheet.C3).be.not.ok()
        should(sheet.C4).be.not.ok()
        should(sheet.D4).be.not.ok()
        should(sheet.B6).be.not.ok()
        should(sheet['!merges'] ?? []).have.length(0)
      })
    }

    if (mode === 'row') {
      it('row condition should render cells when true and keep merged cells (without row definition) after the condition', async () => {
        const data = {
          show: true,
          name: 'Alexander',
          lastname: 'Smith',
          age: 32
        }

        const { sheet } = await render('condition-merged-cells-without-row', data)

        should(sheet.B3.v).be.eql(data.name)
        should(sheet.C3.v).be.eql(data.lastname)
        should(sheet.D3.v).be.eql(data.age)
        should(mergeCellExists(sheet, 'B5:D6')).be.True()
        should(sheet['!merges']).have.length(1)
      })

      it('row condition should remove cells when false and update merged cells (without row definition) after the condition', async () => {
        const data = {
          show: false,
          name: 'Alexander',
          lastname: 'Smith',
          age: 32
        }

        const { sheet } = await render('condition-merged-cells-without-row', data)

        should(sheet.B3).be.not.ok()
        should(sheet.C3).be.not.ok()
        should(sheet.D3).be.not.ok()
        // the row of the condition is removed, the merged cell after it is moved up
        should(mergeCellExists(sheet, 'B4:D5')).be.True()
        should(sheet['!merges']).have.length(1)
      })

      it('row condition should render cells when true and keep the format of merged cells (without cells definition) inherited from row/column', async () => {
        const data = {
          show: true,
          name: 'Alexander',
          lastname: 'Smith',
          age: 32
        }

        const { sheet, documents: [sheetDoc] } = await render('condition-merged-cells-without-cells-styled', data, {
          files: ['xl/worksheets/sheet1.xml']
        })

        const getCellStyleId = (cellRef) => {
          const cellEl = nodeListToArray(sheetDoc.getElementsByTagName('c')).find((el) => el.getAttribute('r') === cellRef)
          return cellEl?.getAttribute('s')
        }

        should(sheet.B3.v).be.eql(data.name)

        // the merged cell in a row with custom format inherits the style of the row
        should(mergeCellExists(sheet, 'B5:C5')).be.True()
        should(getCellStyleId('B5')).be.eql('1')
        // the merged cell in a column with style inherits the style of the column
        should(mergeCellExists(sheet, 'F7:G7')).be.True()
        should(getCellStyleId('F7')).be.eql('2')
        should(sheet['!merges']).have.length(2)
      })

      it('row condition should remove cells when false and keep the format of merged cells (without cells definition) inherited from row/column when they are moved', async () => {
        const data = {
          show: false,
          name: 'Alexander',
          lastname: 'Smith',
          age: 32
        }

        const { sheet, documents: [sheetDoc] } = await render('condition-merged-cells-without-cells-styled', data, {
          files: ['xl/worksheets/sheet1.xml']
        })

        const getCellStyleId = (cellRef) => {
          const cellEl = nodeListToArray(sheetDoc.getElementsByTagName('c')).find((el) => el.getAttribute('r') === cellRef)
          return cellEl?.getAttribute('s')
        }

        should(sheet.B3).be.not.ok()

        // the merged cells are moved up and they keep the inherited style
        should(mergeCellExists(sheet, 'B4:C4')).be.True()
        should(getCellStyleId('B4')).be.eql('1')
        should(mergeCellExists(sheet, 'F6:G6')).be.True()
        should(getCellStyleId('F6')).be.eql('2')
        should(sheet['!merges']).have.length(2)
      })
    }

    if (mode === 'vertical') {
      it('vertical condition should render cells when true and keep merged cells (without cells definition) in the rows of the condition', async () => {
        const data = {
          show: true,
          name: 'Alexander',
          lastname: 'Smith',
          age: 32
        }

        const { sheet } = await render('condition-vertical-merged-cells-without-cells', data)

        should(sheet.D2.v).be.eql(data.name)
        should(sheet.D3.v).be.eql(data.lastname)
        should(sheet.D4.v).be.eql(data.age)
        should(mergeCellExists(sheet, 'F3:G3')).be.True()
        should(sheet['!merges']).have.length(1)
      })

      it('vertical condition should remove cells when false and update merged cells (without cells definition) in the rows of the condition', async () => {
        const data = {
          show: false,
          name: 'Alexander',
          lastname: 'Smith',
          age: 32
        }

        const { sheet } = await render('condition-vertical-merged-cells-without-cells', data)

        should(sheet.D2).be.not.ok()
        should(sheet.D3).be.not.ok()
        should(sheet.D4).be.not.ok()
        // the row 3 does not have rendered cells, the merged cell is moved left
        // like the rest of cells after the condition in the rows of the condition
        should(mergeCellExists(sheet, 'E3:F3')).be.True()
        should(sheet['!merges']).have.length(1)
      })
    }

    if (mode === 'row') {
      it('row condition (keepCells) should render cells when true and keep merged cells', async () => {
        const data = { show: true, a: 'A', b: 'B' }
        const { sheet } = await render('condition-keep-cells-merged-cells', data)

        should(sheet['!ref']).be.eql('B2:E4')

        should(sheet.B2.v).be.eql(data.a)
        should(sheet.D2.v).be.eql(data.b)
        should(sheet.E2.v).be.eql('end')
        should(sheet.B4.v).be.eql('after')

        should(mergeCellExists(sheet, 'B2:C2')).be.True()
        should(mergeCellExists(sheet, 'B4:C4')).be.True()
        should(sheet['!merges']).have.length(2)
      })

      it('row condition (keepCells) should empty the cells when false and keep merged cells', async () => {
        const data = { show: false, a: 'A', b: 'B' }
        const { sheet } = await render('condition-keep-cells-merged-cells', data)

        should(sheet['!ref']).be.eql('B2:E4')

        // the merged cells inside the condition are kept (empty), the merged cells after it are not moved
        should(sheet.B2.v).be.eql('')
        should(sheet.D2.v).be.eql('')
        should(sheet.E2.v).be.eql('end')
        should(sheet.B4.v).be.eql('after')

        should(mergeCellExists(sheet, 'B2:C2')).be.True()
        should(mergeCellExists(sheet, 'B4:C4')).be.True()
        should(sheet['!merges']).have.length(2)
      })
    }

    // #endregion merged cells

    // #region formulas

    it(`${mode} condition should render cells when true and keep existing formulas after condition`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E11')

          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.E3.v).be.eql(data.age)

          should(sheet.E7.f).be.eql('SUM(E5:E6)')
          should(sheet.E8.f).be.eql('AVERAGE(E5:E6)')

          should(calcChainCellExists(cellEls, 'E7')).be.True()
          should(calcChainCellExists(cellEls, 'E8')).be.True()
          should(cellEls).have.length(2)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E11')

          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)

          should(sheet.E10.f).be.eql('SUM(E8:E9)')
          should(sheet.E11.f).be.eql('AVERAGE(E8:E9)')

          should(calcChainCellExists(cellEls, 'E10')).be.True()
          should(calcChainCellExists(cellEls, 'E11')).be.True()
          should(cellEls).have.length(2)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:I9')

          should(sheet.D2.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.D4.v).be.eql(data.age)

          should(sheet.H4.f).be.eql('SUM(F4:G4)')
          should(sheet.I4.f).be.eql('AVERAGE(F4:G4)')

          should(calcChainCellExists(cellEls, 'H4')).be.True()
          should(calcChainCellExists(cellEls, 'I4')).be.True()
          should(cellEls).have.length(2)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update existing formulas after condition`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E10')

          should(sheet.C3).be.not.ok()

          // the formulas are moved up and their references updated
          should(sheet.E6.f).be.eql('SUM(E4:E5)')
          should(sheet.E7.f).be.eql('AVERAGE(E4:E5)')
          should(sheet.E8?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E6')).be.True()
          should(calcChainCellExists(cellEls, 'E7')).be.True()
          should(calcChainCellExists(cellEls, 'E8')).be.False()
          should(cellEls).have.length(2)
        },
        block: () => {
          should(sheet['!ref']).be.eql('D3:E6')

          should(sheet.B2).be.not.ok()
          should(sheet.C4).be.not.ok()

          // the formulas are moved up and their references updated
          should(sheet.E5.f).be.eql('SUM(E3:E4)')
          should(sheet.E6.f).be.eql('AVERAGE(E3:E4)')
          should(sheet.E10?.f).be.not.ok()
          should(sheet.E11?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(calcChainCellExists(cellEls, 'E6')).be.True()
          should(calcChainCellExists(cellEls, 'E10')).be.False()
          should(calcChainCellExists(cellEls, 'E11')).be.False()
          should(cellEls).have.length(2)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:H9')

          should(sheet.D2).be.not.ok()

          // the formulas are moved left and their references updated
          should(sheet.G4.f).be.eql('SUM(E4:F4)')
          should(sheet.H4.f).be.eql('AVERAGE(E4:F4)')
          should(sheet.I4?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'G4')).be.True()
          should(calcChainCellExists(cellEls, 'H4')).be.True()
          should(calcChainCellExists(cellEls, 'I4')).be.False()
          should(cellEls).have.length(2)
        }
      })
    })

    if (mode === 'row') {
      it('row condition should render cells when true and keep the formula cells inside the condition', async () => {
        const data = {
          show: true,
          name: 'Alexander',
          age: 32
        }

        const { sheet, documents: [calcChainDoc, contentTypesDoc, workbookRelsDoc] } = await render('condition-formula-cells-in-condition', data, {
          files: ['xl/calcChain.xml', '[Content_Types].xml', 'xl/_rels/workbook.xml.rels']
        })

        should(sheet.C3.v).be.eql(data.name)
        should(sheet.D3.f).be.eql('SUM(E5:E6)')
        should(sheet.E3.v).be.eql(data.age)

        const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

        should(calcChainCellExists(cellEls, 'D3')).be.True()
        should(cellEls).have.length(1)

        should(nodeListToArray(contentTypesDoc.getElementsByTagName('Override')).some((el) => el.getAttribute('PartName') === '/xl/calcChain.xml')).be.True()
        should(nodeListToArray(workbookRelsDoc.getElementsByTagName('Relationship')).some((el) => el.getAttribute('Target') === 'calcChain.xml')).be.True()
      })

      it('row condition should remove cells when false and remove the calcChain when all the formula cells were removed', async () => {
        const data = {
          show: false,
          name: 'Alexander',
          age: 32
        }

        const { sheet, documents: [calcChainDoc, contentTypesDoc, workbookRelsDoc] } = await render('condition-formula-cells-in-condition', data, {
          files: ['xl/calcChain.xml', '[Content_Types].xml', 'xl/_rels/workbook.xml.rels']
        })

        should(sheet.C3).be.not.ok()
        should(sheet.D3).be.not.ok()
        should(sheet.E3).be.not.ok()

        // like Excel, when the workbook does not have formulas the calcChain does not exist
        should(calcChainDoc).be.Null()
        should(nodeListToArray(contentTypesDoc.getElementsByTagName('Override')).some((el) => el.getAttribute('PartName') === '/xl/calcChain.xml')).be.False()
        should(nodeListToArray(workbookRelsDoc.getElementsByTagName('Relationship')).some((el) => el.getAttribute('Target') === 'calcChain.xml')).be.False()
      })
    }

    it(`${mode} condition should render cells when true and preserve the content of formula cells that are not in the condition (left) but in the same row`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-left-formula-cell-preserve' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A1:E3')

          // preserving the cells on the left of the condition
          should(sheet.A3.f).be.eql('A1*2')
          should(sheet.B3.f).be.eql('A1*3')
          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.E3.v).be.eql(data.age)

          should(calcChainCellExists(cellEls, 'A3')).be.True()
          should(calcChainCellExists(cellEls, 'B3')).be.True()
          should(cellEls).have.length(2)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A1:F7')

          // preserving the cells on the left of the condition
          should(sheet.A3.f).be.eql('A1*2')
          should(sheet.B3.f).be.eql('A1*3')
          should(sheet.D5.v).be.eql(data.name)
          should(sheet.E5.v).be.eql(data.lastname)
          should(sheet.F5.v).be.eql(data.age)

          should(calcChainCellExists(cellEls, 'A3')).be.True()
          should(calcChainCellExists(cellEls, 'B3')).be.True()
          should(cellEls).have.length(2)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B1:D5')

          should(sheet.B1.v).be.eql(10)
          // preserving the formula cells above the condition
          should(sheet.D1.f).be.eql('B1*2')
          should(sheet.D2.f).be.eql('B1*3')
          should(sheet.D3.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.D5.v).be.eql(data.age)

          should(calcChainCellExists(cellEls, 'D1')).be.True()
          should(calcChainCellExists(cellEls, 'D2')).be.True()
          should(cellEls).have.length(2)
        }
      })
    })

    it(`${mode} condition should remove cells when false and preserve the content of formula cells that are not in the condition (left) but in the same row`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-left-formula-cell-preserve' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A1:E3')

          // preserving the cells on the left of the condition
          should(sheet.A3.f).be.eql('A1*2')
          should(sheet.B3.f).be.eql('A1*3')
          should(sheet.C3).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.E3).be.not.ok()

          should(calcChainCellExists(cellEls, 'A3')).be.True()
          should(calcChainCellExists(cellEls, 'B3')).be.True()
          should(cellEls).have.length(2)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A1:B3')

          // preserving the cells on the left of the condition, the start row is kept
          should(sheet.A3.f).be.eql('A1*2')
          should(sheet.B3.f).be.eql('A1*3')
          should(sheet.D5).be.not.ok()
          should(sheet.E5).be.not.ok()
          should(sheet.F5).be.not.ok()

          should(calcChainCellExists(cellEls, 'A3')).be.True()
          should(calcChainCellExists(cellEls, 'B3')).be.True()
          should(cellEls).have.length(2)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B1:D5')

          should(sheet.B1.v).be.eql(10)
          // preserving the formula cells above the condition
          should(sheet.D1.f).be.eql('B1*2')
          should(sheet.D2.f).be.eql('B1*3')
          should(sheet.D3).be.not.ok()
          should(sheet.D4).be.not.ok()
          should(sheet.D5).be.not.ok()

          should(calcChainCellExists(cellEls, 'D1')).be.True()
          should(calcChainCellExists(cellEls, 'D2')).be.True()
          should(cellEls).have.length(2)
        }
      })
    })

    it(`${mode} condition should render cells when true and preserve the content of formula cells that are not in the condition (right) but in the same row`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-right-formula-cell-preserve' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A1:G3')

          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.E3.v).be.eql(data.age)
          // preserving the cells on the right of the condition
          should(sheet.F3.f).be.eql('A1*2')
          should(sheet.G3.f).be.eql('A1*3')

          should(calcChainCellExists(cellEls, 'F3')).be.True()
          should(calcChainCellExists(cellEls, 'G3')).be.True()
          should(cellEls).have.length(2)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A1:E6')

          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          // preserving the cells on the right of the condition
          should(sheet.C6.f).be.eql('A1*2')
          should(sheet.D6.f).be.eql('A1*3')

          should(calcChainCellExists(cellEls, 'C6')).be.True()
          should(calcChainCellExists(cellEls, 'D6')).be.True()
          should(cellEls).have.length(2)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B1:D6')

          should(sheet.B1.v).be.eql(10)
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.D4.v).be.eql(data.age)
          // preserving the formula cells below the condition
          should(sheet.D5.f).be.eql('B1*2')
          should(sheet.D6.f).be.eql('B1*3')

          should(calcChainCellExists(cellEls, 'D5')).be.True()
          should(calcChainCellExists(cellEls, 'D6')).be.True()
          should(cellEls).have.length(2)
        }
      })
    })

    it(`${mode} condition should remove cells when false and preserve the content of formula cells that are not in the condition (right) but in the same row`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-right-formula-cell-preserve' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A1:E3')

          // preserving the cells on the right of the condition, the cells are moved left
          should(sheet.C3.f).be.eql('A1*2')
          should(sheet.D3.f).be.eql('A1*3')
          should(sheet.E3).be.not.ok()
          should(sheet.F3).be.not.ok()
          should(sheet.G3).be.not.ok()

          should(calcChainCellExists(cellEls, 'C3')).be.True()
          should(calcChainCellExists(cellEls, 'D3')).be.True()
          should(cellEls).have.length(2)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A1:C2')

          // preserving the cells on the right of the condition, the end row is kept
          // (moved up) and the cells are moved left
          should(sheet.B2.f).be.eql('A1*2')
          should(sheet.C2.f).be.eql('A1*3')
          should(sheet.C6).be.not.ok()
          should(sheet.D6).be.not.ok()

          should(calcChainCellExists(cellEls, 'B2')).be.True()
          should(calcChainCellExists(cellEls, 'C2')).be.True()
          should(cellEls).have.length(2)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B1:D6')

          should(sheet.B1.v).be.eql(10)
          should(sheet.D2).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.D4).be.not.ok()
          // preserving the formula cells below the condition, they are not moved by the vertical condition
          should(sheet.D5.f).be.eql('B1*2')
          should(sheet.D6.f).be.eql('B1*3')

          should(calcChainCellExists(cellEls, 'D5')).be.True()
          should(calcChainCellExists(cellEls, 'D6')).be.True()
          should(cellEls).have.length(2)
        }
      })
    })

    it(`${mode} condition should render cells when true and preserve the content of formula cells that are not in the condition (left, right) but in the same row`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-left-right-formula-cell-preserve' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A1:G3')

          // preserving the cells on the left of the condition
          should(sheet.A3.f).be.eql('A1*2')
          should(sheet.B3.f).be.eql('A1*3')
          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.E3.v).be.eql(data.age)
          // preserving the cells on the right of the condition
          should(sheet.F3.f).be.eql('A1*4')
          should(sheet.G3.f).be.eql('A1*5')

          should(calcChainCellExists(cellEls, 'A3')).be.True()
          should(calcChainCellExists(cellEls, 'B3')).be.True()
          should(calcChainCellExists(cellEls, 'F3')).be.True()
          should(calcChainCellExists(cellEls, 'G3')).be.True()
          should(cellEls).have.length(4)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A1:F7')

          // preserving the cells on the left of the condition
          should(sheet.A3.f).be.eql('A1*2')
          should(sheet.B3.f).be.eql('A1*3')
          should(sheet.D5.v).be.eql(data.name)
          should(sheet.E5.v).be.eql(data.lastname)
          should(sheet.F5.v).be.eql(data.age)
          // preserving the cells on the right of the condition
          should(sheet.D7.f).be.eql('A1*4')
          should(sheet.E7.f).be.eql('A1*5')

          should(calcChainCellExists(cellEls, 'A3')).be.True()
          should(calcChainCellExists(cellEls, 'B3')).be.True()
          should(calcChainCellExists(cellEls, 'D7')).be.True()
          should(calcChainCellExists(cellEls, 'E7')).be.True()
          should(cellEls).have.length(4)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B1:D7')

          should(sheet.B1.v).be.eql(10)
          // preserving the formula cells above the condition
          should(sheet.D1.f).be.eql('B1*2')
          should(sheet.D2.f).be.eql('B1*3')
          should(sheet.D3.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.D5.v).be.eql(data.age)
          // preserving the formula cells below the condition
          should(sheet.D6.f).be.eql('B1*4')
          should(sheet.D7.f).be.eql('B1*5')

          should(calcChainCellExists(cellEls, 'D1')).be.True()
          should(calcChainCellExists(cellEls, 'D2')).be.True()
          should(calcChainCellExists(cellEls, 'D6')).be.True()
          should(calcChainCellExists(cellEls, 'D7')).be.True()
          should(cellEls).have.length(4)
        }
      })
    })

    it(`${mode} condition should remove cells when false and preserve the content of formula cells that are not in the condition (left, right) but in the same row`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-left-right-formula-cell-preserve' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A1:E3')

          // preserving the cells on the left of the condition
          should(sheet.A3.f).be.eql('A1*2')
          should(sheet.B3.f).be.eql('A1*3')
          // preserving the cells on the right of the condition, the cells are moved left
          should(sheet.C3.f).be.eql('A1*4')
          should(sheet.D3.f).be.eql('A1*5')
          should(sheet.E3).be.not.ok()
          should(sheet.F3).be.not.ok()
          should(sheet.G3).be.not.ok()

          should(calcChainCellExists(cellEls, 'A3')).be.True()
          should(calcChainCellExists(cellEls, 'B3')).be.True()
          should(calcChainCellExists(cellEls, 'C3')).be.True()
          should(calcChainCellExists(cellEls, 'D3')).be.True()
          should(cellEls).have.length(4)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A1:D4')

          // preserving the cells on the left of the condition, the start row is kept
          should(sheet.A3.f).be.eql('A1*2')
          should(sheet.B3.f).be.eql('A1*3')
          // preserving the cells on the right of the condition, the end row is kept
          // (moved up) and the cells are moved left
          should(sheet.C4.f).be.eql('A1*4')
          should(sheet.D4.f).be.eql('A1*5')
          should(sheet.D5).be.not.ok()
          should(sheet.D7).be.not.ok()
          should(sheet.E7).be.not.ok()

          should(calcChainCellExists(cellEls, 'A3')).be.True()
          should(calcChainCellExists(cellEls, 'B3')).be.True()
          should(calcChainCellExists(cellEls, 'C4')).be.True()
          should(calcChainCellExists(cellEls, 'D4')).be.True()
          should(cellEls).have.length(4)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B1:D7')

          should(sheet.B1.v).be.eql(10)
          // preserving the formula cells above the condition
          should(sheet.D1.f).be.eql('B1*2')
          should(sheet.D2.f).be.eql('B1*3')
          should(sheet.D3).be.not.ok()
          should(sheet.D4).be.not.ok()
          should(sheet.D5).be.not.ok()
          // preserving the formula cells below the condition, they are not moved by the vertical condition
          should(sheet.D6.f).be.eql('B1*4')
          should(sheet.D7.f).be.eql('B1*5')

          should(calcChainCellExists(cellEls, 'D1')).be.True()
          should(calcChainCellExists(cellEls, 'D2')).be.True()
          should(calcChainCellExists(cellEls, 'D6')).be.True()
          should(calcChainCellExists(cellEls, 'D7')).be.True()
          should(cellEls).have.length(4)
        }
      })
    })

    it(`${mode} condition should render cells when true and keep the content of formula cells if origin is after condition but the reference is inside`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-origin-after-reference-inside' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E11')

          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.E3.v).be.eql(data.age)
          should(sheet.E5.f).be.eql('10+E3')

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E11')

          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.E8.f).be.eql('10+E4')

          should(calcChainCellExists(cellEls, 'E8')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:F4')

          should(sheet.D2.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.D4.v).be.eql(data.age)
          should(sheet.F4.f).be.eql('10+D4')

          should(calcChainCellExists(cellEls, 'F4')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update the content of formula cells if origin is after condition but the reference is inside`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-origin-after-reference-inside' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E10')

          should(sheet.C3).be.not.ok()
          // the formula is moved up, its reference is invalid because the cell was removed
          should(sheet.E4.f).be.eql('10+#REF!')
          should(sheet.E5?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E4')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('D2:E6')

          should(sheet.C4).be.not.ok()
          // the formula is moved up, its reference is invalid because the cell was removed
          should(sheet.E3.f).be.eql('10+#REF!')
          should(sheet.E8?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E3')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:E4')

          should(sheet.D2).be.not.ok()
          // the formula is moved left, its reference is invalid because the cell was removed
          should(sheet.E4.f).be.eql('10+#REF!')
          should(sheet.F4?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E4')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should render cells when true and keep the content of formula cells if origin is before condition but the reference is inside`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-origin-before-reference-inside' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E12')

          should(sheet.E2.f).be.eql('10+E5')
          should(sheet.C5.v).be.eql(data.name)
          should(sheet.D5.v).be.eql(data.lastname)
          should(sheet.E5.v).be.eql(data.age)

          should(calcChainCellExists(cellEls, 'E2')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E12')

          should(sheet.E2.f).be.eql('10+E6')
          should(sheet.C6.v).be.eql(data.name)
          should(sheet.D6.v).be.eql(data.lastname)
          should(sheet.E6.v).be.eql(data.age)

          should(calcChainCellExists(cellEls, 'E2')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B2:E4')

          should(sheet.B4.f).be.eql('10+E4')
          should(sheet.E2.v).be.eql(data.name)
          should(sheet.E3.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)

          should(calcChainCellExists(cellEls, 'B4')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update the content of formula cells if origin is before condition but the reference is inside`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-origin-before-reference-inside' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // the formula is resolved after the reference is rendered (it is after the formula), the call that
      // resolves it is inside the condition, so it is resolved at the end with the removed reference
      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E11')

          // the reference is invalid because the cell was removed
          should(sheet.E2.f).be.eql('10+#REF!')
          should(sheet.C5).be.not.ok()

          should(calcChainCellExists(cellEls, 'E2')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('D2:E7')

          // the reference is invalid because the cell was removed
          should(sheet.E2.f).be.eql('10+#REF!')
          should(sheet.C6).be.not.ok()

          should(calcChainCellExists(cellEls, 'E2')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B2:D4')

          // the reference is invalid because the cell was removed
          should(sheet.B4.f).be.eql('10+#REF!')
          should(sheet.E2).be.not.ok()

          should(calcChainCellExists(cellEls, 'B4')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should render cells when true and keep the content of formula cells if origin is before condition but the reference is after`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-origin-before-reference-after' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E12')

          should(sheet.E2.f).be.eql('10+E7')
          should(sheet.C5.v).be.eql(data.name)
          should(sheet.D5.v).be.eql(data.lastname)
          should(sheet.E5.v).be.eql(data.age)
          should(sheet.E7.v).be.eql(30)

          should(calcChainCellExists(cellEls, 'E2')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E12')

          should(sheet.E2.f).be.eql('10+E10')
          should(sheet.C6.v).be.eql(data.name)
          should(sheet.D6.v).be.eql(data.lastname)
          should(sheet.E6.v).be.eql(data.age)
          should(sheet.E10.v).be.eql(30)

          should(calcChainCellExists(cellEls, 'E2')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B2:G4')

          should(sheet.B4.f).be.eql('10+G4')
          should(sheet.E2.v).be.eql(data.name)
          should(sheet.E3.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.G4.v).be.eql(30)

          should(calcChainCellExists(cellEls, 'B4')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update the content of formula cells if origin is before condition but the reference is after`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-origin-before-reference-after' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E11')

          should(sheet.C5).be.not.ok()
          // the referenced cell is moved up
          should(sheet.E6.v).be.eql(30)
          should(sheet.E2.f).be.eql('10+E6')

          should(calcChainCellExists(cellEls, 'E2')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('D2:E7')

          should(sheet.C6).be.not.ok()
          // the referenced cell is moved up
          should(sheet.E5.v).be.eql(30)
          should(sheet.E2.f).be.eql('10+E5')

          should(calcChainCellExists(cellEls, 'E2')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B2:F4')

          should(sheet.E2).be.not.ok()
          // the referenced cell is moved left
          should(sheet.F4.v).be.eql(30)
          should(sheet.B4.f).be.eql('10+F4')

          should(calcChainCellExists(cellEls, 'B4')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should render cells when true and keep the content of formula cells if origin is before condition but the reference is before and another reference after`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-origin-before-reference-before-and-after' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C1:E12')

          should(sheet.E1.v).be.eql(20)
          should(sheet.E2.f).be.eql('10+E1+E7')
          should(sheet.C5.v).be.eql(data.name)
          should(sheet.D5.v).be.eql(data.lastname)
          should(sheet.E5.v).be.eql(data.age)
          should(sheet.E7.v).be.eql(30)

          should(calcChainCellExists(cellEls, 'E2')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B1:E12')

          should(sheet.E1.v).be.eql(20)
          should(sheet.E2.f).be.eql('10+E1+E10')
          should(sheet.C6.v).be.eql(data.name)
          should(sheet.D6.v).be.eql(data.lastname)
          should(sheet.E6.v).be.eql(data.age)
          should(sheet.E10.v).be.eql(30)

          should(calcChainCellExists(cellEls, 'E2')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('A2:G4')

          should(sheet.A4.v).be.eql(20)
          should(sheet.B4.f).be.eql('10+A4+G4')
          should(sheet.E2.v).be.eql(data.name)
          should(sheet.E3.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.G4.v).be.eql(30)

          should(calcChainCellExists(cellEls, 'B4')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update the content of formula cells if origin is before condition but the reference is before and another reference after`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-origin-before-reference-before-and-after' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // the reference before the condition is not affected by the removal
      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C1:E11')

          should(sheet.C5).be.not.ok()
          // the reference after the condition is moved up
          should(sheet.E1.v).be.eql(20)
          should(sheet.E6.v).be.eql(30)
          should(sheet.E2.f).be.eql('10+E1+E6')

          should(calcChainCellExists(cellEls, 'E2')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('D1:E7')

          should(sheet.C6).be.not.ok()
          // the reference after the condition is moved up
          should(sheet.E1.v).be.eql(20)
          should(sheet.E5.v).be.eql(30)
          should(sheet.E2.f).be.eql('10+E1+E5')

          should(calcChainCellExists(cellEls, 'E2')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('A2:F4')

          should(sheet.E2).be.not.ok()
          // the reference after the condition (same row) is moved left
          should(sheet.A4.v).be.eql(20)
          should(sheet.F4.v).be.eql(30)
          should(sheet.B4.f).be.eql('10+A4+F4')

          should(calcChainCellExists(cellEls, 'B4')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should render cells when true and keep the content of formula cells if origin is after condition but the reference is not and also not affected by previous condition`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-origin-after-reference-not-inside-and-previous' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E13')

          should(sheet.E2.v).be.eql(10)
          should(sheet.C5.v).be.eql(data.name)
          should(sheet.D5.v).be.eql(data.lastname)
          should(sheet.E5.v).be.eql(data.age)
          should(sheet.E7.f).be.eql('10+E2')

          should(calcChainCellExists(cellEls, 'E7')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E13')

          should(sheet.E2.v).be.eql(10)
          should(sheet.C6.v).be.eql(data.name)
          should(sheet.D6.v).be.eql(data.lastname)
          should(sheet.E6.v).be.eql(data.age)
          should(sheet.E10.f).be.eql('10+E2')

          should(calcChainCellExists(cellEls, 'E10')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B2:G4')

          should(sheet.B4.v).be.eql(10)
          should(sheet.E2.v).be.eql(data.name)
          should(sheet.E3.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)
          should(sheet.G4.f).be.eql('10+B4')

          should(calcChainCellExists(cellEls, 'G4')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should remove cells when false and not update the content of formula cells if origin is after condition but the reference is not and also not affected by previous condition`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-origin-after-reference-not-inside-and-previous' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E12')

          should(sheet.C5).be.not.ok()
          // the formula is moved up, its reference is before the condition so it is not changed
          should(sheet.E2.v).be.eql(10)
          should(sheet.E6.f).be.eql('10+E2')
          should(sheet.E7?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E6')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('D2:E8')

          should(sheet.C6).be.not.ok()
          // the formula is moved up, its reference is before the condition so it is not changed
          should(sheet.E2.v).be.eql(10)
          should(sheet.E5.f).be.eql('10+E2')
          should(sheet.E10?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('B2:F4')

          should(sheet.E2).be.not.ok()
          // the formula is moved left, its reference is before the condition so it is not changed
          should(sheet.B4.v).be.eql(10)
          should(sheet.F4.f).be.eql('10+B4')
          should(sheet.G4?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'F4')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should render cells when true and keep existing formulas after condition (formula start in condition and formula end points to one cell bellow condition)`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-(end-bellow)' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E9')

          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.E3.v).be.eql(data.age)

          should(sheet.E5.f).be.eql('SUM(E3:E4)')
          should(sheet.E6.f).be.eql('AVERAGE(E3:E4)')
          should(sheet.E7.f).be.eql('MIN(E3:E4)')
          should(sheet.E8.f).be.eql('MAX(E3:E4)')
          should(sheet.E9.f).be.eql('SUM(E7,E8)')

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(calcChainCellExists(cellEls, 'E6')).be.True()
          should(calcChainCellExists(cellEls, 'E7')).be.True()
          should(calcChainCellExists(cellEls, 'E8')).be.True()
          should(calcChainCellExists(cellEls, 'E9')).be.True()
          should(cellEls).have.length(5)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E12')

          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)

          should(sheet.E8.f).be.eql('SUM(E4:E7)')
          should(sheet.E9.f).be.eql('AVERAGE(E4:E7)')
          should(sheet.E10.f).be.eql('MIN(E4:E7)')
          should(sheet.E11.f).be.eql('MAX(E4:E7)')
          should(sheet.E12.f).be.eql('SUM(E10,E11)')

          should(calcChainCellExists(cellEls, 'E8')).be.True()
          should(calcChainCellExists(cellEls, 'E9')).be.True()
          should(calcChainCellExists(cellEls, 'E10')).be.True()
          should(calcChainCellExists(cellEls, 'E11')).be.True()
          should(calcChainCellExists(cellEls, 'E12')).be.True()
          should(cellEls).have.length(5)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:J9')

          should(sheet.D2.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.D4.v).be.eql(data.age)

          should(sheet.F4.f).be.eql('SUM(D4:E4)')
          should(sheet.G4.f).be.eql('AVERAGE(D4:E4)')
          should(sheet.H4.f).be.eql('MIN(D4:E4)')
          should(sheet.I4.f).be.eql('MAX(D4:E4)')
          should(sheet.J4.f).be.eql('SUM(H4,I4)')

          should(calcChainCellExists(cellEls, 'F4')).be.True()
          should(calcChainCellExists(cellEls, 'G4')).be.True()
          should(calcChainCellExists(cellEls, 'H4')).be.True()
          should(calcChainCellExists(cellEls, 'I4')).be.True()
          should(calcChainCellExists(cellEls, 'J4')).be.True()
          should(cellEls).have.length(5)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update existing formulas after condition (formula start in condition and formula end points to one cell bellow condition)`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-(end-bellow)' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // the start of the formula range is removed with the condition, so (like when deleting
      // rows/cells in Excel) it is moved to the first cell after the removed cells
      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E8')

          should(sheet.C3).be.not.ok()

          should(sheet.E4.f).be.eql('SUM(E3:E3)')
          should(sheet.E5.f).be.eql('AVERAGE(E3:E3)')
          should(sheet.E6.f).be.eql('MIN(E3:E3)')
          should(sheet.E7.f).be.eql('MAX(E3:E3)')
          should(sheet.E8.f).be.eql('SUM(E6,E7)')
          should(sheet.E9?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E4')).be.True()
          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(calcChainCellExists(cellEls, 'E6')).be.True()
          should(calcChainCellExists(cellEls, 'E7')).be.True()
          should(calcChainCellExists(cellEls, 'E8')).be.True()
          should(calcChainCellExists(cellEls, 'E9')).be.False()
          should(cellEls).have.length(5)
        },
        block: () => {
          should(sheet['!ref']).be.eql('D3:E7')

          should(sheet.B2).be.not.ok()
          should(sheet.C4).be.not.ok()

          should(sheet.E3.f).be.eql('SUM(E2:E2)')
          should(sheet.E4.f).be.eql('AVERAGE(E2:E2)')
          should(sheet.E5.f).be.eql('MIN(E2:E2)')
          should(sheet.E6.f).be.eql('MAX(E2:E2)')
          should(sheet.E7.f).be.eql('SUM(E5,E6)')
          should(sheet.E8?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E3')).be.True()
          should(calcChainCellExists(cellEls, 'E4')).be.True()
          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(calcChainCellExists(cellEls, 'E6')).be.True()
          should(calcChainCellExists(cellEls, 'E7')).be.True()
          should(calcChainCellExists(cellEls, 'E8')).be.False()
          should(cellEls).have.length(5)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:I9')

          should(sheet.D2).be.not.ok()

          should(sheet.E4.f).be.eql('SUM(D4:D4)')
          should(sheet.F4.f).be.eql('AVERAGE(D4:D4)')
          should(sheet.G4.f).be.eql('MIN(D4:D4)')
          should(sheet.H4.f).be.eql('MAX(D4:D4)')
          should(sheet.I4.f).be.eql('SUM(G4,H4)')
          should(sheet.J4?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E4')).be.True()
          should(calcChainCellExists(cellEls, 'F4')).be.True()
          should(calcChainCellExists(cellEls, 'G4')).be.True()
          should(calcChainCellExists(cellEls, 'H4')).be.True()
          should(calcChainCellExists(cellEls, 'I4')).be.True()
          should(calcChainCellExists(cellEls, 'J4')).be.False()
          should(cellEls).have.length(5)
        }
      })
    })

    it(`${mode} condition should render cells when true and keep existing formulas after condition (formula start and end points to cell in condition)`, async () => {
      const data = {
        show: true,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-(inside)' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E9')

          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.E3.v).be.eql(data.age)

          should(sheet.E5.f).be.eql('SUM(E3:E3)')
          should(sheet.E6.f).be.eql('AVERAGE(E3:E3)')
          should(sheet.E7.f).be.eql('MIN(E3:E3)')
          should(sheet.E8.f).be.eql('MAX(E3:E3)')
          should(sheet.E9.f).be.eql('SUM(E7,E8)')

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(calcChainCellExists(cellEls, 'E6')).be.True()
          should(calcChainCellExists(cellEls, 'E7')).be.True()
          should(calcChainCellExists(cellEls, 'E8')).be.True()
          should(calcChainCellExists(cellEls, 'E9')).be.True()
          should(cellEls).have.length(5)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:E12')

          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)
          should(sheet.E4.v).be.eql(data.age)

          should(sheet.E8.f).be.eql('SUM(E4:E4)')
          should(sheet.E9.f).be.eql('AVERAGE(E4:E5)')
          should(sheet.E10.f).be.eql('MIN(E4:E4)')
          should(sheet.E11.f).be.eql('MAX(E4:E4)')
          should(sheet.E12.f).be.eql('SUM(E10,E11)')

          should(calcChainCellExists(cellEls, 'E8')).be.True()
          should(calcChainCellExists(cellEls, 'E9')).be.True()
          should(calcChainCellExists(cellEls, 'E10')).be.True()
          should(calcChainCellExists(cellEls, 'E11')).be.True()
          should(calcChainCellExists(cellEls, 'E12')).be.True()
          should(cellEls).have.length(5)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:J9')

          should(sheet.D2.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)
          should(sheet.D4.v).be.eql(data.age)

          should(sheet.F4.f).be.eql('SUM(D4:D4)')
          should(sheet.G4.f).be.eql('AVERAGE(D4:D4)')
          should(sheet.H4.f).be.eql('MIN(D4:D4)')
          should(sheet.I4.f).be.eql('MAX(D4:D4)')
          should(sheet.J4.f).be.eql('SUM(H4,I4)')

          should(calcChainCellExists(cellEls, 'F4')).be.True()
          should(calcChainCellExists(cellEls, 'G4')).be.True()
          should(calcChainCellExists(cellEls, 'H4')).be.True()
          should(calcChainCellExists(cellEls, 'I4')).be.True()
          should(calcChainCellExists(cellEls, 'J4')).be.True()
          should(cellEls).have.length(5)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update existing formulas after condition (formula start and end points to cell in condition)`, async () => {
      const data = {
        show: false,
        name: 'Alexander',
        lastname: 'Smith',
        age: 32
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-update-formula-cells-(inside)' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // the ranges have both ends in the removed cells, like Excel when deleting all the cells
      // of a range, the range is invalid
      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:E8')

          should(sheet.C3).be.not.ok()

          // the formulas are moved up and their references updated
          should(sheet.E4.f).be.eql('SUM(#REF!)')
          should(sheet.E5.f).be.eql('AVERAGE(#REF!)')
          should(sheet.E6.f).be.eql('MIN(#REF!)')
          should(sheet.E7.f).be.eql('MAX(#REF!)')
          should(sheet.E8.f).be.eql('SUM(E6,E7)')
          should(sheet.E9?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E4')).be.True()
          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(calcChainCellExists(cellEls, 'E6')).be.True()
          should(calcChainCellExists(cellEls, 'E7')).be.True()
          should(calcChainCellExists(cellEls, 'E8')).be.True()
          should(calcChainCellExists(cellEls, 'E9')).be.False()
          should(cellEls).have.length(5)
        },
        block: () => {
          should(sheet['!ref']).be.eql('D3:E7')

          should(sheet.B2).be.not.ok()
          should(sheet.C4).be.not.ok()

          // the formulas are moved up and their references updated
          should(sheet.E3.f).be.eql('SUM(#REF!)')
          // the end of the range (E5) is a cell with no definition in the template, it is removed too
          should(sheet.E4.f).be.eql('AVERAGE(#REF!)')
          should(sheet.E5.f).be.eql('MIN(#REF!)')
          should(sheet.E6.f).be.eql('MAX(#REF!)')
          should(sheet.E7.f).be.eql('SUM(E5,E6)')
          should(sheet.E8?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E3')).be.True()
          should(calcChainCellExists(cellEls, 'E4')).be.True()
          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(calcChainCellExists(cellEls, 'E6')).be.True()
          should(calcChainCellExists(cellEls, 'E7')).be.True()
          should(calcChainCellExists(cellEls, 'E8')).be.False()
          should(cellEls).have.length(5)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:I9')

          should(sheet.D2).be.not.ok()
          should(sheet.D3).be.not.ok()
          should(sheet.D4).be.not.ok()

          // the formulas are moved left and their references updated
          should(sheet.E4.f).be.eql('SUM(#REF!)')
          should(sheet.F4.f).be.eql('AVERAGE(#REF!)')
          should(sheet.G4.f).be.eql('MIN(#REF!)')
          should(sheet.H4.f).be.eql('MAX(#REF!)')
          should(sheet.I4.f).be.eql('SUM(G4,H4)')
          should(sheet.J4?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'E4')).be.True()
          should(calcChainCellExists(cellEls, 'F4')).be.True()
          should(calcChainCellExists(cellEls, 'G4')).be.True()
          should(calcChainCellExists(cellEls, 'H4')).be.True()
          should(calcChainCellExists(cellEls, 'I4')).be.True()
          should(calcChainCellExists(cellEls, 'J4')).be.False()
          should(cellEls).have.length(5)
        }
      })
    })

    it(`${mode} condition should render cells when true and keep the formulas that reference cells in the condition`, async () => {
      const data = {
        show: true,
        a: 1,
        b: 2
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-formula-refs-to-removed-cells' }, data, {
        files: ['xl/calcChain.xml']
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('B3:E8')

          should(sheet.C3.v).be.eql(data.a)
          should(sheet.D3.v).be.eql(data.b)

          should(sheet.C5.f).be.eql('SUM(B3:C3)')
          should(sheet.C6.f).be.eql('SUM(D3:E3)')
          should(sheet.C7.f).be.eql('C3')
          should(sheet.C8.f).be.eql('SUM(C3:D3)')

          should(calcChainCellExists(cellEls, 'C5')).be.True()
          should(calcChainCellExists(cellEls, 'C6')).be.True()
          should(calcChainCellExists(cellEls, 'C7')).be.True()
          should(calcChainCellExists(cellEls, 'C8')).be.True()
          should(cellEls).have.length(4)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B1:E11')

          should(sheet.E3.v).be.eql(data.a)
          should(sheet.E4.v).be.eql(data.b)

          should(sheet.E8.f).be.eql('SUM(E1:E3)')
          should(sheet.E9.f).be.eql('SUM(E4:E6)')
          should(sheet.E10.f).be.eql('E3')
          should(sheet.E11.f).be.eql('SUM(E3:E4)')

          should(calcChainCellExists(cellEls, 'E8')).be.True()
          should(calcChainCellExists(cellEls, 'E9')).be.True()
          should(calcChainCellExists(cellEls, 'E10')).be.True()
          should(calcChainCellExists(cellEls, 'E11')).be.True()
          should(cellEls).have.length(4)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:E8')

          should(sheet.D2.v).be.eql(data.a)
          should(sheet.D3.v).be.eql(data.b)

          should(sheet.C5.f).be.eql('SUM(C2:D2)')
          should(sheet.C6.f).be.eql('SUM(D2:E2)')
          should(sheet.C7.f).be.eql('D2')
          should(sheet.C8.f).be.eql('SUM(D2:D3)')

          should(calcChainCellExists(cellEls, 'C5')).be.True()
          should(calcChainCellExists(cellEls, 'C6')).be.True()
          should(calcChainCellExists(cellEls, 'C7')).be.True()
          should(calcChainCellExists(cellEls, 'C8')).be.True()
          should(cellEls).have.length(4)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update the formulas that reference the removed cells`, async () => {
      const data = {
        show: false,
        a: 1,
        b: 2
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-formula-refs-to-removed-cells' }, data, {
        files: ['xl/calcChain.xml']
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // like Excel when deleting cells:
      // - the end of a range moves to the last cell before the removed cells
      // - the start of a range moves to the first cell after the removed cells
      // - a single ref to a removed cell, or a range with both ends removed, is invalid
      assertMode(mode, {
        row: () => {
          // the cells C3:D3 of the template are removed, the cells after them are moved left
          should(sheet['!ref']).be.eql('B3:C8')

          should(sheet.B3.v).be.eql(5)
          should(sheet.C3.v).be.eql(7)
          should(sheet.D3).be.not.ok()

          should(sheet.C5.f).be.eql('SUM(B3:B3)')
          should(sheet.C6.f).be.eql('SUM(C3:C3)')
          should(sheet.C7.f).be.eql('#REF!')
          should(sheet.C8.f).be.eql('SUM(#REF!)')

          should(calcChainCellExists(cellEls, 'C5')).be.True()
          should(calcChainCellExists(cellEls, 'C6')).be.True()
          should(calcChainCellExists(cellEls, 'C7')).be.True()
          should(calcChainCellExists(cellEls, 'C8')).be.True()
          should(cellEls).have.length(4)
        },
        block: () => {
          // the rows 2-5 of the template are removed, the rows after them are moved up
          should(sheet['!ref']).be.eql('E1:E7')

          should(sheet.E1.v).be.eql(10)
          should(sheet.E2.v).be.eql(20)

          should(sheet.E4.f).be.eql('SUM(E1:E1)')
          should(sheet.E5.f).be.eql('SUM(E2:E2)')
          should(sheet.E6.f).be.eql('#REF!')
          should(sheet.E7.f).be.eql('SUM(#REF!)')

          should(calcChainCellExists(cellEls, 'E4')).be.True()
          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(calcChainCellExists(cellEls, 'E6')).be.True()
          should(calcChainCellExists(cellEls, 'E7')).be.True()
          should(cellEls).have.length(4)
        },
        vertical: () => {
          // the cells D2:D3 of the template are removed, the cells after them (in each row) are moved left
          should(sheet['!ref']).be.eql('C2:D8')

          should(sheet.C2.v).be.eql(5)
          should(sheet.D2.v).be.eql(7)
          should(sheet.C3.v).be.eql(6)
          should(sheet.D3.v).be.eql(8)

          should(sheet.C5.f).be.eql('SUM(C2:C2)')
          should(sheet.C6.f).be.eql('SUM(D2:D2)')
          should(sheet.C7.f).be.eql('#REF!')
          // the cells of the range are removed row by row, they are still part of the same removal
          should(sheet.C8.f).be.eql('SUM(#REF!)')

          should(calcChainCellExists(cellEls, 'C5')).be.True()
          should(calcChainCellExists(cellEls, 'C6')).be.True()
          should(calcChainCellExists(cellEls, 'C7')).be.True()
          should(calcChainCellExists(cellEls, 'C8')).be.True()
          should(cellEls).have.length(4)
        }
      })
    })

    if (mode === 'row') {
      it(`${mode} condition should remove cells when false and update the formulas with a range that has its ends removed by different sibling conditions`, async () => {
        const data = {
          show: false,
          show2: false,
          a: 1,
          b: 2,
          c: 3,
          d: 4
        }

        const { sheet, documents: [calcChainDoc] } = await render('condition-siblings-formula-refs-to-removed-cells', data, {
          files: ['xl/calcChain.xml']
        })

        const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

        // the cells B3:C3 and E3:F3 of the template are removed, the cells after them are moved left
        should(sheet['!ref']).be.eql('B3:C5')

        should(sheet.B3.v).be.eql(5)
        should(sheet.C3.v).be.eql(7)
        should(sheet.D3).be.not.ok()

        // like Excel when deleting the cells of each condition one after the other, the ends of the range
        // are removed by different conditions so the range is not invalid, the start moves to the first
        // cell after the cells of the first condition and the end moves to the last cell before the
        // cells of the second condition
        should(sheet.C5.f).be.eql('SUM(B3:B3)')

        should(calcChainCellExists(cellEls, 'C5')).be.True()
        should(cellEls).have.length(1)
      })

      it(`${mode} condition should remove cells when false and update the formulas with a range that has no cell left between its ends (adjacent sibling conditions)`, async () => {
        const data = {
          show: false,
          show2: false,
          a: 1,
          b: 2,
          c: 3,
          d: 4
        }

        const { sheet, documents: [calcChainDoc] } = await render('condition-adjacent-siblings-formula-refs-to-removed-cells', data, {
          files: ['xl/calcChain.xml']
        })

        const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

        // the cells B3:C3 and D3:E3 of the template are removed, the cells after them are moved left
        should(sheet['!ref']).be.eql('B3:C5')

        should(sheet.B3.v).be.eql(7)
        should(sheet.C3).be.not.ok()

        // like Excel when deleting the cells of each condition one after the other, the ends of the range
        // are removed by different conditions but there is no cell left between them, so the range is invalid
        should(sheet.C5.f).be.eql('SUM(#REF!)')

        should(calcChainCellExists(cellEls, 'C5')).be.True()
        should(cellEls).have.length(1)
      })
    }

    it(`${mode} condition should render cells when true and keep existing formulas with cell references with locked row`, async () => {
      const data = {
        show: true,
        name: 'John',
        lastname: 'Doe'
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-formula-cells-locked-row' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:H6')

          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)

          should(sheet.F6.v).be.eql(22)
          should(sheet.G6.v).be.eql(122)
          should(sheet.H6.f).be.eql('F6*G$6')

          should(calcChainCellExists(cellEls, 'H6')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:H8')

          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)

          should(sheet.F8.v).be.eql(22)
          should(sheet.G8.v).be.eql(122)
          should(sheet.H8.f).be.eql('F8*G$8')

          should(calcChainCellExists(cellEls, 'H8')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:E5')

          should(sheet.D2.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)

          should(sheet.E2.v).be.eql(22)
          should(sheet.E3.v).be.eql(122)
          should(sheet.E5.f).be.eql('E2*E$3')

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update existing formulas with cell references with locked row`, async () => {
      const data = {
        show: false,
        name: 'John',
        lastname: 'Doe'
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-formula-cells-locked-row' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // like Excel when deleting cells, the locked rows ($) of the cells after the removed cells
      // are updated too
      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:H5')

          should(sheet.C3).be.not.ok()

          // the row 3 of the template is removed, the formula is moved up
          should(sheet.F5.v).be.eql(22)
          should(sheet.G5.v).be.eql(122)
          should(sheet.H5.f).be.eql('F5*G$5')
          should(sheet.H6?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'H5')).be.True()
          should(calcChainCellExists(cellEls, 'H6')).be.False()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('C3:H4')

          should(sheet.B2).be.not.ok()

          // the rows 2-5 of the template are removed, the formula is moved up
          should(sheet.F4.v).be.eql(22)
          should(sheet.G4.v).be.eql(122)
          should(sheet.H4.f).be.eql('F4*G$4')
          should(sheet.H8?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'H4')).be.True()
          should(calcChainCellExists(cellEls, 'H8')).be.False()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:E5')

          // the cells D2:D3 of the template are removed, the referenced cells are moved left
          should(sheet.D2.v).be.eql(22)
          should(sheet.D3.v).be.eql(122)
          should(sheet.E2).be.not.ok()
          should(sheet.E3).be.not.ok()

          // the formula is not in the rows of the condition, it keeps its position
          should(sheet.E5.f).be.eql('D2*D$3')

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should render cells when true and keep existing formulas with cell references with locked row #2`, async () => {
      const data = {
        show: true,
        name: 'John',
        lastname: 'Doe'
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-formula-cells-(row-absolute-reference)' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A1:H6')

          should(sheet.A1.v).be.eql(10)
          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)

          should(sheet.H6.f).be.eql('A$1*F6*G6')

          should(calcChainCellExists(cellEls, 'H6')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A1:H8')

          should(sheet.A1.v).be.eql(10)
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)

          should(sheet.H8.f).be.eql('A$1*F8*G8')

          should(calcChainCellExists(cellEls, 'H8')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('A1:E5')

          should(sheet.A1.v).be.eql(10)
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)

          should(sheet.E5.f).be.eql('A$1*E2*E3')

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update existing formulas with cell references with locked row #2`, async () => {
      const data = {
        show: false,
        name: 'John',
        lastname: 'Doe'
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-formula-cells-(row-absolute-reference)' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // the locked row (A$1) is before the removed cells, it is not changed, the
      // rest of references are updated
      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A1:H5')

          should(sheet.A1.v).be.eql(10)
          should(sheet.C3).be.not.ok()

          // the row 3 of the template is removed, the formula is moved up
          should(sheet.H5.f).be.eql('A$1*F5*G5')
          should(sheet.H6?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'H5')).be.True()
          should(calcChainCellExists(cellEls, 'H6')).be.False()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A1:H4')

          should(sheet.A1.v).be.eql(10)
          should(sheet.B2).be.not.ok()

          // the rows 2-5 of the template are removed, the formula is moved up
          should(sheet.H4.f).be.eql('A$1*F4*G4')
          should(sheet.H8?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'H4')).be.True()
          should(calcChainCellExists(cellEls, 'H8')).be.False()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('A1:E5')

          should(sheet.A1.v).be.eql(10)

          // the cells D2:D3 of the template are removed, the referenced cells are moved left
          should(sheet.D2.v).be.eql(22)
          should(sheet.D3.v).be.eql(122)

          // the formula is not in the rows of the condition, it keeps its position
          should(sheet.E5.f).be.eql('A$1*D2*D3')

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should render cells when true and keep existing formulas with cell references with locked column`, async () => {
      const data = {
        show: true,
        name: 'John',
        lastname: 'Doe'
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-formula-cells-locked-column' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:H6')

          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)

          should(sheet.F6.v).be.eql(22)
          should(sheet.G6.v).be.eql(122)
          should(sheet.H6.f).be.eql('F6*$G6')

          should(calcChainCellExists(cellEls, 'H6')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:H8')

          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)

          should(sheet.F8.v).be.eql(22)
          should(sheet.G8.v).be.eql(122)
          should(sheet.H8.f).be.eql('F8*$G8')

          should(calcChainCellExists(cellEls, 'H8')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:E5')

          should(sheet.D2.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)

          should(sheet.E2.v).be.eql(22)
          should(sheet.E3.v).be.eql(122)
          should(sheet.E5.f).be.eql('E2*$E3')

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update existing formulas with cell references with locked column`, async () => {
      const data = {
        show: false,
        name: 'John',
        lastname: 'Doe'
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-formula-cells-locked-column' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // like Excel when deleting cells, the locked columns ($) of the cells after the removed cells
      // are updated too (when rows are removed only the row of the references changes)
      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('C2:H5')

          should(sheet.C3).be.not.ok()

          // the row 3 of the template is removed, the formula is moved up
          should(sheet.F5.v).be.eql(22)
          should(sheet.G5.v).be.eql(122)
          should(sheet.H5.f).be.eql('F5*$G5')
          should(sheet.H6?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'H5')).be.True()
          should(calcChainCellExists(cellEls, 'H6')).be.False()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('C3:H4')

          should(sheet.B2).be.not.ok()

          // the rows 2-5 of the template are removed, the formula is moved up
          should(sheet.F4.v).be.eql(22)
          should(sheet.G4.v).be.eql(122)
          should(sheet.H4.f).be.eql('F4*$G4')
          should(sheet.H8?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'H4')).be.True()
          should(calcChainCellExists(cellEls, 'H8')).be.False()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('C2:E5')

          // the cells D2:D3 of the template are removed, the referenced cells are moved left
          should(sheet.D2.v).be.eql(22)
          should(sheet.D3.v).be.eql(122)
          should(sheet.E2).be.not.ok()
          should(sheet.E3).be.not.ok()

          // the formula is not in the rows of the condition, it keeps its position
          should(sheet.E5.f).be.eql('D2*$D3')

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should render cells when true and keep existing formulas with cell references with locked column #2`, async () => {
      const data = {
        show: true,
        name: 'John',
        lastname: 'Doe'
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-formula-cells-(column-absolute-reference)' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A1:H6')

          should(sheet.A1.v).be.eql(10)
          should(sheet.C3.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)

          should(sheet.H6.f).be.eql('$A1*F6*G6')

          should(calcChainCellExists(cellEls, 'H6')).be.True()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A1:H8')

          should(sheet.A1.v).be.eql(10)
          should(sheet.C4.v).be.eql(data.name)
          should(sheet.D4.v).be.eql(data.lastname)

          should(sheet.H8.f).be.eql('$A1*F8*G8')

          should(calcChainCellExists(cellEls, 'H8')).be.True()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('A1:E5')

          should(sheet.A1.v).be.eql(10)
          should(sheet.D2.v).be.eql(data.name)
          should(sheet.D3.v).be.eql(data.lastname)

          should(sheet.E5.f).be.eql('$A1*E2*E3')

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update existing formulas with cell references with locked column #2`, async () => {
      const data = {
        show: false,
        name: 'John',
        lastname: 'Doe'
      }

      const { sheet, documents: [calcChainDoc] } = await render({ mode, name: '-formula-cells-(column-absolute-reference)' }, data, {
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // the locked column ($A1) is before the removed cells, it is not changed, the
      // rest of references are updated
      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A1:H5')

          should(sheet.A1.v).be.eql(10)
          should(sheet.C3).be.not.ok()

          // the row 3 of the template is removed, the formula is moved up
          should(sheet.H5.f).be.eql('$A1*F5*G5')
          should(sheet.H6?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'H5')).be.True()
          should(calcChainCellExists(cellEls, 'H6')).be.False()
          should(cellEls).have.length(1)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A1:H4')

          should(sheet.A1.v).be.eql(10)
          should(sheet.B2).be.not.ok()

          // the rows 2-5 of the template are removed, the formula is moved up
          should(sheet.H4.f).be.eql('$A1*F4*G4')
          should(sheet.H8?.f).be.not.ok()

          should(calcChainCellExists(cellEls, 'H4')).be.True()
          should(calcChainCellExists(cellEls, 'H8')).be.False()
          should(cellEls).have.length(1)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('A1:E5')

          should(sheet.A1.v).be.eql(10)

          // the cells D2:D3 of the template are removed, the referenced cells are moved left
          should(sheet.D2.v).be.eql(22)
          should(sheet.D3.v).be.eql(122)

          // the formula is not in the rows of the condition, it keeps its position
          should(sheet.E5.f).be.eql('$A1*D2*D3')

          should(calcChainCellExists(cellEls, 'E5')).be.True()
          should(cellEls).have.length(1)
        }
      })
    })

    it(`${mode} condition should render cells when true and keep formulas that reference cell from other sheet`, async () => {
      const data = {
        show: true,
        value: 10
      }

      const { sheet, sheet2, documents: [calcChainDoc] } = await render({ mode, name: '-existing-formula-cross-sheet-reference' }, data, {
        sheets: [0, 1],
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // the other sheet is not changed
      should(sheet2.A1.v).be.eql(10)
      should(sheet2.A3.v).be.eql(20)
      should(sheet2.A5.v).be.eql(30)

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A2:B5')

          should(sheet.A2.v).be.eql(data.value)
          should(sheet.A4.v).be.eql(20)
          should(sheet.B4.f).be.eql('A4+B!A1')
          should(sheet.A5.v).be.eql(30)
          should(sheet.B5.f).be.eql('A5+B!A3')

          should(calcChainCellExists(cellEls, 'B4', '1')).be.True()
          should(calcChainCellExists(cellEls, 'B5', '1')).be.True()
          should(cellEls).have.length(2)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A2:B7')

          should(sheet.A3.v).be.eql(data.value)
          should(sheet.A6.v).be.eql(20)
          should(sheet.B6.f).be.eql('A6+B!A1')
          should(sheet.A7.v).be.eql(30)
          should(sheet.B7.f).be.eql('A7+B!A3')

          should(calcChainCellExists(cellEls, 'B6', '1')).be.True()
          should(calcChainCellExists(cellEls, 'B7', '1')).be.True()
          should(cellEls).have.length(2)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('A2:C3')

          should(sheet.A2.v).be.eql(data.value)
          should(sheet.B2.v).be.eql(20)
          should(sheet.C2.f).be.eql('B2+B!A1')
          should(sheet.B3.v).be.eql(30)
          should(sheet.C3.f).be.eql('B3+B!A3')

          should(calcChainCellExists(cellEls, 'C2', '1')).be.True()
          should(calcChainCellExists(cellEls, 'C3', '1')).be.True()
          should(cellEls).have.length(2)
        }
      })
    })

    it(`${mode} condition should remove cells when false and update formulas that reference cell from other sheet`, async () => {
      const data = {
        show: false,
        value: 10
      }

      const { sheet, sheet2, documents: [calcChainDoc] } = await render({ mode, name: '-existing-formula-cross-sheet-reference' }, data, {
        sheets: [0, 1],
        files: (workbook) => [workbook.Directory.calcchain]
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // the other sheet is not changed
      should(sheet2.A1.v).be.eql(10)
      should(sheet2.A3.v).be.eql(20)
      should(sheet2.A5.v).be.eql(30)

      // the formulas are moved and their references to cells of the same sheet updated,
      // the references to the other sheet are not changed
      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A3:B4')

          // the row 2 of the template is removed, the formulas are moved up
          should(sheet.A3.v).be.eql(20)
          should(sheet.B3.f).be.eql('A3+B!A1')
          should(sheet.A4.v).be.eql(30)
          should(sheet.B4.f).be.eql('A4+B!A3')
          should(sheet.B5).be.not.ok()

          should(calcChainCellExists(cellEls, 'B3', '1')).be.True()
          should(calcChainCellExists(cellEls, 'B4', '1')).be.True()
          should(cellEls).have.length(2)
        },
        block: () => {
          should(sheet['!ref']).be.eql('A3:B4')

          // the rows 2-4 of the template are removed, the formulas are moved up
          should(sheet.A3.v).be.eql(20)
          should(sheet.B3.f).be.eql('A3+B!A1')
          should(sheet.A4.v).be.eql(30)
          should(sheet.B4.f).be.eql('A4+B!A3')
          should(sheet.B6).be.not.ok()

          should(calcChainCellExists(cellEls, 'B3', '1')).be.True()
          should(calcChainCellExists(cellEls, 'B4', '1')).be.True()
          should(cellEls).have.length(2)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('A2:B3')

          // the cells A2:A3 of the template are removed, the formulas are moved left
          should(sheet.A2.v).be.eql(20)
          should(sheet.B2.f).be.eql('A2+B!A1')
          should(sheet.A3.v).be.eql(30)
          should(sheet.B3.f).be.eql('A3+B!A3')
          should(sheet.C2).be.not.ok()

          should(calcChainCellExists(cellEls, 'B2', '1')).be.True()
          should(calcChainCellExists(cellEls, 'B3', '1')).be.True()
          should(cellEls).have.length(2)
        }
      })
    })

    it(`${mode} condition should render cells when true and not break shared formulas`, async () => {
      const data = {
        show: true,
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
      }

      const { sheet, documents: [calcChainDoc, sheetDoc] } = await render({ mode, name: '-shared-formulas' }, data, {
        helpers: 'function toNumber(val) { return Number(val) }',
        files: (workbook) => [workbook.Directory.calcchain, 'xl/worksheets/sheet1.xml']
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // the ranges (ref attribute) of the shared formulas (the formula that defines the shared formula)
      const getSharedFormulaRefs = (doc) => (
        nodeListToArray(doc.getElementsByTagName('f')).filter((el) => (
          el.getAttribute('t') === 'shared' && el.hasAttribute('ref')
        )).map((el) => el.getAttribute('ref'))
      )

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A1:V4')

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

          should(sheet.A2.v).be.eql(data.ID)
          should(sheet.A2.t).be.eql('n')
          should(sheet.B2.v).be.eql(data.Name)
          should(sheet.C2.v).be.eql(data.Value1)
          should(sheet.C2.t).be.eql('n')
          should(sheet.D2.v).be.eql(data.Value2)
          should(sheet.D2.t).be.eql('n')
          should(sheet.E2.v).be.eql(data.Value3)
          should(sheet.E2.t).be.eql('n')
          should(sheet.F2.v).be.eql(data.Value4)
          should(sheet.F2.t).be.eql('n')
          should(sheet.G2.v).be.eql(data.Value5)
          should(sheet.G2.t).be.eql('n')
          should(sheet.H2.v).be.eql(data.Value6)
          should(sheet.H2.t).be.eql('n')
          should(sheet.I2.v).be.eql(data.Value7)
          should(sheet.I2.t).be.eql('n')
          should(sheet.J2.v).be.eql(data.Value8)
          should(sheet.J2.t).be.eql('n')
          should(sheet.K2.v).be.eql(data.Value9)
          should(sheet.K2.t).be.eql('n')
          should(sheet.L2.v).be.eql(data.Value10)
          should(sheet.L2.t).be.eql('n')
          should(sheet.M2.v).be.eql(data.Value11)
          should(sheet.M2.t).be.eql('n')
          should(sheet.N2.v).be.eql(data.Value12)
          should(sheet.N2.t).be.eql('n')
          should(sheet.O2.v).be.eql(data.Value13)
          should(sheet.O2.t).be.eql('n')
          should(sheet.P2.v).be.eql(data.Value14)
          should(sheet.P2.t).be.eql('n')
          should(sheet.Q2.v).be.eql(data.Value15)
          should(sheet.Q2.t).be.eql('n')
          should(sheet.R2.v).be.eql(data.Value16)
          should(sheet.R2.t).be.eql('n')
          should(sheet.S2.v).be.eql(data.Value17)
          should(sheet.S2.t).be.eql('n')
          should(sheet.T2.v).be.eql(data.Value18)
          should(sheet.T2.t).be.eql('n')
          should(sheet.U2.v).be.eql(data.Value19)
          should(sheet.U2.t).be.eql('n')
          should(sheet.V2.v).be.eql(data.Value20)
          should(sheet.V2.t).be.eql('n')

          should(sheet.C4.f).be.eql('SUBTOTAL(109,C2:C3)')
          should(sheet.D4.f).be.eql('SUBTOTAL(109,D2:D3)')
          should(sheet.E4.f).be.eql('SUBTOTAL(109,E2:E3)')
          should(sheet.F4.f).be.eql('SUBTOTAL(109,F2:F3)')
          should(sheet.G4.f).be.eql('SUBTOTAL(109,G2:G3)')
          should(sheet.H4.f).be.eql('SUBTOTAL(109,H2:H3)')
          should(sheet.I4.f).be.eql('SUBTOTAL(109,I2:I3)')
          should(sheet.J4.f).be.eql('SUBTOTAL(109,J2:J3)')
          should(sheet.K4.f).be.eql('SUBTOTAL(109,K2:K3)')
          should(sheet.L4.f).be.eql('SUBTOTAL(109,L2:L3)')
          should(sheet.M4.f).be.eql('SUBTOTAL(109,M2:M3)')
          should(sheet.N4.f).be.eql('SUBTOTAL(109,N2:N3)')
          should(sheet.O4.f).be.eql('SUBTOTAL(109,O2:O3)')
          should(sheet.P4.f).be.eql('SUBTOTAL(109,P2:P3)')
          should(sheet.Q4.f).be.eql('SUBTOTAL(109,Q2:Q3)')
          should(sheet.R4.f).be.eql('SUBTOTAL(109,R2:R3)')
          should(sheet.S4.f).be.eql('SUBTOTAL(109,S2:S3)')
          should(sheet.T4.f).be.eql('SUBTOTAL(109,T2:T3)')
          should(sheet.U4.f).be.eql('SUBTOTAL(109,U2:U3)')
          should(sheet.V4.f).be.eql('SUBTOTAL(109,V2:V3)')

          should(getSharedFormulaRefs(sheetDoc)).be.eql(['D4:V4'])

          should(calcChainCellExists(cellEls, 'C4')).be.True()
          should(calcChainCellExists(cellEls, 'D4')).be.True()
          should(calcChainCellExists(cellEls, 'E4')).be.True()
          should(calcChainCellExists(cellEls, 'F4')).be.True()
          should(calcChainCellExists(cellEls, 'G4')).be.True()
          should(calcChainCellExists(cellEls, 'H4')).be.True()
          should(calcChainCellExists(cellEls, 'I4')).be.True()
          should(calcChainCellExists(cellEls, 'J4')).be.True()
          should(calcChainCellExists(cellEls, 'K4')).be.True()
          should(calcChainCellExists(cellEls, 'L4')).be.True()
          should(calcChainCellExists(cellEls, 'M4')).be.True()
          should(calcChainCellExists(cellEls, 'N4')).be.True()
          should(calcChainCellExists(cellEls, 'O4')).be.True()
          should(calcChainCellExists(cellEls, 'P4')).be.True()
          should(calcChainCellExists(cellEls, 'Q4')).be.True()
          should(calcChainCellExists(cellEls, 'R4')).be.True()
          should(calcChainCellExists(cellEls, 'S4')).be.True()
          should(calcChainCellExists(cellEls, 'T4')).be.True()
          should(calcChainCellExists(cellEls, 'U4')).be.True()
          should(calcChainCellExists(cellEls, 'V4')).be.True()
          should(cellEls).have.length(20)
        },
        block: () => {
          should(sheet['!ref']).be.eql('B2:X8')

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

          should(sheet.C4.v).be.eql(data.ID)
          should(sheet.C4.t).be.eql('n')
          should(sheet.D4.v).be.eql(data.Name)
          should(sheet.E4.v).be.eql(data.Value1)
          should(sheet.E4.t).be.eql('n')
          should(sheet.F4.v).be.eql(data.Value2)
          should(sheet.F4.t).be.eql('n')
          should(sheet.G4.v).be.eql(data.Value3)
          should(sheet.G4.t).be.eql('n')
          should(sheet.H4.v).be.eql(data.Value4)
          should(sheet.H4.t).be.eql('n')
          should(sheet.I4.v).be.eql(data.Value5)
          should(sheet.I4.t).be.eql('n')
          should(sheet.J4.v).be.eql(data.Value6)
          should(sheet.J4.t).be.eql('n')
          should(sheet.K4.v).be.eql(data.Value7)
          should(sheet.K4.t).be.eql('n')
          should(sheet.L4.v).be.eql(data.Value8)
          should(sheet.L4.t).be.eql('n')
          should(sheet.M4.v).be.eql(data.Value9)
          should(sheet.M4.t).be.eql('n')
          should(sheet.N4.v).be.eql(data.Value10)
          should(sheet.N4.t).be.eql('n')
          should(sheet.O4.v).be.eql(data.Value11)
          should(sheet.O4.t).be.eql('n')
          should(sheet.P4.v).be.eql(data.Value12)
          should(sheet.P4.t).be.eql('n')
          should(sheet.Q4.v).be.eql(data.Value13)
          should(sheet.Q4.t).be.eql('n')
          should(sheet.R4.v).be.eql(data.Value14)
          should(sheet.R4.t).be.eql('n')
          should(sheet.S4.v).be.eql(data.Value15)
          should(sheet.S4.t).be.eql('n')
          should(sheet.T4.v).be.eql(data.Value16)
          should(sheet.T4.t).be.eql('n')
          should(sheet.U4.v).be.eql(data.Value17)
          should(sheet.U4.t).be.eql('n')
          should(sheet.V4.v).be.eql(data.Value18)
          should(sheet.V4.t).be.eql('n')
          should(sheet.W4.v).be.eql(data.Value19)
          should(sheet.W4.t).be.eql('n')
          should(sheet.X4.v).be.eql(data.Value20)
          should(sheet.X4.t).be.eql('n')

          should(sheet.E8.f).be.eql('SUBTOTAL(109,E4:E7)')
          should(sheet.F8.f).be.eql('SUBTOTAL(109,F4:F7)')
          should(sheet.G8.f).be.eql('SUBTOTAL(109,G4:G7)')
          should(sheet.H8.f).be.eql('SUBTOTAL(109,H4:H7)')
          should(sheet.I8.f).be.eql('SUBTOTAL(109,I4:I7)')
          should(sheet.J8.f).be.eql('SUBTOTAL(109,J4:J7)')
          should(sheet.K8.f).be.eql('SUBTOTAL(109,K4:K7)')
          should(sheet.L8.f).be.eql('SUBTOTAL(109,L4:L7)')
          should(sheet.M8.f).be.eql('SUBTOTAL(109,M4:M7)')
          should(sheet.N8.f).be.eql('SUBTOTAL(109,N4:N7)')
          should(sheet.O8.f).be.eql('SUBTOTAL(109,O4:O7)')
          should(sheet.P8.f).be.eql('SUBTOTAL(109,P4:P7)')
          should(sheet.Q8.f).be.eql('SUBTOTAL(109,Q4:Q7)')
          should(sheet.R8.f).be.eql('SUBTOTAL(109,R4:R7)')
          should(sheet.S8.f).be.eql('SUBTOTAL(109,S4:S7)')
          should(sheet.T8.f).be.eql('SUBTOTAL(109,T4:T7)')
          should(sheet.U8.f).be.eql('SUBTOTAL(109,U4:U7)')
          should(sheet.V8.f).be.eql('SUBTOTAL(109,V4:V7)')
          should(sheet.W8.f).be.eql('SUBTOTAL(109,W4:W7)')
          should(sheet.X8.f).be.eql('SUBTOTAL(109,X4:X7)')

          should(getSharedFormulaRefs(sheetDoc)).be.eql(['F8:X8'])

          should(calcChainCellExists(cellEls, 'E8')).be.True()
          should(calcChainCellExists(cellEls, 'F8')).be.True()
          should(calcChainCellExists(cellEls, 'G8')).be.True()
          should(calcChainCellExists(cellEls, 'H8')).be.True()
          should(calcChainCellExists(cellEls, 'I8')).be.True()
          should(calcChainCellExists(cellEls, 'J8')).be.True()
          should(calcChainCellExists(cellEls, 'K8')).be.True()
          should(calcChainCellExists(cellEls, 'L8')).be.True()
          should(calcChainCellExists(cellEls, 'M8')).be.True()
          should(calcChainCellExists(cellEls, 'N8')).be.True()
          should(calcChainCellExists(cellEls, 'O8')).be.True()
          should(calcChainCellExists(cellEls, 'P8')).be.True()
          should(calcChainCellExists(cellEls, 'Q8')).be.True()
          should(calcChainCellExists(cellEls, 'R8')).be.True()
          should(calcChainCellExists(cellEls, 'S8')).be.True()
          should(calcChainCellExists(cellEls, 'T8')).be.True()
          should(calcChainCellExists(cellEls, 'U8')).be.True()
          should(calcChainCellExists(cellEls, 'V8')).be.True()
          should(calcChainCellExists(cellEls, 'W8')).be.True()
          should(calcChainCellExists(cellEls, 'X8')).be.True()
          should(cellEls).have.length(20)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('A1:D22')

          should(sheet.A1.v).be.eql('ID')
          should(sheet.A2.v).be.eql('Name')
          should(sheet.A3.v).be.eql('Value1')
          should(sheet.A4.v).be.eql('Value2')
          should(sheet.A5.v).be.eql('Value3')
          should(sheet.A6.v).be.eql('Value4')
          should(sheet.A7.v).be.eql('Value5')
          should(sheet.A8.v).be.eql('Value6')
          should(sheet.A9.v).be.eql('Value7')
          should(sheet.A10.v).be.eql('Value8')
          should(sheet.A11.v).be.eql('Value9')
          should(sheet.A12.v).be.eql('Value10')
          should(sheet.A13.v).be.eql('Value11')
          should(sheet.A14.v).be.eql('Value12')
          should(sheet.A15.v).be.eql('Value13')
          should(sheet.A16.v).be.eql('Value14')
          should(sheet.A17.v).be.eql('Value15')
          should(sheet.A18.v).be.eql('Value16')
          should(sheet.A19.v).be.eql('Value17')
          should(sheet.A20.v).be.eql('Value18')
          should(sheet.A21.v).be.eql('Value19')
          should(sheet.A22.v).be.eql('Value20')

          should(sheet.B1.v).be.eql(data.ID)
          should(sheet.B1.t).be.eql('n')
          should(sheet.B2.v).be.eql(data.Name)
          should(sheet.B3.v).be.eql(data.Value1)
          should(sheet.B3.t).be.eql('n')
          should(sheet.B4.v).be.eql(data.Value2)
          should(sheet.B4.t).be.eql('n')
          should(sheet.B5.v).be.eql(data.Value3)
          should(sheet.B5.t).be.eql('n')
          should(sheet.B6.v).be.eql(data.Value4)
          should(sheet.B6.t).be.eql('n')
          should(sheet.B7.v).be.eql(data.Value5)
          should(sheet.B7.t).be.eql('n')
          should(sheet.B8.v).be.eql(data.Value6)
          should(sheet.B8.t).be.eql('n')
          should(sheet.B9.v).be.eql(data.Value7)
          should(sheet.B9.t).be.eql('n')
          should(sheet.B10.v).be.eql(data.Value8)
          should(sheet.B10.t).be.eql('n')
          should(sheet.B11.v).be.eql(data.Value9)
          should(sheet.B11.t).be.eql('n')
          should(sheet.B12.v).be.eql(data.Value10)
          should(sheet.B12.t).be.eql('n')
          should(sheet.B13.v).be.eql(data.Value11)
          should(sheet.B13.t).be.eql('n')
          should(sheet.B14.v).be.eql(data.Value12)
          should(sheet.B14.t).be.eql('n')
          should(sheet.B15.v).be.eql(data.Value13)
          should(sheet.B15.t).be.eql('n')
          should(sheet.B16.v).be.eql(data.Value14)
          should(sheet.B16.t).be.eql('n')
          should(sheet.B17.v).be.eql(data.Value15)
          should(sheet.B17.t).be.eql('n')
          should(sheet.B18.v).be.eql(data.Value16)
          should(sheet.B18.t).be.eql('n')
          should(sheet.B19.v).be.eql(data.Value17)
          should(sheet.B19.t).be.eql('n')
          should(sheet.B20.v).be.eql(data.Value18)
          should(sheet.B20.t).be.eql('n')
          should(sheet.B21.v).be.eql(data.Value19)
          should(sheet.B21.t).be.eql('n')
          should(sheet.B22.v).be.eql(data.Value20)
          should(sheet.B22.t).be.eql('n')

          should(sheet.D3.f).be.eql('SUBTOTAL(109,B3:C3)')
          should(sheet.D4.f).be.eql('SUBTOTAL(109,B4:C4)')
          should(sheet.D5.f).be.eql('SUBTOTAL(109,B5:C5)')
          should(sheet.D6.f).be.eql('SUBTOTAL(109,B6:C6)')
          should(sheet.D7.f).be.eql('SUBTOTAL(109,B7:C7)')
          should(sheet.D8.f).be.eql('SUBTOTAL(109,B8:C8)')
          should(sheet.D9.f).be.eql('SUBTOTAL(109,B9:C9)')
          should(sheet.D10.f).be.eql('SUBTOTAL(109,B10:C10)')
          should(sheet.D11.f).be.eql('SUBTOTAL(109,B11:C11)')
          should(sheet.D12.f).be.eql('SUBTOTAL(109,B12:C12)')
          should(sheet.D13.f).be.eql('SUBTOTAL(109,B13:C13)')
          should(sheet.D14.f).be.eql('SUBTOTAL(109,B14:C14)')
          should(sheet.D15.f).be.eql('SUBTOTAL(109,B15:C15)')
          should(sheet.D16.f).be.eql('SUBTOTAL(109,B16:C16)')
          should(sheet.D17.f).be.eql('SUBTOTAL(109,B17:C17)')
          should(sheet.D18.f).be.eql('SUBTOTAL(109,B18:C18)')
          should(sheet.D19.f).be.eql('SUBTOTAL(109,B19:C19)')
          should(sheet.D20.f).be.eql('SUBTOTAL(109,B20:C20)')
          should(sheet.D21.f).be.eql('SUBTOTAL(109,B21:C21)')
          should(sheet.D22.f).be.eql('SUBTOTAL(109,B22:C22)')

          should(getSharedFormulaRefs(sheetDoc)).be.eql(['D4:D22'])

          should(calcChainCellExists(cellEls, 'D3')).be.True()
          should(calcChainCellExists(cellEls, 'D4')).be.True()
          should(calcChainCellExists(cellEls, 'D5')).be.True()
          should(calcChainCellExists(cellEls, 'D6')).be.True()
          should(calcChainCellExists(cellEls, 'D7')).be.True()
          should(calcChainCellExists(cellEls, 'D8')).be.True()
          should(calcChainCellExists(cellEls, 'D9')).be.True()
          should(calcChainCellExists(cellEls, 'D10')).be.True()
          should(calcChainCellExists(cellEls, 'D11')).be.True()
          should(calcChainCellExists(cellEls, 'D12')).be.True()
          should(calcChainCellExists(cellEls, 'D13')).be.True()
          should(calcChainCellExists(cellEls, 'D14')).be.True()
          should(calcChainCellExists(cellEls, 'D15')).be.True()
          should(calcChainCellExists(cellEls, 'D16')).be.True()
          should(calcChainCellExists(cellEls, 'D17')).be.True()
          should(calcChainCellExists(cellEls, 'D18')).be.True()
          should(calcChainCellExists(cellEls, 'D19')).be.True()
          should(calcChainCellExists(cellEls, 'D20')).be.True()
          should(calcChainCellExists(cellEls, 'D21')).be.True()
          should(calcChainCellExists(cellEls, 'D22')).be.True()
          should(cellEls).have.length(20)
        }
      })
    })

    it(`${mode} condition should remove cells when false and not break shared formulas`, async () => {
      const data = {
        show: false,
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
      }

      const { sheet, documents: [calcChainDoc, sheetDoc] } = await render({ mode, name: '-shared-formulas' }, data, {
        helpers: 'function toNumber(val) { return Number(val) }',
        files: (workbook) => [workbook.Directory.calcchain, 'xl/worksheets/sheet1.xml']
      })

      const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

      // the ranges (ref attribute) of the shared formulas (the formula that defines the shared formula)
      const getSharedFormulaRefs = (doc) => (
        nodeListToArray(doc.getElementsByTagName('f')).filter((el) => (
          el.getAttribute('t') === 'shared' && el.hasAttribute('ref')
        )).map((el) => el.getAttribute('ref'))
      )

      assertMode(mode, {
        row: () => {
          should(sheet['!ref']).be.eql('A1:V3')

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

          should(sheet.A2).be.not.ok()
          should(sheet.B2).be.not.ok()

          // the row 2 of the template is removed, the formulas are moved up and the start of the ranges
          // (removed) moves to the first cell after the removed row
          should(sheet.C3.f).be.eql('SUBTOTAL(109,C2:C2)')
          should(sheet.D3.f).be.eql('SUBTOTAL(109,D2:D2)')
          should(sheet.E3.f).be.eql('SUBTOTAL(109,E2:E2)')
          should(sheet.F3.f).be.eql('SUBTOTAL(109,F2:F2)')
          should(sheet.G3.f).be.eql('SUBTOTAL(109,G2:G2)')
          should(sheet.H3.f).be.eql('SUBTOTAL(109,H2:H2)')
          should(sheet.I3.f).be.eql('SUBTOTAL(109,I2:I2)')
          should(sheet.J3.f).be.eql('SUBTOTAL(109,J2:J2)')
          should(sheet.K3.f).be.eql('SUBTOTAL(109,K2:K2)')
          should(sheet.L3.f).be.eql('SUBTOTAL(109,L2:L2)')
          should(sheet.M3.f).be.eql('SUBTOTAL(109,M2:M2)')
          should(sheet.N3.f).be.eql('SUBTOTAL(109,N2:N2)')
          should(sheet.O3.f).be.eql('SUBTOTAL(109,O2:O2)')
          should(sheet.P3.f).be.eql('SUBTOTAL(109,P2:P2)')
          should(sheet.Q3.f).be.eql('SUBTOTAL(109,Q2:Q2)')
          should(sheet.R3.f).be.eql('SUBTOTAL(109,R2:R2)')
          should(sheet.S3.f).be.eql('SUBTOTAL(109,S2:S2)')
          should(sheet.T3.f).be.eql('SUBTOTAL(109,T2:T2)')
          should(sheet.U3.f).be.eql('SUBTOTAL(109,U2:U2)')
          should(sheet.V3.f).be.eql('SUBTOTAL(109,V2:V2)')

          // the range of the shared formula is moved too
          should(getSharedFormulaRefs(sheetDoc)).be.eql(['D3:V3'])

          should(calcChainCellExists(cellEls, 'C3')).be.True()
          should(calcChainCellExists(cellEls, 'D3')).be.True()
          should(calcChainCellExists(cellEls, 'E3')).be.True()
          should(calcChainCellExists(cellEls, 'F3')).be.True()
          should(calcChainCellExists(cellEls, 'G3')).be.True()
          should(calcChainCellExists(cellEls, 'H3')).be.True()
          should(calcChainCellExists(cellEls, 'I3')).be.True()
          should(calcChainCellExists(cellEls, 'J3')).be.True()
          should(calcChainCellExists(cellEls, 'K3')).be.True()
          should(calcChainCellExists(cellEls, 'L3')).be.True()
          should(calcChainCellExists(cellEls, 'M3')).be.True()
          should(calcChainCellExists(cellEls, 'N3')).be.True()
          should(calcChainCellExists(cellEls, 'O3')).be.True()
          should(calcChainCellExists(cellEls, 'P3')).be.True()
          should(calcChainCellExists(cellEls, 'Q3')).be.True()
          should(calcChainCellExists(cellEls, 'R3')).be.True()
          should(calcChainCellExists(cellEls, 'S3')).be.True()
          should(calcChainCellExists(cellEls, 'T3')).be.True()
          should(calcChainCellExists(cellEls, 'U3')).be.True()
          should(calcChainCellExists(cellEls, 'V3')).be.True()
          should(cellEls).have.length(20)
        },
        block: () => {
          should(sheet['!ref']).be.eql('E3:X3')

          should(sheet.C3).be.not.ok()
          should(sheet.C4).be.not.ok()
          should(sheet.D4).be.not.ok()

          // the rows 2-6 of the template are removed, the formulas are moved up and the start of the ranges
          // (removed) moves to the first cell after the removed rows
          should(sheet.E3.f).be.eql('SUBTOTAL(109,E2:E2)')
          should(sheet.F3.f).be.eql('SUBTOTAL(109,F2:F2)')
          should(sheet.G3.f).be.eql('SUBTOTAL(109,G2:G2)')
          should(sheet.H3.f).be.eql('SUBTOTAL(109,H2:H2)')
          should(sheet.I3.f).be.eql('SUBTOTAL(109,I2:I2)')
          should(sheet.J3.f).be.eql('SUBTOTAL(109,J2:J2)')
          should(sheet.K3.f).be.eql('SUBTOTAL(109,K2:K2)')
          should(sheet.L3.f).be.eql('SUBTOTAL(109,L2:L2)')
          should(sheet.M3.f).be.eql('SUBTOTAL(109,M2:M2)')
          should(sheet.N3.f).be.eql('SUBTOTAL(109,N2:N2)')
          should(sheet.O3.f).be.eql('SUBTOTAL(109,O2:O2)')
          should(sheet.P3.f).be.eql('SUBTOTAL(109,P2:P2)')
          should(sheet.Q3.f).be.eql('SUBTOTAL(109,Q2:Q2)')
          should(sheet.R3.f).be.eql('SUBTOTAL(109,R2:R2)')
          should(sheet.S3.f).be.eql('SUBTOTAL(109,S2:S2)')
          should(sheet.T3.f).be.eql('SUBTOTAL(109,T2:T2)')
          should(sheet.U3.f).be.eql('SUBTOTAL(109,U2:U2)')
          should(sheet.V3.f).be.eql('SUBTOTAL(109,V2:V2)')
          should(sheet.W3.f).be.eql('SUBTOTAL(109,W2:W2)')
          should(sheet.X3.f).be.eql('SUBTOTAL(109,X2:X2)')

          // the range of the shared formula is moved too
          should(getSharedFormulaRefs(sheetDoc)).be.eql(['F3:X3'])

          should(calcChainCellExists(cellEls, 'E3')).be.True()
          should(calcChainCellExists(cellEls, 'F3')).be.True()
          should(calcChainCellExists(cellEls, 'G3')).be.True()
          should(calcChainCellExists(cellEls, 'H3')).be.True()
          should(calcChainCellExists(cellEls, 'I3')).be.True()
          should(calcChainCellExists(cellEls, 'J3')).be.True()
          should(calcChainCellExists(cellEls, 'K3')).be.True()
          should(calcChainCellExists(cellEls, 'L3')).be.True()
          should(calcChainCellExists(cellEls, 'M3')).be.True()
          should(calcChainCellExists(cellEls, 'N3')).be.True()
          should(calcChainCellExists(cellEls, 'O3')).be.True()
          should(calcChainCellExists(cellEls, 'P3')).be.True()
          should(calcChainCellExists(cellEls, 'Q3')).be.True()
          should(calcChainCellExists(cellEls, 'R3')).be.True()
          should(calcChainCellExists(cellEls, 'S3')).be.True()
          should(calcChainCellExists(cellEls, 'T3')).be.True()
          should(calcChainCellExists(cellEls, 'U3')).be.True()
          should(calcChainCellExists(cellEls, 'V3')).be.True()
          should(calcChainCellExists(cellEls, 'W3')).be.True()
          should(calcChainCellExists(cellEls, 'X3')).be.True()
          should(cellEls).have.length(20)
        },
        vertical: () => {
          should(sheet['!ref']).be.eql('A1:C22')

          should(sheet.A1.v).be.eql('ID')
          should(sheet.A2.v).be.eql('Name')
          should(sheet.A3.v).be.eql('Value1')
          should(sheet.A4.v).be.eql('Value2')
          should(sheet.A5.v).be.eql('Value3')
          should(sheet.A6.v).be.eql('Value4')
          should(sheet.A7.v).be.eql('Value5')
          should(sheet.A8.v).be.eql('Value6')
          should(sheet.A9.v).be.eql('Value7')
          should(sheet.A10.v).be.eql('Value8')
          should(sheet.A11.v).be.eql('Value9')
          should(sheet.A12.v).be.eql('Value10')
          should(sheet.A13.v).be.eql('Value11')
          should(sheet.A14.v).be.eql('Value12')
          should(sheet.A15.v).be.eql('Value13')
          should(sheet.A16.v).be.eql('Value14')
          should(sheet.A17.v).be.eql('Value15')
          should(sheet.A18.v).be.eql('Value16')
          should(sheet.A19.v).be.eql('Value17')
          should(sheet.A20.v).be.eql('Value18')
          should(sheet.A21.v).be.eql('Value19')
          should(sheet.A22.v).be.eql('Value20')

          should(sheet.B1).be.not.ok()
          should(sheet.B2).be.not.ok()

          // the cells B1:B22 of the template are removed, the formulas are moved left and the start of the
          // ranges (removed) moves to the first cell after the removed cells
          should(sheet.C3.f).be.eql('SUBTOTAL(109,B3:B3)')
          should(sheet.C4.f).be.eql('SUBTOTAL(109,B4:B4)')
          should(sheet.C5.f).be.eql('SUBTOTAL(109,B5:B5)')
          should(sheet.C6.f).be.eql('SUBTOTAL(109,B6:B6)')
          should(sheet.C7.f).be.eql('SUBTOTAL(109,B7:B7)')
          should(sheet.C8.f).be.eql('SUBTOTAL(109,B8:B8)')
          should(sheet.C9.f).be.eql('SUBTOTAL(109,B9:B9)')
          should(sheet.C10.f).be.eql('SUBTOTAL(109,B10:B10)')
          should(sheet.C11.f).be.eql('SUBTOTAL(109,B11:B11)')
          should(sheet.C12.f).be.eql('SUBTOTAL(109,B12:B12)')
          should(sheet.C13.f).be.eql('SUBTOTAL(109,B13:B13)')
          should(sheet.C14.f).be.eql('SUBTOTAL(109,B14:B14)')
          should(sheet.C15.f).be.eql('SUBTOTAL(109,B15:B15)')
          should(sheet.C16.f).be.eql('SUBTOTAL(109,B16:B16)')
          should(sheet.C17.f).be.eql('SUBTOTAL(109,B17:B17)')
          should(sheet.C18.f).be.eql('SUBTOTAL(109,B18:B18)')
          should(sheet.C19.f).be.eql('SUBTOTAL(109,B19:B19)')
          should(sheet.C20.f).be.eql('SUBTOTAL(109,B20:B20)')
          should(sheet.C21.f).be.eql('SUBTOTAL(109,B21:B21)')
          should(sheet.C22.f).be.eql('SUBTOTAL(109,B22:B22)')

          // the range of the shared formula is moved too
          should(getSharedFormulaRefs(sheetDoc)).be.eql(['C4:C22'])

          should(calcChainCellExists(cellEls, 'C3')).be.True()
          should(calcChainCellExists(cellEls, 'C4')).be.True()
          should(calcChainCellExists(cellEls, 'C5')).be.True()
          should(calcChainCellExists(cellEls, 'C6')).be.True()
          should(calcChainCellExists(cellEls, 'C7')).be.True()
          should(calcChainCellExists(cellEls, 'C8')).be.True()
          should(calcChainCellExists(cellEls, 'C9')).be.True()
          should(calcChainCellExists(cellEls, 'C10')).be.True()
          should(calcChainCellExists(cellEls, 'C11')).be.True()
          should(calcChainCellExists(cellEls, 'C12')).be.True()
          should(calcChainCellExists(cellEls, 'C13')).be.True()
          should(calcChainCellExists(cellEls, 'C14')).be.True()
          should(calcChainCellExists(cellEls, 'C15')).be.True()
          should(calcChainCellExists(cellEls, 'C16')).be.True()
          should(calcChainCellExists(cellEls, 'C17')).be.True()
          should(calcChainCellExists(cellEls, 'C18')).be.True()
          should(calcChainCellExists(cellEls, 'C19')).be.True()
          should(calcChainCellExists(cellEls, 'C20')).be.True()
          should(calcChainCellExists(cellEls, 'C21')).be.True()
          should(calcChainCellExists(cellEls, 'C22')).be.True()
          should(cellEls).have.length(20)
        }
      })
    })

    if (mode === 'row') {
      it('row condition (keepCells) should render cells when true and keep formulas', async () => {
        const data = { show: true, a: 1, b: 2 }

        const { sheet, documents: [calcChainDoc] } = await render('condition-keep-cells-formula-cells', data, {
          files: (workbook) => [workbook.Directory.calcchain]
        })

        should(sheet['!ref']).be.eql('B2:E4')

        should(sheet.B2.v).be.eql(data.a)
        should(sheet.C2.f).be.eql('B2*2')
        should(sheet.D2.v).be.eql(data.b)
        should(sheet.E2.v).be.eql('end')
        should(sheet.B4.f).be.eql('SUM(B2:D2)')

        const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

        should(calcChainCellExists(cellEls, 'C2')).be.True()
        should(calcChainCellExists(cellEls, 'B4')).be.True()
        should(cellEls).have.length(2)
      })

      it('row condition (keepCells) should empty the cells (including formula cells) when false and keep the formulas that reference them', async () => {
        const data = { show: false, a: 1, b: 2 }

        const { sheet, documents: [calcChainDoc] } = await render('condition-keep-cells-formula-cells', data, {
          files: (workbook) => [workbook.Directory.calcchain]
        })

        should(sheet['!ref']).be.eql('B2:E4')

        // the formula cell inside the condition is emptied
        should(sheet.B2.v).be.eql('')
        should(sheet.C2.v).be.eql('')
        should(sheet.C2.f).be.undefined()
        should(sheet.D2.v).be.eql('')
        should(sheet.E2.v).be.eql('end')
        // the referenced cells are kept (empty), so the references are not changed
        should(sheet.B4.f).be.eql('SUM(B2:D2)')

        const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

        should(calcChainCellExists(cellEls, 'C2')).be.False()
        should(calcChainCellExists(cellEls, 'B4')).be.True()
        should(cellEls).have.length(1)
      })
    }

    // #endregion formulas
  }

  // #region nested cases

  // #region nested cases: cells

  it('block condition should render cells when true (with inner block condition true)', async () => {
    const { sheet } = await render('condition-nested-condition', { a: true, b: true })

    should(sheet.A2.v).be.eql('A')
    should(sheet.A3.v).be.eql('B')
    should(sheet.A4.v).be.eql('B2')
    should(sheet.A5.v).be.eql('A2')
    should(sheet.A6.v).be.eql('End')
    should(sheet.A7).be.undefined()
  })

  it('block condition should render cells when true (with inner block condition false)', async () => {
    const { sheet } = await render('condition-nested-condition', { a: true, b: false })

    // the rows of the inner condition are removed
    should(sheet.A2.v).be.eql('A')
    should(sheet.A3.v).be.eql('A2')
    should(sheet.A4.v).be.eql('End')
    should(sheet.A5).be.undefined()
  })

  it('block condition should remove cells when false (with inner block condition)', async () => {
    const { sheet } = await render('condition-nested-condition', { a: false, b: true })

    // the rows of the condition (including the inner condition) are removed
    should(sheet.A2.v).be.eql('End')
    should(sheet.A3).be.undefined()
  })

  it('block condition should render cells when true (with inner row condition true)', async () => {
    const { sheet } = await render('condition-block-and-nested-row-condition', { a: true, b: true, name: 'N', x: 'X', y: 'Y', z: 'Z' })

    should(sheet['!ref']).be.eql('B2:D5')
    should(sheet.B2.v).be.eql('N')
    should(sheet.B3.v).be.eql('X')
    should(sheet.C3.v).be.eql('Y')
    should(sheet.D3.v).be.eql('end')
    should(sheet.B4.v).be.eql('Z')
    should(sheet.B5.v).be.eql('End')
  })

  it('block condition should render cells when true (with inner row condition false)', async () => {
    const { sheet } = await render('condition-block-and-nested-row-condition', { a: true, b: false, name: 'N', x: 'X', y: 'Y', z: 'Z' })

    // the cells of the inner condition are removed, the cells after them are moved left
    should(sheet['!ref']).be.eql('B2:B5')
    should(sheet.B2.v).be.eql('N')
    should(sheet.B3.v).be.eql('end')
    should(sheet.C3).be.not.ok()
    should(sheet.D3).be.not.ok()
    should(sheet.B4.v).be.eql('Z')
    should(sheet.B5.v).be.eql('End')
  })

  it('block condition should remove cells when false (with inner row condition)', async () => {
    const { sheet } = await render('condition-block-and-nested-row-condition', { a: false, b: true, name: 'N', x: 'X', y: 'Y', z: 'Z' })

    // the rows of the condition (including the inner condition) are removed
    should(sheet['!ref']).be.eql('B2')
    should(sheet.B2.v).be.eql('End')
    should(sheet.B3).be.not.ok()
  })

  it('block condition should render cells when true (with inner vertical condition true)', async () => {
    const { sheet } = await render('condition-block-and-nested-vertical-condition', { a: true, b: true, name: 'N', x: 'X', y: 'Y', z: 'Z' })

    should(sheet['!ref']).be.eql('B2:D6')
    should(sheet.B2.v).be.eql('N')
    should(sheet.B3.v).be.eql('Label1')
    should(sheet.C3.v).be.eql('X')
    should(sheet.D3.v).be.eql('after1')
    should(sheet.B4.v).be.eql('Label2')
    should(sheet.C4.v).be.eql('Y')
    should(sheet.D4.v).be.eql('after2')
    should(sheet.B5.v).be.eql('Z')
    should(sheet.B6.v).be.eql('End')
  })

  it('block condition should render cells when true (with inner vertical condition false)', async () => {
    const { sheet } = await render('condition-block-and-nested-vertical-condition', { a: true, b: false, name: 'N', x: 'X', y: 'Y', z: 'Z' })

    // the cells of the inner condition are removed, the cells after them (in each row) are moved left
    should(sheet['!ref']).be.eql('B2:C6')
    should(sheet.B2.v).be.eql('N')
    should(sheet.B3.v).be.eql('Label1')
    should(sheet.C3.v).be.eql('after1')
    should(sheet.D3).be.not.ok()
    should(sheet.B4.v).be.eql('Label2')
    should(sheet.C4.v).be.eql('after2')
    should(sheet.D4).be.not.ok()
    should(sheet.B5.v).be.eql('Z')
    should(sheet.B6.v).be.eql('End')
  })

  it('block condition should remove cells when false (with inner vertical condition)', async () => {
    const { sheet } = await render('condition-block-and-nested-vertical-condition', { a: false, b: true, name: 'N', x: 'X', y: 'Y', z: 'Z' })

    // the rows of the condition (including the inner condition) are removed
    should(sheet['!ref']).be.eql('B2')
    should(sheet.B2.v).be.eql('End')
    should(sheet.B3).be.not.ok()
  })

  it('row condition should render cells when true (with inner row condition true)', async () => {
    const { sheet } = await render('condition-row-and-nested-row-condition', { a: true, b: true, x: 'X', y: 'Y', z: 'Z', w: 'W' })

    should(sheet['!ref']).be.eql('B2:F3')
    should(sheet.B2.v).be.eql('X')
    should(sheet.C2.v).be.eql('Y')
    should(sheet.D2.v).be.eql('Z')
    should(sheet.E2.v).be.eql('W')
    should(sheet.F2.v).be.eql('end')
    should(sheet.B3.v).be.eql('End')
  })

  it('row condition should render cells when true (with inner row condition false)', async () => {
    const { sheet } = await render('condition-row-and-nested-row-condition', { a: true, b: false, x: 'X', y: 'Y', z: 'Z', w: 'W' })

    // the cells of the inner condition are removed, the cells after them are moved left
    should(sheet['!ref']).be.eql('B2:D3')
    should(sheet.B2.v).be.eql('X')
    should(sheet.C2.v).be.eql('W')
    should(sheet.D2.v).be.eql('end')
    should(sheet.E2).be.not.ok()
    should(sheet.F2).be.not.ok()
    should(sheet.B3.v).be.eql('End')
  })

  it('row condition should remove cells when false (with inner row condition)', async () => {
    const { sheet } = await render('condition-row-and-nested-row-condition', { a: false, b: true, x: 'X', y: 'Y', z: 'Z', w: 'W' })

    // the cells of the condition (including the inner condition) are removed, the cells after them are moved left
    should(sheet['!ref']).be.eql('B2:B3')
    should(sheet.B2.v).be.eql('end')
    should(sheet.C2).be.not.ok()
    should(sheet.B3.v).be.eql('End')
  })

  it('block condition should render cells when true (with multiple levels of inner conditions true)', async () => {
    const { sheet } = await render('condition-block-and-multiple-levels-nested-conditions', { a: true, b: true, c: true, x: 'X', y: 'Y' })

    should(sheet['!ref']).be.eql('B2:D7')
    should(sheet.B2.v).be.eql('A')
    should(sheet.B3.v).be.eql('B')
    should(sheet.B4.v).be.eql('X')
    should(sheet.C4.v).be.eql('Y')
    should(sheet.D4.v).be.eql('end')
    should(sheet.B5.v).be.eql('B2')
    should(sheet.B6.v).be.eql('A2')
    should(sheet.B7.v).be.eql('End')
  })

  it('block condition should render cells when true (with multiple levels of inner conditions and the innermost condition false)', async () => {
    const { sheet } = await render('condition-block-and-multiple-levels-nested-conditions', { a: true, b: true, c: false, x: 'X', y: 'Y' })

    // the cells of the innermost (row) condition are removed
    should(sheet['!ref']).be.eql('B2:B7')
    should(sheet.B2.v).be.eql('A')
    should(sheet.B3.v).be.eql('B')
    should(sheet.B4.v).be.eql('end')
    should(sheet.C4).be.not.ok()
    should(sheet.B5.v).be.eql('B2')
    should(sheet.B6.v).be.eql('A2')
    should(sheet.B7.v).be.eql('End')
  })

  it('block condition should render cells when true (with multiple levels of inner conditions and the middle condition false)', async () => {
    const { sheet } = await render('condition-block-and-multiple-levels-nested-conditions', { a: true, b: false, c: true, x: 'X', y: 'Y' })

    // the rows of the middle (block) condition are removed, including the innermost condition
    should(sheet['!ref']).be.eql('B2:B4')
    should(sheet.B2.v).be.eql('A')
    should(sheet.B3.v).be.eql('A2')
    should(sheet.B4.v).be.eql('End')
    should(sheet.B5).be.not.ok()
  })

  it('block condition should remove cells when false (with multiple levels of inner conditions)', async () => {
    const { sheet } = await render('condition-block-and-multiple-levels-nested-conditions', { a: false, b: true, c: true, x: 'X', y: 'Y' })

    // the rows of the condition (including the inner conditions) are removed
    should(sheet['!ref']).be.eql('B2')
    should(sheet.B2.v).be.eql('End')
    should(sheet.B3).be.not.ok()
  })

  it('block condition should render cells when true (with inner sibling row and block conditions true)', async () => {
    const { sheet } = await render('condition-block-and-siblings-nested-row-and-block-conditions', { a: true, b: true, c: true, x: 'X', y: 'Y' })

    should(sheet['!ref']).be.eql('B2:D7')
    should(sheet.B2.v).be.eql('A')
    should(sheet.B3.v).be.eql('X')
    should(sheet.C3.v).be.eql('Y')
    should(sheet.D3.v).be.eql('end')
    should(sheet.B4.v).be.eql('C')
    should(sheet.B5.v).be.eql('C2')
    should(sheet.B6.v).be.eql('A2')
    should(sheet.B7.v).be.eql('End')
  })

  it('block condition should render cells when true (with inner sibling row condition false and block condition true)', async () => {
    const { sheet } = await render('condition-block-and-siblings-nested-row-and-block-conditions', { a: true, b: false, c: true, x: 'X', y: 'Y' })

    // only the cells of the inner row condition are removed
    should(sheet['!ref']).be.eql('B2:B7')
    should(sheet.B2.v).be.eql('A')
    should(sheet.B3.v).be.eql('end')
    should(sheet.C3).be.not.ok()
    should(sheet.B4.v).be.eql('C')
    should(sheet.B5.v).be.eql('C2')
    should(sheet.B6.v).be.eql('A2')
    should(sheet.B7.v).be.eql('End')
  })

  it('block condition should render cells when true (with inner sibling row condition true and block condition false)', async () => {
    const { sheet } = await render('condition-block-and-siblings-nested-row-and-block-conditions', { a: true, b: true, c: false, x: 'X', y: 'Y' })

    // only the rows of the inner block condition are removed
    should(sheet['!ref']).be.eql('B2:D5')
    should(sheet.B2.v).be.eql('A')
    should(sheet.B3.v).be.eql('X')
    should(sheet.C3.v).be.eql('Y')
    should(sheet.D3.v).be.eql('end')
    should(sheet.B4.v).be.eql('A2')
    should(sheet.B5.v).be.eql('End')
  })

  it('block condition should render cells when true (with inner sibling row and block conditions false)', async () => {
    const { sheet } = await render('condition-block-and-siblings-nested-row-and-block-conditions', { a: true, b: false, c: false, x: 'X', y: 'Y' })

    should(sheet['!ref']).be.eql('B2:B5')
    should(sheet.B2.v).be.eql('A')
    should(sheet.B3.v).be.eql('end')
    should(sheet.C3).be.not.ok()
    should(sheet.B4.v).be.eql('A2')
    should(sheet.B5.v).be.eql('End')
  })

  it('block condition should remove cells when false (with inner sibling row and block conditions)', async () => {
    const { sheet } = await render('condition-block-and-siblings-nested-row-and-block-conditions', { a: false, b: true, c: true, x: 'X', y: 'Y' })

    // the rows of the condition (including the inner conditions) are removed
    should(sheet['!ref']).be.eql('B2')
    should(sheet.B2.v).be.eql('End')
    should(sheet.B3).be.not.ok()
  })

  // #endregion nested cases: cells

  // #region nested cases: merged cells

  it('block condition should render cells when true and keep merged cells (with inner block condition true)', async () => {
    const { sheet } = await render('condition-block-and-nested-condition-merged-cells', { a: true, b: true, x: 'X' })

    should(sheet['!ref']).be.eql('B2:B7')
    should(sheet.B2.v).be.eql('A')
    should(sheet.B3.v).be.eql('B')
    should(sheet.B4.v).be.eql('X')
    should(sheet.B5.v).be.eql('B2')
    should(sheet.B6.v).be.eql('A2')
    should(sheet.B7.v).be.eql('merged after')

    should(mergeCellExists(sheet, 'B4:C4')).be.True()
    should(mergeCellExists(sheet, 'B7:C7')).be.True()
    should(sheet['!merges']).have.length(2)
  })

  it('block condition should render cells when true, remove merged cells inside the inner condition and update merged cells after it (with inner block condition false)', async () => {
    const { sheet } = await render('condition-block-and-nested-condition-merged-cells', { a: true, b: false, x: 'X' })

    // the rows of the inner condition (with its merged cells) are removed, the merged cells after it are moved up
    should(sheet['!ref']).be.eql('B2:B4')
    should(sheet.B2.v).be.eql('A')
    should(sheet.B3.v).be.eql('A2')
    should(sheet.B4.v).be.eql('merged after')

    should(mergeCellExists(sheet, 'B4:C4')).be.True()
    should(sheet['!merges']).have.length(1)
  })

  it('block condition should remove cells when false, remove merged cells inside it and update merged cells after it (with inner block condition)', async () => {
    const { sheet } = await render('condition-block-and-nested-condition-merged-cells', { a: false, b: true, x: 'X' })

    // the rows of the condition (with the merged cells of the inner condition) are removed, the merged cells after it are moved up
    should(sheet['!ref']).be.eql('B2')
    should(sheet.B2.v).be.eql('merged after')

    should(mergeCellExists(sheet, 'B2:C2')).be.True()
    should(sheet['!merges']).have.length(1)
  })

  // #endregion nested cases: merged cells

  // #region nested cases: formulas

  it('block condition should render cells when true and keep existing formulas after condition (with inner block condition true)', async () => {
    const { sheet, documents: [calcChainDoc] } = await render('condition-block-and-nested-condition-formula-cells', { a: true, b: true, v1: 1, v2: 2, v3: 3, v4: 4 }, {
      files: (workbook) => [workbook.Directory.calcchain]
    })

    should(sheet['!ref']).be.eql('B2:B9')
    should(sheet.B2.v).be.eql(1)
    should(sheet.B3.v).be.eql(2)
    should(sheet.B4.v).be.eql(3)
    should(sheet.B5.v).be.eql(4)
    should(sheet.B7.f).be.eql('SUM(B2:B5)')
    should(sheet.B8.f).be.eql('SUM(B3:B4)')
    should(sheet.B9.f).be.eql('B4')

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    should(calcChainCellExists(cellEls, 'B7')).be.True()
    should(calcChainCellExists(cellEls, 'B8')).be.True()
    should(calcChainCellExists(cellEls, 'B9')).be.True()
    should(cellEls).have.length(3)
  })

  it('block condition should render cells when true and update existing formulas after condition that reference cells removed by the inner condition (with inner block condition false)', async () => {
    const { sheet, documents: [calcChainDoc] } = await render('condition-block-and-nested-condition-formula-cells', { a: true, b: false, v1: 1, v2: 2, v3: 3, v4: 4 }, {
      files: (workbook) => [workbook.Directory.calcchain]
    })

    // the rows of the inner condition are removed, the formulas are moved up and the references to the removed cells are updated like Excel
    should(sheet['!ref']).be.eql('B2:B7')
    should(sheet.B2.v).be.eql(1)
    should(sheet.B3.v).be.eql(4)
    should(sheet.B5.f).be.eql('SUM(B2:B3)')
    should(sheet.B6.f).be.eql('SUM(#REF!)')
    should(sheet.B7.f).be.eql('#REF!')

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    should(calcChainCellExists(cellEls, 'B5')).be.True()
    should(calcChainCellExists(cellEls, 'B6')).be.True()
    should(calcChainCellExists(cellEls, 'B7')).be.True()
    should(cellEls).have.length(3)
  })

  it('block condition should remove cells when false and update existing formulas after condition that reference removed cells (with inner block condition)', async () => {
    const { sheet, documents: [calcChainDoc] } = await render('condition-block-and-nested-condition-formula-cells', { a: false, b: true, v1: 1, v2: 2, v3: 3, v4: 4 }, {
      files: (workbook) => [workbook.Directory.calcchain]
    })

    // all the rows of the condition (including the inner condition) are removed, all the referenced cells were removed
    should(sheet['!ref']).be.eql('B3:B5')
    should(sheet.B3.f).be.eql('SUM(#REF!)')
    should(sheet.B4.f).be.eql('SUM(#REF!)')
    should(sheet.B5.f).be.eql('#REF!')

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    should(calcChainCellExists(cellEls, 'B3')).be.True()
    should(calcChainCellExists(cellEls, 'B4')).be.True()
    should(calcChainCellExists(cellEls, 'B5')).be.True()
    should(cellEls).have.length(3)
  })

  // #endregion nested cases: formulas

  // #endregion nested cases

  // #region performance

  it('vertical condition should evaluate its value once (not once for each row)', async () => {
    const { sheet } = await render('condition-vertical-value-evaluated-once', { show: true, x: 'X', y: 'Y' }, {
      helpers: `
        let count = 0
        function isShown (value) { count++; return value }
        function calls () { return count }
      `
    })

    should(sheet.B2.v).be.eql('X')
    should(sheet.B3.v).be.eql('Y')
    // the vertical condition has a call for each row, the value (isShown) is evaluated just once
    should(sheet.A5.v).be.eql(1)
  })

  it('block condition with cells outside of it in the start and end rows should evaluate its value once (not once for each part)', async () => {
    const { sheet } = await render('condition-block-value-evaluated-once', { show: true, x: 'X', y: 'Y', z: 'Z' }, {
      helpers: `
        let count = 0
        function isShown (value) { count++; return value }
        function calls () { return count }
      `
    })

    should(sheet.A2.v).be.eql('before')
    should(sheet.B2.v).be.eql('X')
    should(sheet.B3.v).be.eql('Y')
    should(sheet.B4.v).be.eql('Z')
    should(sheet.C4.v).be.eql('after')
    // the condition has a call for each part (start row, middle rows, end row), the value (isShown) is evaluated just once
    should(sheet.A6.v).be.eql(1)
  })

  it('condition (keepCells) should evaluate the value of the conditions inside it when true', async () => {
    const { sheet } = await render('condition-keep-cells-nested-condition-not-evaluated', { show: true, inner: true, x: 'X', y: 'Y', z: 'Z', w: 'W' }, {
      helpers: `
        let count = 0
        function isShown (value) { count++; return value }
        function calls () { return count }
      `
    })

    should(sheet.B2.v).be.eql('X')
    should(sheet.B3.v).be.eql('Y')
    should(sheet.C3.v).be.eql('Z')
    should(sheet.B4.v).be.eql('W')
    should(sheet.A6.v).be.eql(1)
  })

  it('condition (keepCells) should not evaluate the value of the conditions inside it when false', async () => {
    const { sheet } = await render('condition-keep-cells-nested-condition-not-evaluated', { show: false, inner: true, x: 'X', y: 'Y', z: 'Z', w: 'W' }, {
      helpers: `
        let count = 0
        function isShown (value) { count++; return value }
        function calls () { return count }
      `
    })

    should(sheet.B2.v).be.eql('')
    should(sheet.B3.v).be.eql('')
    should(sheet.C3.v).be.eql('')
    should(sheet.B4.v).be.eql('')
    // the content is rendered empty, the value of the inner condition (isShown) is not evaluated
    should(sheet.A6.v).be.eql(0)
  })

  // #endregion performance

  // #region errors

  const errorCases = [
    ['condition-error-unclosed', /Unable to find end of condition/i],
    ['condition-error-each-closing-if', /Found {{\/each}} in cell "A3".*{{#if}} starting at cell A2 is not closed/i],
    ['condition-error-vertical-different-column', /both start and end of block must be on same column/i],
    ['condition-error-text-before-start', /{{#if}} across cells must be at the start of the cell/i],
    ['condition-error-text-after-end', /{{\/if}} across cells must be at the end of the cell/i],
    ['condition-error-inside-vertical-loop', /can not be defined inside vertical loops/i],
    ['condition-error-loop-in-kept-row', /Loops inside {{#if}} across cells must be defined in rows that are fully part of the condition/i],
    ['condition-error-sibling-loop-shared-row', /can not start or end in the same row of a loop that is not part of it/i],
    ['condition-error-merge-crossing', /Merged cells "C2:D2" can not cross the boundary/i]
  ]

  for (const [fixtureName, expectedError] of errorCases) {
    it(`should throw clear error for invalid definition (${fixtureName})`, async () => {
      return should(render(fixtureName, { a: true, show: true, items: [{ name: 'x' }] })).be.rejectedWith(expectedError)
    })
  }

  for (const mode of modes) {
    for (const [elseCall, fixtureName] of [['{{else}}', '-with-else'], ['{{else if showOther}}', '-with-else-if']]) {
      it(`${mode} condition should throw error when using ${elseCall} (not supported)`, async () => {
        const data = { show: true, showOther: true, name: 'Alexander', lastname: 'Smith', age: 32 }

        let elseCellRef

        assertMode(mode, {
          row: () => { elseCellRef = 'E3' },
          block: () => { elseCellRef = 'B6' },
          vertical: () => { elseCellRef = 'D5' }
        })

        return should(render({ mode, name: fixtureName }, data)).be.rejectedWith(new RegExp(
          `found ${elseCall} in cell "${
            elseCellRef
          }" of sheet ".+", {{else}} is not supported in {{#if}} across cells`,
          'i'
        ))
      })
    }
  }

  // #endregion errors
})
