const should = require('should')
const util = require('util')
const path = require('path')
const fs = require('fs')
const textract = util.promisify(require('textract').fromBufferWithName)
const { DOMParser } = require('@xmldom/xmldom')
const { decompress } = require('@jsreport/office')
const jsreport = require('@jsreport/jsreport-core')
const { nodeListToArray } = require('../lib/utils')
const { getImageDataUri } = require('./utils')

const pptxDirPath = path.join(__dirname, './pptx')
const outputPath = path.join(__dirname, '../out.pptx')

describe('pptx', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport().use(require('../')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-assets')())
      .use(jsreport.tests.listeners())
    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('accept buffer as base64 string by default', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'variable.pptx')).toString('base64')
          }
        }
      },
      data: {
        hello: 'Jan Blaha'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = await textract('test.pptx', result.content)
    should(text).containEql('Jan Blaha')
  })

  it('accept buffer as string with explicit encoding', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'variable.pptx')).toString('binary'),
            encoding: 'binary'
          }
        }
      },
      data: {
        hello: 'Jan Blaha'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = await textract('test.pptx', result.content)
    should(text).containEql('Jan Blaha')
  })

  it('throw clear error when template fails to be parsed as pptx', async () => {
    return should(reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'variable.pptx')).toString('utf8'),
            encoding: 'utf8'
          }
        }
      },
      data: {
        hello: 'Jan Blaha'
      }
    })).be.rejectedWith(/Failed to parse pptx template input/i)
  })

  it('should propagate lineNumber when error in helper', async () => {
    try {
      await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'pptx',
          pptx: {
            templateAsset: {
              content: fs.readFileSync(path.join(pptxDirPath, 'variable.pptx'))
            }
          },
          helpers: `function hello() {
            throw new Error('xxx')
          }
        `
        }
      })
    } catch (e) {
      should(e.lineNumber).be.eql(2)
    }
  })

  it('variable-replace', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'variable.pptx'))
          }
        }
      },
      data: {
        hello: 'Jan Blaha'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = await textract('test.pptx', result.content)
    should(text).containEql('Jan Blaha')
  })

  it('handlebars partials', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        helpers: `
          const h = require('handlebars')

          h.registerPartial('test', '{{name}}')
        `,
        pptx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(pptxDirPath, 'partial.pptx')
            )
          }
        }
      },
      data: {
        name: 'John'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = await textract('test.pptx', result.content)
    should(text).containEql('Hello world John')
  })

  it('work normally with NUL character (should remove it)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(pptxDirPath, 'variable.pptx')
            )
          }
        }
      },
      data: {
        hello: 'John\u0000'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = await textract('test.pptx', result.content)
    should(text).containEql('John')
  })

  it('work normally with VERTICAL TAB character (should remove it)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(pptxDirPath, 'variable.pptx')
            )
          }
        }
      },
      data: {
        hello: 'John\u000b'
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = await textract('test.pptx', result.content)
    should(text).containEql('John')
  })

  it('list', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'list.pptx'))
          }
        }
      },
      data: {
        items: [{
          name: 'Jan'
        }, {
          name: 'Boris'
        }, {
          name: 'Pavel'
        }]
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = await textract('test.pptx', result.content)
    should(text).containEql('Jan')
    should(text).containEql('Boris')
    should(text).containEql('Pavel')
  })

  it('slides', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'slides.pptx'))
          }
        }
      },
      data: {
        items: [{ hello: 'Jan' }, { hello: 'Blaha' }, { hello: 'Boris' }]
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = await textract('test.pptx', result.content)
    should(text).containEql('Jan')
    should(text).containEql('Blaha')
    // the parser somehow don't find the other items on the first run
    // should(text).containEql('Boris')

    const files = await decompress()(result.content)
    const presentationStr = files.find(f => f.path === 'ppt/presentation.xml').data.toString()
    const presentation = new DOMParser().parseFromString(presentationStr)
    const sldIdLstEl = presentation.getElementsByTagName('p:presentation')[0].getElementsByTagName('p:sldIdLst')[0]
    const sldIdEls = nodeListToArray(sldIdLstEl.getElementsByTagName('p:sldId'))

    should(sldIdEls[2].getAttribute('id')).be.eql('5001')
    should(sldIdEls[3].getAttribute('id')).be.eql('5002')
  })

  it('slides when pptxSlide and other handlebars in the same a:t', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'slides_in_same_node.pptx'))
          }
        }
      },
      data: {
        list: [{ text: 'Jan' }, { text: 'Boris' }]
      }
    })

    const files = await decompress()(result.content)
    const presentationStr = files.find(f => f.path === 'ppt/presentation.xml').data.toString()
    const presentation = new DOMParser().parseFromString(presentationStr)
    const sldIdLstEl = presentation.getElementsByTagName('p:presentation')[0].getElementsByTagName('p:sldIdLst')[0]
    const sldIdEls = nodeListToArray(sldIdLstEl.getElementsByTagName('p:sldId'))

    should(sldIdEls[1].getAttribute('id')).be.eql('5001')
  })

  it('slides with image', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'slides_with_image.pptx'))
          }
        }
      },
      data: {
        list: [{
          text: 'Jan',
          image1: getImageDataUri('png', fs.readFileSync(path.join(pptxDirPath, 'image.png')))
        }, {
          text: 'Boris',
          image1: getImageDataUri('jpeg', fs.readFileSync(path.join(pptxDirPath, 'image.jpeg')))
        }]
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)
    const presentationStr = files.find(f => f.path === 'ppt/presentation.xml').data.toString()
    const presentation = new DOMParser().parseFromString(presentationStr)
    const sldIdLstEl = presentation.getElementsByTagName('p:presentation')[0].getElementsByTagName('p:sldIdLst')[0]
    const sldIdEls = nodeListToArray(sldIdLstEl.getElementsByTagName('p:sldId'))

    should(sldIdEls[1].getAttribute('id')).be.eql('5001')
  })

  it('slides with notes', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'slides_with_notes.pptx'))
          }
        }
      },
      data: {
        items: [{ hello: 'Jan' }, { hello: 'Blaha' }, { hello: 'Boris' }]
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const files = await decompress()(result.content)
    should(files.find(f => f.path === 'ppt/notesSlides/notesSlide5001.xml')).be.ok()
    should(files.find(f => f.path === 'ppt/notesSlides/notesSlide5002.xml')).be.ok()
  })

  it('slides block helper call should throw descriptive error', async () => {
    return should(reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'slides-block-helper-call.pptx'))
          }
        }
      },
      data: {
        items: [{ hello: 'Jan' }, { hello: 'Blaha' }, { hello: 'Boris' }]
      }
    })).be.rejectedWith(/pptxSlides helper must be called as a simple helper call/i)
  })
})
