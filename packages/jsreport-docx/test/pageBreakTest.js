const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const { nodeListToArray } = require('../lib/utils')
const { getDocumentsFromDocxBuf } = require('./utils')

describe('docx pageBreak', () => {
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

  it('page break in single paragraph', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'page-break-single-paragraph.docx')
            )
          }
        }
      },
      data: {}
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    paragraphNodes[0]
      .getElementsByTagName('w:t')[0]
      .textContent.should.be.eql('Demo')

    paragraphNodes[0].getElementsByTagName('w:br').should.have.length(1)
    paragraphNodes[0]
      .getElementsByTagName('w:t')[1]
      .textContent.should.be.eql('break')
  })

  it('page break in single paragraph with condition', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'page-break-single-paragraph-with-condition.docx')
            )
          }
        }
      },
      data: {}
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    paragraphNodes[0]
      .getElementsByTagName('w:t')[0]
      .textContent.should.be.eql('Demo')

    paragraphNodes[0].getElementsByTagName('w:br').length.should.be.eql(1)

    paragraphNodes[0]
      .getElementsByTagName('w:t')[1]
      .textContent.should.be.eql('break')
  })

  it('page break in single paragraph with condition #2', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'page-break-single-paragraph-with-condition2.docx')
            )
          }
        }
      },
      data: {}
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    paragraphNodes[0]
      .getElementsByTagName('w:t')[0]
      .textContent.should.be.eql('Demo')

    paragraphNodes[0].getElementsByTagName('w:br').length.should.be.eql(1)

    paragraphNodes[0]
      .getElementsByTagName('w:t')[1]
      .textContent.should.be.eql(' ')

    paragraphNodes[0]
      .getElementsByTagName('w:t')[2]
      .textContent.should.be.eql('break')
  })

  it('page break in single paragraph (sharing text nodes)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'page-break-single-paragraph2.docx')
            )
          }
        }
      },
      data: {}
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    paragraphNodes[0]
      .getElementsByTagName('w:t')[0]
      .textContent.should.be.eql('Demo')

    paragraphNodes[0].getElementsByTagName('w:br').should.have.length(1)

    paragraphNodes[0]
      .getElementsByTagName('w:t')[1]
      .textContent.should.be.eql('of a break')
  })

  it('page break between paragraphs', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'page-break-between-paragraphs.docx')
            )
          }
        }
      },
      data: {}
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const paragraphNodes = nodeListToArray(
      doc.getElementsByTagName('w:p')
    ).filter(p => {
      const breakNodes = getBreaks(p)

      const hasText = getText(p) != null && getText(p) !== ''

      if (!hasText && breakNodes.length === 0) {
        return false
      }

      return true
    })

    function getText (p) {
      const textNodes = nodeListToArray(p.getElementsByTagName('w:t')).filter(
        t => {
          return t.textContent != null && t.textContent !== ''
        }
      )

      return textNodes.map(t => t.textContent).join('')
    }

    function getBreaks (p) {
      return nodeListToArray(p.getElementsByTagName('w:br'))
    }

    getText(paragraphNodes[0]).should.be.eql('Demo some text')
    getBreaks(paragraphNodes[1]).should.have.length(1)
    getText(paragraphNodes[2]).should.be.eql('after break')
  })
})
