const should = require('should')
const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const { DOMParser } = require('@xmldom/xmldom')
const moment = require('moment')
const toExcelDate = require('js-excel-date-convert').toExcelDate
const { decompress } = require('@jsreport/office')
const sizeOf = require('image-size')
const { nodeListToArray, pxToEMU, cmToEMU } = require('../lib/utils')
const WordExtractor = require('word-extractor')
const extractor = new WordExtractor()

async function getImageSize (buf) {
  const files = await decompress()(buf)
  const doc = new DOMParser().parseFromString(
    files.find(f => f.path === 'word/document.xml').data.toString()
  )
  const drawingEl = doc.getElementsByTagName('w:drawing')[0]
  const pictureEl = findDirectPictureChild(drawingEl)
  const aExtEl = pictureEl.getElementsByTagName('a:xfrm')[0].getElementsByTagName('a:ext')[0]

  return {
    width: parseFloat(aExtEl.getAttribute('cx')),
    height: parseFloat(aExtEl.getAttribute('cy'))
  }
}

function findDirectPictureChild (parentNode) {
  const childNodes = parentNode.childNodes || []
  let pictureEl

  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i]

    if (child.nodeName === 'w:drawing') {
      break
    }

    if (child.nodeName === 'pic:pic') {
      pictureEl = child
      break
    }

    const foundInChild = findDirectPictureChild(child)

    if (foundInChild) {
      pictureEl = foundInChild
      break
    }
  }

  return pictureEl
}

describe('docx', () => {
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

  it('condition-with-helper-call', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'condition-with-helper-call.docx')
            )
          }
        },
        helpers: `
          function moreThan2(users) {
            return users.length > 2
          }
        `
      },
      data: {
        users: [1, 2, 3]
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const doc = await extractor.extract(result.content)
    doc.getBody().should.containEql('More than 2 users')
  })

  it('condition with docProps/thumbnail.jpeg in docx', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'condition.docx'))
          }
        },
        helpers: `
          function moreThan2(users) {
            return users.length > 2
          }
        `
      },
      data: {
        users: [1, 2, 3]
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const doc = await extractor.extract(result.content)
    doc.getBody().should.containEql('More than 2 users')
  })

  it('variable-replace', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'variable-replace.docx')
            )
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Hello world John')
  })

  it('variable-replace-multi', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'variable-replace-multi.docx')
            )
          }
        }
      },
      data: {
        name: 'John',
        lastname: 'Wick'
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const doc = await extractor.extract(result.content)
    doc.getBody().replace(/\n/g, ' ').should.containEql(
      'Hello world John developer Another lines John developer with Wick as lastname'
    )
  })

  it('variable-replace-syntax-error', () => {
    const prom = reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'variable-replace-syntax-error.docx')
            )
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    return Promise.all([
      should(prom).be.rejectedWith(/Parse error/),
      // this text that error contains proper location of syntax error
      should(prom).be.rejectedWith(/<w:t>{{<\/w:t>/)
    ])
  })

  it('invoice', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'invoice.docx'))
          }
        }
      },
      data: {
        invoiceNumber: 'T-123',
        company: {
          address: 'Prague 345',
          email: 'foo',
          phone: 'phone'
        },
        total: 1000,
        date: 'dddd',
        items: [
          {
            product: {
              name: 'jsreport',
              price: 11
            },
            quantity: 10,
            cost: 20
          }
        ]
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const doc = await extractor.extract(result.content)
    const text = doc.getBody()
    text.should.containEql('T-123')
    text.should.containEql('jsreport')
    text.should.containEql('Prague 345')
  })

  it('endnote', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'end-note.docx'))
          }
        }
      },
      data: {
        value: 'endnotevalue'
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const doc = await extractor.extract(result.content)
    const text = doc.getEndnotes()
    text.should.containEql('endnotevalue')
  })

  it('footnote', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'foot-note.docx'))
          }
        }
      },
      data: {
        value: 'footnotevalue'
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const doc = await extractor.extract(result.content)
    const text = doc.getFootnotes()
    text.should.containEql('footnotevalue')
  })

  it('link', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'link.docx'))
          }
        }
      },
      data: {
        url: 'https://jsreport.net'
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('website')

    const files = await decompress()(result.content)
    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )
    const hyperlink = doc.getElementsByTagName('w:hyperlink')[0]
    const docRels = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/_rels/document.xml.rels').data.toString()
    )
    const rels = nodeListToArray(docRels.getElementsByTagName('Relationship'))

    rels
      .find(node => node.getAttribute('Id') === hyperlink.getAttribute('r:id'))
      .getAttribute('Target')
      .should.be.eql('https://jsreport.net')
  })

  it('link in header', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'link-header.docx'))
          }
        }
      },
      data: {
        linkText: 'jsreport',
        linkUrl: 'https://jsreport.net'
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getHeaders()
    text.should.containEql('jsreport')

    const files = await decompress()(result.content)
    const header = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/header1.xml').data.toString()
    )
    const hyperlink = header.getElementsByTagName('w:hyperlink')[0]
    const headerRels = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/_rels/header1.xml.rels').data.toString()
    )
    const rels = nodeListToArray(
      headerRels.getElementsByTagName('Relationship')
    )

    rels
      .find(node => node.getAttribute('Id') === hyperlink.getAttribute('r:id'))
      .getAttribute('Target')
      .should.be.eql('https://jsreport.net')
  })

  it('link in footer', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'link-footer.docx'))
          }
        }
      },
      data: {
        linkText: 'jsreport',
        linkUrl: 'https://jsreport.net'
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getFooters()
    text.should.containEql('jsreport')

    const files = await decompress()(result.content)
    const footer = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/footer1.xml').data.toString()
    )
    const hyperlink = footer.getElementsByTagName('w:hyperlink')[0]
    const footerRels = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/_rels/footer1.xml.rels').data.toString()
    )
    const rels = nodeListToArray(
      footerRels.getElementsByTagName('Relationship')
    )

    rels
      .find(node => node.getAttribute('Id') === hyperlink.getAttribute('r:id'))
      .getAttribute('Target')
      .should.be.eql('https://jsreport.net')
  })

  it('link in header, footer', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'link-header-footer.docx')
            )
          }
        }
      },
      data: {
        linkText: 'jsreport',
        linkUrl: 'https://jsreport.net',
        linkText2: 'github',
        linkUrl2: 'https://github.com'
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getHeaders()
    text.should.containEql('jsreport')

    const files = await decompress()(result.content)
    const header = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/header2.xml').data.toString()
    )
    const footer = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/footer2.xml').data.toString()
    )
    const headerHyperlink = header.getElementsByTagName('w:hyperlink')[0]
    const footerHyperlink = footer.getElementsByTagName('w:hyperlink')[0]
    const headerRels = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/_rels/header2.xml.rels').data.toString()
    )
    const footerRels = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/_rels/footer2.xml.rels').data.toString()
    )
    const rels = nodeListToArray(
      headerRels.getElementsByTagName('Relationship')
    )
    const rels2 = nodeListToArray(
      footerRels.getElementsByTagName('Relationship')
    )

    rels
      .find(
        node => node.getAttribute('Id') === headerHyperlink.getAttribute('r:id')
      )
      .getAttribute('Target')
      .should.be.eql('https://jsreport.net')
    rels2
      .find(
        node => node.getAttribute('Id') === footerHyperlink.getAttribute('r:id')
      )
      .getAttribute('Target')
      .should.be.eql('https://github.com')
  })

  it('link to bookmark should not break', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'link-to-bookmark.docx'))
          }
        }
      },
      data: {
        acn: '2222222',
        companyName: 'Demo'
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody().replace(/\t/g, ' ')

    text.should.containEql('1 Preliminary 1')
    text.should.containEql('1.1 Name of the Company 1')
    text.should.containEql('1.2 Type of Company 1')
    text.should.containEql('1.3 Limited liability of Members 1')
    text.should.containEql('1.4 The Guarantee 1')
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

    const files = await decompress()(result.content)
    const header1 = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/header1.xml').data.toString()
    )
    const header2 = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/header2.xml').data.toString()
    )
    const header3 = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/header3.xml').data.toString()
    )

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

  it('list', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'list.docx'))
          }
        }
      },
      data: {
        people: [
          {
            name: 'Jan'
          },
          {
            name: 'Boris'
          },
          {
            name: 'Pavel'
          }
        ]
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('Boris')
  })

  it('list and links', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'list-and-links.docx')
            )
          }
        }
      },
      data: {
        items: [
          {
            text: 'jsreport',
            address: 'https://jsreport.net'
          },
          {
            text: 'github',
            address: 'https://github.com'
          }
        ]
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()

    text.should.containEql('jsreport')
    text.should.containEql('github')
  })

  it('list and endnotes', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'list-and-endnotes.docx')
            )
          }
        }
      },
      data: {
        items: [
          {
            name: '1',
            note: '1n'
          },
          {
            name: '2',
            note: '2n'
          }
        ]
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getEndnotes()

    text.should.containEql('note 1n')
    text.should.containEql('note 2n')
  })

  it('list and footnotes', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'list-and-footnotes.docx')
            )
          }
        }
      },
      data: {
        items: [
          {
            name: '1',
            note: '1n'
          },
          {
            name: '2',
            note: '2n'
          }
        ]
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getFootnotes()

    text.should.containEql('note 1n')
    text.should.containEql('note 2n')
  })

  it('list nested', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'list-nested.docx'))
          }
        }
      },
      data: {
        items: [{
          name: 'Boris',
          items: [{
            name: 'item1'
          }, {
            name: 'item2'
          }]
        }, {
          name: 'Junior',
          items: [{
            name: 'item3'
          }, {
            name: 'item4'
          }]
        }, {
          name: 'Jan',
          items: [{
            name: 'item5'
          }, {
            name: 'item6'
          }]
        }]
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const text = (await extractor.extract(result.content)).getBody()

    text.should.containEql('Boris')
    text.should.containEql('Junior')
    text.should.containEql('Jan')
    text.should.containEql('item1')
    text.should.containEql('item2')
    text.should.containEql('item3')
    text.should.containEql('item4')
    text.should.containEql('item5')
    text.should.containEql('item6')
  })

  it('variable-replace-and-list-after', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'variable-replace-and-list-after.docx')
            )
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody().replace(/\n/g, ' ')
    text.should.containEql(
      'This is a test John here we go Test 1 Test 2 Test 3'
    )
  })

  it('variable-replace-and-list-after2', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'variable-replace-and-list-after2.docx')
            )
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody().replace(/\n/g, ' ')
    text.should.containEql(
      'This is a test John here we go Test 1 Test 2 Test 3 This is another test John can you see me here'
    )
  })

  it('variable-replace-and-list-after-syntax-error', async () => {
    const prom = reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(
                __dirname,
                'variable-replace-and-list-after-syntax-error.docx'
              )
            )
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    return Promise.all([
      should(prom).be.rejectedWith(/Parse error/),
      // this text that error contains proper location of syntax error
      should(prom).be.rejectedWith(/<w:t>{{<\/w:t>/)
    ])
  })

  it('table', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'table.docx'))
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

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('Boris')
  })

  it('table and links', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'table-and-links.docx')
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

    fs.writeFileSync('out.docx', result.content)
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
              path.join(__dirname, 'table-and-endnotes.docx')
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

    fs.writeFileSync('out.docx', result.content)
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
              path.join(__dirname, 'table-and-footnotes.docx')
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

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getFootnotes()

    text.should.containEql('note site1')
    text.should.containEql('note site2')
    text.should.containEql('note site3')
  })

  it('table nested', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'table-nested.docx'))
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

    fs.writeFileSync('out.docx', result.content)

    const text = (await extractor.extract(result.content)).getBody()

    text.should.containEql('Rick')
    text.should.containEql('Andrea')
    text.should.containEql('Math1')
    text.should.containEql('Math2')
    text.should.containEql('Literature1')
    text.should.containEql('Literature2')
  })

  it('table vertical', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'table-vertical.docx'))
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

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan')
    text.should.containEql('jan.blaha@foo.com')
    text.should.containEql('Boris')
    text.should.containEql('boris@foo.met')
    text.should.containEql('Pavel')
    text.should.containEql('pavel@foo.met')
  })

  it('table rows, columns', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'table-rows-columns.docx'))
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

    fs.writeFileSync('out.docx', result.content)
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
            content: fs.readFileSync(path.join(__dirname, 'table-rows-columns-block.docx'))
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

    fs.writeFileSync('out.docx', result.content)
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
            content: fs.readFileSync(path.join(__dirname, 'table-rows-columns-block-index.docx'))
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

    fs.writeFileSync('out.docx', result.content)
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
            content: fs.readFileSync(path.join(__dirname, 'table-rows-columns-block-parent.docx'))
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

    fs.writeFileSync('out.docx', result.content)
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
            content: fs.readFileSync(path.join(__dirname, 'table-rows-columns.docx'))
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

    fs.writeFileSync('out.docx', result.content)
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
            content: fs.readFileSync(path.join(__dirname, 'table-rows-columns.docx'))
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

    fs.writeFileSync('out.docx', result.content)
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
            content: fs.readFileSync(path.join(__dirname, 'table-rows-columns.docx'))
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

    fs.writeFileSync('out.docx', result.content)
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
            content: fs.readFileSync(path.join(__dirname, 'table-rows-columns.docx'))
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

    fs.writeFileSync('out.docx', result.content)
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
            content: fs.readFileSync(path.join(__dirname, 'table-rows-columns.docx'))
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

    fs.writeFileSync('out.docx', result.content)
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
            content: fs.readFileSync(path.join(__dirname, 'table-rows-columns.docx'))
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

    fs.writeFileSync('out.docx', result.content)
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
            content: fs.readFileSync(path.join(__dirname, 'table-rows-columns-block-index.docx'))
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

    fs.writeFileSync('out.docx', result.content)
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

  it('style - textColor', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000',
      three: 'AA5500',
      four: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'style-textcolor.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    wREls.should.matchEach((wREl) => {
      const wRPrEl = wREl.getElementsByTagName('w:rPr')[0]
      const wColorEl = wRPrEl != null ? wRPrEl.getElementsByTagName('w:color')[0] : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (wTEl == null || wColorEl == null) {
        return
      }

      if (wTEl.textContent.includes('blue')) {
        wColorEl.getAttribute('w:val').should.be.eql(targetColors.one)
      } else if (wTEl.textContent.includes('red')) {
        wColorEl.getAttribute('w:val').should.be.eql(targetColors.two)
      } else if (
        wTEl.textContent.includes('This is heading') ||
        wTEl.textContent.includes('And this is some kind') ||
        wTEl.textContent.includes('Even with a list')
      ) {
        wColorEl.getAttribute('w:val').should.be.eql(targetColors.three)
      } else if (wTEl.textContent.includes('Greeen')) {
        wColorEl.getAttribute('w:val').should.be.eql('92D050')
      } else if (wTEl.textContent.includes('asd')) {
        wColorEl.getAttribute('w:val').should.be.eql(targetColors.four)
      }
    })
  })

  it('style - backgroundColor', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000',
      three: 'AA5500',
      four: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'style-backgroundcolor.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    const wpEls = nodeListToArray(doc.getElementsByTagName('w:p'))

    wpEls.should.matchEach((wpEl) => {
      const wpPrEl = wpEl.getElementsByTagName('w:pPr')[0]
      const wshdEl = wpPrEl != null ? wpPrEl.getElementsByTagName('w:shd')[0] : undefined
      const text = nodeListToArray(wpEl.getElementsByTagName('w:t')).map((tEl) => tEl.textContent).join(' ')

      if (text == null || wshdEl == null) {
        return
      }

      if (text.includes('blue') || text.includes('red')) {
        wshdEl.getAttribute('w:fill').should.be.eql(targetColors.two)
      } else if (
        text.includes('This is heading') ||
        text.includes('And this is some kind') ||
        text.includes('Even with a list')
      ) {
        wshdEl.getAttribute('w:fill').should.be.eql(targetColors.three)
      } else if (text.includes('asd')) {
        wshdEl.getAttribute('w:fill').should.be.eql(targetColors.four)
      }
    })
  })

  it('image', async () => {
    const imageBuf = fs.readFileSync(path.join(__dirname, 'image.png'))
    const imageDimensions = sizeOf(imageBuf)

    const targetImageSize = {
      width: pxToEMU(imageDimensions.width),
      height: pxToEMU(imageDimensions.height)
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image.docx'))
          }
        }
      },
      data: {
        src: 'data:image/png;base64,' + imageBuf.toString('base64')
      }
    })

    const ouputImageSize = await getImageSize(result.content)

    // should preserve original image size by default
    ouputImageSize.width.should.be.eql(targetImageSize.width)
    ouputImageSize.height.should.be.eql(targetImageSize.height)

    fs.writeFileSync('out.docx', result.content)
  })

  it('image with placeholder size (usePlaceholderSize)', async () => {
    const docxBuf = fs.readFileSync(
      path.join(__dirname, 'image-use-placeholder-size.docx')
    )

    const placeholderImageSize = await getImageSize(docxBuf)

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxBuf
          }
        }
      },
      data: {
        src:
          'data:image/png;base64,' +
          fs.readFileSync(path.join(__dirname, 'image.png')).toString('base64')
      }
    })

    const ouputImageSize = await getImageSize(result.content)

    ouputImageSize.width.should.be.eql(placeholderImageSize.width)
    ouputImageSize.height.should.be.eql(placeholderImageSize.height)

    fs.writeFileSync('out.docx', result.content)
  })

  const units = ['cm', 'px']

  units.forEach(unit => {
    describe(`image size in ${unit}`, () => {
      it('image with custom size (width, height)', async () => {
        const docxBuf = fs.readFileSync(
          path.join(
            __dirname,
            unit === 'cm'
              ? 'image-custom-size.docx'
              : 'image-custom-size-px.docx'
          )
        )

        // 3cm defined in the docx
        const targetImageSize = {
          width: unit === 'cm' ? cmToEMU(3) : pxToEMU(100),
          height: unit === 'cm' ? cmToEMU(3) : pxToEMU(100)
        }

        const result = await reporter.render({
          template: {
            engine: 'handlebars',
            recipe: 'docx',
            docx: {
              templateAsset: {
                content: docxBuf
              }
            }
          },
          data: {
            src:
              'data:image/png;base64,' +
              fs
                .readFileSync(path.join(__dirname, 'image.png'))
                .toString('base64')
          }
        })

        const ouputImageSize = await getImageSize(result.content)

        ouputImageSize.width.should.be.eql(targetImageSize.width)
        ouputImageSize.height.should.be.eql(targetImageSize.height)

        fs.writeFileSync('out.docx', result.content)
      })

      it('image with custom size (width set and height automatic - keep aspect ratio)', async () => {
        const docxBuf = fs.readFileSync(
          path.join(
            __dirname,
            unit === 'cm'
              ? 'image-custom-size-width.docx'
              : 'image-custom-size-width-px.docx'
          )
        )

        const targetImageSize = {
          // 2cm defined in the docx
          width: unit === 'cm' ? cmToEMU(2) : pxToEMU(100),
          // height is calculated automatically based on aspect ratio of image
          height:
            unit === 'cm'
              ? cmToEMU(0.5142851308524194)
              : pxToEMU(25.714330708661418)
        }

        const result = await reporter.render({
          template: {
            engine: 'handlebars',
            recipe: 'docx',
            docx: {
              templateAsset: {
                content: docxBuf
              }
            }
          },
          data: {
            src:
              'data:image/png;base64,' +
              fs
                .readFileSync(path.join(__dirname, 'image.png'))
                .toString('base64')
          }
        })

        const ouputImageSize = await getImageSize(result.content)

        ouputImageSize.width.should.be.eql(targetImageSize.width)
        ouputImageSize.height.should.be.eql(targetImageSize.height)

        fs.writeFileSync('out.docx', result.content)
      })

      it('image with custom size (height set and width automatic - keep aspect ratio)', async () => {
        const docxBuf = fs.readFileSync(
          path.join(
            __dirname,
            unit === 'cm'
              ? 'image-custom-size-height.docx'
              : 'image-custom-size-height-px.docx'
          )
        )

        const targetImageSize = {
          // width is calculated automatically based on aspect ratio of image
          width:
            unit === 'cm'
              ? cmToEMU(7.777781879962101)
              : pxToEMU(194.4444094488189),
          // 2cm defined in the docx
          height: unit === 'cm' ? cmToEMU(2) : pxToEMU(50)
        }

        const result = await reporter.render({
          template: {
            engine: 'handlebars',
            recipe: 'docx',
            docx: {
              templateAsset: {
                content: docxBuf
              }
            }
          },
          data: {
            src:
              'data:image/png;base64,' +
              fs
                .readFileSync(path.join(__dirname, 'image.png'))
                .toString('base64')
          }
        })

        const ouputImageSize = await getImageSize(result.content)

        ouputImageSize.width.should.be.eql(targetImageSize.width)
        ouputImageSize.height.should.be.eql(targetImageSize.height)

        fs.writeFileSync('out.docx', result.content)
      })
    })
  })

  it('image with hyperlink inside', async () => {
    const imageBuf = fs.readFileSync(path.join(__dirname, 'image.png'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image-with-hyperlink.docx'))
          }
        }
      },
      data: {
        src: 'data:image/png;base64,' + imageBuf.toString('base64'),
        url: 'https://jsreport.net'
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    const drawningEls = doc.getElementsByTagName('w:drawing')

    drawningEls.length.should.be.eql(1)

    const drawningEl = drawningEls[0]

    const isImg = drawningEl.getElementsByTagName('pic:pic').length > 0

    isImg.should.be.True()

    const elLinkClick = drawningEl.getElementsByTagName('a:hlinkClick')[0]
    const hyperlinkRelId = elLinkClick.getAttribute('r:id')

    const docRels = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/_rels/document.xml.rels').data.toString()
    )

    const hyperlinkRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
      return el.getAttribute('Id') === hyperlinkRelId
    })

    const target = decodeURIComponent(hyperlinkRelEl.getAttribute('Target'))

    target.should.be.eql('https://jsreport.net')
  })

  it('image error message when no src provided', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'image.docx'))
            }
          }
        },
        data: {
          src: null
        }
      })
      .should.be.rejectedWith(/src parameter to be set/)
  })

  it('image can render from url', async () => {
    const url = 'https://some-server.com/some-image.png'

    reporter.tests.beforeRenderEval((req, res, { require }) => {
      require('nock')('https://some-server.com')
        .get('/some-image.png')
        .replyWithFile(200, req.data.imagePath, {
          'content-type': 'image/png'
        })
    })

    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'image.docx'))
            }
          }
        },
        data: {
          src: url,
          imagePath: path.join(__dirname, 'image.png')
        }
      }).should.not.be.rejectedWith(/src parameter to be set/)
  })

  it('image can render from url with returning parametrized content type', async () => {
    const url = 'https://some-server.com/some-image.png'

    reporter.tests.beforeRenderEval((req, res, { require }) => {
      require('nock')('https://some-server.com')
        .get('/some-image.png')
        .replyWithFile(200, req.data.imagePath, {
          'content-type': 'image/png; qs=0.7'
        })
    })

    const result = await reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'image.docx'))
            }
          }
        },
        data: {
          src: url,
          imagePath: path.join(__dirname, 'image.png')
        }
      })

    const files = await decompress()(result.content)
    const contentTypes = files.find(f => f.path === '[Content_Types].xml').data.toString()
    contentTypes.should.not.containEql('image/png; qs=0.7')
  })

  it('image error message when src not valid param', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'image.docx'))
            }
          }
        },
        data: {
          src: 'data:image/gif;base64,R0lG'
        }
      })
      .should.be.rejectedWith(
        /docxImage helper requires src parameter to be valid data uri/
      )
  })

  it('image error message when width not valid param', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(__dirname, 'image-with-wrong-width.docx')
              )
            }
          }
        },
        data: {
          src:
            'data:image/png;base64,' +
            fs
              .readFileSync(path.join(__dirname, 'image.png'))
              .toString('base64')
        }
      })
      .should.be.rejectedWith(
        /docxImage helper requires width parameter to be valid number with unit/
      )
  })

  it('image error message when height not valid param', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(__dirname, 'image-with-wrong-height.docx')
              )
            }
          }
        },
        data: {
          src:
            'data:image/png;base64,' +
            fs
              .readFileSync(path.join(__dirname, 'image.png'))
              .toString('base64')
        }
      })
      .should.be.rejectedWith(
        /docxImage helper requires height parameter to be valid number with unit/
      )
  })

  it('image loop', async () => {
    const images = [
      fs.readFileSync(path.join(__dirname, 'image.png')),
      fs.readFileSync(path.join(__dirname, 'image2.png'))
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image-loop.docx'))
          }
        }
      },
      data: {
        photos: images.map((imageBuf) => {
          return {
            src: 'data:image/png;base64,' + imageBuf.toString('base64')
          }
        })
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    const docRels = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/_rels/document.xml.rels').data.toString()
    )

    const drawningEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    drawningEls.length.should.be.eql(2)

    drawningEls.forEach((drawningEl, idx) => {
      const isImg = drawningEl.getElementsByTagName('pic:pic').length > 0

      isImg.should.be.True()

      const imageRelId = drawningEl.getElementsByTagName('a:blip')[0].getAttribute('r:embed')

      const imageRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === imageRelId
      })

      imageRelEl.getAttribute('Type').should.be.eql('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')

      const imageFile = files.find(f => f.path === `word/${imageRelEl.getAttribute('Target')}`)

      // compare returns 0 when buffers are equal
      Buffer.compare(imageFile.data, images[idx]).should.be.eql(0)
    })
  })

  it('image loop and hyperlink inside', async () => {
    const images = [
      {
        url: 'https://jsreport.net',
        buf: fs.readFileSync(path.join(__dirname, 'image.png'))
      },
      {
        url: 'https://www.google.com/intl/es-419/chrome/',
        buf: fs.readFileSync(path.join(__dirname, 'image2.png'))
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image-loop-url.docx'))
          }
        }
      },
      data: {
        photos: images.map((image) => {
          return {
            src: 'data:image/png;base64,' + image.buf.toString('base64'),
            url: image.url
          }
        })
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    const docRels = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/_rels/document.xml.rels').data.toString()
    )

    const drawningEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    drawningEls.length.should.be.eql(2)

    drawningEls.forEach((drawningEl, idx) => {
      const isImg = drawningEl.getElementsByTagName('pic:pic').length > 0

      isImg.should.be.True()

      const imageRelId = drawningEl.getElementsByTagName('a:blip')[0].getAttribute('r:embed')

      const imageRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === imageRelId
      })

      imageRelEl.getAttribute('Type').should.be.eql('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')

      const imageFile = files.find(f => f.path === `word/${imageRelEl.getAttribute('Target')}`)

      // compare returns 0 when buffers are equal
      Buffer.compare(imageFile.data, images[idx].buf).should.be.eql(0)

      const elLinkClick = drawningEl.getElementsByTagName('a:hlinkClick')[0]
      const hyperlinkRelId = elLinkClick.getAttribute('r:id')

      const hyperlinkRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === hyperlinkRelId
      })

      const target = decodeURIComponent(hyperlinkRelEl.getAttribute('Target'))

      target.should.be.eql(images[idx].url)
    })
  })

  it('image loop with bookmarks', async () => {
    const imageBuf = fs.readFileSync(path.join(__dirname, 'cuzco1.jpg'))
    const image2Buf = fs.readFileSync(path.join(__dirname, 'cuzco2.jpg'))

    const data = {
      rows: [{
        title: 'one',
        uri1: `data:image/png;base64,${imageBuf.toString('base64')}`,
        uri2: `data:image/png;base64,${image2Buf.toString('base64')}`
      }, {
        title: 'two',
        uri1: `data:image/png;base64,${imageBuf.toString('base64')}`,
        uri2: `data:image/png;base64,${image2Buf.toString('base64')}`
      }]
    }

    const images = [imageBuf, image2Buf, imageBuf, image2Buf]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image-bookmark-loop.docx'))
          }
        }
      },
      data
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    const docRels = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/_rels/document.xml.rels').data.toString()
    )

    const drawningEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const bookmarkEls = nodeListToArray(doc.getElementsByTagName('w:bookmarkStart')).filter((el) => {
      return el.getAttribute('w:name').startsWith('image')
    })

    should(drawningEls.length).be.eql(4)
    should(bookmarkEls.length).be.eql(4)

    drawningEls.forEach((drawningEl, idx) => {
      const isImg = drawningEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const hyperlinkRelId = drawningEl.getElementsByTagName('wp:docPr')[0].getElementsByTagName('a:hlinkClick')[0].getAttribute('r:id')
      const imageRelId = drawningEl.getElementsByTagName('a:blip')[0].getAttribute('r:embed')

      const hyperlinkRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === hyperlinkRelId
      })

      const imageRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === imageRelId
      })

      should(hyperlinkRelEl.getAttribute('Type')).be.eql('http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink')
      should(imageRelEl.getAttribute('Type')).be.eql('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')

      const imageFile = files.find(f => f.path === `word/${imageRelEl.getAttribute('Target')}`)

      // compare returns 0 when buffers are equal
      Buffer.compare(imageFile.data, images[idx]).should.be.eql(0)

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${bookmarkEls[idx].getAttribute('w:name')}`)
    })
  })

  it('loop', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'loop.docx'))
          }
        }
      },
      data: {
        chapters: [
          {
            title: 'Chapter 1',
            text: 'This is the first chapter'
          },
          {
            title: 'Chapter 2',
            text: 'This is the second chapter'
          }
        ]
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Chapter 1')
    text.should.containEql('This is the first chapter')
    text.should.containEql('Chapter 2')
    text.should.containEql('This is the second chapter')
  })

  it('complex', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'complex.docx'))
          }
        },
        helpers: `
          function customHelper(options) {
            return options.fn(this)
          }
        `
      },
      data: {
        name: 'Jan Blaha',
        email: 'jan.blaha@jsreport.net',
        phone: '+420777271254',
        description: `I am software developer, software architect and consultant with over 8 years of professional
        experience working on projects for cross domain market leaders. My experience covers custom
        projects for big costumers in the banking or electricity domain as well as cloud based SaaS startups.`,
        experiences: [
          {
            title: '.NET Developer',
            company: 'Unicorn',
            from: '1.1.2010',
            to: '15.5.2012'
          },
          {
            title: 'Solution Architect',
            company: 'Simplias',
            from: '15.5.2012',
            to: 'now'
          }
        ],
        skills: [
          {
            title: 'The worst developer ever'
          },
          {
            title: 'Don\'t need to write semicolons'
          }
        ],
        printFooter: true
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Jan Blaha')
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

    const files = await decompress()(result.content)
    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

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

    const files = await decompress()(result.content)
    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

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

    const files = await decompress()(result.content)
    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

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

    const files = await decompress()(result.content)
    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

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

    const files = await decompress()(result.content)
    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

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

    const files = await decompress()(result.content)
    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

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

    const files = await decompress()(result.content)
    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    doc.getElementsByTagName('w:sdtContent')[0]
      .getElementsByTagName('w:t')[0]
      .textContent.should.be.eql('Boris$')
  })

  it('should update TOC', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'toc.docx'))
          }
        }
      },
      data: {
        chapters: [{
          chapter: 'chapter1'
        }, {
          chapter: 'chapter2'
        }, {
          chapter: 'chapter3'
        }]
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    parts[1].should.be.eql('chapter1\t1')
    parts[2].should.be.eql('chapter2\t1')
    parts[3].should.be.eql('chapter3\t1')
    parts[4].should.be.eql('chapter1')
    parts[6].should.be.eql('chapter2')
    parts[8].should.be.eql('chapter3')
  })

  it('should update TOC (english)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'toc-english.docx'))
          }
        }
      },
      data: {
        chapters: [{
          chapter: 'chapter1'
        }, {
          chapter: 'chapter2'
        }, {
          chapter: 'chapter3'
        }]
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    parts[1].should.be.eql('chapter1\t1')
    parts[2].should.be.eql('chapter2\t1')
    parts[3].should.be.eql('chapter3\t1')
    parts[4].should.be.eql('chapter1')
    parts[6].should.be.eql('chapter2')
    parts[8].should.be.eql('chapter3')
  })

  it('should update TOC - with list items', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'toc-with-list.docx'))
          }
        }
      },
      data: {
        chapters: [{
          chapter: 'chapter1'
        }, {
          chapter: 'chapter2'
        }, {
          chapter: 'chapter3'
        }]
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    parts[1].should.be.eql('1.\tchapter1\t1')
    parts[2].should.be.eql('2.\tchapter2\t1')
    parts[3].should.be.eql('3.\tchapter3\t1')
    parts[4].should.be.eql('chapter1')
    parts[6].should.be.eql('chapter2')
    parts[8].should.be.eql('chapter3')
  })

  it('should update TOC - nested', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'toc-nested.docx'))
          }
        }
      },
      data: {
        chapters: [{
          title: 'chapter 1',
          title2: 'chapter 1.1',
          title3: 'chapter 1.1.1'
        }, {
          title: 'chapter 2',
          title2: 'chapter 2.1',
          title3: 'chapter 2.1.1'
        }, {
          title: 'chapter 3',
          title2: 'chapter 3.1',
          title3: 'chapter 3.1.1'
        }]
      }
    })

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    parts[1].should.be.eql('chapter 1\t1')
    parts[2].should.be.eql('chapter 1.1\t1')
    parts[3].should.be.eql('chapter 1.1.1\t1')
    parts[4].should.be.eql('chapter 2\t1')
    parts[5].should.be.eql('chapter 2.1\t1')
    parts[6].should.be.eql('chapter 2.1.1\t1')
    parts[7].should.be.eql('chapter 3\t1')
    parts[8].should.be.eql('chapter 3.1\t1')
    parts[9].should.be.eql('chapter 3.1.1\t1')
    parts[10].should.be.eql('chapter 1')
    parts[12].should.be.eql('chapter 1.1')
    parts[14].should.be.eql('chapter 1.1.1')
    parts[16].should.be.eql('chapter 2')
    parts[18].should.be.eql('chapter 2.1')
    parts[20].should.be.eql('chapter 2.1.1')
    parts[22].should.be.eql('chapter 3')
    parts[24].should.be.eql('chapter 3.1')
    parts[26].should.be.eql('chapter 3.1.1')
  })

  it('should be able to remove TOC Title without producing corrupted document if title is wrapped in condition with closing if on next paragraph', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'toc-title-if-remove.docx'))
          }
        }
      },
      data: {}
    })

    const files = await decompress()(result.content)
    const documentXML = files.find(f => f.path === 'word/document.xml').data.toString()

    should(documentXML.includes('<TOCTitle>')).be.false()

    fs.writeFileSync('out.docx', result.content)
  })

  it('should be able to remove TOC Title without producing corrupted document if title is wrapped in condition with closing if on next paragraph (with other condition inside title)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'toc-title-if-remove2.docx'))
          }
        }
      },
      data: {}
    })

    const files = await decompress()(result.content)

    const documentXML = files.find(f => f.path === 'word/document.xml').data.toString()

    should(documentXML.includes('<TOCTitle>')).be.false()

    fs.writeFileSync('out.docx', result.content)
  })

  it('chart', async () => {
    const labels = ['Jan', 'Feb', 'March']
    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(datasets[idx].data)
    })
  })

  it('chart should allow adding more data series than the ones defined in template', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 2, 4]
    }, {
      label: 'Ser4',
      data: [7, 5, 2]
    }, {
      label: 'Ser5',
      data: [6, 5, 4]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-data-series.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.should.have.length(5)

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(datasets[idx].data)
    })
  })

  it('chart should allow adding less data series than the ones defined in template', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-data-series.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.should.have.length(2)

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(datasets[idx].data)
    })
  })

  it('chart should allow producing chart with serie with empty values', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: []
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-data-series.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.should.have.length(1)

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      parseInt(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:ptCount')[0].getAttribute('val'), 10).should.be.eql(labels.length)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).should.have.length(0)
    })
  })

  it('chart should allow axis configuration for display', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 2, 4]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-options-axis.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        },
        chartOptions: {
          scales: {
            xAxes: [{
              display: false
            }]
          }
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const chartPlotAreaEl = doc.getElementsByTagName('c:plotArea')[0]

    const existingAxesNodes = []

    for (let i = 0; i < chartPlotAreaEl.childNodes.length; i++) {
      const currentNode = chartPlotAreaEl.childNodes[i]

      if (currentNode.nodeName === 'c:catAx' || currentNode.nodeName === 'c:valAx') {
        existingAxesNodes.push(currentNode)
      }
    }

    const mainXAxisEl = existingAxesNodes[0]
    const deleteEl = findChildNode('c:delete', mainXAxisEl)

    deleteEl.getAttribute('val').should.be.eql('1')
  })

  it('chart should allow axis configuration for min value', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 7]
    }, {
      label: 'Ser2',
      data: [4, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 6, 9]
    }]

    const minConfig = 2

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-options-axis.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        },
        chartOptions: {
          scales: {
            yAxes: [{
              ticks: {
                min: minConfig
              }
            }]
          }
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const chartPlotAreaEl = doc.getElementsByTagName('c:plotArea')[0]

    const existingAxesNodes = []

    for (let i = 0; i < chartPlotAreaEl.childNodes.length; i++) {
      const currentNode = chartPlotAreaEl.childNodes[i]

      if (currentNode.nodeName === 'c:catAx' || currentNode.nodeName === 'c:valAx') {
        existingAxesNodes.push(currentNode)
      }
    }

    const mainYAxisEl = existingAxesNodes[1]
    const scalingEl = findChildNode('c:scaling', mainYAxisEl)
    const minEl = findChildNode('c:min', scalingEl)

    parseInt(minEl.getAttribute('val'), 10).should.be.eql(minConfig)
  })

  it('chart should allow axis configuration for max value', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 7]
    }, {
      label: 'Ser2',
      data: [4, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 6, 9]
    }]

    const maxConfig = 12

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-options-axis.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        },
        chartOptions: {
          scales: {
            yAxes: [{
              ticks: {
                max: maxConfig
              }
            }]
          }
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const chartPlotAreaEl = doc.getElementsByTagName('c:plotArea')[0]

    const existingAxesNodes = []

    for (let i = 0; i < chartPlotAreaEl.childNodes.length; i++) {
      const currentNode = chartPlotAreaEl.childNodes[i]

      if (currentNode.nodeName === 'c:catAx' || currentNode.nodeName === 'c:valAx') {
        existingAxesNodes.push(currentNode)
      }
    }

    const mainYAxisEl = existingAxesNodes[1]
    const scalingEl = findChildNode('c:scaling', mainYAxisEl)
    const maxEl = findChildNode('c:max', scalingEl)

    parseInt(maxEl.getAttribute('val'), 10).should.be.eql(maxConfig)
  })

  it('chart should allow axis configuration for min, max values', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 7]
    }, {
      label: 'Ser2',
      data: [4, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 6, 9]
    }]

    const minConfig = 2
    const maxConfig = 12

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-options-axis.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        },
        chartOptions: {
          scales: {
            yAxes: [{
              ticks: {
                min: minConfig,
                max: maxConfig
              }
            }]
          }
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const chartPlotAreaEl = doc.getElementsByTagName('c:plotArea')[0]

    const existingAxesNodes = []

    for (let i = 0; i < chartPlotAreaEl.childNodes.length; i++) {
      const currentNode = chartPlotAreaEl.childNodes[i]

      if (currentNode.nodeName === 'c:catAx' || currentNode.nodeName === 'c:valAx') {
        existingAxesNodes.push(currentNode)
      }
    }

    const mainYAxisEl = existingAxesNodes[1]
    const scalingEl = findChildNode('c:scaling', mainYAxisEl)
    const minEl = findChildNode('c:min', scalingEl)
    const maxEl = findChildNode('c:max', scalingEl)

    parseInt(minEl.getAttribute('val'), 10).should.be.eql(minConfig)
    parseInt(maxEl.getAttribute('val'), 10).should.be.eql(maxConfig)
  })

  it('chart should allow axis configuration for stepSize value', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 7]
    }, {
      label: 'Ser2',
      data: [4, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 6, 9]
    }]

    const stepSizeConfig = 3

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-options-axis.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        },
        chartOptions: {
          scales: {
            yAxes: [{
              ticks: {
                stepSize: stepSizeConfig
              }
            }]
          }
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const chartPlotAreaEl = doc.getElementsByTagName('c:plotArea')[0]

    const existingAxesNodes = []

    for (let i = 0; i < chartPlotAreaEl.childNodes.length; i++) {
      const currentNode = chartPlotAreaEl.childNodes[i]

      if (currentNode.nodeName === 'c:catAx' || currentNode.nodeName === 'c:valAx') {
        existingAxesNodes.push(currentNode)
      }
    }

    const mainYAxisEl = existingAxesNodes[1]
    const majorUnitEl = findChildNode('c:majorUnit', mainYAxisEl)

    parseInt(majorUnitEl.getAttribute('val'), 10).should.be.eql(stepSizeConfig)
  })

  it('chart should allow setting datalabels', async () => {
    const labels = [0.7, 1.8, 2.6]

    const datasets = [{
      label: 'Ser1',
      data: [2.7, 3.2, 0.8],
      dataLabels: ['A1', {
        value: 'B1',
        position: 'left'
      }, 'C1']
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'basic-scatter-chart-datalabels.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.should.have.length(1)

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)

      nodeListToArray(dataEl.getElementsByTagName('c:dLbls')[0].getElementsByTagName('dLbl')).should.matchEach((dataLabelEl, dlIdx) => {
        let targetDataLabel = datasets[idx].dataLabels[dlIdx]

        if (typeof targetDataLabel !== 'string') {
          targetDataLabel = targetDataLabel.value
        }

        dataLabelEl.getElementsByTagName('c:tx')[0].getElementsByTagName('a:t')[0].textContent.should.be.eql(targetDataLabel)
      })
    })
  })

  it('chart without style, color xml files', async () => {
    const labels = ['Q1', 'Q2', 'Q3', 'Q4']
    const datasets = [{
      label: 'Apples',
      data: [100, 50, 10, 70]
    }, {
      label: 'Oranges',
      data: [20, 30, 20, 40]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-with-no-style-colors-xml-files.docx'))
          }
        }
      },
      data: {
        fruits: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(datasets[idx].data)
    })
  })

  it('chart with title', async () => {
    const labels = ['Jan', 'Feb', 'March']
    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-with-title.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const chartTitleEl = doc.getElementsByTagName('c:title')[0].getElementsByTagName('a:t')[0]

    chartTitleEl.textContent.should.be.eql('DEMO CHART')
  })

  it('chart with dynamic title', async () => {
    const labels = ['Jan', 'Feb', 'March']
    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }]
    const chartTitle = 'CUSTOM CHART'

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-with-dynamic-title.docx'))
          }
        }
      },
      data: {
        chartTitle,
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const chartTitleEl = doc.getElementsByTagName('c:title')[0].getElementsByTagName('a:t')[0]

    chartTitleEl.textContent.should.be.eql(chartTitle)
  })

  it('scatter chart', async () => {
    const labels = [
      2.3,
      1.4,
      4.2,
      3.1,
      2.5
    ]

    const datasets = [{
      label: 'Y Values',
      data: [
        4.6,
        3.2,
        5.4,
        2.1,
        1.5
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'scatter-chart.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)

      nodeListToArray(dataEl.getElementsByTagName('c:xVal')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels.map((l) => l.toString()))

      nodeListToArray(dataEl.getElementsByTagName('c:yVal')[0].getElementsByTagName('c:v')).map((el) => parseFloat(el.textContent)).should.be.eql(datasets[idx].data)
    })
  })

  it('bubble chart', async () => {
    const labels = [
      2.3,
      1.4,
      4.2,
      3.1,
      2.5
    ]

    const datasets = [{
      label: 'Y Values',
      data: [
        [4.6, 6],
        [3.2, 8],
        [5.4, 3],
        [2.1, 7],
        [1.5, 2]
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'bubble-chart.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)

      nodeListToArray(dataEl.getElementsByTagName('c:xVal')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels.map((l) => l.toString()))

      nodeListToArray(dataEl.getElementsByTagName('c:yVal')[0].getElementsByTagName('c:v')).map((el) => parseFloat(el.textContent)).should.be.eql(datasets[idx].data.map((d) => d[0]))

      nodeListToArray(dataEl.getElementsByTagName('c:bubbleSize')[0].getElementsByTagName('c:v')).map((el) => parseFloat(el.textContent)).should.be.eql(datasets[idx].data.map((d) => d[1]))
    })
  })

  it('stock chart', async () => {
    const labels = [
      '2020-05-10',
      '2020-06-10',
      '2020-07-10',
      '2020-08-10'
    ]

    const datasets = [{
      label: 'High',
      data: [
        43,
        56,
        24,
        36
      ]
    }, {
      label: 'Low',
      data: [
        17,
        25,
        47,
        32
      ]
    }, {
      label: 'Close',
      data: [
        19,
        42,
        29,
        33
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'stock-chart.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(datasets[idx].label)

      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels.map((l) => {
        return toExcelDate(moment(l).toDate()).toString()
      }))

      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(datasets[idx].data)
    })
  })

  it('combo chart (chart that uses a different chart type per data serie)', async () => {
    const labels = ['Jan', 'Feb', 'March']

    const datasets = [{
      label: 'Ser1',
      data: [4, 5, 1]
    }, {
      label: 'Ser2',
      data: [2, 3, 5]
    }, {
      label: 'Ser3',
      data: [8, 2, 4]
    }, {
      label: 'Ser4',
      data: [7, 5, 2]
    }, {
      label: 'Ser5',
      data: [6, 5, 4]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'combo-chart.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const barChart = doc.getElementsByTagName('c:barChart')[0]
    const lineChart = doc.getElementsByTagName('c:lineChart')[0]

    const barChartDataElements = nodeListToArray(barChart.getElementsByTagName('c:ser'))
    const lineChartDataElements = nodeListToArray(lineChart.getElementsByTagName('c:ser'))

    barChartDataElements.should.have.length(2)
    lineChartDataElements.should.have.length(3)

    barChartDataElements.forEach((dataEl, idx) => {
      const currentDatasets = datasets.slice(0, 2)
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(currentDatasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(currentDatasets[idx].data)
    })

    lineChartDataElements.forEach((dataEl, idx) => {
      const currentDatasets = datasets.slice(2)
      dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(currentDatasets[idx].label)
      nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(labels)
      nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(currentDatasets[idx].data)
    })
  })

  it('waterfall chart (chartex)', async () => {
    const labels = [
      'Cat 1',
      'Cat 2',
      'Cat 3',
      'Cat 4',
      'Cat 5',
      'Cat 5',
      'Cat 6',
      'Cat 8',
      'Cat 9'
    ]

    const datasets = [{
      label: 'Water Fall',
      data: [
        9702.0,
        -210.3,
        -24.0,
        -674.0,
        19.4,
        -1406.9,
        352.9,
        2707.5,
        10466.5
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'waterfall-chart.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chartEx1.xml').data.toString()
    )

    const labelElement = (
      doc.getElementsByTagName('cx:series')[0]
        .getElementsByTagName('cx:txData')[0]
        .getElementsByTagName('cx:v')[0]
    )

    const dataElement = doc.getElementsByTagName('cx:data')[0]

    labelElement.textContent.should.be.eql(datasets[0].label)

    const strDimElement = dataElement.getElementsByTagName('cx:strDim')[0]
    const numDimElement = dataElement.getElementsByTagName('cx:numDim')[0]

    strDimElement.getAttribute('type').should.be.eql('cat')
    numDimElement.getAttribute('type').should.be.eql('val')

    nodeListToArray(
      strDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      dataEl.textContent.should.be.eql(labels[idx])
    })

    nodeListToArray(
      numDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      parseFloat(dataEl.textContent).should.be.eql(datasets[0].data[idx])
    })
  })

  it('funnel chart (chartex)', async () => {
    const labels = [
      'Cat 1',
      'Cat 2',
      'Cat 3',
      'Cat 4',
      'Cat 5',
      'Cat 6'
    ]

    const datasets = [{
      label: 'Funnel',
      data: [
        3247,
        5729,
        1395,
        2874,
        6582,
        1765
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'funnel-chart.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chartEx1.xml').data.toString()
    )

    const labelElement = (
      doc.getElementsByTagName('cx:series')[0]
        .getElementsByTagName('cx:txData')[0]
        .getElementsByTagName('cx:v')[0]
    )

    const dataElement = doc.getElementsByTagName('cx:data')[0]

    labelElement.textContent.should.be.eql(datasets[0].label)

    const strDimElement = dataElement.getElementsByTagName('cx:strDim')[0]
    const numDimElement = dataElement.getElementsByTagName('cx:numDim')[0]

    strDimElement.getAttribute('type').should.be.eql('cat')
    numDimElement.getAttribute('type').should.be.eql('val')

    nodeListToArray(
      strDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      dataEl.textContent.should.be.eql(labels[idx])
    })

    nodeListToArray(
      numDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      parseFloat(dataEl.textContent).should.be.eql(datasets[0].data[idx])
    })
  })

  it('treemap chart (chartex)', async () => {
    const labels = [
      [
        'Rama 1',
        'Rama 1',
        'Rama 1',
        'Rama 1',
        'Rama 1',
        'Rama 2',
        'Rama 2',
        'Rama 3'
      ],
      [
        'Tallo 1',
        'Tallo 1',
        'Tallo 1',
        'Tallo 2',
        'Tallo 2',
        'Tallo 2',
        'Tallo 3',
        'Tallo 3'
      ],
      [
        'Hoja 1',
        'Hoja 2',
        'Hoja 3',
        'Hoja 4',
        'Hoja 5',
        'Hoja 6',
        'Hoja 7',
        'Hoja 8'
      ]
    ]

    const datasets = [{
      label: 'Treemap',
      data: [
        52,
        43,
        56,
        76,
        91,
        49,
        31,
        81
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'treemap-chart.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chartEx1.xml').data.toString()
    )

    const labelElement = (
      doc.getElementsByTagName('cx:series')[0]
        .getElementsByTagName('cx:txData')[0]
        .getElementsByTagName('cx:v')[0]
    )

    const dataElement = doc.getElementsByTagName('cx:data')[0]

    labelElement.textContent.should.be.eql(datasets[0].label)

    const strDimElement = dataElement.getElementsByTagName('cx:strDim')[0]
    const numDimElement = dataElement.getElementsByTagName('cx:numDim')[0]

    strDimElement.getAttribute('type').should.be.eql('cat')
    numDimElement.getAttribute('type').should.be.eql('size')

    nodeListToArray(
      strDimElement.getElementsByTagName('cx:lvl')
    ).forEach((lvlEl, idx) => {
      const targetLabels = labels.reverse()[idx]

      nodeListToArray(lvlEl.getElementsByTagName('cx:pt')).forEach((dataEl, ydx) => {
        dataEl.textContent.should.be.eql(targetLabels[ydx])
      })
    })

    nodeListToArray(
      numDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      parseFloat(dataEl.textContent).should.be.eql(datasets[0].data[idx])
    })
  })

  it('sunburst chart (chartex)', async () => {
    const labels = [
      [
        'Rama 1',
        'Rama 1',
        'Rama 1',
        'Rama 2',
        'Rama 2',
        'Rama 2',
        'Rama 2',
        'Rama 3'
      ],
      [
        'Tallo 1',
        'Tallo 1',
        'Tallo 1',
        'Tallo 2',
        'Tallo 2',
        'Tallo 2',
        'Hoja 6',
        'Hoja 7'
      ],
      [
        'Hoja 1',
        'Hoja 2',
        'Hoja 3',
        'Hoja 4',
        'Hoja 5',
        null,
        null,
        'Hoja 8'
      ]
    ]

    const datasets = [{
      label: 'Sunburst',
      data: [
        32,
        68,
        83,
        72,
        75,
        84,
        52,
        34
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'sunburst-chart.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chartEx1.xml').data.toString()
    )

    const labelElement = (
      doc.getElementsByTagName('cx:series')[0]
        .getElementsByTagName('cx:txData')[0]
        .getElementsByTagName('cx:v')[0]
    )

    const dataElement = doc.getElementsByTagName('cx:data')[0]

    labelElement.textContent.should.be.eql(datasets[0].label)

    const strDimElement = dataElement.getElementsByTagName('cx:strDim')[0]
    const numDimElement = dataElement.getElementsByTagName('cx:numDim')[0]

    strDimElement.getAttribute('type').should.be.eql('cat')
    numDimElement.getAttribute('type').should.be.eql('size')

    nodeListToArray(
      strDimElement.getElementsByTagName('cx:lvl')
    ).forEach((lvlEl, idx) => {
      const targetLabels = labels.reverse()[idx]

      nodeListToArray(lvlEl.getElementsByTagName('cx:pt')).forEach((dataEl, ydx) => {
        dataEl.textContent.should.be.eql(targetLabels[ydx] || '')
      })
    })

    nodeListToArray(
      numDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      parseFloat(dataEl.textContent).should.be.eql(datasets[0].data[idx])
    })
  })

  it('clusteredColumn (chartex)', async () => {
    const labels = [null]

    const datasets = [{
      label: 'clusteredColumn',
      data: [
        1,
        3,
        3,
        3,
        7,
        7,
        7,
        7,
        9,
        9,
        9,
        10,
        10,
        13,
        13,
        14,
        15,
        15,
        15,
        18,
        18,
        18,
        19,
        19,
        21,
        21,
        22,
        22,
        24,
        25
      ]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'clusteredColumn-chart.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chartEx1.xml').data.toString()
    )

    const labelElement = (
      doc.getElementsByTagName('cx:series')[0]
        .getElementsByTagName('cx:txData')[0]
        .getElementsByTagName('cx:v')[0]
    )

    const dataElement = doc.getElementsByTagName('cx:data')[0]

    labelElement.textContent.should.be.eql(datasets[0].label)

    const strDimElement = dataElement.getElementsByTagName('cx:strDim')[0]
    const numDimElement = dataElement.getElementsByTagName('cx:numDim')[0]

    should(strDimElement).be.not.ok()
    numDimElement.getAttribute('type').should.be.eql('val')

    nodeListToArray(
      numDimElement
        .getElementsByTagName('cx:lvl')[0]
        .getElementsByTagName('cx:pt')
    ).forEach((dataEl, idx) => {
      parseFloat(dataEl.textContent).should.be.eql(datasets[0].data[idx])
    })
  })

  it('chart error message when no data', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'chart-error-data.docx'))
            }
          }
        },
        data: {
          chartData: null
        }
      })
      .should.be.rejectedWith(/requires data parameter to be set/)
  })

  it('chart error message when no data.labels', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'chart-error-data.docx'))
            }
          }
        },
        data: {
          chartData: {}
        }
      })
      .should.be.rejectedWith(/requires data parameter with labels to be set/)
  })

  it('chart error message when no data.datasets', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'chart-error-data.docx'))
            }
          }
        },
        data: {
          chartData: {
            labels: ['Jan', 'Feb', 'March'],
            datasets: null
          }
        }
      })
      .should.be.rejectedWith(/requires data parameter with datasets to be set/)
  })

  it('chart loop', async () => {
    const charts = [{
      chartData: {
        labels: ['Jan', 'Feb', 'March'],
        datasets: [{
          label: 'Ser1',
          data: [4, 5, 1]
        }, {
          label: 'Ser2',
          data: [2, 3, 5]
        }]
      }
    }, {
      chartData: {
        labels: ['Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Ser3',
          data: [8, 2, 4]
        }, {
          label: 'Ser4',
          data: [2, 5, 3]
        }]
      }
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-loop.docx'))
          }
        }
      },
      data: {
        charts
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    const chartDrawningEls = nodeListToArray(doc.getElementsByTagName('c:chart'))

    chartDrawningEls.length.should.be.eql(charts.length)

    const docRels = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/_rels/document.xml.rels').data.toString()
    )

    chartDrawningEls.forEach((chartDrawningEl, chartIdx) => {
      const chartRelId = chartDrawningEl.getAttribute('r:id')

      const chartRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === chartRelId
      })

      const chartDoc = new DOMParser().parseFromString(
        files.find(f => f.path === `word/${chartRelEl.getAttribute('Target')}`).data.toString()
      )

      const chartRelsDoc = new DOMParser().parseFromString(
        files.find(f => f.path === `word/charts/_rels/${chartRelEl.getAttribute('Target').split('/').slice(-1)[0]}.rels`).data.toString()
      )

      const dataElements = nodeListToArray(chartDoc.getElementsByTagName('c:ser'))

      dataElements.forEach((dataEl, idx) => {
        dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(charts[chartIdx].chartData.datasets[idx].label)
        nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(charts[chartIdx].chartData.labels)
        nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(charts[chartIdx].chartData.datasets[idx].data)
      })

      const chartStyleRelEl = nodeListToArray(chartRelsDoc.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Type') === 'http://schemas.microsoft.com/office/2011/relationships/chartStyle'
      })

      const chartStyleDoc = files.find(f => f.path === `word/charts/${chartStyleRelEl.getAttribute('Target')}`)

      chartStyleDoc.should.be.not.undefined()

      const chartColorStyleRelEl = nodeListToArray(chartRelsDoc.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Type') === 'http://schemas.microsoft.com/office/2011/relationships/chartColorStyle'
      })

      const chartColorStyleDoc = files.find(f => f.path === `word/charts/${chartColorStyleRelEl.getAttribute('Target')}`)

      chartColorStyleDoc.should.be.not.undefined()
    })
  })

  it('chart loop and x, y axis titles', async () => {
    const chartList = [{
      chart_data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Apples',
          data: [100, 50, 10, 70]
        }, {
          label: 'Oranges',
          data: [20, 30, 20, 40]
        }]
      },
      title: 'Fruit Chart 1',
      x_axis: 'X VALUE 1',
      y_axis: 'Y VALUE 1'
    }, {
      chart_data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Apples',
          data: [60, 20, 90, 30]
        }, {
          label: 'Oranges',
          data: [50, 10, 90, 100]
        }]
      },
      title: 'Fruit Chart 2',
      x_axis: 'X VALUE 2',
      y_axis: 'Y VALUE 2'
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-loop-axis-titles.docx'))
          }
        }
      },
      data: {
        chart_list: chartList
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    const chartDrawningEls = nodeListToArray(doc.getElementsByTagName('c:chart'))

    chartDrawningEls.length.should.be.eql(chartList.length)

    const docRels = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/_rels/document.xml.rels').data.toString()
    )

    chartDrawningEls.forEach((chartDrawningEl, chartIdx) => {
      const chartRelId = chartDrawningEl.getAttribute('r:id')

      const chartRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === chartRelId
      })

      const chartDoc = new DOMParser().parseFromString(
        files.find(f => f.path === `word/${chartRelEl.getAttribute('Target')}`).data.toString()
      )

      const chartTitles = nodeListToArray(chartDoc.getElementsByTagName('c:title'))

      const chartMainTitleEl = chartTitles[0]

      chartMainTitleEl.getElementsByTagName('a:t')[0].textContent.should.be.eql(`Fruit Chart ${(chartIdx + 1)}`)

      const chartCatAxTitleEl = chartTitles[1]

      chartCatAxTitleEl.getElementsByTagName('a:t')[0].textContent.should.be.eql(`X VALUE ${(chartIdx + 1)}`)

      const chartValAxTitleEl = chartTitles[2]

      chartValAxTitleEl.getElementsByTagName('a:t')[0].textContent.should.be.eql(`Y VALUE ${(chartIdx + 1)}`)

      const chartRelsDoc = new DOMParser().parseFromString(
        files.find(f => f.path === `word/charts/_rels/${chartRelEl.getAttribute('Target').split('/').slice(-1)[0]}.rels`).data.toString()
      )

      const dataElements = nodeListToArray(chartDoc.getElementsByTagName('c:ser'))

      dataElements.forEach((dataEl, idx) => {
        dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(chartList[chartIdx].chart_data.datasets[idx].label)
        nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(chartList[chartIdx].chart_data.labels)
        nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(chartList[chartIdx].chart_data.datasets[idx].data)
      })

      const chartStyleRelEl = nodeListToArray(chartRelsDoc.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Type') === 'http://schemas.microsoft.com/office/2011/relationships/chartStyle'
      })

      const chartStyleDoc = files.find(f => f.path === `word/charts/${chartStyleRelEl.getAttribute('Target')}`)

      chartStyleDoc.should.be.not.undefined()

      const chartColorStyleRelEl = nodeListToArray(chartRelsDoc.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Type') === 'http://schemas.microsoft.com/office/2011/relationships/chartColorStyle'
      })

      const chartColorStyleDoc = files.find(f => f.path === `word/charts/${chartColorStyleRelEl.getAttribute('Target')}`)

      chartColorStyleDoc.should.be.not.undefined()
    })
  })

  it('chart loop and x, y, secondary axis titles', async () => {
    const chartList = [{
      chart_data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Apples',
          data: [100, 50, 10, 70]
        }, {
          label: 'Oranges',
          data: [20, 30, 20, 40]
        }]
      },
      title: 'Fruit Chart 1',
      x_axis: 'X VALUE 1',
      x2_axis: 'X VALUE 1',
      y_axis: 'Y VALUE 1',
      y2_axis: 'Y VALUE 1'
    }, {
      chart_data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Apples',
          data: [60, 20, 90, 30]
        }, {
          label: 'Oranges',
          data: [50, 10, 90, 100]
        }]
      },
      title: 'Fruit Chart 2',
      x_axis: 'X VALUE 2',
      x2_axis: 'X VALUE 2',
      y_axis: 'Y VALUE 2',
      y2_axis: 'Y VALUE 2'
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-loop-secondary-axis-titles.docx'))
          }
        }
      },
      data: {
        chart_list: chartList
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    const chartDrawningEls = nodeListToArray(doc.getElementsByTagName('c:chart'))

    chartDrawningEls.length.should.be.eql(chartList.length)

    const docRels = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/_rels/document.xml.rels').data.toString()
    )

    chartDrawningEls.forEach((chartDrawningEl, chartIdx) => {
      const chartRelId = chartDrawningEl.getAttribute('r:id')

      const chartRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === chartRelId
      })

      const chartDoc = new DOMParser().parseFromString(
        files.find(f => f.path === `word/${chartRelEl.getAttribute('Target')}`).data.toString()
      )

      const chartTitles = nodeListToArray(chartDoc.getElementsByTagName('c:title'))

      const chartMainTitleEl = chartTitles[0]

      chartMainTitleEl.getElementsByTagName('a:t')[0].textContent.should.be.eql(`Fruit Chart ${(chartIdx + 1)}`)

      const chartAxTitleEl = chartTitles[1]

      chartAxTitleEl.getElementsByTagName('a:t')[0].textContent.should.be.eql(`X VALUE ${(chartIdx + 1)}`)

      const chartAxTitle2El = chartTitles[2]

      chartAxTitle2El.getElementsByTagName('a:t')[0].textContent.should.be.eql(`Y VALUE ${(chartIdx + 1)}`)

      const chartAxTitle3El = chartTitles[3]

      chartAxTitle3El.getElementsByTagName('a:t')[0].textContent.should.be.eql(`Y VALUE ${(chartIdx + 1)}`)

      const chartAxTitle4El = chartTitles[4]

      chartAxTitle4El.getElementsByTagName('a:t')[0].textContent.should.be.eql(`X VALUE ${(chartIdx + 1)}`)

      const chartRelsDoc = new DOMParser().parseFromString(
        files.find(f => f.path === `word/charts/_rels/${chartRelEl.getAttribute('Target').split('/').slice(-1)[0]}.rels`).data.toString()
      )

      const dataElements = nodeListToArray(chartDoc.getElementsByTagName('c:ser'))

      dataElements.forEach((dataEl, idx) => {
        dataEl.getElementsByTagName('c:tx')[0].getElementsByTagName('c:v')[0].textContent.should.be.eql(chartList[chartIdx].chart_data.datasets[idx].label)
        nodeListToArray(dataEl.getElementsByTagName('c:cat')[0].getElementsByTagName('c:v')).map((el) => el.textContent).should.be.eql(chartList[chartIdx].chart_data.labels)
        nodeListToArray(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:v')).map((el) => parseInt(el.textContent, 10)).should.be.eql(chartList[chartIdx].chart_data.datasets[idx].data)
      })

      const chartStyleRelEl = nodeListToArray(chartRelsDoc.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Type') === 'http://schemas.microsoft.com/office/2011/relationships/chartStyle'
      })

      const chartStyleDoc = files.find(f => f.path === `word/charts/${chartStyleRelEl.getAttribute('Target')}`)

      chartStyleDoc.should.be.not.undefined()

      const chartColorStyleRelEl = nodeListToArray(chartRelsDoc.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Type') === 'http://schemas.microsoft.com/office/2011/relationships/chartColorStyle'
      })

      const chartColorStyleDoc = files.find(f => f.path === `word/charts/${chartColorStyleRelEl.getAttribute('Target')}`)

      chartColorStyleDoc.should.be.not.undefined()
    })
  })

  it('chart should keep style defined in serie', async () => {
    const labels = ['Q1', 'Q2', 'Q3', 'Q4']
    const datasets = [{
      label: 'Apples',
      data: [100, 50, 10, 70]
    }, {
      label: 'Oranges',
      data: [20, 30, 20, 40]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-serie-style.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      should(dataEl.getElementsByTagName('c:spPr')[0]).be.not.undefined()
    })
  })

  it('chart should keep number format defined in serie', async () => {
    const labels = ['Q1', 'Q2', 'Q3', 'Q4']
    const datasets = [{
      label: 'Apples',
      data: [10000.0, 50000.45, 10000.45, 70000.546]
    }, {
      label: 'Oranges',
      data: [20000.3, 30000.2, 20000.4, 40000.4]
    }]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'chart-serie-number-format.docx'))
          }
        }
      },
      data: {
        chartData: {
          labels,
          datasets
        }
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/charts/chart1.xml').data.toString()
    )

    const dataElements = nodeListToArray(doc.getElementsByTagName('c:ser'))

    dataElements.forEach((dataEl, idx) => {
      should(dataEl.getElementsByTagName('c:val')[0].getElementsByTagName('c:formatCode')[0].textContent).be.eql('#,##0.0')
    })
  })

  it('should not duplicate drawing object id in loop', async () => {
    // drawing object should not contain duplicated id, otherwhise it produce a warning in ms word
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'dw-object-loop-id.docx'))
          }
        }
      },
      data: {
        items: [1, 2, 3]
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))
    const baseId = 12

    drawingEls.forEach((drawingEl, idx) => {
      const docPrEl = nodeListToArray(drawingEl.firstChild.childNodes).find((el) => el.nodeName === 'wp:docPr')
      parseInt(docPrEl.getAttribute('id'), 10).should.be.eql(baseId + idx)
    })
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

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

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

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

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

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

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

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

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

    const files = await decompress()(result.content)
    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

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

  it('should be able to reference stored asset', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'variable-replace.docx',
      shortid: 'template',
      content: fs.readFileSync(path.join(__dirname, 'variable-replace.docx'))
    })
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAssetShortid: 'template'
        }
      },
      data: {
        name: 'John'
      }
    })

    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('Hello world John')
  })

  it('preview request should return html', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'variable-replace.docx')
            )
          }
        }
      },
      data: {
        name: 'John'
      },
      options: {
        preview: true
      }
    })

    result.content.toString().should.containEql('iframe')
  })

  it('text nodes with xml:space="preserve" should continue to exists when needed', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'preserve-space.docx'))
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

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('My Table - Name')
    text.should.containEql('My Table - Email')
    text.should.containEql('My Table - Jan')
    text.should.containEql('My Table - jan.blaha@foo.com')
    text.should.containEql('My Table - Boris')
    text.should.containEql('My Table - boris@foo.met')
    text.should.containEql('My Table - Pavel')
    text.should.containEql('My Table - pavel@foo.met')

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    const textElements = nodeListToArray(doc.getElementsByTagName('w:t')).filter((node) => {
      return node.textContent === 'My Table - '
    })

    textElements.should.have.length(8)

    textElements.forEach((node) => {
      node.getAttribute('xml:space').should.be.eql('preserve')
    })
  })

  it('remove nodes that were just containing block helper definition calls', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'remove-block.docx'))
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

    fs.writeFileSync('out.docx', result.content)
    const text = (await extractor.extract(result.content)).getBody()
    text.should.containEql('My Table - Name')
    text.should.containEql('My Table - Email')
    text.should.containEql('My Table - Jan')
    text.should.containEql('My Table - jan.blaha@foo.com')
    text.should.containEql('My Table - Boris')
    text.should.containEql('My Table - boris@foo.met')
    text.should.containEql('My Table - Pavel')
    text.should.containEql('My Table - pavel@foo.met')

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

    const textElements = nodeListToArray(doc.getElementsByTagName('w:t')).filter((node) => {
      return node.textContent === 'My Table - '
    })

    textElements.should.have.length(8)

    textElements.should.matchEach((tNode) => {
      const rNode = tNode.parentNode
      const pNode = rNode.parentNode

      let previousNode = rNode.previousSibling
      let previousRNode

      while (previousNode != null) {
        if (previousNode.nodeName === 'w:r') {
          previousRNode = previousNode
          break
        }

        previousNode = previousNode.previousSibling
      }

      if (previousRNode != null) {
        throw new Error('there should be no previous w:r node in the table cell')
      }

      let nextNode = pNode.nextSibling
      let nextPNode

      while (nextNode != null) {
        if (nextNode.nodeName === 'w:p') {
          nextPNode = nextNode
          break
        }

        nextNode = nextNode.nextSibling
      }

      if (nextPNode != null) {
        throw new Error('there should be no next w:p node in the table cell')
      }
    })
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

    const files = await decompress()(result.content)

    const doc = new DOMParser().parseFromString(
      files.find(f => f.path === 'word/document.xml').data.toString()
    )

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

describe('docx with extensions.docx.previewInWordOnline === false', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()
      .use(require('../')({ preview: { enabled: false } }))
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-assets')())
    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('preview request should not return html', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'variable-replace.docx')
            )
          }
        }
      },
      data: {
        name: 'John'
      },
      options: {
        preview: true
      }
    })

    result.content.toString().should.not.containEql('iframe')
  })
})

function findChildNode (nodeName, targetNode, allNodes = false) {
  const result = []

  for (let i = 0; i < targetNode.childNodes.length; i++) {
    let found = false
    const childNode = targetNode.childNodes[i]

    if (childNode.nodeName === nodeName) {
      found = true
      result.push(childNode)
    }

    if (found && !allNodes) {
      break
    }
  }

  return allNodes ? result : result[0]
}
