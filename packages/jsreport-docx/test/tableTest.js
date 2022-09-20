const fs = require('fs')
const path = require('path')
const jsreport = require('@jsreport/jsreport-core')
const WordExtractor = require('word-extractor')
const extractor = new WordExtractor()

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
})
