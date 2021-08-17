const path = require('path')
const { Reporter } = require('@jsreport/jsreport-core')
const should = require('should')

describe('electron pdf', () => {
  let reporter

  beforeEach(async () => {
    reporter = new Reporter({
      rootDirectory: path.join(__dirname, '../')
    })

    await reporter.init()
  })

  it('should not fail when rendering', async () => {
    const request = {
      template: { content: 'Heyx', recipe: 'electron-pdf', engine: 'none' }
    }

    await reporter.render(request)
  })
})

describe('electron pdf with timeout', () => {
  let reporter

  beforeEach(async () => {
    reporter = new Reporter({
      rootDirectory: path.join(__dirname, '../'),
      reportTimeout: 1
    })

    await reporter.init()
  })

  it('should fail', () => {
    const request = {
      template: { content: 'Heyx', recipe: 'electron-pdf', engine: 'none' }
    }

    const renderResult = reporter.render(request)

    should(renderResult).be.rejected()
  })
})
