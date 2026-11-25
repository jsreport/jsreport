const should = require('should')
const jsreport = require('@jsreport/jsreport-core')
const { createRender, mergeCellExists, calcChainCellExists } = require('../utils')
const { nodeListToArray } = require('../../lib/utils')

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

  const render = createRender(() => reporter)

  // #region template input

  it('accept buffer as base64 string by default', async () => {
    const { sheet } = await render('variable-replace', {
      name: 'John'
    }, {
      prepare: (request) => {
        request.template.xlsx.templateAsset.content = request.template.xlsx.templateAsset.content.toString('base64')
        return request
      }
    })

    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('accept buffer as string with explicit encoding', async () => {
    const { sheet } = await render('variable-replace', {
      name: 'John'
    }, {
      prepare: (request) => {
        request.template.xlsx.templateAsset.content = request.template.xlsx.templateAsset.content.toString('binary')
        request.template.xlsx.templateAsset.encoding = 'binary'
        return request
      }
    })

    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('throw clear error when template fails to be parsed as xlsx', async () => {
    return render('variable-replace', {
      name: 'John'
    }, {
      prepare: (request) => {
        request.template.xlsx.templateAsset.content = request.template.xlsx.templateAsset.content.toString('utf8')
        request.template.xlsx.templateAsset.encoding = 'utf8'
        return request
      }
    }).should.be.rejectedWith(/Failed to parse xlsx template input/i)
  })

  // #endregion template input

  // #region templates without dynamic content (preserved as they are)

  it('preserve existing dimension if no changes', async () => {
    const { sheet } = await render('preserve-existing-dimension', {
      name: 'John'
    })

    should(sheet['!ref']).be.eql('A6:J26')
  })

  it('preserve merge cells for cells that do not have definition in row (row with no cells in xml) if no changes', async () => {
    const { sheet, template: { documents: [sheetTemplateDoc] } } = await render('preserve-merge-cells-for-empty-row', {
      name: 'John'
    }, { template: { files: ['xl/worksheets/sheet1.xml'] } })

    const existingMergeCellRefs = nodeListToArray(
      sheetTemplateDoc.getElementsByTagName('mergeCells')[0].childNodes
    ).filter((el) => el.nodeName === 'mergeCell').map((el) => el.getAttribute('ref'))

    for (const mergeCellRef of existingMergeCellRefs) {
      should(mergeCellExists(sheet, mergeCellRef)).be.True()
    }

    should(sheet['!merges'].length).be.eql(existingMergeCellRefs.length)
  })

  it('preserve existing shared formulas', async () => {
    const { documents: [sheetDoc], template: { documents: [sheetTemplateDoc] } } = await render('preserve-shared-formulas', {
      name: 'John'
    }, {
      files: ['xl/worksheets/sheet1.xml'],
      template: { files: ['xl/worksheets/sheet1.xml'] }
    })

    const getSharedFormulas = (doc) => (
      nodeListToArray(
        doc.getElementsByTagName('f')
      ).filter((el) => (
        el.getAttribute('t') === 'shared' &&
        el.getAttribute('ref') != null &&
        el.getAttribute('ref') !== ''
      )).map((el) => el.getAttribute('ref'))
    )

    const existingSharedFormulas = getSharedFormulas(sheetTemplateDoc)

    const outputSharedFormulas = getSharedFormulas(sheetDoc)

    should(existingSharedFormulas.length).be.eql(outputSharedFormulas.length)

    for (const sharedFormulaRef of existingSharedFormulas) {
      const exists = outputSharedFormulas.includes(sharedFormulaRef)
      should(exists).be.eql(true, `output xlsx does not contain shared formula ${sharedFormulaRef}`)
    }
  })

  it('ignore parsing cell of pivot table calculated field marked with error', async () => {
    const { sheet } = await render('pivot-calculated-field-with-error', undefined, { sheets: 2 })

    should(sheet.E4.t).be.eql('e')
    should(sheet.E4.w).be.eql('#DIV/0!')
    should(sheet.E5.t).be.eql('e')
    should(sheet.E5.w).be.eql('#DIV/0!')
  })

  // #endregion templates without dynamic content (preserved as they are)

  // #region cells

  it('variable replace', async () => {
    const { sheet } = await render('variable-replace', {
      name: 'John'
    })

    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('variable replace should generate empty cells', async () => {
    const { sheet, documents: [sheetDoc] } = await render('variable-replace-empty-cells', {
      text: 'TESTABC123 CURR MONTH REPORT',
      text2: '',
      text3: null
    }, { files: ['xl/worksheets/sheet1.xml'] })

    const cellEls = nodeListToArray(sheetDoc.getElementsByTagName('c'))

    const emptyCells = cellEls.filter((c) => c.getAttribute('r') === 'B1' || c.getAttribute('r') === 'C1')

    should(emptyCells).have.length(2)

    should(emptyCells[0].hasChildNodes()).be.False()
    should(emptyCells[1].hasChildNodes()).be.False()

    should(sheet.A1.v).be.eql('TESTABC123 CURR MONTH REPORT')
    should(sheet.A2).be.not.ok()
    should(sheet.A3).be.not.ok()
  })

  it('work with non existing variable', async () => {
    const { sheet } = await render('variable-non-existing', {
      lastname: 'Hockins',
      job: {}
    })

    should(sheet.B2.v).be.eql('')
    should(sheet.C2.v).be.eql('Hockins')
    should(sheet.D2.v).be.eql('')
  })

  it('variable replace multi', async () => {
    const { sheet } = await render('variable-replace-multi', {
      name: 'John',
      lastname: 'Wick'
    })

    should(sheet.A1.v).be.eql('Hello world John developer')
    should(sheet.A2.v).be.eql('Another lines John developer with Wick as lastname')
  })

  it('variable replace multi with cell types', async () => {
    const data = {
      string: 'Boris',
      number: 7,
      boolean: true
    }

    const { sheet } = await render('variable-replace-multi-types', data)

    should(sheet.A1.v).be.eql(data.string)
    should(sheet.A1.t).be.eql('s')
    should(sheet.B1.v).be.eql(data.number)
    should(sheet.B1.t).be.eql('n')
    should(sheet.C1.v).be.eql(data.boolean)
    should(sheet.C1.t).be.eql('b')
  })

  it('generate cells with type according to the data rendered in each cell', async () => {
    const data = {
      name: 'Alexander',
      lastname: 'Smith',
      age: 23,
      working: true
    }

    const { sheet } = await render('content-type', data)

    // test boolean, number and standard string types
    should(sheet.C3.v).be.eql(data.name)
    should(sheet.D3.v).be.eql(data.lastname)
    should(sheet.E3.t).be.eql('n')
    should(sheet.E3.v).be.eql(data.age)
    should(sheet.F3.t).be.eql('b')
    should(sheet.F3.v).be.True()
  })

  it('variable replace multi with cell explicit types', async () => {
    const data = {
      string: 'Boris',
      number: '7',
      boolean: 'true'
    }

    const { sheet } = await render('variable-replace-multi-explicit-types', data)

    should(sheet.A1.v).be.eql(data.string)
    should(sheet.A1.t).be.eql('s')
    should(sheet.B1.v).be.eql(data.string)
    should(sheet.B1.t).be.eql('s')
    should(sheet.C1.v).be.eql(parseInt(data.number, 10))
    should(sheet.C1.t).be.eql('n')
    should(sheet.D1.v).be.eql(data.boolean === 'true')
    should(sheet.D1.t).be.eql('b')
  })

  it('variable replace styled', async () => {
    const { sheet, documents: [sheetDoc] } = await render('variable-replace-styled', {
      name: 'John'
    }, { files: ['xl/worksheets/sheet1.xml'] })

    should(sheet.A1.v).be.eql('Hello world John')

    const cellEls = sheetDoc.getElementsByTagName('c')

    should(cellEls.length).be.eql(1)

    const colorEl = cellEls[0].getElementsByTagName('color')[0]

    should(colorEl).be.ok()
    should(colorEl.getAttribute('rgb')).be.eql('FFFF0000')
  })

  it('variable replace styled (only part of handlebars styled in template should produce no style)', async () => {
    const { sheet, documents: [sheetDoc] } = await render('variable-replace-middle-styled', {
      name: 'John'
    }, { files: ['xl/worksheets/sheet1.xml'] })

    should(sheet.A1.v).be.eql('Hello world John')

    const cellEls = sheetDoc.getElementsByTagName('c')

    should(cellEls.length).be.eql(1)

    const colorEl = cellEls[0].getElementsByTagName('color')[0]

    should(colorEl).be.not.ok()
  })

  it('variable replace should keep escaping cell values when there was intention to do it {{expr}}', async () => {
    const { sheet, documents: [sheetDoc] } = await render('variable-replace', {
      name: 'Boris&Junior'
    }, { files: ['xl/worksheets/sheet1.xml'] })

    const cellEls = sheetDoc.getElementsByTagName('c')

    should(cellEls.length).be.eql(1)
    should(cellEls[0].toString()).containEql('Boris&amp;Junior')

    should(sheet.A1.v).be.eql('Hello world Boris&Junior')
  })

  it('variable replace multi should keep escaping cell values when there was intention to do it {{expr}}', async () => {
    const { sheet, documents: [sheetDoc] } = await render('variable-replace-multi', {
      name: 'Boris&Junior',
      lastname: 'Matos&Morillo'
    }, { files: ['xl/worksheets/sheet1.xml'] })

    const cellEls = sheetDoc.getElementsByTagName('c')

    should(cellEls.length).be.eql(2)
    should(cellEls[0].toString()).containEql('Boris&amp;Junior')
    should(cellEls[1].toString()).containEql('Boris&amp;Junior')
    should(cellEls[1].toString()).containEql('Matos&amp;Morillo')

    should(sheet.A1.v).be.eql('Hello world Boris&Junior developer')
    should(sheet.A2.v).be.eql('Another lines Boris&Junior developer with Matos&Morillo as lastname')
  })

  it('work normally with NUL character (should remove it)', async () => {
    const { sheet } = await render('variable-replace', {
      name: 'John\u0000'
    })

    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('work normally with VERTICAL TAB character (should remove it)', async () => {
    const { sheet } = await render('variable-replace', {
      name: 'John\u000b'
    })

    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('variable replace syntax error', () => {
    const prom = render('variable-replace-syntax-error', {
      name: 'John'
    })

    return Promise.all([
      should(prom).be.rejectedWith(/Parse error/i),
      // this text that error contains proper location of syntax error
      should(prom).be.rejectedWith(/Hello world {{/)
    ])
  })

  // #endregion cells

  // #region handlebars features

  it('helper call passing strings as values', async () => {
    const { sheet } = await render('helper-call-with-strings-as-values', {}, {
      helpers: `
        function testfunction(string) {
          return string
        }
      `
    })

    should(sheet.A1.v).be.eql('Passed in String')
    should(sheet.A2.v).be.eql('Passed in String')
  })

  it('async helper as cell content', async () => {
    const { sheet } = await render('async-helper-as-cell-content', {}, {
      helpers: `
        async function testing () {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(3)
            }, 200)
          })
        }
      `
    })

    should(sheet.A2.t).be.eql('n')
    should(sheet.A2.v).be.eql(3)
  })

  it('async helper as part of cell content', async () => {
    const { sheet } = await render('async-helper-as-part-of-cell-content', {}, {
      helpers: `
        async function testing () {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(3)
            }, 200)
          })
        }
      `
    })

    should(sheet.A2.t).be.eql('s')
    should(sheet.A2.v).be.eql('Value of 3')
  })

  it('condition with helper call inside a cell', async () => {
    const { sheet } = await render('condition-with-helper-call', {
      users: [1, 2, 3]
    }, {
      helpers: `
        function moreThan2(users) {
          return users.length > 2
        }
      `
    })

    should(sheet.A1.v).be.eql('More than 2 users')
  })

  it('handlebars partials', async () => {
    const { sheet } = await render('partial', {
      name: 'John'
    }, {
      helpers: `
        const h = require('handlebars')

        h.registerPartial('test', '{{name}}')
      `
    })

    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('folder scoped shared assets should be evaluated in generation', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'folderA',
      shortid: 'folderA'
    })
    await reporter.documentStore.collection('assets').insert({
      content: 'function a() { return \'hello form helper\' }',
      name: 'assetA',
      sharedHelpersScope: 'folder',
      folder: { shortid: 'folderA' }
    })
    const { sheet } = await render('asset', undefined, {
      prepare: async (request) => {
        const template = await reporter.documentStore.collection('templates').insert({
          ...request.template,
          name: 'template',
          folder: { shortid: 'folderA' }
        })

        return { template }
      }
    })

    should(sheet.A1.v).be.eql('hello form helper')
  })

  // #endregion handlebars features

  // #region formulas

  it('should generate workbook with full recalculation of formulas on load', async () => {
    const { workbook, sheet } = await render('variable-replace', {
      name: 'John'
    })

    should(workbook.Workbook.CalcPr.fullCalcOnLoad).be.eql('1')
    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('existing formulas that reference to cells above, same or bellow level should work', async () => {
    const { sheet, sheet2, sheet3, documents: [calcChainDoc] } = await render('existing-formula-cell-reference-for-different-levels', {}, {
      sheets: [0, 1, 2],
      files: (workbook) => [workbook.Directory.calcchain]
    })

    should(sheet.B2.v).be.eql(10)
    should(sheet.B3.v).be.eql(20)
    should(sheet.B4.f).be.eql('SUM(B2,B3)')

    should(sheet2.B2.f).be.eql('SUM(C2,D2)')
    should(sheet2.C2.v).be.eql(10)
    should(sheet2.D2.v).be.eql(20)

    should(sheet3.B2.f).be.eql('SUM(B3,B4)')
    should(sheet3.B3.v).be.eql(10)
    should(sheet3.B4.v).be.eql(20)

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    should(calcChainCellExists(cellEls, 'B2', '1')).be.True()
    should(calcChainCellExists(cellEls, 'B4', '2')).be.True()
    should(calcChainCellExists(cellEls, 'B2', '3')).be.True()
    should(cellEls).have.length(3)
  })

  it('existing formulas that reference cells from other sheets should be preserved', async () => {
    const { sheet, documents: [calcChainDoc] } = await render('existing-formula-cross-sheet-reference', {}, {
      files: (workbook) => [workbook.Directory.calcchain]
    })

    should(sheet.A2.v).be.eql(20)
    should(sheet.B2.f).be.eql('A2+B!A1')
    should(sheet.A3.v).be.eql(30)
    should(sheet.B3.f).be.eql('A3+B!A3')
    should(sheet.A4.v).be.eql(40)
    should(sheet.B4.f).be.eql('A4+B!A5')

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    should(calcChainCellExists(cellEls, 'B2')).be.True()
    should(calcChainCellExists(cellEls, 'B3')).be.True()
    should(calcChainCellExists(cellEls, 'B4')).be.True()
    should(cellEls).have.length(3)
  })

  it('existing formulas that reference cells from other sheets with name stored with \' string delimiters should be handled', async () => {
    const { sheet, documents: [calcChainDoc] } = await render('existing-formula-cross-sheet-reference-with-name-string-delimiter', {}, {
      files: (workbook) => [workbook.Directory.calcchain]
    })

    should(sheet.B2.f).be.eql("'Raw Data'!$B$2")
    should(sheet.A9.f).be.eql('RawData!$A$15')

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    should(calcChainCellExists(cellEls, 'B2')).be.True()
    should(calcChainCellExists(cellEls, 'A9')).be.True()
    should(cellEls).have.length(2)
  })

  it('existing formula with & character should be handled', async () => {
    const { sheet, documents: [calcChainDoc] } = await render('existing-formula-with-ampersand-character', {}, {
      files: (workbook) => [workbook.Directory.calcchain]
    })

    should(sheet.B4.f).be.eql('B2 & " " & B3')

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    should(calcChainCellExists(cellEls, 'B4')).be.True()
    should(cellEls).have.length(1)
  })

  it('existing lazy formula with & character should be handled', async () => {
    const { sheet, documents: [calcChainDoc] } = await render('existing-lazy-formula-with-ampersand-character', {}, {
      files: (workbook) => [workbook.Directory.calcchain]
    })

    should(sheet.B2.f).be.eql('B3 & " " & B4')

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    should(calcChainCellExists(cellEls, 'B2')).be.True()
    should(cellEls).have.length(1)
  })

  it('last processing of lazy formulas should be handled', async () => {
    const { sheet, documents: [calcChainDoc] } = await render('last-lazy-formulas', { val: 1 }, {
      files: (workbook) => [workbook.Directory.calcchain]
    })

    should(sheet.A1.v).be.eql('col1')
    should(sheet.B1.v).be.eql('col2')
    should(sheet.C1.v).be.eql('col3')
    should(sheet.D1.v).be.eql('col4')
    should(sheet.A2.v).be.eql(1)
    should(sheet.B2.f).be.eql('A2')
    should(sheet.C2.f).be.eql('B2+1')
    should(sheet.D2.f).be.eql('B2+2')
    should(sheet.A3.f).be.eql('C2+B2')
    should(sheet.B3.f).be.eql('C2+D2')

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    should(calcChainCellExists(cellEls, 'B2')).be.True()
    should(calcChainCellExists(cellEls, 'C2')).be.True()
    should(calcChainCellExists(cellEls, 'D2')).be.True()
    should(calcChainCellExists(cellEls, 'A3')).be.True()
    should(calcChainCellExists(cellEls, 'B3')).be.True()
    should(cellEls).have.length(5)
  })

  // #endregion formulas
})
