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
})
