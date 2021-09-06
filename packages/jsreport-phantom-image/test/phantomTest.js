const jsreport = require('@jsreport/jsreport-core')
require('should')

describe('phantom image', function () {
  let reporter

  beforeEach(function () {
    reporter = jsreport()
      .use(require('../')())

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should render png by default', function (done) {
    const request = {
      template: { content: 'Heyx', recipe: 'phantom-image', engine: 'none' }
    }

    reporter.render(request).then(function (response) {
      response.content.toString('utf8').should.containEql('PNG')
      done()
    }).catch(done)
  })

  it('should render jpeg', function (done) {
    const request = {
      template: { content: 'Heyx', recipe: 'phantom-image', engine: 'none', phantomImage: { imageType: 'jpeg' } }
    }

    reporter.render(request).then(function (response) {
      response.content.toString('utf8').should.containEql('JFIF')
      done()
    }).catch(done)
  })

  it('should render gif', function (done) {
    const request = {
      template: { content: 'Heyx', recipe: 'phantom-image', engine: 'none', phantomImage: { imageType: 'gif' } }
    }

    reporter.render(request).then(function (response) {
      response.content.toString('utf8').should.containEql('GIF')
      done()
    }).catch(done)
  })
})
