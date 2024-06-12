const should = require('should')
const path = require('path')
const fs = require('fs')
const fsAsync = require('fs/promises')
const jsreport = require('@jsreport/jsreport-core')
const { extractTextResponse, getDocumentsFromPptx } = require('./utils')
const { nodeListToArray } = require('../lib/utils')

const pptxDirPath = path.join(__dirname, './pptx')
const outputPath = path.join(__dirname, '../out.pptx')

describe('pptx table', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport().use(require('../')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-assets')())
      .use(jsreport.tests.listeners())
    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('table', async () => {
    const data = [
      {
        name: 'Jan',
        email: 'jan.blaha@foo.com'
      },
      {
        name: 'Boris',
        email: 'boris@foo.met'
      },
      {
        name: 'Pavel',
        email: 'pavel@foo.met'
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table.pptx'))
          }
        }
      },
      data: {
        people: data
      }
    })

    await fsAsync.writeFile(outputPath, await result.output.getBuffer())

    const text = await extractTextResponse(result)

    for (const item of data) {
      should(text).containEql(item.name)
      should(text).containEql(item.email)
    }
  })

  it('table and links', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(pptxDirPath, 'table-and-links.pptx')
            )
          }
        }
      },
      data: {
        courses: [
          {
            name: 'The Open University',
            description:
              'Distance and online courses. Qualifications range from certificates, diplomas and short courses to undergraduate and postgraduate degrees.',
            linkName: 'Go to the site1',
            linkURL: 'http://www.openuniversity.edu/courses'
          },
          {
            name: 'Coursera',
            description:
              'Online courses from top universities like Yale, Michigan, Stanford, and leading companies like Google and IBM.',
            linkName: 'Go to the site2',
            linkURL: 'https://plato.stanford.edu/'
          },
          {
            name: 'edX',
            description:
              'Flexible learning on your schedule. Access more than 1900 online courses from 100+ leading institutions including Harvard, MIT, Microsoft, and more.',
            linkName: 'Go to the site3',
            linkURL: 'https://www.edx.org/'
          }
        ]
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = await extractTextResponse(result)

    text.should.containEql('Go to the site1')
    text.should.containEql('Go to the site2')
    text.should.containEql('Go to the site3')
  })

  it('table vertical', async () => {
    const people = [
      {
        name: 'Jan',
        email: 'jan.blaha@foo.com'
      },
      {
        name: 'Boris',
        email: 'boris@foo.met'
      },
      {
        name: 'Pavel',
        email: 'pavel@foo.met'
      }
    ]

    const templateBuf = fs.readFileSync(path.join(pptxDirPath, 'table-vertical.pptx'))

    const [templateSlideDoc] = await getDocumentsFromPptx(templateBuf, ['ppt/slides/slide1.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('a:gridCol'))
    const baseColsWidth = templateGridColEls.reduce((acu, gridColEl) => acu + parseInt(gridColEl.getAttribute('w'), 10), 0)

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        people
      }
    })

    await fsAsync.writeFile(outputPath, await result.output.getBuffer())

    const text = await extractTextResponse(result)

    should(text).containEql('Jan')
    should(text).containEql('jan.blaha@foo.com')
    should(text).containEql('Boris')
    should(text).containEql('boris@foo.met')
    should(text).containEql('Pavel')
    should(text).containEql('pavel@foo.met')

    const [slideDoc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const gridColEls = nodeListToArray(slideDoc.getElementsByTagName('a:gridCol'))
    const totalCols = people.length + 1

    should(gridColEls.length).be.eql(totalCols)

    const colWidth = Math.trunc(baseColsWidth / totalCols)

    for (const gridColEl of gridColEls) {
      should(gridColEl.getAttribute('w')).be.eql(colWidth.toString())
    }
  })

  it('table rows, columns', async () => {
    const rowsItems = [
      ['Jan', 'jan.blaha@foo.com'],
      ['Boris', 'boris@foo.met'],
      ['Pavel', 'pavel@foo.met']
    ]

    const columnsItems = ['Name', 'Email']

    const templateBuf = fs.readFileSync(path.join(pptxDirPath, 'table-rows-columns.pptx'))

    const [templateSlideDoc] = await getDocumentsFromPptx(templateBuf, ['ppt/slides/slide1.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('a:gridCol'))
    const baseColsWidth = parseInt(templateGridColEls[0].getAttribute('w'), 10)

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        rowsItems,
        columnsItems
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = await extractTextResponse(result)

    text.should.containEql('Name')
    text.should.containEql('Email')
    text.should.containEql('Jan')
    text.should.containEql('jan.blaha@foo.com')
    text.should.containEql('Boris')
    text.should.containEql('boris@foo.met')
    text.should.containEql('Pavel')
    text.should.containEql('pavel@foo.met')

    const [slideDoc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const gridColEls = nodeListToArray(slideDoc.getElementsByTagName('a:gridCol'))

    should(gridColEls.length).be.eql(columnsItems.length)

    const colWidth = Math.trunc(baseColsWidth / columnsItems.length)

    for (const gridColEl of gridColEls) {
      should(gridColEl.getAttribute('w')).be.eql(colWidth.toString())
    }
  })

  it('table rows, columns (block)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table-rows-columns-block.pptx'))
          }
        }
      },
      data: {
        rowsItems: [
          ['Jan', 'jan.blaha@foo.com'],
          ['Boris', 'boris@foo.met'],
          ['Pavel', 'pavel@foo.met']
        ],
        columnsItems: ['Name', 'Email']
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = await extractTextResponse(result)

    text.should.containEql('Name')
    text.should.containEql('Email')
    text.should.containEql('Jan')
    text.should.containEql('jan.blaha@foo.com')
    text.should.containEql('Boris')
    text.should.containEql('boris@foo.met')
    text.should.containEql('Pavel')
    text.should.containEql('pavel@foo.met')
  })

  it('table rows, columns (block and data index)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table-rows-columns-block-index.pptx'))
          }
        }
      },
      data: {
        rowsItems: [
          ['Jan', 'jan.blaha@foo.com'],
          ['Boris', 'boris@foo.met'],
          ['Pavel', 'pavel@foo.met']
        ],
        columnsItems: ['Name', 'Email']
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = await extractTextResponse(result)

    text.should.containEql('0-0')
    text.should.containEql('0-1')
    text.should.containEql('1-0')
    text.should.containEql('1-1')
    text.should.containEql('2-0')
    text.should.containEql('2-1')
    text.should.containEql('3-0')
    text.should.containEql('3-1')
  })

  it('table rows, columns (block and access to parent context)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table-rows-columns-block-parent.pptx'))
          }
        }
      },
      data: {
        title: 'My Table',
        rowsItems: [
          ['Jan', 'jan.blaha@foo.com'],
          ['Boris', 'boris@foo.met'],
          ['Pavel', 'pavel@foo.met']
        ],
        columnsItems: ['Name', 'Email']
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = await extractTextResponse(result)

    text.should.containEql('My Table - Name')
    text.should.containEql('My Table - Email')
    text.should.containEql('My Table - Jan')
    text.should.containEql('My Table - jan.blaha@foo.com')
    text.should.containEql('My Table - Boris')
    text.should.containEql('My Table - boris@foo.met')
    text.should.containEql('My Table - Pavel')
    text.should.containEql('My Table - pavel@foo.met')
  })

  it('table rows, columns (merged cells - rowspan)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table-rows-columns.pptx'))
          }
        }
      },
      data: {
        rowsItems: [
          [{ rowspan: 4, value: 'R2-1' }, 'R2-2', 'R2-3', { rowspan: 4, value: 'R2-4' }],
          [null, 'R3-2', 'R3-3', null],
          [null, 'R4-2', 'R4-3', null],
          [null, 'R5-2', 'R5-3', null],
          [{ rowspan: 2, value: 'R6-1' }, 'R6-2', 'R6-3', { rowspan: 2, value: 'R6-4' }],
          [null, 'R7-2', 'R7-3', null],
          [{ rowspan: 3, value: 'R8-1' }, 'R8-2', 'R8-3', { rowspan: 3, value: 'R8-4' }],
          [null, 'R9-2', 'R9-3', null],
          [null, 'R10-2', 'R10-3', null]
        ],
        columnsItems: ['R1-1', 'R1-2', 'R1-3', 'R1-4']
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = await extractTextResponse(result)

    text.should.be.eql([
      ['R1-1', 'R1-2', 'R1-3', 'R1-4'].join(' '),
      ['R2-1', 'R2-2', 'R2-3', 'R2-4'].join(' '),
      ['R3-2', 'R3-3'].join(' '),
      ['R4-2', 'R4-3'].join(' '),
      ['R5-2', 'R5-3'].join(' '),
      ['R6-1', 'R6-2', 'R6-3', 'R6-4'].join(' '),
      ['R7-2', 'R7-3'].join(' '),
      ['R8-1', 'R8-2', 'R8-3', 'R8-4'].join(' '),
      ['R9-2', 'R9-3'].join(' '),
      ['R10-2', 'R10-3'].join(' ')
    ].join(' ') + ' ')

    const [slideDoc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const tableEl = nodeListToArray(slideDoc.getElementsByTagName('a:tbl'))[0]

    const expectedMergedCellsStart = [
      ['1,0', 4], ['1,3', 4], ['5,0', 2], ['5,3', 2],
      ['7,0', 3], ['7,3', 3]
    ].map(([id, rowspan]) => ({ id, rowspan }))

    const expectedPlaceholders = [
      '2,0', '2,3', '3,0', '3,3',
      '4,0', '4,3', '6,0', '6,3',
      '8,0', '8,3', '9,0', '9,3'
    ].map((id) => ({ id, rowspanOrigin: true }))

    checkMergedCells(tableEl, 10, 4, expectedMergedCellsStart, expectedPlaceholders)
  })

  it('table rows, columns (merged cells - rowspan with all cells in row with same value)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table-rows-columns.pptx'))
          }
        }
      },
      data: {
        rowsItems: [
          [{ rowspan: 2, value: 'R2-1' }, { rowspan: 2, value: 'R2-2' }, { rowspan: 2, value: 'R2-3' }, { rowspan: 2, value: 'R2-4' }],
          ['R3-1', 'R3-2', 'R3-3', 'R3-4'],
          ['R4-1', 'R4-2', 'R4-3', 'R4-4']
        ],
        columnsItems: ['R1-1', 'R1-2', 'R1-3', 'R1-4']
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = await extractTextResponse(result)

    text.should.be.eql([
      ['R1-1', 'R1-2', 'R1-3', 'R1-4'].join(' '),
      ['R2-1', 'R2-2', 'R2-3', 'R2-4'].join(' '),
      ['R3-1', 'R3-2', 'R3-3', 'R3-4'].join(' '),
      ['R4-1', 'R4-2', 'R4-3', 'R4-4'].join(' ')
    ].join(' ') + ' ')

    const [slideDoc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const tableEl = nodeListToArray(slideDoc.getElementsByTagName('a:tbl'))[0]

    checkMergedCells(tableEl, 4, 4, [], [])
  })

  it('table rows, columns (merged cells - rowspan in columns items)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table-rows-columns.pptx'))
          }
        }
      },
      data: {
        rowsItems: [
          [null, 'R2-2', 'R2-3', null],
          ['R3-1', 'R3-2', 'R3-3', 'R3-4'],
          ['R4-1', 'R4-2', 'R4-3', 'R4-4']
        ],
        columnsItems: [{ rowspan: 2, value: 'R1-1' }, 'R1-2', 'R1-3', { rowspan: 2, value: 'R1-4' }]
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = await extractTextResponse(result)

    text.should.be.eql([
      ['R1-1', 'R1-2', 'R1-3', 'R1-4'].join(' '),
      ['R2-2', 'R2-3'].join(' '),
      ['R3-1', 'R3-2', 'R3-3', 'R3-4'].join(' '),
      ['R4-1', 'R4-2', 'R4-3', 'R4-4'].join(' ')
    ].join(' ') + ' ')

    const [slideDoc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const tableEl = nodeListToArray(slideDoc.getElementsByTagName('a:tbl'))[0]

    const expectedMergedCellsStart = [
      ['0,0', 2], ['0,3', 2]
    ].map(([id, rowspan]) => ({ id, rowspan }))

    const expectedPlaceholders = [
      '1,0', '1,3'
    ].map((id) => ({ id, rowspanOrigin: true }))

    checkMergedCells(tableEl, 4, 4, expectedMergedCellsStart, expectedPlaceholders)
  })

  it('table rows, columns (merged cells - colspan)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table-rows-columns.pptx'))
          }
        }
      },
      data: {
        rowsItems: [
          [{ colspan: 2, value: 'R2-1' }, { colspan: 2, value: 'R2-3' }],
          ['R3-1', 'R3-2', 'R3-3', 'R3-4'],
          [{ colspan: 2, value: 'R4-1' }, 'R4-3', 'R4-4'],
          ['R5-1', 'R5-2', 'R5-3', 'R5-4'],
          ['R6-1', 'R6-2', { colspan: 2, value: 'R6-3' }],
          ['R7-1', 'R7-2', 'R7-3', 'R7-4'],
          ['R8-1', { colspan: 2, value: 'R8-2' }, 'R8-4'],
          ['R9-1', 'R9-2', 'R9-3', 'R9-4'],
          ['R10-1', 'R10-2', 'R10-3', 'R10-4']
        ],
        columnsItems: ['R1-1', 'R1-2', 'R1-3', 'R1-4']
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = await extractTextResponse(result)

    text.should.be.eql([
      ['R1-1', 'R1-2', 'R1-3', 'R1-4'].join(' '),
      ['R2-1', 'R2-3'].join(' '),
      ['R3-1', 'R3-2', 'R3-3', 'R3-4'].join(' '),
      ['R4-1', 'R4-3', 'R4-4'].join(' '),
      ['R5-1', 'R5-2', 'R5-3', 'R5-4'].join(' '),
      ['R6-1', 'R6-2', 'R6-3'].join(' '),
      ['R7-1', 'R7-2', 'R7-3', 'R7-4'].join(' '),
      ['R8-1', 'R8-2', 'R8-4'].join(' '),
      ['R9-1', 'R9-2', 'R9-3', 'R9-4'].join(' '),
      ['R10-1', 'R10-2', 'R10-3', 'R10-4'].join(' ')
    ].join(' ') + ' ')

    const [slideDoc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const tableEl = nodeListToArray(slideDoc.getElementsByTagName('a:tbl'))[0]

    const expectedMergedCellsStart = [
      ['1,0', 2], ['1,2', 2], ['3,0', 2],
      ['5,2', 2], ['7-1', 2]
    ].map(([id, colspan]) => ({ id, colspan }))

    const expectedPlaceholders = [
      '1,1', '1,3', '3,1', '5,3', '7,2'
    ].map((id) => ({ id, colspanOrigin: true }))

    checkMergedCells(tableEl, 10, 4, expectedMergedCellsStart, expectedPlaceholders)
  })

  it('table rows, columns (merged cells - colspan in columns items)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table-rows-columns.pptx'))
          }
        }
      },
      data: {
        rowsItems: [
          ['R2-1', 'R2-2', 'R2-3', 'R2-4'],
          ['R3-1', 'R3-2', 'R3-3', 'R3-4'],
          ['R4-1', 'R4-2', 'R4-3', 'R4-4']
        ],
        columnsItems: [{ colspan: 2, value: 'R1-1' }, { colspan: 2, value: 'R1-3' }]
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = await extractTextResponse(result)

    text.should.be.eql([
      ['R1-1', 'R1-3'].join(' '),
      ['R2-1', 'R2-2', 'R2-3', 'R2-4'].join(' '),
      ['R3-1', 'R3-2', 'R3-3', 'R3-4'].join(' '),
      ['R4-1', 'R4-2', 'R4-3', 'R4-4'].join(' ')
    ].join(' ') + ' ')

    const [slideDoc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const tableEl = nodeListToArray(slideDoc.getElementsByTagName('a:tbl'))[0]

    const expectedMergedCellsStart = [
      ['0,0', 2], ['0,2', 2]
    ].map(([id, colspan]) => ({ id, colspan }))

    const expectedPlaceholders = [
      '0,1', '0,3'
    ].map((id) => ({ id, colspanOrigin: true }))

    checkMergedCells(tableEl, 4, 4, expectedMergedCellsStart, expectedPlaceholders)
  })

  it('table rows, columns (merged cells - rowspan and colspan)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table-rows-columns.pptx'))
          }
        }
      },
      data: {
        rowsItems: [
          [null, 'R2-3', 'R2-4'],
          ['R3-1', 'R3-2', 'R3-3', 'R3-4'],
          [{ rowspan: 3, colspan: 3, value: 'R4-1' }, 'R4-4'],
          [null, 'R5-4'],
          [null, 'R6-4'],
          ['R7-1', 'R7-2', 'R7-3', 'R7-4']
        ],
        columnsItems: [{ colspan: 2, rowspan: 2, value: 'R1-1' }, { colspan: 2, value: 'R1-3' }]
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = await extractTextResponse(result)

    text.should.be.eql([
      ['R1-1', 'R1-3'].join(' '),
      ['R2-3', 'R2-4'].join(' '),
      ['R3-1', 'R3-2', 'R3-3', 'R3-4'].join(' '),
      ['R4-1', 'R4-4'].join(' '),
      ['R5-4'].join(' '),
      ['R6-4'].join(' '),
      ['R7-1', 'R7-2', 'R7-3', 'R7-4'].join(' ')
    ].join(' ') + ' ')

    const [slideDoc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const tableEl = nodeListToArray(slideDoc.getElementsByTagName('a:tbl'))[0]

    const expectedMergedCellsStart = [
      ['0,0', 2, 2], ['0,2', 2], ['3,0', 3, 3]
    ].map(([id, colspan, rowspan]) => ({ id, colspan, rowspan }))

    const expectedPlaceholders = [
      ['0,1', true, false, null, 2], ['0,3', true], ['1,0', false, true, 2], ['1,1', true, true],
      ['3,1', true, false, null, 3], ['3,2', true, false, null, 3], ['4,0', false, true, 3], ['4,1', true, true], ['4,2', true, true],
      ['5,0', false, true, 3], ['5,1', true, true], ['5,2', true, true]
    ].map(([id, colspanOrigin, rowspanOrigin, colspan, rowspan]) => ({ id, colspanOrigin, rowspanOrigin, colspan, rowspan }))

    checkMergedCells(tableEl, 7, 4, expectedMergedCellsStart, expectedPlaceholders)
  })

  it('table rows, columns (merged cells - rowspan and colspan, columnIndex and rowIndex exists)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table-rows-columns-block-index.pptx'))
          }
        }
      },
      data: {
        rowsItems: [
          [null, 'R2-3', 'R2-4'],
          ['R3-1', 'R3-2', 'R3-3', 'R3-4'],
          [{ rowspan: 3, colspan: 3, value: 'R4-1' }, 'R4-4'],
          [null, 'R5-4'],
          [null, 'R6-4'],
          ['R7-1', 'R7-2', 'R7-3', 'R7-4']
        ],
        columnsItems: [{ colspan: 2, rowspan: 2, value: 'R1-1' }, { colspan: 2, value: 'R1-3' }]
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = await extractTextResponse(result)

    text.should.be.eql([
      ['0-0', '0-2'].join(' '),
      ['1-2', '1-3'].join(' '),
      ['2-0', '2-1', '2-2', '2-3'].join(' '),
      ['3-0', '3-3'].join(' '),
      ['4-3'].join(' '),
      ['5-3'].join(' '),
      ['6-0', '6-1', '6-2', '6-3'].join(' ')
    ].join(' ') + ' ')

    const [slideDoc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const tableEl = nodeListToArray(slideDoc.getElementsByTagName('a:tbl'))[0]

    const expectedMergedCellsStart = [
      ['0,0', 2, 2], ['0,2', 2], ['3,0', 3, 3]
    ].map(([id, colspan, rowspan]) => ({ id, colspan, rowspan }))

    const expectedPlaceholders = [
      ['0,1', true, false, null, 2], ['0,3', true], ['1,0', false, true, 2], ['1,1', true, true],
      ['3,1', true, false, null, 3], ['3,2', true, false, null, 3], ['4,0', false, true, 3], ['4,1', true, true], ['4,2', true, true],
      ['5,0', false, true, 3], ['5,1', true, true], ['5,2', true, true]
    ].map(([id, colspanOrigin, rowspanOrigin, colspan, rowspan]) => ({ id, colspanOrigin, rowspanOrigin, colspan, rowspan }))

    checkMergedCells(tableEl, 7, 4, expectedMergedCellsStart, expectedPlaceholders, true)
  })
})

function checkMergedCells (tableEl, expectedRowsCount, expectedCellsCount, expectedMergedCellsStart, expectedPlaceholders, textIndexBased = false) {
  const rowEls = nodeListToArray(tableEl.getElementsByTagName('a:tr'))

  should(rowEls.length).be.eql(expectedRowsCount)

  for (let rowIdx = 0; rowIdx < rowEls.length; rowIdx++) {
    const rowEl = rowEls[rowIdx]
    const cellEls = nodeListToArray(rowEl.childNodes).filter((node) => node.tagName === 'a:tc')

    should(cellEls.length).be.eql(expectedCellsCount)

    for (let cellIdx = 0; cellIdx < cellEls.length; cellIdx++) {
      const cellEl = cellEls[cellIdx]

      const mergedCellStartInfo = expectedMergedCellsStart.find((cellInfo) => (
        cellInfo.id === `${rowIdx},${cellIdx}`
      ))

      const placeholderCellInfo = expectedPlaceholders.find((cellInfo) => (
        cellInfo.id === `${rowIdx},${cellIdx}`
      ))

      if (mergedCellStartInfo?.rowspan != null) {
        should(cellEl.getAttribute('rowSpan')).be.eql(mergedCellStartInfo.rowspan.toString())
      }

      if (mergedCellStartInfo?.colspan != null) {
        should(cellEl.getAttribute('gridSpan')).be.eql(mergedCellStartInfo.colspan.toString())
      }

      if (placeholderCellInfo != null) {
        should(cellEl.textContent).be.eql('')

        if (placeholderCellInfo?.rowspan != null) {
          should(cellEl.getAttribute('rowSpan')).be.eql(placeholderCellInfo.rowspan.toString())
        }

        if (placeholderCellInfo?.colspan != null) {
          should(cellEl.getAttribute('gridSpan')).be.eql(placeholderCellInfo.colspan.toString())
        }

        if (placeholderCellInfo.rowspanOrigin) {
          should(cellEl.getAttribute('vMerge')).be.eql('1')
        }

        if (placeholderCellInfo.colspanOrigin) {
          should(cellEl.getAttribute('hMerge')).be.eql('1')
        }
      } else {
        should(cellEl.textContent).be.eql(textIndexBased ? `${rowIdx}-${cellIdx}` : `R${rowIdx + 1}-${cellIdx + 1}`)
      }
    }
  }
}
