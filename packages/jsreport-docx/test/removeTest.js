const should = require('should')
const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const { nodeListToArray } = require('../lib/utils')
const { getDocumentsFromDocxBuf } = require('./utils')

const docxDirPath = path.join(__dirname, './docx')
const outputPath = path.join(__dirname, '../out.docx')

describe('docx remove', () => {
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

  it('remove - default should remove paragraph', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'remove-default.docx'))
          }
        }
      },
      data: {}
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const pEls = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(pEls.length).be.equal(1)

    should(pEls[0].textContent).be.equal('Another paragraph here')
  })

  it('remove - paragraph', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'remove-paragraph.docx'))
          }
        }
      },
      data: {
        remove: true
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const pEls = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(pEls.length).be.equal(1)

    should(pEls[0].textContent).be.equal('Another paragraph here')
  })

  it('remove - keep paragraph', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'remove-paragraph.docx'))
          }
        }
      },
      data: {
        remove: false
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const pEls = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(pEls.length).be.equal(2)

    should(pEls[0].textContent).be.equal('a paragraph here')
    should(pEls[1].textContent).be.equal('Another paragraph here')
  })

  it('remove - paragraph in table', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'remove-table-default.docx'))
          }
        }
      },
      data: {
        remove: true
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const tblEls = nodeListToArray(doc.getElementsByTagName('w:tbl'))

    should(tblEls.length).be.equal(1)

    const rows = nodeListToArray(tblEls[0].getElementsByTagName('w:tr'))

    should(rows.length).be.equal(2)

    const paragraphsInFirstRow = rows[0].getElementsByTagName('w:p')

    should(paragraphsInFirstRow.length).be.equal(1)

    should(rows[0].textContent).be.equal('Another paragraph here')
    should(rows[1].textContent).be.equal('Second row')
  })

  it('remove - keep paragraph in table', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'remove-table-default.docx'))
          }
        }
      },
      data: {
        remove: false
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const tblEls = nodeListToArray(doc.getElementsByTagName('w:tbl'))

    should(tblEls.length).be.equal(1)

    const rows = nodeListToArray(tblEls[0].getElementsByTagName('w:tr'))

    should(rows.length).be.equal(2)

    const paragraphsInFirstRow = rows[0].getElementsByTagName('w:p')

    should(paragraphsInFirstRow.length).be.equal(2)

    should(paragraphsInFirstRow[0].textContent).be.equal('a paragraph here')
    should(paragraphsInFirstRow[1].textContent).be.equal('Another paragraph here')

    should(rows[1].textContent).be.equal('Second row')
  })

  it('remove - row in table', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'remove-table.docx'))
          }
        }
      },
      data: {
        remove: true,
        target: 'row'
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const tblEls = nodeListToArray(doc.getElementsByTagName('w:tbl'))

    should(tblEls.length).be.equal(1)

    const rows = nodeListToArray(tblEls[0].getElementsByTagName('w:tr'))

    should(rows.length).be.equal(1)

    const paragraphsInFirstRow = rows[0].getElementsByTagName('w:p')

    should(paragraphsInFirstRow.length).be.equal(1)

    should(paragraphsInFirstRow[0].textContent).be.equal('Second row')
  })

  it('remove - keep row in table', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'remove-table.docx'))
          }
        }
      },
      data: {
        remove: false,
        target: 'row'
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const tblEls = nodeListToArray(doc.getElementsByTagName('w:tbl'))

    should(tblEls.length).be.equal(1)

    const rows = nodeListToArray(tblEls[0].getElementsByTagName('w:tr'))

    should(rows.length).be.equal(2)

    const paragraphsInFirstRow = rows[0].getElementsByTagName('w:p')

    should(paragraphsInFirstRow.length).be.equal(2)

    should(paragraphsInFirstRow[0].textContent).be.equal('a paragraph here')
    should(paragraphsInFirstRow[1].textContent).be.equal('Another paragraph here')

    should(rows[1].textContent).be.equal('Second row')
  })

  it('remove - table', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'remove-table.docx'))
          }
        }
      },
      data: {
        remove: true,
        target: 'table'
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const tblEls = nodeListToArray(doc.getElementsByTagName('w:tbl'))

    should(tblEls.length).be.equal(0)
  })

  it('remove - keep table', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'remove-table.docx'))
          }
        }
      },
      data: {
        remove: false,
        target: 'table'
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const tblEls = nodeListToArray(doc.getElementsByTagName('w:tbl'))

    should(tblEls.length).be.equal(1)

    const rows = nodeListToArray(tblEls[0].getElementsByTagName('w:tr'))

    should(rows.length).be.equal(2)

    const paragraphsInFirstRow = rows[0].getElementsByTagName('w:p')

    should(paragraphsInFirstRow.length).be.equal(2)

    should(paragraphsInFirstRow[0].textContent).be.equal('a paragraph here')
    should(paragraphsInFirstRow[1].textContent).be.equal('Another paragraph here')

    should(rows[1].textContent).be.equal('Second row')
  })

  const products = [
    { name: 'Apple', qty: 1, discount: '10%' },
    { name: 'Orange', qty: 2, discount: '5%' }
  ]

  const renderColumnTemplate = async (templateName, data) => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, templateName))
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    return doc
  }

  const getTableInfo = (doc) => {
    const tblEls = nodeListToArray(doc.getElementsByTagName('w:tbl'))

    should(tblEls.length).be.equal(1)

    const gridColWidths = nodeListToArray(tblEls[0].getElementsByTagName('w:gridCol')).map((el) => parseInt(el.getAttribute('w:w'), 10))

    const rows = nodeListToArray(tblEls[0].getElementsByTagName('w:tr')).map((rowEl) => {
      return nodeListToArray(rowEl.getElementsByTagName('w:tc')).map((cellEl) => {
        const gridSpanEl = cellEl.getElementsByTagName('w:gridSpan')[0]

        return {
          text: cellEl.textContent,
          span: gridSpanEl != null ? parseInt(gridSpanEl.getAttribute('w:val'), 10) : 1,
          width: parseInt(cellEl.getElementsByTagName('w:tcW')[0].getAttribute('w:w'), 10)
        }
      })
    })

    return { gridColWidths, rows }
  }

  const assertCellWidthsMatchGrid = ({ gridColWidths, rows }) => {
    for (const row of rows) {
      let current = 0

      for (const cell of row) {
        const expected = gridColWidths.slice(current, current + cell.span).reduce((acc, w) => acc + w, 0)
        should(cell.width).be.equal(expected)
        current += cell.span
      }
    }
  }

  const getRowsGridInfo = (doc) => {
    const tblEl = doc.getElementsByTagName('w:tbl')[0]

    return nodeListToArray(tblEl.getElementsByTagName('w:tr')).map((rowEl) => {
      const beforeEl = rowEl.getElementsByTagName('w:gridBefore')[0]
      const afterEl = rowEl.getElementsByTagName('w:gridAfter')[0]

      return {
        before: beforeEl != null ? parseInt(beforeEl.getAttribute('w:val'), 10) : 0,
        after: afterEl != null ? parseInt(afterEl.getAttribute('w:val'), 10) : 0
      }
    })
  }

  it('remove - column in table', async () => {
    const doc = await renderColumnTemplate('remove-column.docx', { remove: true, products })
    const info = getTableInfo(doc)

    should(info.gridColWidths.length).be.equal(2)
    should(info.gridColWidths.reduce((acc, w) => acc + w, 0)).be.equal(9350)

    should(info.rows.map((row) => row.map((cell) => cell.text))).be.eql([
      ['Name', 'Qty'],
      ['Apple', '1'],
      ['Orange', '2']
    ])

    assertCellWidthsMatchGrid(info)

    should(doc.documentElement.toString()).not.containEql('docxRemove')
  })

  it('remove - keep column in table', async () => {
    const doc = await renderColumnTemplate('remove-column.docx', { remove: false, products })
    const info = getTableInfo(doc)

    should(info.gridColWidths).be.eql([3116, 3117, 3117])

    should(info.rows.map((row) => row.map((cell) => cell.text))).be.eql([
      ['Name', 'Qty', 'Discount'],
      ['Apple', '1', '10%'],
      ['Orange', '2', '5%']
    ])

    assertCellWidthsMatchGrid(info)

    should(doc.documentElement.toString()).not.containEql('docxRemove')
  })

  it('remove - column in table with merged cell', async () => {
    const doc = await renderColumnTemplate('remove-column-merged.docx', { remove: true, products })
    const info = getTableInfo(doc)

    should(info.gridColWidths.length).be.equal(2)
    should(info.gridColWidths.reduce((acc, w) => acc + w, 0)).be.equal(9350)

    should(info.rows[0].length).be.equal(1)
    should(info.rows[0][0].text).be.equal('Products')
    should(info.rows[0][0].span).be.equal(2)
    should(info.rows[0][0].width).be.equal(9350)

    should(info.rows.slice(1).map((row) => row.map((cell) => cell.text))).be.eql([
      ['Name', 'Qty'],
      ['Apple', '1'],
      ['Orange', '2']
    ])

    assertCellWidthsMatchGrid(info)

    should(doc.documentElement.toString()).not.containEql('docxRemove')
  })

  it('remove - column in table when call is in loop row', async () => {
    const doc = await renderColumnTemplate('remove-column-middle.docx', { remove: true, products })
    const info = getTableInfo(doc)

    should(info.gridColWidths.length).be.equal(2)
    should(info.gridColWidths.reduce((acc, w) => acc + w, 0)).be.equal(9350)

    should(info.rows.map((row) => row.map((cell) => cell.text))).be.eql([
      ['Name', 'Discount'],
      ['Apple', '10%'],
      ['Orange', '5%']
    ])

    assertCellWidthsMatchGrid(info)

    should(doc.documentElement.toString()).not.containEql('docxRemove')
  })

  it('remove - keep column in table with merged cell', async () => {
    const doc = await renderColumnTemplate('remove-column-merged.docx', { remove: false, products })
    const info = getTableInfo(doc)

    should(info.gridColWidths).be.eql([3116, 3117, 3117])

    should(info.rows[0].length).be.equal(1)
    should(info.rows[0][0].text).be.equal('Products')
    should(info.rows[0][0].span).be.equal(3)
    should(info.rows[0][0].width).be.equal(9350)

    should(info.rows.slice(1).map((row) => row.map((cell) => cell.text))).be.eql([
      ['Name', 'Qty', 'Discount'],
      ['Apple', '1', '10%'],
      ['Orange', '2', '5%']
    ])

    should(doc.documentElement.toString()).not.containEql('docxRemove')
  })

  it('remove - keep column in table when call is in loop row', async () => {
    const doc = await renderColumnTemplate('remove-column-middle.docx', { remove: false, products })
    const info = getTableInfo(doc)

    should(info.gridColWidths).be.eql([3116, 3117, 3117])

    should(info.rows.map((row) => row.map((cell) => cell.text))).be.eql([
      ['Name', 'Qty', 'Discount'],
      ['Apple', '1', '10%'],
      ['Orange', '2', '5%']
    ])

    should(doc.documentElement.toString()).not.containEql('docxRemove')
  })

  it('remove - column in table with no data rows', async () => {
    const doc = await renderColumnTemplate('remove-column.docx', { remove: true, products: [] })
    const info = getTableInfo(doc)

    should(info.gridColWidths.length).be.equal(2)
    should(info.gridColWidths.reduce((acc, w) => acc + w, 0)).be.equal(9350)

    should(info.rows.map((row) => row.map((cell) => cell.text))).be.eql([
      ['Name', 'Qty']
    ])

    assertCellWidthsMatchGrid(info)
  })

  it('remove - column should remove table when it is the only column', async () => {
    const doc = await renderColumnTemplate('remove-column-single.docx', { remove: true, products })

    const tblEls = nodeListToArray(doc.getElementsByTagName('w:tbl'))

    should(tblEls.length).be.equal(0)
    should(doc.documentElement.toString()).not.containEql('docxRemove')
  })

  it('remove - keep column when it is the only column', async () => {
    const doc = await renderColumnTemplate('remove-column-single.docx', { remove: false, products })
    const info = getTableInfo(doc)

    should(info.gridColWidths).be.eql([9350])

    should(info.rows.map((row) => row.map((cell) => cell.text))).be.eql([
      ['Discount'],
      ['10%'],
      ['5%']
    ])
  })

  it('remove - column in table with gridBefore and gridAfter rows', async () => {
    const doc = await renderColumnTemplate('remove-column-grid-before-after.docx', { remove: true })
    const info = getTableInfo(doc)

    should(info.gridColWidths.length).be.equal(2)
    should(info.gridColWidths.reduce((acc, w) => acc + w, 0)).be.equal(9350)

    // the row that only had a cell in the removed column is removed
    should(info.rows.map((row) => row.map((cell) => cell.text))).be.eql([
      ['Name', 'Qty'],
      ['A0', 'A1'],
      ['C1']
    ])

    should(getRowsGridInfo(doc)).be.eql([
      { before: 0, after: 0 },
      { before: 0, after: 0 },
      { before: 1, after: 0 }
    ])

    const tblEl = doc.getElementsByTagName('w:tbl')[0]
    const lastRowCellEl = nodeListToArray(tblEl.getElementsByTagName('w:tr'))[2].getElementsByTagName('w:tc')[0]

    should(parseInt(lastRowCellEl.getElementsByTagName('w:tcW')[0].getAttribute('w:w'), 10)).be.equal(info.gridColWidths[1])
  })

  it('remove - column when call is in row with gridBefore', async () => {
    const doc = await renderColumnTemplate('remove-column-grid-before.docx', { remove: true })
    const info = getTableInfo(doc)

    should(info.gridColWidths.length).be.equal(2)
    should(info.gridColWidths.reduce((acc, w) => acc + w, 0)).be.equal(9350)

    // the call is in the second grid column (gridBefore=1 + first cell), so "Qty" column is removed
    should(info.rows.map((row) => row.map((cell) => cell.text))).be.eql([
      ['Name', 'Discount'],
      ['X2'],
      ['Y2']
    ])

    should(getRowsGridInfo(doc)).be.eql([
      { before: 0, after: 0 },
      { before: 1, after: 0 },
      { before: 1, after: 0 }
    ])
  })

  it('remove - column should not modify nested tables and keep pct widths', async () => {
    const doc = await renderColumnTemplate('remove-column-nested.docx', { remove: true })

    const tblEls = nodeListToArray(doc.getElementsByTagName('w:tbl'))

    should(tblEls.length).be.equal(2)

    const outerTblEl = tblEls.find((el) => el.parentNode.nodeName !== 'w:tc')
    const nestedTblEl = tblEls.find((el) => el !== outerTblEl)

    const getDirectChildren = (el, name) => nodeListToArray(el.childNodes).filter((n) => n.nodeName === name)

    const outerGridCols = getDirectChildren(getDirectChildren(outerTblEl, 'w:tblGrid')[0], 'w:gridCol')

    should(outerGridCols.length).be.equal(2)

    const outerRows = getDirectChildren(outerTblEl, 'w:tr')

    should(outerRows.map((rowEl) => getDirectChildren(rowEl, 'w:tc').length)).be.eql([2, 2])

    // pct widths are not changed
    const headerWidths = getDirectChildren(outerRows[0], 'w:tc').map((cellEl) => {
      const tcWEl = cellEl.getElementsByTagName('w:tcW')[0]
      return [tcWEl.getAttribute('w:type'), tcWEl.getAttribute('w:w')]
    })

    should(headerWidths).be.eql([['pct', '1666'], ['pct', '1667']])

    // nested table is untouched
    const nestedGridCols = nestedTblEl.getElementsByTagName('w:gridCol')

    should(nestedGridCols.length).be.equal(3)
    should(nestedTblEl.getElementsByTagName('w:tc').length).be.equal(3)
    should(nestedTblEl.textContent).be.equal('N0N1N2')

    should(doc.documentElement.toString()).not.containEql('docxRemove')
  })

  it('remove - invalid target should throw', async () => {
    const err = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'remove-table.docx'))
          }
        }
      },
      data: {
        remove: true,
        target: 'cell'
      }
    }).should.be.rejected()

    should(err.message).containEql('"paragraph", "row", "column", "table"')
  })
})
