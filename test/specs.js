require('should')
const jsreport = require('../')
const path = require('path')

describe('all extensions', function () {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      rootDirectory: path.join(__dirname, '../'),
      loadConfig: false
    })

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('all available extensions should be loaded', () => {
    const availableExtensions = reporter.extensionsManager.availableExtensions.filter((extension) => {
      if (!extension.options) {
        return true
      }

      if (extension.options.enabled === false) {
        return false
      }

      return true
    })

    availableExtensions.length.should.be.eql(reporter.extensionsManager.extensions.length)
  })

  it('child template should be resolvable dynamically', async () => {
    await reporter.documentStore.collection('templates').insert({
      content: 'child content', engine: 'jsrender', recipe: 'html', name: 'foo'
    })

    const res = await reporter.render({
      template: { content: '{#child {{:a}}}', engine: 'jsrender', recipe: 'html' },
      data: { a: 'foo' }
    })

    res.content.toString().should.be.eql('child content')
  })

  it('scripts should be able to use sample data loaded before evaluating scripts', async () => {
    await reporter.documentStore.collection('data').insert({
      name: 'data', dataJson: '{ "a": "foo" }', shortid: 'data'
    })

    const resp = await reporter.render({
      template: {
        content: 'foo',
        engine: 'jsrender',
        recipe: 'html',
        data: { shortid: 'data' },
        script: {
          content: 'function beforeRender(done) { request.template.content = request.data.a; done() }'
        }
      }
    })

    resp.content.toString().should.be.eql('foo')
  })

  it('scripts should be able to load data for the child template', async () => {
    await reporter.documentStore.collection('templates').insert({
      content: '{{:foo}}',
      engine: 'jsrender',
      recipe: 'html',
      name: 'foo'
    })
    const resp = await reporter.render({
      template: {
        content: '{#child foo}',
        engine: 'jsrender',
        recipe: 'html',
        scripts: [{
          content: "function beforeRender(req, res, done) { req.data.foo = 'x'; done() }"
        }]
      }
    })

    resp.content.toString().should.be.eql('x')
  })

  it('child templates should be able to have assigned scripts loading data', async () => {
    await reporter.documentStore.collection('templates').insert({
      content: '{{:foo}}',
      engine: 'jsrender',
      recipe: 'html',
      name: 'foo',
      scripts: [{ content: "function beforeRender(req, res, done) { req.data.foo = 'yes'; done() }" }]
    })
    const resp = await reporter.render({
      template: {
        content: '{#child foo}',
        engine: 'jsrender',
        recipe: 'html',
        script: {
          content: "function beforeRender(done) { request.data.foo = 'no'; done() }"
        }
      }
    })

    resp.content.toString().should.be.eql('yes')
  })

  it('should be able to process high volume inputs', async function () {
    this.timeout(7000)
    const data = { people: [] }
    for (let i = 0; i < 1000000; i++) {
      data.people.push(i)
    }

    const resp = await reporter.render({
      template: {
        content: 'foo',
        engine: 'jsrender',
        recipe: 'html'
      },
      data: data
    })

    resp.content.toString().should.be.eql('foo')
  })
})

describe('in process strategy', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      templatingEngines: { strategy: 'in-process' },
      loadConfig: false,
      rootDirectory: path.join(__dirname, '../')
    })

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should handle function passed as parameter', async () => {
    const resp = await reporter.render({
      template: {
        content: '{{:~a()}}',
        engine: 'jsrender',
        recipe: 'html',
        helpers: {
          a: function () {
            return 'b'
          }
        }
      }
    })

    resp.content.toString().should.be.eql('b')
  })
})

describe('rendering shortcut', () => {
  it('should produce output', async () => {
    jsreport.renderDefaults.rootDirectory = path.join(__dirname, '../')
    const res = await jsreport.render({
      template: {
        content: 'foo',
        engine: 'handlebars',
        recipe: 'html'
      }
    })

    res.content.toString().should.be.eql('foo')
  })
})
