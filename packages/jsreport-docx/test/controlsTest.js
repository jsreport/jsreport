const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const { getDocumentsFromDocxBuf } = require('./utils')

describe('docx controls', () => {
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

  it('input form control', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'form-control-input.docx')
            )
          }
        }
      },
      data: {
        name: 'Erick'
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    doc
      .getElementsByTagName('w:textInput')[0]
      .getElementsByTagName('w:default')[0]
      .getAttribute('w:val')
      .should.be.eql('Erick')
  })

  it('checkbox form control', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'form-control-checkbox.docx')
            )
          }
        }
      },
      data: {
        ready: true
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    doc
      .getElementsByTagName('w14:checked')[0]
      .getAttribute('w14:val')
      .should.be.eql('1')

    doc
      .getElementsByTagName('w:sdt')[0]
      .getElementsByTagName('w:t')[0]
      .textContent.should.be.eql('☒')
  })

  it('combobox form control', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'form-control-combo.docx')
            )
          }
        }
      },
      data: {
        val: 'vala'
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    doc.getElementsByTagName('w:sdtContent')[0]
      .getElementsByTagName('w:t')[0]
      .textContent.should.be.eql('display val')
  })

  it('combobox form control with constant value', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'form-control-combo-constant-value.docx')
            )
          }
        }
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    doc.getElementsByTagName('w:sdtContent')[0]
      .getElementsByTagName('w:t')[0]
      .textContent.should.be.eql('value a')
  })

  it('combobox form control with dynamic items', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'form-control-combo-dynamic-items.docx')
            )
          }
        }
      },
      data: {
        val: 'b',
        items: [
          {
            value: 'a',
            text: 'Jan'
          },
          {
            value: 'b',
            text: 'Boris'
          }
        ]
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    doc.getElementsByTagName('w:sdtContent')[0]
      .getElementsByTagName('w:t')[0]
      .textContent.should.be.eql('Boris')
  })

  it('combobox form control with dynamic items in strings', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'form-control-combo-dynamic-items.docx')
            )
          }
        }
      },
      data: {
        val: 'Boris',
        items: ['Jan', 'Boris']
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    doc.getElementsByTagName('w:sdtContent')[0]
      .getElementsByTagName('w:t')[0]
      .textContent.should.be.eql('Boris')
  })

  it('combobox form control with dynamic items in strings and special character', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'form-control-combo-dynamic-items.docx')
            )
          }
        }
      },
      data: {
        val: 'Boris$',
        items: ['Jan$', 'Boris$']
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    doc.getElementsByTagName('w:sdtContent')[0]
      .getElementsByTagName('w:t')[0]
      .textContent.should.be.eql('Boris$')
  })
})
