const fs = require('fs')
const path = require('path')
const jsreport = require('@jsreport/jsreport-core')
const WordExtractor = require('word-extractor')
const should = require('should')
const { getDocumentsFromDocxBuf } = require('./utils')
const { nodeListToArray, getDimension, pxToEMU, emuToTOAP } = require('../lib/utils')
const extractor = new WordExtractor()

const docxDirPath = path.join(__dirname, './docx')
const dataDirPath = path.join(__dirname, './data')
const outputPath = path.join(__dirname, '../out.docx')

describe('docx table', () => {
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

  it('table', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table.docx'))
          }
        }
      },
      data: {
        people: [
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
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('Boris')
    text.should.containEql('Pavel')
  })

  it('table and links', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(docxDirPath, 'table-and-links.docx')
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
    const text = (await extractor.extract(result.content)).getBody()

    text.should.containEql('Go to the site1')
    text.should.containEql('Go to the site2')
    text.should.containEql('Go to the site3')
  })

  it('table and endnotes', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(docxDirPath, 'table-and-endnotes.docx')
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
            linkURL: 'http://www.openuniversity.edu/courses',
            note: 'note site1'
          },
          {
            name: 'Coursera',
            description:
              'Online courses from top universities like Yale, Michigan, Stanford, and leading companies like Google and IBM.',
            linkName: 'Go to the site2',
            linkURL: 'https://plato.stanford.edu/',
            note: 'note site2'
          },
          {
            name: 'edX',
            description:
              'Flexible learning on your schedule. Access more than 1900 online courses from 100+ leading institutions including Harvard, MIT, Microsoft, and more.',
            linkName: 'Go to the site3',
            linkURL: 'https://www.edx.org/',
            note: 'note site3'
          }
        ]
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getEndnotes()

    text.should.containEql('note site1')
    text.should.containEql('note site2')
    text.should.containEql('note site3')
  })

  it('table and footnotes', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(docxDirPath, 'table-and-footnotes.docx')
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
            linkURL: 'http://www.openuniversity.edu/courses',
            note: 'note site1'
          },
          {
            name: 'Coursera',
            description:
              'Online courses from top universities like Yale, Michigan, Stanford, and leading companies like Google and IBM.',
            linkName: 'Go to the site2',
            linkURL: 'https://plato.stanford.edu/',
            note: 'note site2'
          },
          {
            name: 'edX',
            description:
              'Flexible learning on your schedule. Access more than 1900 online courses from 100+ leading institutions including Harvard, MIT, Microsoft, and more.',
            linkName: 'Go to the site3',
            linkURL: 'https://www.edx.org/',
            note: 'note site3'
          }
        ]
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getFootnotes()

    text.should.containEql('note site1')
    text.should.containEql('note site2')
    text.should.containEql('note site3')
  })

  it('table with horizontal merged cells', async () => {
    const people = [
      {
        name: 'Jan',
        lastname: 'Blaha',
        email: 'jan.blaha@foo.com'
      },
      {
        name: 'Boris',
        lastname: 'Matos',
        email: 'boris@foo.met'
      },
      {
        name: 'Pavel',
        lastname: 'Sládek',
        email: 'pavel@foo.met'
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-horizontal-merged-cells.docx'))
          }
        }
      },
      data: {
        people
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('Boris')
    text.should.containEql('Pavel')

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))

    should(gridColEls.length).be.eql(4)

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    should(rowEls.length).be.eql(4)

    for (const [rowIdx, rowEl] of rowEls.entries()) {
      if (rowIdx === 0) {
        continue
      }

      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      should(cellEls.length).be.eql(3)

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const gridSpanEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:gridSpan')

        if (cellIdx === 0 || cellIdx === 2) {
          should(gridSpanEl).be.not.ok()
        } else {
          should(gridSpanEl.getAttribute('w:val')).be.eql('2')
        }
      }
    }
  })

  it('table nested', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-nested.docx'))
          }
        }
      },
      data: {
        people: [{
          name: 'Rick',
          lastname: 'Grimes',
          courses: [{
            name: 'Math1',
            homeroom: '2389'
          }, {
            name: 'Math2',
            homeroom: '3389'
          }],
          age: 38
        }, {
          name: 'Andrea',
          lastname: 'Henderson',
          courses: [{
            name: 'Literature1',
            homeroom: '5262'
          }, {
            name: 'Literature2',
            homeroom: '1693'
          }],
          age: 33
        }]
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = (await extractor.extract(result.content)).getBody()

    text.should.containEql('Rick')
    text.should.containEql('Andrea')
    text.should.containEql('Math1')
    text.should.containEql('Math2')
    text.should.containEql('Literature1')
    text.should.containEql('Literature2')
  })

  it('table nested (as content)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(docxDirPath, 'table-nested-as-content.docx')
            )
          }
        }
      },
      data: {
        items: [
          {
            model: 'Model A',
            tag: 'Tag1',
            brand: 'BrandX',
            warranty: '1 year',
            total: 100,
            desc: 'Description of item 1',
            qty: 1
          },
          {
            model: 'Model B',
            tag: 'Tag2',
            brand: 'BrandY',
            warranty: '2 years',
            total: 200,
            desc: 'Description of item 2',
            qty: 2
          },
          {
            model: 'Model C',
            tag: 'Tag3',
            brand: 'BrandZ',
            warranty: '3 years',
            total: 300,
            desc: 'Description of item 3',
            qty: 3
          },
          {
            model: 'Model D',
            tag: 'Tag4',
            brand: 'BrandW',
            warranty: '4 years',
            total: 400,
            desc: 'Description of item 4',
            qty: 4
          },
          {
            model: 'Model E',
            tag: 'Tag5',
            brand: 'BrandV',
            warranty: '5 years',
            total: 500,
            desc: 'Description of item 5',
            qty: 5
          }
        ]
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const text = (await extractor.extract(result.content)).getBody()

    text.should.containEql('Header1')
    text.should.containEql('Header2')

    text.should.containEql('Description of item 1')
    text.should.containEql('BrandX')
    text.should.containEql('Model A')
    text.should.containEql('1 year')
    text.should.containEql('Tag1')
    text.should.containEql('100')

    text.should.containEql('Description of item 2')
    text.should.containEql('BrandY')
    text.should.containEql('Model B')
    text.should.containEql('2 years')
    text.should.containEql('Tag2')
    text.should.containEql('200')

    text.should.containEql('Description of item 3')
    text.should.containEql('BrandZ')
    text.should.containEql('Model C')
    text.should.containEql('3 years')
    text.should.containEql('Tag3')
    text.should.containEql('300')

    text.should.containEql('Description of item 4')
    text.should.containEql('BrandW')
    text.should.containEql('Model D')
    text.should.containEql('4 years')
    text.should.containEql('Tag4')
    text.should.containEql('400')

    text.should.containEql('Description of item 5')
    text.should.containEql('BrandV')
    text.should.containEql('Model E')
    text.should.containEql('4 years')
    text.should.containEql('Tag5')
    text.should.containEql('500')
  })

  it('table with custom col width (single col configured)', async () => {
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

    const colsWidth = ['100px']

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'table-custom-col-width.docx'))
    const [templateSlideDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('w:gridCol'))
    const templateFirstColWidth = templateGridColEls[0].getAttribute('w:w')
    const templateSecondColWidth = templateGridColEls[1].getAttribute('w:w')

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        people,
        colsWidth
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('Boris')
    text.should.containEql('Pavel')

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))
    const outputFirstColWidth = gridColEls[0].getAttribute('w:w')
    const expectedFirstColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[0]).value)).toString()

    should(outputFirstColWidth).be.not.eql(templateFirstColWidth)
    should(outputFirstColWidth).be.eql(expectedFirstColWidth)

    should(templateSecondColWidth).be.eql(gridColEls[1].getAttribute('w:w'))

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    for (const rowEl of rowEls) {
      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const cellWidthEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')

        if (cellIdx === 0) {
          should(cellWidthEl.getAttribute('w:w')).be.eql(expectedFirstColWidth)
        } else {
          should(cellWidthEl.getAttribute('w:w')).be.eql(templateSecondColWidth)
        }

        should(cellWidthEl.getAttribute('w:type')).be.eql('dxa')
      }
    }
  })

  it('table with custom col width (all cols configured)', async () => {
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

    const colsWidth = ['100px', '150px']

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'table-custom-col-width.docx'))
    const [templateSlideDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('w:gridCol'))
    const templateFirstColWidth = templateGridColEls[0].getAttribute('w:w')
    const templateSecondColWidth = templateGridColEls[1].getAttribute('w:w')

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        people,
        colsWidth
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('Boris')
    text.should.containEql('Pavel')

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))
    const outputFirstColWidth = gridColEls[0].getAttribute('w:w')
    const outputSecondColWidth = gridColEls[1].getAttribute('w:w')
    const expectedFirstColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[0]).value)).toString()
    const expectedSecondColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[1]).value)).toString()

    should(outputFirstColWidth).be.not.eql(templateFirstColWidth)
    should(outputFirstColWidth).be.eql(expectedFirstColWidth)

    should(outputSecondColWidth).be.not.eql(templateSecondColWidth)
    should(outputSecondColWidth).be.eql(expectedSecondColWidth)

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    for (const rowEl of rowEls) {
      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const cellWidthEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')

        if (cellIdx === 0) {
          should(cellWidthEl.getAttribute('w:w')).be.eql(expectedFirstColWidth)
        } else {
          should(cellWidthEl.getAttribute('w:w')).be.eql(expectedSecondColWidth)
        }

        should(cellWidthEl.getAttribute('w:type')).be.eql('dxa')
      }
    }
  })

  it('table with custom col width (single col configured) and horizontal merged cells', async () => {
    const people = [
      {
        name: 'Jan',
        lastname: 'Blaha',
        email: 'jan.blaha@foo.com'
      },
      {
        name: 'Boris',
        lastname: 'Matos',
        email: 'boris@foo.met'
      },
      {
        name: 'Pavel',
        lastname: 'Sládek',
        email: 'pavel@foo.met'
      }
    ]

    const colsWidth = ['100px']

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'table-custom-col-width-horizontal-merged-cells.docx'))

    const [templateSlideDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('w:gridCol'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        people,
        colsWidth
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('Boris')
    text.should.containEql('Pavel')

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))

    should(gridColEls.length).be.eql(4)

    for (const [colIdx, colEl] of gridColEls.entries()) {
      if (colIdx === 0) {
        const expectedColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[colIdx]).value)).toString()
        should(colEl.getAttribute('w:w')).be.not.eql(templateGridColEls[colIdx].getAttribute('w:w'))
        should(colEl.getAttribute('w:w')).be.eql(expectedColWidth)
      } else {
        should(colEl.getAttribute('w:w')).be.eql(templateGridColEls[colIdx].getAttribute('w:w'))
      }
    }

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    should(rowEls.length).be.eql(4)

    for (const [rowIdx, rowEl] of rowEls.entries()) {
      if (rowIdx === 0) {
        continue
      }

      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      should(cellEls.length).be.eql(3)

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const gridSpanEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:gridSpan')
        const cellWidthEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')

        if (cellIdx === 0 || cellIdx === 2) {
          should(gridSpanEl).be.not.ok()

          if (cellIdx === 0) {
            const expectedCellWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)).toString()
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else {
            should(cellWidthEl.getAttribute('w:w')).be.eql(templateGridColEls[3].getAttribute('w:w'))
          }
        } else {
          const expectedCellWidth = (
            parseInt(templateGridColEls[1].getAttribute('w:w'), 10) +
            parseInt(templateGridColEls[2].getAttribute('w:w'), 10)
          ).toString()

          should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
        }
      }
    }
  })

  it('table with custom col width (all cols configured) and horizontal merged cells', async () => {
    const people = [
      {
        name: 'Jan',
        lastname: 'Blaha',
        email: 'jan.blaha@foo.com'
      },
      {
        name: 'Boris',
        lastname: 'Matos',
        email: 'boris@foo.met'
      },
      {
        name: 'Pavel',
        lastname: 'Sládek',
        email: 'pavel@foo.met'
      }
    ]

    const colsWidth = ['100px', '150px', '150px', '150px']

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'table-custom-col-width-horizontal-merged-cells.docx'))

    const [templateSlideDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('w:gridCol'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        people,
        colsWidth
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('Boris')
    text.should.containEql('Pavel')

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))

    should(gridColEls.length).be.eql(4)

    for (const [colIdx, colEl] of gridColEls.entries()) {
      const expectedColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[colIdx]).value)).toString()
      should(colEl.getAttribute('w:w')).be.not.eql(templateGridColEls[colIdx].getAttribute('w:w'))
      should(colEl.getAttribute('w:w')).be.eql(expectedColWidth)
    }

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    should(rowEls.length).be.eql(4)

    for (const [rowIdx, rowEl] of rowEls.entries()) {
      if (rowIdx === 0) {
        continue
      }

      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      should(cellEls.length).be.eql(3)

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const gridSpanEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:gridSpan')
        const cellWidthEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')

        if (cellIdx === 0 || cellIdx === 2) {
          should(gridSpanEl).be.not.ok()

          if (cellIdx === 0) {
            const expectedCellWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)).toString()
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else {
            const expectedCellWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[3]).value)).toString()
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          }
        } else {
          const expectedCellWidth = emuToTOAP(
            pxToEMU(getDimension(colsWidth[1]).value) +
            pxToEMU(getDimension(colsWidth[2]).value)
          ).toString()

          should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
        }
      }
    }
  })

  it('table vertical', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-vertical.docx'))
          }
        }
      },
      data: {
        people: [
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
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('jan.blaha@foo.com')
    text.should.containEql('Boris')
    text.should.containEql('boris@foo.met')
    text.should.containEql('Pavel')
    text.should.containEql('pavel@foo.met')
  })

  it('table vertical merged cells', async () => {
    const people = [
      {
        name: 'Jan',
        lastname: 'Blaha',
        email: 'jan.blaha@foo.com'
      },
      {
        name: 'Boris',
        lastname: 'Matos',
        email: 'boris@foo.met'
      },
      {
        name: 'Pavel',
        lastname: 'Sládek',
        email: 'pavel@foo.met'
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-vertical-merged-cells.docx'))
          }
        }
      },
      data: {
        people
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('jan.blaha@foo.com')
    text.should.containEql('Boris')
    text.should.containEql('boris@foo.met')
    text.should.containEql('Pavel')
    text.should.containEql('pavel@foo.met')

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))

    should(gridColEls.length).be.eql(4)

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    should(rowEls.length).be.eql(4)

    for (const [rowIdx, rowEl] of rowEls.entries()) {
      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      should(cellEls.length).be.eql(4)

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        if (cellIdx === 0) {
          continue
        }

        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const vMergeEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:vMerge')

        if (
          (rowIdx === 1 || rowIdx === 2) &&
          cellIdx >= 1
        ) {
          if (rowIdx === 1) {
            should(vMergeEl.hasAttribute('w:val')).be.eql(true)
            should(vMergeEl.getAttribute('w:val')).be.eql('restart')
          } else {
            should(vMergeEl.hasAttribute('w:val')).be.eql(false)
          }
        } else {
          should(vMergeEl).be.not.ok()
        }
      }
    }
  })

  it('table vertical with custom col width (single col configured)', async () => {
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

    const colsWidth = ['100px']

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'table-vertical-custom-col-width.docx'))
    const [templateSlideDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('w:gridCol'))
    const templateFirstColWidth = templateGridColEls[0].getAttribute('w:w')
    const templateSecondColWidth = templateGridColEls[0].getAttribute('w:w')

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        people,
        colsWidth
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('jan.blaha@foo.com')
    text.should.containEql('Boris')
    text.should.containEql('boris@foo.met')
    text.should.containEql('Pavel')
    text.should.containEql('pavel@foo.met')

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))

    should(gridColEls.length).be.eql(4)

    const outputFirstColWidth = gridColEls[0].getAttribute('w:w')
    const expectedFirstColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[0]).value)).toString()

    should(outputFirstColWidth).be.not.eql(templateFirstColWidth)
    should(outputFirstColWidth).be.eql(expectedFirstColWidth)

    should(templateSecondColWidth).be.eql(gridColEls[1].getAttribute('w:w'))

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    for (const rowEl of rowEls) {
      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const cellWidthEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')

        if (cellIdx === 0) {
          should(cellWidthEl.getAttribute('w:w')).be.eql(expectedFirstColWidth)
        } else {
          should(cellWidthEl.getAttribute('w:w')).be.eql(templateSecondColWidth)
        }

        should(cellWidthEl.getAttribute('w:type')).be.eql('dxa')
      }
    }
  })

  it('table vertical with custom col width (all cols configured)', async () => {
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

    const colsWidth = ['100px', '150px', '150px', '150px']

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'table-vertical-custom-col-width.docx'))
    const [templateSlideDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('w:gridCol'))
    const templateFirstColWidth = templateGridColEls[0].getAttribute('w:w')
    const templateSecondColWidth = templateGridColEls[0].getAttribute('wa:w')

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        people,
        colsWidth
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('jan.blaha@foo.com')
    text.should.containEql('Boris')
    text.should.containEql('boris@foo.met')
    text.should.containEql('Pavel')
    text.should.containEql('pavel@foo.met')

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))

    should(gridColEls.length).be.eql(4)

    for (const [colIdx, colEl] of gridColEls.entries()) {
      const expectedColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[colIdx]).value)).toString()

      if (colIdx === 0) {
        should(colEl.getAttribute('w:w')).be.not.eql(templateFirstColWidth)
      } else {
        should(colEl.getAttribute('w:w')).be.not.eql(templateSecondColWidth)
      }

      colEl.getAttribute('w:w').should.be.eql(expectedColWidth)
    }

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    for (const rowEl of rowEls) {
      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const cellWidthEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')
        const expectedColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)).toString()

        should(cellWidthEl.getAttribute('w:w')).be.eql(expectedColWidth)
        should(cellWidthEl.getAttribute('w:type')).be.eql('dxa')
      }
    }
  })

  it('table vertical with custom col width (single col configured) and vertical merged cells', async () => {
    const people = [
      {
        name: 'Jan',
        lastname: 'Blaha',
        email: 'jan.blaha@foo.com'
      },
      {
        name: 'Boris',
        lastname: 'Matos',
        email: 'boris@foo.met'
      },
      {
        name: 'Pavel',
        lastname: 'Sládek',
        email: 'pavel@foo.met'
      }
    ]

    const colsWidth = ['100px']

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'table-vertical-custom-col-width-vertical-merged-cells.docx'))
    const [templateSlideDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('w:gridCol'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        people,
        colsWidth
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('jan.blaha@foo.com')
    text.should.containEql('Boris')
    text.should.containEql('boris@foo.met')
    text.should.containEql('Pavel')
    text.should.containEql('pavel@foo.met')

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))

    should(gridColEls.length).be.eql(4)

    for (const [colIdx, colEl] of gridColEls.entries()) {
      if (colIdx === 0) {
        const expectedColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[colIdx]).value)).toString()
        should(colEl.getAttribute('w:w')).be.not.eql(templateGridColEls[colIdx].getAttribute('w:w'))
        should(colEl.getAttribute('w:w')).be.eql(expectedColWidth)
      } else {
        should(colEl.getAttribute('w:w')).be.eql(templateGridColEls[1].getAttribute('w:w'))
      }
    }

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    for (const [rowIdx, rowEl] of rowEls.entries()) {
      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      should(cellEls.length).be.eql(4)

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const cellWidthEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')

        if (cellIdx === 0) {
          const expectedCellWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[0]).value)).toString()
          should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          continue
        }

        should(cellWidthEl.getAttribute('w:w')).be.eql(templateGridColEls[1].getAttribute('w:w'))

        const vMergeEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:vMerge')

        if (
          (rowIdx === 1 || rowIdx === 2) &&
          cellIdx >= 1
        ) {
          if (rowIdx === 1) {
            should(vMergeEl.hasAttribute('w:val')).be.eql(true)
            should(vMergeEl.getAttribute('w:val')).be.eql('restart')
          } else {
            should(vMergeEl.hasAttribute('w:val')).be.eql(false)
          }
        } else {
          should(vMergeEl).be.not.ok()
        }
      }
    }
  })

  it('table vertical with custom col width (all cols configured) and vertical merged cells', async () => {
    const people = [
      {
        name: 'Jan',
        lastname: 'Blaha',
        email: 'jan.blaha@foo.com'
      },
      {
        name: 'Boris',
        lastname: 'Matos',
        email: 'boris@foo.met'
      },
      {
        name: 'Pavel',
        lastname: 'Sládek',
        email: 'pavel@foo.met'
      }
    ]

    const colsWidth = ['100px', '150px', '150px', '150px']

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'table-vertical-custom-col-width-vertical-merged-cells.docx'))
    const [templateSlideDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('w:gridCol'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        people,
        colsWidth
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('jan.blaha@foo.com')
    text.should.containEql('Boris')
    text.should.containEql('boris@foo.met')
    text.should.containEql('Pavel')
    text.should.containEql('pavel@foo.met')

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))

    should(gridColEls.length).be.eql(4)

    for (const [colIdx, colEl] of gridColEls.entries()) {
      const expectedColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[colIdx]).value)).toString()

      if (colIdx === 0) {
        should(colEl.getAttribute('w:w')).be.not.eql(templateGridColEls[0].getAttribute('w:w'))
      } else {
        should(colEl.getAttribute('w:w')).be.not.eql(templateGridColEls[1].getAttribute('w:w'))
      }

      should(colEl.getAttribute('w:w')).be.eql(expectedColWidth)
    }

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    for (const [rowIdx, rowEl] of rowEls.entries()) {
      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      should(cellEls.length).be.eql(4)

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const cellWidthEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')

        const expectedCellWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)).toString()
        should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)

        if (cellIdx === 0) {
          continue
        }

        const vMergeEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:vMerge')

        if (
          (rowIdx === 1 || rowIdx === 2) &&
          cellIdx >= 1
        ) {
          if (rowIdx === 1) {
            should(vMergeEl.hasAttribute('w:val')).be.eql(true)
            should(vMergeEl.getAttribute('w:val')).be.eql('restart')
          } else {
            should(vMergeEl.hasAttribute('w:val')).be.eql(false)
          }
        } else {
          should(vMergeEl).be.not.ok()
        }
      }
    }
  })

  it('table rows, columns', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-rows-columns.docx'))
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
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Name')
    text.should.containEql('Email')
    text.should.containEql('Jan')
    text.should.containEql('jan.blaha@foo.com')
    text.should.containEql('Boris')
    text.should.containEql('boris@foo.met')
    text.should.containEql('Pavel')
    text.should.containEql('pavel@foo.met')
  })

  it('table rows, columns (block)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-rows-columns-block.docx'))
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
    const text = (await extractor.extract(result.content)).getBody()
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
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-rows-columns-block-index.docx'))
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
    const text = (await extractor.extract(result.content)).getBody()
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
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-rows-columns-block-parent.docx'))
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
    const text = (await extractor.extract(result.content)).getBody()
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
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-rows-columns.docx'))
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
    const text = (await extractor.extract(result.content)).getBody().replace(/^\n*|\n*$/g, '')

    text.should.be.eql([
      ['R1-1', 'R1-2', 'R1-3', 'R1-4', ''].join('\t'),
      ['R2-1', 'R2-2', 'R2-3', 'R2-4', ''].join('\t'),
      ['', 'R3-2', 'R3-3', '', ''].join('\t'),
      ['', 'R4-2', 'R4-3', '', ''].join('\t'),
      ['', 'R5-2', 'R5-3', '', ''].join('\t'),
      ['R6-1', 'R6-2', 'R6-3', 'R6-4', ''].join('\t'),
      ['', 'R7-2', 'R7-3', '', ''].join('\t'),
      ['R8-1', 'R8-2', 'R8-3', 'R8-4', ''].join('\t'),
      ['', 'R9-2', 'R9-3', '', ''].join('\t'),
      ['', 'R10-2', 'R10-3', '', ''].join('\t')
    ].join('\n'))
  })

  it('table rows, columns (merged cells - rowspan with all cells in row with same value)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-rows-columns.docx'))
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
    const text = (await extractor.extract(result.content)).getBody().replace(/^\n*|\n*$/g, '')

    text.should.be.eql([
      ['R1-1', 'R1-2', 'R1-3', 'R1-4', ''].join('\t'),
      ['R2-1', 'R2-2', 'R2-3', 'R2-4', ''].join('\t'),
      ['R3-1', 'R3-2', 'R3-3', 'R3-4', ''].join('\t'),
      ['R4-1', 'R4-2', 'R4-3', 'R4-4', ''].join('\t')
    ].join('\n'))
  })

  it('table rows, columns (merged cells - rowspan in columns items)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-rows-columns.docx'))
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
    const text = (await extractor.extract(result.content)).getBody().replace(/^\n*|\n*$/g, '')

    text.should.be.eql([
      ['R1-1', 'R1-2', 'R1-3', 'R1-4', ''].join('\t'),
      ['', 'R2-2', 'R2-3', '', ''].join('\t'),
      ['R3-1', 'R3-2', 'R3-3', 'R3-4', ''].join('\t'),
      ['R4-1', 'R4-2', 'R4-3', 'R4-4', ''].join('\t')
    ].join('\n'))
  })

  it('table rows, columns (merged cells - colspan)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-rows-columns.docx'))
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
    const text = (await extractor.extract(result.content)).getBody().replace(/^\n*|\n*$/g, '')

    text.should.be.eql([
      ['R1-1', 'R1-2', 'R1-3', 'R1-4', ''].join('\t'),
      ['R2-1', 'R2-3', ''].join('\t'),
      ['R3-1', 'R3-2', 'R3-3', 'R3-4', ''].join('\t'),
      ['R4-1', 'R4-3', 'R4-4', ''].join('\t'),
      ['R5-1', 'R5-2', 'R5-3', 'R5-4', ''].join('\t'),
      ['R6-1', 'R6-2', 'R6-3', ''].join('\t'),
      ['R7-1', 'R7-2', 'R7-3', 'R7-4', ''].join('\t'),
      ['R8-1', 'R8-2', 'R8-4', ''].join('\t'),
      ['R9-1', 'R9-2', 'R9-3', 'R9-4', ''].join('\t'),
      ['R10-1', 'R10-2', 'R10-3', 'R10-4', ''].join('\t')
    ].join('\n'))
  })

  it('table rows, columns (merged cells - colspan in columns items)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-rows-columns.docx'))
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
    const text = (await extractor.extract(result.content)).getBody().replace(/^\n*|\n*$/g, '')

    text.should.be.eql([
      ['R1-1', 'R1-3', ''].join('\t'),
      ['R2-1', 'R2-2', 'R2-3', 'R2-4', ''].join('\t'),
      ['R3-1', 'R3-2', 'R3-3', 'R3-4', ''].join('\t'),
      ['R4-1', 'R4-2', 'R4-3', 'R4-4', ''].join('\t')
    ].join('\n'))
  })

  it('table rows, columns (merged cells - rowspan and colspan)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-rows-columns.docx'))
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
    const text = (await extractor.extract(result.content)).getBody().replace(/^\n*|\n*$/g, '')

    text.should.be.eql([
      ['R1-1', 'R1-3', ''].join('\t'),
      ['', 'R2-3', 'R2-4', ''].join('\t'),
      ['R3-1', 'R3-2', 'R3-3', 'R3-4', ''].join('\t'),
      ['R4-1', 'R4-4', ''].join('\t'),
      ['', 'R5-4', ''].join('\t'),
      ['', 'R6-4', ''].join('\t'),
      ['R7-1', 'R7-2', 'R7-3', 'R7-4', ''].join('\t')
    ].join('\n'))
  })

  it('table rows, columns (merged cells - rowspan and colspan, columnIndex and rowIndex exists)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-rows-columns-block-index.docx'))
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
    const text = (await extractor.extract(result.content)).getBody().replace(/^\n*|\n*$/g, '')

    text.should.be.eql([
      ['0-0', '0-2', ''].join('\t'),
      ['', '1-2', '1-3', ''].join('\t'),
      ['2-0', '2-1', '2-2', '2-3', ''].join('\t'),
      ['3-0', '3-3', ''].join('\t'),
      ['', '4-3', ''].join('\t'),
      ['', '5-3', ''].join('\t'),
      ['6-0', '6-1', '6-2', '6-3', ''].join('\t')
    ].join('\n'))
  })

  it('table rows, columns with custom col width (single col configured)', async () => {
    const colsWidth = ['100px']
    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'table-rows-columns-custom-col-width.docx'))
    const [templateSlideDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('w:gridCol'))
    const templateFirstColWidth = templateGridColEls[0].getAttribute('w:w')

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        rowsItems: [
          ['Jan', 'jan.blaha@foo.com'],
          ['Boris', 'boris@foo.met'],
          ['Pavel', 'pavel@foo.met']
        ],
        columnsItems: ['Name', 'Email'],
        colsWidth
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Name')
    text.should.containEql('Email')
    text.should.containEql('Jan')
    text.should.containEql('jan.blaha@foo.com')
    text.should.containEql('Boris')
    text.should.containEql('boris@foo.met')
    text.should.containEql('Pavel')
    text.should.containEql('pavel@foo.met')

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))

    should(gridColEls.length).be.eql(2)

    const outputFirstColWidth = gridColEls[0].getAttribute('w:w')
    const expectedFirstColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[0]).value)).toString()

    should(outputFirstColWidth).be.not.eql(templateFirstColWidth)
    should(outputFirstColWidth).be.eql(expectedFirstColWidth)

    should(gridColEls[1].getAttribute('w:w')).be.eql(templateFirstColWidth)

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    for (const rowEl of rowEls) {
      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const cellWidthEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')

        if (cellIdx === 0) {
          should(cellWidthEl.getAttribute('w:w')).be.eql(expectedFirstColWidth)
        } else {
          should(cellWidthEl.getAttribute('w:w')).be.eql(templateFirstColWidth)
        }

        should(cellWidthEl.getAttribute('w:type')).be.eql('dxa')
      }
    }
  })

  it('table rows, columns with custom col width (all cols configured)', async () => {
    const colsWidth = ['100px', '150px']
    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'table-rows-columns-custom-col-width.docx'))
    const [templateSlideDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('w:gridCol'))
    const templateFirstColWidth = templateGridColEls[0].getAttribute('w:w')

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        rowsItems: [
          ['Jan', 'jan.blaha@foo.com'],
          ['Boris', 'boris@foo.met'],
          ['Pavel', 'pavel@foo.met']
        ],
        columnsItems: ['Name', 'Email'],
        colsWidth
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Name')
    text.should.containEql('Email')
    text.should.containEql('Jan')
    text.should.containEql('jan.blaha@foo.com')
    text.should.containEql('Boris')
    text.should.containEql('boris@foo.met')
    text.should.containEql('Pavel')
    text.should.containEql('pavel@foo.met')

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))

    should(gridColEls.length).be.eql(2)

    for (const [colIdx, colEl] of gridColEls.entries()) {
      const expectedColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[colIdx]).value)).toString()

      should(colEl.getAttribute('w:w')).be.not.eql(templateFirstColWidth)

      colEl.getAttribute('w:w').should.be.eql(expectedColWidth)
    }

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    for (const rowEl of rowEls) {
      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const cellWidthEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')
        const expectedColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)).toString()

        should(cellWidthEl.getAttribute('w:w')).be.eql(expectedColWidth)
        should(cellWidthEl.getAttribute('w:type')).be.eql('dxa')
      }
    }
  })

  it('table rows, columns with custom col width (single col configured) and merged cells - colspan', async () => {
    const colsWidth = ['100px']

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'table-custom-col-width-rows-columns.docx'))

    const [templateSlideDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('w:gridCol'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
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
        columnsItems: ['R1-1', 'R1-2', 'R1-3', 'R1-4'],
        colsWidth
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody().replace(/^\n*|\n*$/g, '')

    text.should.be.eql([
      ['R1-1', 'R1-2', 'R1-3', 'R1-4', ''].join('\t'),
      ['R2-1', 'R2-3', ''].join('\t'),
      ['R3-1', 'R3-2', 'R3-3', 'R3-4', ''].join('\t'),
      ['R4-1', 'R4-3', 'R4-4', ''].join('\t'),
      ['R5-1', 'R5-2', 'R5-3', 'R5-4', ''].join('\t'),
      ['R6-1', 'R6-2', 'R6-3', ''].join('\t'),
      ['R7-1', 'R7-2', 'R7-3', 'R7-4', ''].join('\t'),
      ['R8-1', 'R8-2', 'R8-4', ''].join('\t'),
      ['R9-1', 'R9-2', 'R9-3', 'R9-4', ''].join('\t'),
      ['R10-1', 'R10-2', 'R10-3', 'R10-4', ''].join('\t')
    ].join('\n'))

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))

    should(gridColEls.length).be.eql(4)

    for (const [colIdx, colEl] of gridColEls.entries()) {
      if (colIdx === 0) {
        const expectedColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[colIdx]).value)).toString()
        should(colEl.getAttribute('w:w')).be.not.eql(templateGridColEls[0].getAttribute('w:w'))
        should(colEl.getAttribute('w:w')).be.eql(expectedColWidth)
      } else {
        should(colEl.getAttribute('w:w')).be.eql(templateGridColEls[0].getAttribute('w:w'))
      }
    }

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    should(rowEls.length).be.eql(10)

    for (const [rowIdx, rowEl] of rowEls.entries()) {
      if (rowIdx === 0 || rowIdx === 2 || rowIdx === 4 || rowIdx === 6 || rowIdx === 8 || rowIdx === 9) {
        continue
      }

      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      if (rowIdx === 1) {
        should(cellEls.length).be.eql(2)
      } else {
        should(cellEls.length).be.eql(3)
      }

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const gridSpanEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:gridSpan')
        const cellWidthEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')

        if (rowIdx === 1) {
          should(gridSpanEl.getAttribute('w:val')).be.eql('2')

          if (cellIdx === 0) {
            const expectedCellWidth = (
              emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)) +
              parseInt(templateGridColEls[0].getAttribute('w:w'), 10)
            ).toString()

            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else {
            const expectedCellWidth = (
              parseInt(templateGridColEls[0].getAttribute('w:w'), 10) +
              parseInt(templateGridColEls[0].getAttribute('w:w'), 10)
            ).toString()

            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          }
        } else if (rowIdx === 3) {
          if (cellIdx === 0) {
            should(gridSpanEl.getAttribute('w:val')).be.eql('2')

            const expectedCellWidth = (
              emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)) +
              parseInt(templateGridColEls[0].getAttribute('w:w'), 10)
            ).toString()

            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else {
            should(gridSpanEl).be.not.ok()

            const expectedCellWidth = templateGridColEls[0].getAttribute('w:w')
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          }
        } else if (rowIdx === 5) {
          if (cellIdx === 0) {
            const expectedCellWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)).toString()
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else if (cellIdx === 2) {
            should(gridSpanEl.getAttribute('w:val')).be.eql('2')

            const expectedCellWidth = (
              parseInt(templateGridColEls[0].getAttribute('w:w'), 10) +
              parseInt(templateGridColEls[0].getAttribute('w:w'), 10)
            ).toString()

            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else {
            should(gridSpanEl).be.not.ok()

            const expectedCellWidth = templateGridColEls[0].getAttribute('w:w')
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          }
        } else if (rowIdx === 7) {
          if (cellIdx === 0) {
            const expectedCellWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)).toString()
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else if (cellIdx === 1) {
            should(gridSpanEl.getAttribute('w:val')).be.eql('2')

            const expectedCellWidth = (
              parseInt(templateGridColEls[0].getAttribute('w:w'), 10) +
              parseInt(templateGridColEls[0].getAttribute('w:w'), 10)
            ).toString()

            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else {
            should(gridSpanEl).be.not.ok()

            const expectedCellWidth = templateGridColEls[0].getAttribute('w:w')
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          }
        }
      }
    }
  })

  it('table rows, columns with custom col width (all cols configured) and merged cells - colspan', async () => {
    const colsWidth = ['100px', '100px', '100px', '100px']

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'table-custom-col-width-rows-columns.docx'))

    const [templateSlideDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const templateGridColEls = nodeListToArray(templateSlideDoc.getElementsByTagName('w:gridCol'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
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
        columnsItems: ['R1-1', 'R1-2', 'R1-3', 'R1-4'],
        colsWidth
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody().replace(/^\n*|\n*$/g, '')

    text.should.be.eql([
      ['R1-1', 'R1-2', 'R1-3', 'R1-4', ''].join('\t'),
      ['R2-1', 'R2-3', ''].join('\t'),
      ['R3-1', 'R3-2', 'R3-3', 'R3-4', ''].join('\t'),
      ['R4-1', 'R4-3', 'R4-4', ''].join('\t'),
      ['R5-1', 'R5-2', 'R5-3', 'R5-4', ''].join('\t'),
      ['R6-1', 'R6-2', 'R6-3', ''].join('\t'),
      ['R7-1', 'R7-2', 'R7-3', 'R7-4', ''].join('\t'),
      ['R8-1', 'R8-2', 'R8-4', ''].join('\t'),
      ['R9-1', 'R9-2', 'R9-3', 'R9-4', ''].join('\t'),
      ['R10-1', 'R10-2', 'R10-3', 'R10-4', ''].join('\t')
    ].join('\n'))

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const gridColEls = nodeListToArray(doc.getElementsByTagName('w:gridCol'))

    should(gridColEls.length).be.eql(4)

    for (const [colIdx, colEl] of gridColEls.entries()) {
      const expectedColWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[colIdx]).value)).toString()
      should(colEl.getAttribute('w:w')).be.not.eql(templateGridColEls[0].getAttribute('w:w'))
      should(colEl.getAttribute('w:w')).be.eql(expectedColWidth)
    }

    const rowEls = nodeListToArray(doc.getElementsByTagName('w:tr'))

    should(rowEls.length).be.eql(10)

    for (const [rowIdx, rowEl] of rowEls.entries()) {
      if (rowIdx === 0 || rowIdx === 2 || rowIdx === 4 || rowIdx === 6 || rowIdx === 8 || rowIdx === 9) {
        continue
      }

      const cellEls = nodeListToArray(rowEl.getElementsByTagName('w:tc'))

      if (rowIdx === 1) {
        should(cellEls.length).be.eql(2)
      } else {
        should(cellEls.length).be.eql(3)
      }

      for (const [cellIdx, cellEl] of cellEls.entries()) {
        const cellPrEl = nodeListToArray(cellEl.childNodes).find((node) => node.nodeName === 'w:tcPr')
        const gridSpanEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:gridSpan')
        const cellWidthEl = nodeListToArray(cellPrEl.childNodes).find((node) => node.nodeName === 'w:tcW')

        if (rowIdx === 1) {
          should(gridSpanEl.getAttribute('w:val')).be.eql('2')

          const expectedCellWidth = (
            emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)) +
            emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value))
          ).toString()

          should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
        } else if (rowIdx === 3) {
          if (cellIdx === 0) {
            should(gridSpanEl.getAttribute('w:val')).be.eql('2')

            const expectedCellWidth = (
              emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)) +
              emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value))
            ).toString()

            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else {
            should(gridSpanEl).be.not.ok()

            const expectedCellWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)).toString()
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          }
        } else if (rowIdx === 5) {
          if (cellIdx === 0) {
            const expectedCellWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)).toString()
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else if (cellIdx === 2) {
            should(gridSpanEl.getAttribute('w:val')).be.eql('2')

            const expectedCellWidth = (
              emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)) +
              emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value))
            ).toString()

            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else {
            should(gridSpanEl).be.not.ok()

            const expectedCellWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)).toString()
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          }
        } else if (rowIdx === 7) {
          if (cellIdx === 0) {
            const expectedCellWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)).toString()
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else if (cellIdx === 1) {
            should(gridSpanEl.getAttribute('w:val')).be.eql('2')

            const expectedCellWidth = (
              emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)) +
              emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value))
            ).toString()

            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          } else {
            should(gridSpanEl).be.not.ok()

            const expectedCellWidth = emuToTOAP(pxToEMU(getDimension(colsWidth[cellIdx]).value)).toString()
            should(cellWidthEl.getAttribute('w:w')).be.eql(expectedCellWidth)
          }
        }
      }
    }
  })

  it('conditions across rows/cells should produce valid document', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-conditional-cells-content.docx'))
          }
        }
      },
      data: JSON.parse(fs.readFileSync(path.join(dataDirPath, 'table-conditional-cells-content.json'), 'utf8'))
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const cellEls = nodeListToArray(doc.getElementsByTagName('w:tc'))

    should(cellEls).have.length(18)

    for (const cellEl of cellEls) {
      const cellChildEls = nodeListToArray(cellEl.childNodes)
      const cellContentEls = cellChildEls.filter((node) => node.nodeName !== 'w:tcPr')
      should(cellContentEls.length).greaterThan(0)
    }
  })

  it('conditions across rows/cells should produce valid document - nested', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'table-conditional-cells-content2.docx'))
          }
        }
      },
      data: JSON.parse(fs.readFileSync(path.join(dataDirPath, 'table-conditional-cells-content.json'), 'utf8'))
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const cellEls = nodeListToArray(doc.getElementsByTagName('w:tc'))

    should(cellEls).have.length(64)

    for (const cellEl of cellEls) {
      const cellChildEls = nodeListToArray(cellEl.childNodes)
      const cellContentEls = cellChildEls.filter((node) => node.nodeName !== 'w:tcPr')
      should(cellContentEls.length).greaterThan(0)
    }
  })
})
