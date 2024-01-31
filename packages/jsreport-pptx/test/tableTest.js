const should = require('should')
const path = require('path')
const fs = require('fs')
const jsreport = require('@jsreport/jsreport-core')
const { extractTextResponse } = require('./utils')

const pptxDirPath = path.join(__dirname, './pptx')
const outputPath = path.join(__dirname, '../out.pptx')

describe('pptx table', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport().use(require('../')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-assets')())
      .use(jsreport.tests.listeners())
    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('table', async () => {
    const data = [
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

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table.pptx'))
          }
        }
      },
      data: {
        people: data
      }
    })

    await result.output.toFile(outputPath)

    const text = await extractTextResponse(result)

    for (const item of data) {
      should(text).containEql(item.name)
      should(text).containEql(item.email)
    }
  })

  it('table vertical', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'table-vertical.pptx'))
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

    await result.output.toFile(outputPath)

    const text = await extractTextResponse(result)

    should(text).containEql('Jan')
    should(text).containEql('jan.blaha@foo.com')
    should(text).containEql('Boris')
    should(text).containEql('boris@foo.met')
    should(text).containEql('Pavel')
    should(text).containEql('pavel@foo.met')
  })
})
