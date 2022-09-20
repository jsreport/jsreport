const should = require('should')
const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const { nodeListToArray } = require('../lib/utils')
const { getDocumentsFromDocxBuf } = require('./utils')

describe('docx raw', () => {
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

  it('raw', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'raw.docx'))
          }
        }
      },
      data: {
        xmlRun: '<w:r><w:t>raw xml run</w:t></w:r>',
        xmlInvalidRun: 'invalid xml run',
        xmlParagraph: '<w:p><w:r><w:t>raw xml paragraph</w:t></w:r></w:p>',
        xmlInvalidParagraph: 'invalid xml paragraph',
        xmlTableCell: '<w:tc><w:p><w:r><w:t>raw xml table cell</w:t></w:r></w:p></w:tc>',
        xmlInvalidTableCell: 'invalid xml table cell',
        xmlTable: '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>raw xml full table</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
        xmlInvalidTable: 'invalid xml full table'
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const generalTextElements = nodeListToArray(doc.getElementsByTagName('w:t'))

    const found = []
    for (const textEl of generalTextElements) {
      if (textEl.textContent.includes('raw xml run')) {
        found.push(textEl.textContent)
        should(textEl.parentNode.nodeName).eql('w:r', textEl.textContent)
        should(textEl.parentNode.parentNode.nodeName).eql('w:p', textEl.textContent)
        should(textEl.parentNode.parentNode.parentNode.nodeName).eql('w:body', textEl.textContent)
      }
      if (textEl.textContent.includes('invalid xml run')) {
        found.push(textEl.textContent)
        should(textEl.parentNode.nodeName).eql('w:r', textEl.textContent)
        should(textEl.parentNode.parentNode.nodeName).eql('w:p', textEl.textContent)
        should(textEl.parentNode.parentNode.parentNode.nodeName).eql('w:body', textEl.textContent)
      }
      if (textEl.textContent.includes('raw xml paragraph')) {
        found.push(textEl.textContent)
        should(textEl.parentNode.nodeName).eql('w:r', textEl.textContent)
        should(textEl.parentNode.parentNode.nodeName).eql('w:p', textEl.textContent)
        should(textEl.parentNode.parentNode.parentNode.nodeName).eql('w:body', textEl.textContent)
      }
      if (textEl.textContent.includes('invalid xml paragraph')) {
        found.push(textEl.textContent)
        should(textEl.parentNode.nodeName).eql('w:r', textEl.textContent)
        should(textEl.parentNode.parentNode.nodeName).eql('w:body', textEl.textContent)
      }
      if (textEl.textContent.includes('raw xml table cell')) {
        found.push(textEl.textContent)
        should(textEl.parentNode.nodeName).eql('w:r', textEl.textContent)
        should(textEl.parentNode.parentNode.nodeName).eql('w:p', textEl.textContent)
        should(textEl.parentNode.parentNode.parentNode.nodeName).eql('w:tc', textEl.textContent)
        should(textEl.parentNode.parentNode.parentNode.parentNode.nodeName).eql('w:tr', textEl.textContent)
        should(textEl.parentNode.parentNode.parentNode.parentNode.parentNode.nodeName).eql('w:tbl', textEl.textContent)
        should(textEl.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.nodeName).eql('w:body', textEl.textContent)
      }
      if (textEl.textContent.includes('invalid xml table cell')) {
        found.push(textEl.textContent)
        should(textEl.parentNode.nodeName).eql('w:r', textEl.textContent)
        should(textEl.parentNode.parentNode.nodeName).eql('w:tr', textEl.textContent)
      }
      if (textEl.textContent.includes('raw xml full table')) {
        found.push(textEl.textContent)
        should(textEl.parentNode.nodeName).eql('w:r', textEl.textContent)
        should(textEl.parentNode.parentNode.nodeName).eql('w:p', textEl.textContent)
        should(textEl.parentNode.parentNode.parentNode.nodeName).eql('w:tc', textEl.textContent)
        should(textEl.parentNode.parentNode.parentNode.parentNode.nodeName).eql('w:tr', textEl.textContent)
        should(textEl.parentNode.parentNode.parentNode.parentNode.parentNode.nodeName).eql('w:tbl', textEl.textContent)
        should(textEl.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.nodeName).eql('w:body', textEl.textContent)
      }
      if (textEl.textContent.includes('invalid xml full table')) {
        found.push(textEl.textContent)
        should(textEl.parentNode.nodeName).eql('w:r', textEl.textContent)
        should(textEl.parentNode.parentNode.nodeName).eql('w:body', textEl.textContent)
      }
    }
    should(found).eql([
      'raw xml run',
      'invalid xml run',
      'raw xml paragraph',
      'invalid xml paragraph',
      'raw xml table cell',
      'invalid xml table cell',
      'raw xml full table',
      'invalid xml full table'
    ])
  })

  it('raw error no parameter', async () => {
    const result = reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'raw-error-no-parameter.docx'))
          }
        }
      },
      data: {}
    })

    return Promise.all([
      should(result).be.rejectedWith(/Expected "xml" and "replaceParentElement" parameters for the docxRaw helper/)
    ])
  })

  it('raw error no xml parameter', async () => {
    return reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'raw-error-no-xml-parameter.docx'))
          }
        }
      },
      data: {}
    }).should.be.rejectedWith(/Expected "xml" parameter for the docxRaw helper/)
  })

  it('raw error no replaceParentElement parameter', async () => {
    return reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'raw-error-no-replaceParentElement-parameter.docx'))
          }
        }
      },
      data: {}
    }).should.be.rejectedWith(/Expected "replaceParentElement" parameter for the docxRaw helper/)
  })

  it('raw error invalid replaceParentElement value', async () => {
    return reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'raw-error-invalid-replaceParentElement-value.docx'))
          }
        }
      },
      data: {}
    }).should.be.rejectedWith(/Could not find a reference element that matches the "replaceParentElement" parameter of the docxRaw helper in the document tree: w:bad/)
  })

  it('raw error invalid wtc location', async () => {
    return reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'raw-error-invalid-wtc-location.docx'))
          }
        }
      },
      data: {}
    }).should.be.rejectedWith(/Could not find a reference element that matches the "replaceParentElement" parameter of the docxRaw helper in the document tree: w:tc/)
  })
})
