const path = require('path')
const jsreport = require('@jsreport/jsreport-core')
const wkhtmltopdf = require('../')
require('should')

describe('wkhtmltopdf', function () {
  let reporter

  beforeEach(function () {
    reporter = jsreport()
    reporter.use(wkhtmltopdf())

    return reporter.init()
  })

  it('should not fail when rendering', function () {
    const request = {
      template: { content: 'Heyx', recipe: 'wkhtmltopdf', engine: 'none' }
    }

    return reporter.render(request).then(function (response) {
      response.content.toString().should.containEql('%PDF')
    })
  })

  it('should block local file access', function (done) {
    const localFile = path.join(__dirname, 'test.png')
    const request = {
      template: { content: '<img src="' + localFile + '"/>', recipe: 'wkhtmltopdf', engine: 'none' }
    }

    reporter.render(request).then(function (response) {
      done('Should have failed')
    }).catch(function () {
      done()
    })
  })

  it('should propagate output to logs', function () {
    const request = {
      template: { content: 'Heyx<script>console.log("aaa")</script>', recipe: 'wkhtmltopdf', engine: 'none' }
    }

    return reporter.render(request).then(function (response) {
      response.meta.logs.map(l => l.message).should.matchAny(/aaa/)
    })
  })
})

describe('wkhtmltopdf with local', function () {
  let reporter

  beforeEach(function () {
    reporter = jsreport()
    reporter.use(wkhtmltopdf({
      allowLocalFilesAccess: true
    }))

    return reporter.init()
  })

  it('should block local file access', function () {
    const localFile = path.join(__dirname, 'test.png')
    const request = {
      template: { content: '<img src="' + localFile + '"/>', recipe: 'wkhtmltopdf', engine: 'none' }
    }

    return reporter.render(request).then(function (response) {
      response.content.toString().should.containEql('%PDF')
    })
  })
})

describe('wkhtmltopdf with proxy', function () {
  let reporter

  beforeEach(function () {
    reporter = jsreport()
    reporter.use(wkhtmltopdf({
      proxy: 'foo'
    }))

    return reporter.init()
  })

  it('should propagate proxy config', function () {
    const request = {
      template: { content: 'foo', recipe: 'wkhtmltopdf', engine: 'none' }
    }

    return reporter.render(request).then(function (response) {
      response.meta.logs.map(l => l.message).should.matchAny(/--proxy foo/)
    })
  })
})

describe('wkhtmltopdf with execOpptions.maxBuffer = 1', function () {
  let reporter

  beforeEach(function () {
    reporter = jsreport()
    reporter.use(wkhtmltopdf({
      execOptions: {
        maxBuffer: 1
      }
    }))

    return reporter.init()
  })

  it('should fail because of max buffer acceeded', function (done) {
    const request = {
      template: { content: 'foo', recipe: 'wkhtmltopdf', engine: 'none' }
    }

    reporter.render(request).then(function (response) {
      done(new Error('Should have fail'))
    }).catch(function () {
      done()
    })
  })
})

describe('wkhtmltopdf with execOpptions.maxBuffer = 1000 * 100', function () {
  let reporter

  beforeEach(function () {
    reporter = jsreport()
    reporter.use(wkhtmltopdf({
      execOptions: {
        maxBuffer: 1000 * 100
      }
    }))

    return reporter.init()
  })

  it('should work', function () {
    const request = {
      template: { content: 'foo', recipe: 'wkhtmltopdf', engine: 'none' }
    }

    return reporter.render(request)
  })
})
