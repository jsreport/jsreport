const should = require('should')
const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const { DOMParser } = require('@xmldom/xmldom')
const { decompress } = require('@jsreport/office')
const { nodeListToArray } = require('../lib/utils')
const WordExtractor = require('word-extractor')
const extractor = new WordExtractor()

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
