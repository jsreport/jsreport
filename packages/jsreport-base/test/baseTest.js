require('should')
const jsreport = require('@jsreport/jsreport-core')

describe('base', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()
      .use(require('../')())

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should replace base if in request.options.base', async () => {
    const response = await reporter.render({
      template: {
        content: '<html><head></head><body></body></html>',
        recipe: 'html',
        engine: 'none'
      },
      options: {
        base: 'foo'
      }
    })

    response.content.toString().should.containEql('<base href=\'foo\' />')
  })

  it('should replace ${cwd} with working directory', async () => { // eslint-disable-line
    const res = await reporter.render({
      template: {
        content: '<html><head></head><body></body></html>',
        recipe: 'html',
        engine: 'none'
      },
      options: {
        base: '${cwd}/foo' // eslint-disable-line
      }
    })

    res.content.toString().should.containEql('file:///' + process.cwd().replace('\\', '/') + '/foo')
  })

  it('should replace base if in request.options.base and html contains lang', async () => {
    const response = await reporter.render({
      template: {
        content: '<html lang="en"><head></head><body></body></html>',
        recipe: 'html',
        engine: 'none'
      },
      options: {
        base: 'foo'
      }
    })

    response.content.toString().should.containEql('<base href=\'foo\' />')
  })

  it('should not duplicate base tag', async () => {
    const response = await reporter.render({
      template: {
        content: '<html><head><base></base></head><body></body></html>',
        recipe: 'html',
        engine: 'none'
      },
      options: {
        base: 'foo'
      }
    })

    response.content.toString().should.not.containEql('<base href=\'foo\' />')
  })
})

describe('base with global settings', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()
      .use(require('../')({ url: 'foo.com' }))

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should replace base from the global options', async () => {
    const res = await reporter.render({
      template: {
        content: '<html><head></head><body></body></html>',
        recipe: 'html',
        engine: 'none'
      }
    })

    res.content.toString().should.containEql('<base href=\'foo.com\' />')
  })
})
