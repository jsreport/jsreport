require('should')
const jsreport = require('@jsreport/jsreport-core')

describe('html to text recipe', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport().use(require('../')())
    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('should work', async () => {
    const res = await reporter.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'html-to-text'
      }
    })
    res.content.toString().should.containEql('Hello')
  })

  it('should be able to select table', async () => {
    const res = await reporter.render({
      template: {
        content: '<table id="x"><thead><tr><th>Header</th></tr><tbody><tr><td>Hello</td></tr></tbody></table>',
        engine: 'none',
        recipe: 'html-to-text',
        htmlToText: {
          tables: '#x'
        }
      }
    })
    res.content.toString().should.containEql('HEADER\nHello')
  })

  it('should be able to select all table', async () => {
    const res = await reporter.render({
      template: {
        content: '<table id="x"><thead><tr><th>Header</th></tr><tbody><tr><td>Hello</td></tr></tbody></table>',
        engine: 'none',
        recipe: 'html-to-text',
        htmlToText: {
          tablesSelectAll: true
        }
      }
    })
    res.content.toString().should.containEql('HEADER\nHello')
  })
})
