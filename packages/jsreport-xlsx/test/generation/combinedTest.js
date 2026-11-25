const should = require('should')
const jsreport = require('@jsreport/jsreport-core')
const { calcChainCellExists, createRender, mergeCellExists } = require('../utils')
const { nodeListToArray } = require('../../lib/utils')

describe('xlsx generation - loops and conditions', () => {
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

  // #region conditions inside loops

  it('row loop with condition should remove the rows of the items that do not meet the condition', async () => {
    const { sheet } = await render('loop-row-with-condition', {
      items: [
        { type: 'AC', name: 'Apple', price: 10 },
        { type: 'XY', name: 'Pear', price: 5 },
        { type: 'AC', name: 'Plum', price: 7 }
      ]
    }, {
      helpers: 'function eq (a, b) { return a === b }'
    })

    should(sheet.A2.v).be.eql('Name')
    should(sheet.B2.v).be.eql('Price')
    should(sheet.A3.v).be.eql('Apple')
    should(sheet.B3.v).be.eql(10)
    should(sheet.A4.v).be.eql('Plum')
    should(sheet.B4.v).be.eql(7)
    should(sheet.A5.v).be.eql('Total')
    should(sheet.A6).be.undefined()
  })

  it('row loop with condition should keep all rows when all items meet the condition', async () => {
    const { sheet } = await render('loop-row-with-condition', {
      items: [
        { type: 'AC', name: 'Apple', price: 10 },
        { type: 'AC', name: 'Plum', price: 7 }
      ]
    }, {
      helpers: 'function eq (a, b) { return a === b }'
    })

    should(sheet.A3.v).be.eql('Apple')
    should(sheet.A4.v).be.eql('Plum')
    should(sheet.A5.v).be.eql('Total')
  })

  it('row loop with condition should remove all rows when no item meet the condition', async () => {
    const { sheet } = await render('loop-row-with-condition', {
      items: [
        { type: 'XY', name: 'Pear', price: 5 },
        { type: 'XY', name: 'Kiwi', price: 2 }
      ]
    }, {
      helpers: 'function eq (a, b) { return a === b }'
    })

    should(sheet.A2.v).be.eql('Name')
    should(sheet.A3.v).be.eql('Total')
    should(sheet.A4).be.undefined()
  })

  it('row loop with condition should work with block params', async () => {
    const { sheet } = await render('loop-row-with-condition-block-params', {
      items: [
        { type: 'AC', name: 'Apple', price: 10 },
        { type: 'XY', name: 'Pear', price: 5 },
        { type: 'AC', name: 'Plum', price: 7 }
      ]
    }, {
      helpers: 'function eq (a, b) { return a === b }'
    })

    should(sheet.A3.v).be.eql('Apple')
    should(sheet.B3.v).be.eql(10)
    should(sheet.A4.v).be.eql('Plum')
    should(sheet.B4.v).be.eql(7)
    should(sheet.A5.v).be.eql('Total')
  })

  it('row loop with condition should remove the cells (not the rows) of the items that do not meet the condition when the row has cells outside of the loop', async () => {
    const items = [
      { a: true, name: 'x', price: 1 },
      { a: false, name: 'y', price: 2 },
      { a: true, name: 'z', price: 3 }
    ]

    const { sheet } = await render('loop-row-with-condition-and-out-of-loop-cells', { items })

    should(sheet['!ref']).be.eql('A2:C4')

    // the cell outside of the loop is rendered just in the first iteration
    should(sheet.A2.v).be.eql('Label')
    should(sheet.B2.v).be.eql(items[0].name)
    should(sheet.C2.v).be.eql(items[0].price)

    // the condition covers the cells of the loop but not the whole row (the row has a cell outside
    // of the loop), so the condition removes the cells and the row of the iteration stays empty
    should(sheet.A3).be.not.ok()
    should(sheet.B3).be.not.ok()
    should(sheet.C3).be.not.ok()

    should(sheet.A4).be.not.ok()
    should(sheet.B4.v).be.eql(items[2].name)
    should(sheet.C4.v).be.eql(items[2].price)
  })

  it('block loop with condition should remove the rows of the items that do not meet the condition and preserve loop data variables', async () => {
    const { sheet } = await render('loop-with-condition-block', {
      title: 'T',
      items: [
        { name: 'a', show: true },
        { name: 'b', show: false },
        { name: 'c', show: true }
      ]
    })

    should(sheet.A2.v).be.eql('Item 0')
    should(sheet.A3.v).be.eql('a')
    should(sheet.B3.v).be.eql('merged')
    should(sheet.A4.v).be.eql('T')
    should(sheet.A5.v).be.eql('first')
    should(sheet.A6.v).be.eql('end 0')
    should(sheet.A7.v).be.eql('Item 1')
    should(sheet.A8.v).be.eql('end 1')
    should(sheet.A9.v).be.eql('Item 2')
    should(sheet.A10.v).be.eql('c')
    should(sheet.B10.v).be.eql('merged')
    should(sheet.A11.v).be.eql('T')
    should(sheet.A12.v).be.eql('other')
    should(sheet.A13.v).be.eql('end 2')
    should(sheet.A14.v).be.eql('Total')
    should(sheet['!merges'].length).be.eql(2)
    should(mergeCellExists(sheet, 'B3:C3')).be.True()
    should(mergeCellExists(sheet, 'B10:C10')).be.True()
  })

  it('vertical condition inside loop should remove the column cells of the items that do not meet the condition', async () => {
    const { sheet } = await render('loop-with-condition-vertical', {
      items: [
        { name: 'Apple', price: 10, qty: 3, hasPrice: true, note: 'note1' },
        { name: 'Pear', qty: 5, note: 'note2' }
      ]
    })

    should(sheet.A2.v).be.eql('Apple')
    should(sheet.B2.v).be.eql(10)
    should(sheet.C2.v).be.eql(3)
    should(sheet.A3.v).be.eql('note1')
    should(sheet.A4.v).be.eql('Pear')
    should(sheet.B4.v).be.eql(5)
    should(sheet.C4).be.undefined()
    should(sheet.A5.v).be.eql('note2')
  })

  it('vertical condition inside vertical loop should use the value of each item in all the rows of the condition', async () => {
    const items = [
      { name: 'i1', show: true, a: 1, b: 2 },
      { name: 'i2', show: false, a: 3, b: 4 },
      { name: 'i3', show: true, a: 5, b: 6 }
    ]

    const { sheet } = await render('loop-vertical-with-condition-vertical', { items })

    should(sheet['!ref']).be.eql('C3:E6')

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[1].name)
    should(sheet.E3.v).be.eql(items[2].name)

    // the vertical loop renders row by row (all the items for a row, then the next row), each row of
    // the condition should use the value of its own item. the cells of the item that does not meet the
    // condition are removed and the cells on the right take its place
    should(sheet.C4.v).be.eql(items[0].a)
    should(sheet.D4.v).be.eql(items[2].a)
    should(sheet.E4).be.not.ok()
    should(sheet.C5.v).be.eql(items[0].b)
    should(sheet.D5.v).be.eql(items[2].b)
    should(sheet.E5).be.not.ok()

    should(sheet.C6.v).be.eql('end')
    should(sheet.D6.v).be.eql('end')
    should(sheet.E6.v).be.eql('end')
  })

  // #endregion conditions inside loops

  // #region loops inside conditions

  it('condition with loop inside should render the loop when condition is true', async () => {
    const { sheet } = await render('condition-with-loop', { showItems: true, items: [{ name: 'n1' }, { name: 'n2' }] })

    should(sheet.A2.v).be.eql('Items:')
    should(sheet.A3.v).be.eql('n1')
    should(sheet.A4.v).be.eql('n2')
    should(sheet.A5.v).be.eql('Count: 2')
    should(sheet.A6.v).be.eql('Total')
  })

  it('condition with loop inside should remove all the rows when condition is false', async () => {
    const { sheet } = await render('condition-with-loop', { showItems: false, items: [{ name: 'n1' }, { name: 'n2' }] })

    should(sheet['!ref']).be.eql('A2')
    should(sheet.A2.v).be.eql('Total')
  })

  it('condition (keepCells) with loop inside should render the loop when condition is true', async () => {
    const data = { show: true, items: [{ name: 'n1' }, { name: 'n2' }] }
    const { sheet } = await render('condition-keep-cells-with-loop', data)

    should(sheet.A3.v).be.eql('Items:')
    should(sheet.A4.v).be.eql(data.items[0].name)
    should(sheet.A5.v).be.eql(data.items[1].name)
    should(sheet.A6.v).be.eql('Count: 2')
    should(sheet.A7.v).be.eql('Total')
  })

  it('condition (keepCells) with loop inside should render the loop once with empty cells when condition is false', async () => {
    const data = { show: false, items: [{ name: 'n1' }, { name: 'n2' }] }
    const { sheet } = await render('condition-keep-cells-with-loop', data)

    should(sheet['!ref']).be.eql('A3:B6')

    // the cells of the condition are kept (empty), the loop is rendered once (empty) no matter the data
    should(sheet.A3.v).be.eql('')
    should(sheet.A4.v).be.eql('')
    should(sheet.A5.v).be.eql('')
    should(sheet.A6.v).be.eql('Total')
  })

  it('condition with dynamic loop inside should render the loop when condition is true', async () => {
    const items = [['a1', 'a2', 'a3'], ['b1', 'b2', 'b3']]

    const { sheet } = await render('condition-with-dynamic-loop', { show: true, items })

    should(sheet['!ref']).be.eql('A2:D7')

    should(sheet.A2.v).be.eql('Items:')
    should(sheet.B3.v).be.eql(items[0][0])
    should(sheet.C3.v).be.eql(items[0][1])
    should(sheet.D3.v).be.eql(items[0][2])
    should(sheet.B4.v).be.eql(items[1][0])
    should(sheet.C4.v).be.eql(items[1][1])
    should(sheet.D4.v).be.eql(items[1][2])
    should(sheet.A5.v).be.eql('end')
    should(sheet.A7.v).be.eql('after')
  })

  it('condition with dynamic loop inside should remove all the rows when condition is false', async () => {
    const items = [['a1', 'a2', 'a3'], ['b1', 'b2', 'b3']]

    const { sheet } = await render('condition-with-dynamic-loop', { show: false, items })

    // the rows 2-4 of the template are removed (with the loop), the rows after them are moved up
    should(sheet['!ref']).be.eql('A3')

    should(sheet.A2).be.not.ok()
    should(sheet.B3).be.not.ok()
    should(sheet.A3.v).be.eql('after')
  })

  it('condition with vertical loop inside should render the loop when condition is true', async () => {
    const items = [{ name: 'i1', price: 1 }, { name: 'i2', price: 2 }]

    const { sheet } = await render('condition-with-vertical-loop', { show: true, items })

    should(sheet['!ref']).be.eql('A2:C7')

    should(sheet.A2.v).be.eql('Items:')
    should(sheet.A3.v).be.eql('Name')
    should(sheet.B3.v).be.eql(items[0].name)
    should(sheet.C3.v).be.eql(items[1].name)
    should(sheet.A4.v).be.eql('Price')
    should(sheet.B4.v).be.eql(items[0].price)
    should(sheet.C4.v).be.eql(items[1].price)
    should(sheet.A5.v).be.eql('end')
    should(sheet.A7.v).be.eql('after')
  })

  it('condition with vertical loop inside should remove all the rows when condition is false', async () => {
    const items = [{ name: 'i1', price: 1 }, { name: 'i2', price: 2 }]

    const { sheet } = await render('condition-with-vertical-loop', { show: false, items })

    // the rows 2-5 of the template are removed (with the loop), the rows after them are moved up
    should(sheet['!ref']).be.eql('A3')

    should(sheet.A2).be.not.ok()
    should(sheet.B3).be.not.ok()
    should(sheet.C3).be.not.ok()
    should(sheet.A3.v).be.eql('after')
  })

  it('condition (keepCells) with vertical loop inside should render the loop when condition is true', async () => {
    const items = [{ name: 'i1', price: 1 }, { name: 'i2', price: 2 }]

    const { sheet } = await render('condition-with-vertical-loop', { show: true, keep: true, items })

    should(sheet['!ref']).be.eql('A2:C7')

    should(sheet.A2.v).be.eql('Items:')
    should(sheet.B3.v).be.eql(items[0].name)
    should(sheet.C3.v).be.eql(items[1].name)
    should(sheet.B4.v).be.eql(items[0].price)
    should(sheet.C4.v).be.eql(items[1].price)
    should(sheet.A5.v).be.eql('end')
    should(sheet.A7.v).be.eql('after')
  })

  it('condition (keepCells) with vertical loop inside should render the loop once with empty cells when condition is false', async () => {
    const items = [{ name: 'i1', price: 1 }, { name: 'i2', price: 2 }]

    const { sheet } = await render('condition-with-vertical-loop', { show: false, keep: true, items })

    // the rows are kept, the loop is rendered once (just one column) with empty cells
    should(sheet['!ref']).be.eql('A2:B7')

    should(sheet.A2.v).be.eql('')
    should(sheet.A3.v).be.eql('')
    should(sheet.B3.v).be.eql('')
    should(sheet.C3).be.not.ok()
    should(sheet.A4.v).be.eql('')
    should(sheet.B4.v).be.eql('')
    should(sheet.C4).be.not.ok()
    should(sheet.A5.v).be.eql('')
    should(sheet.A7.v).be.eql('after')
  })

  // #endregion loops inside conditions

  // #region sibling loops and conditions

  it('dynamic loop and sibling condition should render the cells of the condition after the rows of the loop when condition is true', async () => {
    const items = [['a1', 'a2', 'a3'], ['b1', 'b2', 'b3']]

    const { sheet } = await render('loop-dynamic-and-sibling-condition', { show: true, items })

    should(sheet['!ref']).be.eql('A2:D8')

    should(sheet.B2.v).be.eql(items[0][0])
    should(sheet.D2.v).be.eql(items[0][2])
    should(sheet.B3.v).be.eql(items[1][0])
    should(sheet.D3.v).be.eql(items[1][2])

    // the condition is moved down by the rows generated by the loop
    should(sheet.A5.v).be.eql('x')
    should(sheet.A6.v).be.eql('y')
    should(sheet.A8.v).be.eql('after')
  })

  it('dynamic loop and sibling condition should remove the rows of the condition after the rows of the loop when condition is false', async () => {
    const items = [['a1', 'a2', 'a3'], ['b1', 'b2', 'b3']]

    const { sheet } = await render('loop-dynamic-and-sibling-condition', { show: false, items })

    should(sheet['!ref']).be.eql('A2:D6')

    should(sheet.B2.v).be.eql(items[0][0])
    should(sheet.D2.v).be.eql(items[0][2])
    should(sheet.B3.v).be.eql(items[1][0])
    should(sheet.D3.v).be.eql(items[1][2])

    // the rows of the condition are removed, the rows after them are moved up
    should(sheet.A5).be.not.ok()
    should(sheet.A6.v).be.eql('after')
  })

  // #endregion sibling loops and conditions

  // #region multiple levels of nesting

  it('block loop with condition with loop inside', async () => {
    const { sheet } = await render('loop-with-condition-with-loop', {
      groups: [
        { name: 'g1', show: true, members: ['m1', 'm2'] },
        { name: 'g2', show: false, members: ['x'] },
        { name: 'g3', show: true, members: ['m3'] }
      ]
    })

    const expected = ['g1', 'Members:', 'm1', 'm2', 'end', '---', 'g2', '---', 'g3', 'Members:', 'm3', 'end', '---', 'Total']

    for (const [idx, value] of expected.entries()) {
      should(sheet[`A${idx + 2}`].v).be.eql(value)
    }

    should(sheet[`A${expected.length + 2}`]).be.undefined()
  })

  it('vertical loop with vertical condition with vertical condition inside should use the value of each item in all the rows of the conditions', async () => {
    const items = [
      { name: 'i1', show: true, showInner: false, a: 'a1', b: 'b1', c: 'c1', d: 'd1' },
      { name: 'i2', show: false, showInner: true, a: 'a2', b: 'b2', c: 'c2', d: 'd2' },
      { name: 'i3', show: true, showInner: true, a: 'a3', b: 'b3', c: 'c3', d: 'd3' }
    ]

    const { sheet } = await render('loop-vertical-with-condition-vertical-and-inner-condition-vertical', { items })

    should(sheet['!ref']).be.eql('C3:E8')

    should(sheet.C3.v).be.eql(items[0].name)
    should(sheet.D3.v).be.eql(items[1].name)
    should(sheet.E3.v).be.eql(items[2].name)

    // the vertical loop renders row by row (all the items for a row, then the next row), each row of
    // the conditions should use the values of its own item. the cells of the items that do not meet
    // the conditions are removed and the cells on the right take its place
    should(sheet.C4.v).be.eql(items[0].a)
    should(sheet.D4.v).be.eql(items[2].a)
    should(sheet.E4).be.not.ok()

    // the inner condition is only true for the last item (the second item does not meet the outer condition)
    should(sheet.C5.v).be.eql(items[2].b)
    should(sheet.D5).be.not.ok()
    should(sheet.C6.v).be.eql(items[2].c)
    should(sheet.D6).be.not.ok()

    should(sheet.C7.v).be.eql(items[0].d)
    should(sheet.D7.v).be.eql(items[2].d)
    should(sheet.E7).be.not.ok()

    should(sheet.C8.v).be.eql('end')
    should(sheet.D8.v).be.eql('end')
    should(sheet.E8.v).be.eql('end')
  })

  // #endregion multiple levels of nesting

  // #region formulas

  it('row condition inside loop should update the formula of each iteration with the cells of the same iteration (removed or rendered)', async () => {
    const data = {
      items: [
        { name: 'a', show: true, value: 1 },
        { name: 'b', show: false, value: 2 },
        { name: 'c', show: true, value: 3 }
      ]
    }

    const { sheet, documents: [calcChainDoc] } = await render('condition-inside-loop-formula-refs-to-removed-cells', data, {
      files: ['xl/calcChain.xml']
    })

    should(sheet['!ref']).be.eql('B3:F5')

    should(sheet.B3.v).be.eql('a')
    should(sheet.C3.v).be.eql(1)
    should(sheet.E3.f).be.eql('C3*2')

    // the condition is false in this iteration, the cells of the condition are removed and the
    // formula cell is moved left, its ref points to a removed cell of the same iteration
    should(sheet.B4.v).be.eql('b')
    should(sheet.C4.f).be.eql('#REF!*2')
    should(sheet.E4).be.not.ok()

    should(sheet.B5.v).be.eql('c')
    should(sheet.C5.v).be.eql(3)
    should(sheet.E5.f).be.eql('C5*2')

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    should(calcChainCellExists(cellEls, 'E3')).be.True()
    should(calcChainCellExists(cellEls, 'C4')).be.True()
    should(calcChainCellExists(cellEls, 'E5')).be.True()
    should(cellEls).have.length(3)
  })

  it('vertical condition inside vertical loop inside block loop should update the formula of each iteration with the cells of the same iteration (removed or rendered)', async () => {
    const groups = [
      { name: 'g1', items: [{ name: 'i1', show: true, a: 1, b: 2 }, { name: 'i2', show: true, a: 3, b: 4 }] },
      { name: 'g2', items: [{ name: 'i3', show: true, a: 5, b: 6 }, { name: 'i4', show: false, a: 7, b: 8 }] }
    ]

    const { sheet, documents: [calcChainDoc] } = await render('loop-with-vertical-loop-with-vertical-condition-formula-refs-to-removed-cells', { groups }, {
      files: ['xl/calcChain.xml']
    })

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    should(sheet['!ref']).be.eql('B2:D15')

    should(sheet.B2.v).be.eql(groups[0].name)
    should(sheet.C3.v).be.eql(groups[0].items[0].name)
    should(sheet.D3.v).be.eql(groups[0].items[1].name)
    should(sheet.C4.v).be.eql(groups[0].items[0].a)
    should(sheet.D4.v).be.eql(groups[0].items[1].a)
    should(sheet.C5.v).be.eql(groups[0].items[0].b)
    should(sheet.D5.v).be.eql(groups[0].items[1].b)
    should(sheet.C6.f).be.eql('C4')
    should(sheet.D6.f).be.eql('D4')
    should(sheet.C7.v).be.eql('end')
    should(sheet.D7.v).be.eql('end')

    should(sheet.B9.v).be.eql(groups[1].name)
    should(sheet.C10.v).be.eql(groups[1].items[0].name)
    should(sheet.D10.v).be.eql(groups[1].items[1].name)
    should(sheet.C11.v).be.eql(groups[1].items[0].a)
    should(sheet.D11).be.not.ok()
    should(sheet.C12.v).be.eql(groups[1].items[0].b)
    should(sheet.D12).be.not.ok()
    should(sheet.C13.f).be.eql('C11')
    // the ref points to a removed cell of the same iteration of the vertical loop, the iteration has the
    // same index than an iteration of the previous group, it should not use the cell of that group (D4)
    should(sheet.D13.f).be.eql('#REF!')
    should(sheet.C14.v).be.eql('end')
    should(sheet.D14.v).be.eql('end')

    should(calcChainCellExists(cellEls, 'C6')).be.True()
    should(calcChainCellExists(cellEls, 'D6')).be.True()
    should(calcChainCellExists(cellEls, 'C13')).be.True()
    should(calcChainCellExists(cellEls, 'D13')).be.True()
    should(cellEls).have.length(4)
  })

  it('condition with loop inside should update the formulas of the loop and the formulas that reference the loop when condition is true', async () => {
    const data = {
      show: true,
      items: [{ name: 'a', value: 1 }, { name: 'b', value: 2 }]
    }

    const { sheet, documents: [calcChainDoc] } = await render('condition-with-loop-formula-refs-to-removed-cells', data, {
      files: ['xl/calcChain.xml']
    })

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    should(sheet['!ref']).be.eql('B2:E7')

    should(sheet.B2.v).be.eql('Items')
    should(sheet.B3.v).be.eql(data.items[0].name)
    should(sheet.C3.v).be.eql(data.items[0].value)
    should(sheet.D3.f).be.eql('C3*2')
    should(sheet.B4.v).be.eql(data.items[1].name)
    should(sheet.C4.v).be.eql(data.items[1].value)
    should(sheet.D4.f).be.eql('C4*2')
    should(sheet.B5.v).be.eql('end')

    should(sheet.B7.v).be.eql('Total')
    should(sheet.C7.f).be.eql('SUM(C3:C4)')

    should(calcChainCellExists(cellEls, 'D3')).be.True()
    should(calcChainCellExists(cellEls, 'D4')).be.True()
    should(calcChainCellExists(cellEls, 'C7')).be.True()
    should(cellEls).have.length(3)
  })

  it('condition with loop inside should remove the formula cells of the loop and update the formulas that reference the loop when condition is false', async () => {
    const data = {
      show: false,
      items: [{ name: 'a', value: 1 }, { name: 'b', value: 2 }]
    }

    const { sheet, documents: [calcChainDoc] } = await render('condition-with-loop-formula-refs-to-removed-cells', data, {
      files: ['xl/calcChain.xml']
    })

    const cellEls = nodeListToArray(calcChainDoc.getElementsByTagName('c'))

    // the rows 2-4 of the template are removed (with the loop and its formula cells),
    // the rows after them are moved up
    should(sheet['!ref']).be.eql('B3:C3')

    should(sheet.B2).be.not.ok()
    should(sheet.D3).be.not.ok()

    // the range points to the cells of the loop, all of them were removed
    should(sheet.B3.v).be.eql('Total')
    should(sheet.C3.f).be.eql('SUM(#REF!)')

    should(calcChainCellExists(cellEls, 'C3')).be.True()
    should(cellEls).have.length(1)
  })

  // #endregion formulas
})
