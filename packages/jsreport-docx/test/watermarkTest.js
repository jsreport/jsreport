const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const styleAttr = require('style-attr')
const { nodeListToArray } = require('../lib/utils')
const { getDocumentsFromDocxBuf } = require('./utils')

describe('docx watermark', () => {
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

  it('watermark', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'watermark.docx'))
          }
        }
      },
      data: {
        watermark: 'replacedvalue'
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [header1, header2, header3] = await getDocumentsFromDocxBuf(result.content, ['word/header1.xml', 'word/header2.xml', 'word/header3.xml'])

    header1
      .getElementsByTagName('v:shape')[0]
      .getElementsByTagName('v:textpath')[0]
      .getAttribute('string')
      .should.be.eql('replacedvalue')
    header2
      .getElementsByTagName('v:shape')[0]
      .getElementsByTagName('v:textpath')[0]
      .getAttribute('string')
      .should.be.eql('replacedvalue')
    header3
      .getElementsByTagName('v:shape')[0]
      .getElementsByTagName('v:textpath')[0]
      .getAttribute('string')
      .should.be.eql('replacedvalue')
  })

  it('watermark disabled', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'watermark-hide.docx'))
          }
        }
      },
      data: {
        watermark: 'replacedvalue',
        watermarkEnabled: false
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [header1, header2, header3] = await getDocumentsFromDocxBuf(result.content, ['word/header1.xml', 'word/header2.xml', 'word/header3.xml'])

    nodeListToArray(header1.getElementsByTagName('v:shape')).should.have.length(0)
    nodeListToArray(header2.getElementsByTagName('v:shape')).should.have.length(0)
    nodeListToArray(header3.getElementsByTagName('v:shape')).should.have.length(0)
  })

  it('watermark standard style', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'watermark-style.docx'))
          }
        }
      },
      data: {
        watermark: 'foo',
        watermarkStyle: {
          fontFamily: 'Times New Roman',
          fontColor: '#c45911',
          fontSize: 66,
          fontBold: true,
          fontItalic: true
        }
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [header1, header2, header3] = await getDocumentsFromDocxBuf(result.content, ['word/header1.xml', 'word/header2.xml', 'word/header3.xml'])

    const h1ShapeEl = header1.getElementsByTagName('v:shape')[0]
    const h1TextEl = h1ShapeEl.getElementsByTagName('v:textpath')[0]

    h1TextEl.getAttribute('string').should.be.eql('foo')

    const h1TextStyles = styleAttr.parse(h1TextEl.getAttribute('style'))

    h1ShapeEl.getAttribute('fillcolor').should.be.eql('#c45911')
    h1TextStyles['font-family'].should.be.eql('Times New Roman')
    h1TextStyles['font-weight'].should.be.eql('bold')
    h1TextStyles['font-style'].should.be.eql('italic')
    h1TextStyles['font-size'].should.be.eql('66pt')

    const h2TextEl = header2.getElementsByTagName('v:shape')[0].getElementsByTagName('v:textpath')[0]

    h2TextEl.getAttribute('string').should.be.eql('foo')

    const h2TextStyles = styleAttr.parse(h2TextEl.getAttribute('style'))

    h2TextStyles['font-family'].should.be.eql('Times New Roman')
    h2TextStyles['font-weight'].should.be.eql('bold')
    h2TextStyles['font-style'].should.be.eql('italic')
    h2TextStyles['font-size'].should.be.eql('66pt')

    const h3TextEl = header3.getElementsByTagName('v:shape')[0].getElementsByTagName('v:textpath')[0]

    h3TextEl.getAttribute('string').should.be.eql('foo')

    const h3TextStyles = styleAttr.parse(h3TextEl.getAttribute('style'))

    h3TextStyles['font-family'].should.be.eql('Times New Roman')
    h3TextStyles['font-weight'].should.be.eql('bold')
    h3TextStyles['font-style'].should.be.eql('italic')
    h3TextStyles['font-size'].should.be.eql('66pt')
  })

  it('watermark transparency style', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'watermark-style-transparency.docx'))
          }
        }
      },
      data: {
        watermark: 'foo',
        watermarkStyle: {
          transparency: '60%'
        }
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [header1, header2, header3] = await getDocumentsFromDocxBuf(result.content, ['word/header1.xml', 'word/header2.xml', 'word/header3.xml'])

    const h1FillEl = header1.getElementsByTagName('v:shape')[0].getElementsByTagName('v:fill')[0]

    h1FillEl.getAttribute('opacity').should.be.eql('40%')

    const h2FillEl = header2.getElementsByTagName('v:shape')[0].getElementsByTagName('v:fill')[0]

    h2FillEl.getAttribute('opacity').should.be.eql('40%')

    const h3FillEl = header3.getElementsByTagName('v:shape')[0].getElementsByTagName('v:fill')[0]

    h3FillEl.getAttribute('opacity').should.be.eql('40%')
  })

  it('watermark orientation style (horizontal)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'watermark-style-orientation.docx'))
          }
        }
      },
      data: {
        watermark: 'foo',
        watermarkStyle: {
          orientation: 'horizontal'
        }
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [header1, header2, header3] = await getDocumentsFromDocxBuf(result.content, ['word/header1.xml', 'word/header2.xml', 'word/header3.xml'])

    const h1ShapeEl = header1.getElementsByTagName('v:shape')[0]
    const h1TextEl = h1ShapeEl.getElementsByTagName('v:textpath')[0]

    h1TextEl.getAttribute('string').should.be.eql('foo')

    const h1ShapeStyles = styleAttr.parse(h1ShapeEl.getAttribute('style'))

    h1ShapeStyles.should.not.have.property('rotation')

    const h2ShapeEl = header2.getElementsByTagName('v:shape')[0]
    const h2TextEl = h2ShapeEl.getElementsByTagName('v:textpath')[0]

    h2TextEl.getAttribute('string').should.be.eql('foo')

    const h2ShapeStyles = styleAttr.parse(h2ShapeEl.getAttribute('style'))

    h2ShapeStyles.should.not.have.property('rotation')

    const h3ShapeEl = header3.getElementsByTagName('v:shape')[0]
    const h3TextEl = h3ShapeEl.getElementsByTagName('v:textpath')[0]

    h3TextEl.getAttribute('string').should.be.eql('foo')

    const h3ShapeStyles = styleAttr.parse(h3ShapeEl.getAttribute('style'))

    h3ShapeStyles.should.not.have.property('rotation')
  })

  it('watermark orientation style (diagonal)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'watermark-style-orientation.docx'))
          }
        }
      },
      data: {
        watermark: 'foo',
        watermarkStyle: {
          orientation: 'diagonal'
        }
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [header1, header2, header3] = await getDocumentsFromDocxBuf(result.content, ['word/header1.xml', 'word/header2.xml', 'word/header3.xml'])

    const h1ShapeEl = header1.getElementsByTagName('v:shape')[0]
    const h1TextEl = h1ShapeEl.getElementsByTagName('v:textpath')[0]

    h1TextEl.getAttribute('string').should.be.eql('foo')

    const h1ShapeStyles = styleAttr.parse(h1ShapeEl.getAttribute('style'))

    h1ShapeStyles.rotation.should.be.eql('315')

    const h2ShapeEl = header2.getElementsByTagName('v:shape')[0]
    const h2TextEl = h2ShapeEl.getElementsByTagName('v:textpath')[0]

    h2TextEl.getAttribute('string').should.be.eql('foo')

    const h2ShapeStyles = styleAttr.parse(h2ShapeEl.getAttribute('style'))

    h2ShapeStyles.rotation.should.be.eql('315')

    const h3ShapeEl = header3.getElementsByTagName('v:shape')[0]
    const h3TextEl = h3ShapeEl.getElementsByTagName('v:textpath')[0]

    h3TextEl.getAttribute('string').should.be.eql('foo')

    const h3ShapeStyles = styleAttr.parse(h3ShapeEl.getAttribute('style'))

    h3ShapeStyles.rotation.should.be.eql('315')
  })
})
