require('should')
const Reporter = require('@jsreport/jsreport-core')
const isAssetPathValid = require('../lib/assetsShared').isAssetPathValid
const request = require('supertest')

describe('assets', function () {
  let reporter

  beforeEach(() => {
    reporter = Reporter({
      rootDirectory: process.cwd()
    })
      .use(require('@jsreport/jsreport-express')())
      .use(require('@jsreport/jsreport-jsrender')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-scripts')())
      .use(require('../')())
      .use(Reporter.tests.listeners())

    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('should handle normal render request', async () => {
    const res = await reporter.render({
      template: {
        content: 'foo',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql('foo')
  })

  it('should extract static asset', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })

    const res = await reporter.render({
      template: {
        content: '{#asset foo.html}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should extract static asset with leading space in name', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })

    const res = await reporter.render({
      template: {
        content: '{#asset  foo.html}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should extract static asset with trailing space in name', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })

    const res = await reporter.render({
      template: {
        content: '{#asset foo.html }',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should extract static asset which is marked as shared helper', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      isSharedHelper: true,
      content: 'function foo() { return "hello" }'
    })

    const res = await reporter.render({
      template: {
        content: '{{:~foo()}}',
        recipe: 'html',
        engine: 'jsrender'
      }
    })

    res.content.toString().should.be.eql('hello')
  })

  it('should extract static asset which is marked as shared helper and run in alphabetically order', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo2.html',
      isSharedHelper: true,
      content: 'function foo() { return "bar" }'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      sharedHelpersScope: 'global',
      content: 'function foo() { return "hello" }'
    })

    const res = await reporter.render({
      template: {
        content: '{{:~foo()}}',
        recipe: 'html',
        engine: 'jsrender'
      }
    })

    res.content.toString().should.be.eql('bar')
  })

  it('should extract static asset which is marked as shared helper and make them callable to other helpers', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      isSharedHelper: true,
      content: 'function foo() { return "hello" }'
    })

    const res = await reporter.render({
      template: {
        content: '{{:~bar()}}',
        recipe: 'html',
        engine: 'jsrender',
        helpers: `
          function bar () {
            return foo() +  ' world'
          }
        `
      }
    })

    res.content.toString().should.be.eql('hello world')
  })

  it('should extract static asset which is marked as shared helper and make them async callable to other helpers', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      isSharedHelper: true,
      content: 'async function foo() { return new Promise(resolve => setTimeout(resolve("hello"), 500)) }'
    })

    const res = await reporter.render({
      template: {
        content: '{{:~bar()}}',
        recipe: 'html',
        engine: 'jsrender',
        helpers: `
          async function bar () {
            const fromFoo = await foo()
            return fromFoo +  ' world'
          }
        `
      }
    })

    res.content.toString().should.be.eql('hello world')
  })

  it('should extract static asset which is marked as shared helper and don\'t break stack traces', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.js',
      isSharedHelper: true,
      content: `async function foo() {
        await new Promise((resolve, reject) => {
          reject(new Error('fail'))
        }, 100)
      }`
    })

    try {
      await reporter.render({
        template: {
          content: '{{:~foo()}}',
          recipe: 'html',
          engine: 'jsrender'
        }
      })
      throw new Error('should have failed')
    } catch (e) {
      e.entity.name.should.be.eql('foo.js')
      e.lineNumber.should.be.eql(3)
    }
  })

  it('should extract static folder asset which is marked as shared helper', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'f1',
      shortid: 'f1'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "hello" }',
      folder: {
        shortid: 'f1'
      }
    })

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      content: '{{:~foo()}}',
      engine: 'jsrender',
      recipe: 'html',
      folder: {
        shortid: 'f1'
      }
    })

    const res = await reporter.render({
      template: {
        name: 'template'
      }
    })

    res.content.toString().should.be.eql('hello')
  })

  it('should extract static folder asset which is marked as shared helper and run in alphabetically order', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'f1',
      shortid: 'f1'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo2.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "bar" }',
      folder: {
        shortid: 'f1'
      }
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "hello" }',
      folder: {
        shortid: 'f1'
      }
    })

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      content: '{{:~foo()}}',
      engine: 'jsrender',
      recipe: 'html',
      folder: {
        shortid: 'f1'
      }
    })

    const res = await reporter.render({
      template: {
        name: 'template'
      }
    })

    res.content.toString().should.be.eql('bar')
  })

  it('should extract static folder asset which is marked as shared helper only at top level when template is anonymous', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'f1',
      shortid: 'f1'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "hello" }'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo2.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "bar" }',
      folder: {
        shortid: 'f1'
      }
    })

    const res = await reporter.render({
      template: {
        content: '{{:~foo()}}',
        engine: 'jsrender',
        recipe: 'html'
      }
    })

    res.content.toString().should.be.eql('hello')
  })

  it('should extract static folder asset which is marked as shared helper only at top level when template is anonymous and run in alphabetically order', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'f1',
      shortid: 'f1'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo2.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "bar" }'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "hello" }'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo2.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "bar" }',
      folder: {
        shortid: 'f1'
      }
    })

    const res = await reporter.render({
      template: {
        content: '{{:~foo()}}',
        engine: 'jsrender',
        recipe: 'html'
      }
    })

    res.content.toString().should.be.eql('bar')
  })

  it('should extract static folder asset which is marked as shared helper and run in hierarchy and alphabetically order', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'f1',
      shortid: 'f1'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo2.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "foo2" }',
      folder: {
        shortid: 'f1'
      }
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "foo" }',
      folder: {
        shortid: 'f1'
      }
    })

    await reporter.documentStore.collection('folders').insert({
      name: 'f2',
      shortid: 'f2',
      folder: {
        shortid: 'f1'
      }
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo3.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "foo3" }',
      folder: {
        shortid: 'f2'
      }
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo4.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "foo4" }',
      folder: {
        shortid: 'f2'
      }
    })

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      content: '{{:~foo()}}',
      engine: 'jsrender',
      recipe: 'html',
      folder: {
        shortid: 'f2'
      }
    })

    const res = await reporter.render({
      template: {
        name: 'template'
      }
    })

    res.content.toString().should.be.eql('foo4')
  })

  it('should extract static global and folder asset which are marked as shared helpers and run in hierarchy and alphabetically order', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'f1',
      shortid: 'f1'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo2.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "foo2" }',
      folder: {
        shortid: 'f1'
      }
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "foo" }',
      folder: {
        shortid: 'f1'
      }
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'g2.html',
      sharedHelpersScope: 'global',
      content: 'function foo() { return "g2" }',
      folder: {
        shortid: 'f1'
      }
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'g1.html',
      sharedHelpersScope: 'global',
      content: 'function foo() { return "g1" }',
      folder: {
        shortid: 'f1'
      }
    })

    await reporter.documentStore.collection('folders').insert({
      name: 'f2',
      shortid: 'f2',
      folder: {
        shortid: 'f1'
      }
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo3.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "foo3" }',
      folder: {
        shortid: 'f2'
      }
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'foo4.html',
      sharedHelpersScope: 'folder',
      content: 'function foo() { return "foo4" }',
      folder: {
        shortid: 'f2'
      }
    })

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      content: '{{:~foo()}}',
      engine: 'jsrender',
      recipe: 'html',
      folder: {
        shortid: 'f2'
      }
    })

    const res = await reporter.render({
      template: {
        name: 'template'
      }
    })

    res.content.toString().should.be.eql('foo4')
  })

  it('should extract static asset as base64 when @encoding=base64', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })
    const res = await reporter.render({
      template: {
        content: '{#asset foo.html @encoding=base64}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql(Buffer.from('hello').toString('base64'))
  })

  it('should extract static asset as data uri when @encoding=dataURI', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.png',
      content: 'hello'
    })
    const res = await reporter.render({
      template: {
        content: '{#asset foo.png @encoding=dataURI}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql('data:image/png;base64,' + Buffer.from('hello').toString('base64'))
  })

  it('should fail for asset with @encoding=dataURI but no image', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })
    try {
      await reporter.render({
        template: {
          content: '{#asset foo.html @encoding=dataURI}',
          recipe: 'html',
          engine: 'none'
        }
      })
      throw new Error('should fail')
    } catch (e) {
      e.message.should.not.be.eql('should fail')
      e.statusCode.should.be.eql(400)
      e.weak.should.be.true()
    }
  })

  it('should extract static asset with leading space and @encoding specified', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })
    const res = await reporter.render({
      template: {
        content: '{#asset  foo.html @encoding=base64}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql(Buffer.from('hello').toString('base64'))
  })

  it('should extract static asset with trailing space and @encoding specified', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })
    const res = await reporter.render({
      template: {
        content: '{#asset foo.html  @encoding=base64}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql(Buffer.from('hello').toString('base64'))
  })

  it('should extract static asset with name dynamically constructed by templating engine', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'a.html',
      content: 'hello'
    })

    const res = await reporter.render({
      template: {
        content: '{#asset {{:~foo()}}}',
        recipe: 'html',
        helpers: 'function foo() { return "a.html" }',
        engine: 'jsrender'
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should extract assets recursively', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'a.html',
      content: '{#asset b.html}'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'b.html',
      content: 'hello'
    })

    const res = await reporter.render({
      template: {
        content: '{#asset a.html}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should not fail with circle in asset references', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'a.html',
      content: '{#asset b.html}'
    })
    await reporter.documentStore.collection('assets').insert({
      name: 'b.html',
      content: '{#asset a.html}'
    })

    const res = await reporter.render({
      template: {
        content: '{#asset a.html}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql('{#asset b.html}')
  })

  it('should be able to link external file and extract it', async () => {
    reporter.assets.options.allowedFiles = '**/test.html'
    reporter.tests.beforeRenderEval((req, res, { reporter }) => {
      reporter.assets.options.allowedFiles = '**/test.html'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'test.html',
      link: 'test/test.html'
    })

    const res = await reporter.render({
      template: {
        content: '{#asset test.html}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should be able to link external file as base64 and extract it', async () => {
    reporter.assets.options.allowedFiles = '**/test.html'
    reporter.tests.beforeRenderEval((req, res, { reporter }) => {
      reporter.assets.options.allowedFiles = '**/test.html'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'test.html',
      link: 'test/test.html'
    })
    const res = await reporter.render({
      template: {
        content: '{#asset test.html @encoding=base64}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql(Buffer.from('hello').toString('base64'))
  })

  it('should deny insert not allowed external files', () => {
    return reporter.documentStore.collection('assets').insert({
      name: 'test.html',
      link: 'test/test.html'
    }).catch(function (res) {
      return 'ok'
    }).then(function (m) {
      m.should.be.eql('ok')
    })
  })

  it('should deny insert of external files when "allowAssetsLinkedToFiles" is false', async () => {
    reporter.assets.options.allowedFiles = '**/*.*'
    reporter.assets.options.allowAssetsLinkedToFiles = false

    return reporter.documentStore.collection('assets').insert({
      name: 'test.html',
      link: 'test/test.html'
    }).then(() => {
      throw new Error('it should have failed')
    }, () => {})
  })

  it('should deny update of external files when "allowAssetsLinkedToFiles" is false', async () => {
    reporter.assets.options.allowedFiles = '**/test.html'
    reporter.assets.options.allowAssetsLinkedToFiles = true

    const asset = await reporter.documentStore.collection('assets').insert({
      name: 'test.html',
      link: 'test/test.html'
    })

    reporter.assets.options.allowAssetsLinkedToFiles = false

    return reporter.documentStore.collection('assets').update({
      _id: asset._id
    }, {
      $set: {
        link: 'test/testbom.html'
      }
    }).then(() => {
      throw new Error('it should have failed')
    }, () => {})
  })

  it('should extract assets also from scripts', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.json',
      content: '{ a: "hello" }'
    })

    const res = await reporter.render({
      template: {
        content: ' ',
        recipe: 'html',
        engine: 'none',
        scripts: [{
          content: 'function beforeRender(req, res, done) { var x = {#asset foo.json}; req.template.content = x.a; done() }'
        }]
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should find assets on disk if not found in store but searchOnDiskIfNotFoundInStore is true', async () => {
    reporter.assets.options.searchOnDiskIfNotFoundInStore = true
    reporter.assets.options.allowedFiles = 'test/test.html'

    reporter.tests.beforeRenderEval((req, res, { reporter }) => {
      reporter.assets.options.searchOnDiskIfNotFoundInStore = true
      reporter.assets.options.allowedFiles = 'test/test.html'
    })

    const res = await reporter.render({
      template: {
        content: '{#asset test/test.html}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should escape js string when encoding string', async () => {
    reporter.assets.options.allowedFiles = 'test/helpers.js'

    reporter.tests.beforeRenderEval((req, res, { reporter }) => {
      reporter.assets.options.allowedFiles = 'test/helpers.js'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'helpers.js',
      link: 'test/helpers.js'
    })
    const res = await reporter.render({
      template: {
        content: '{{:~foo()}}',
        recipe: 'html',
        engine: 'jsrender',
        scripts: [{
          content: 'function beforeRender(req, res, done) { req.template.helpers = "{#asset helpers.js @encoding=string}"; done() }'
        }]
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should return link based on rootUrlForLinks if encoding is link', async () => {
    reporter.assets.options.allowedFiles = 'test/helpers.js'
    reporter.assets.options.rootUrlForLinks = 'http://localhost:123'

    reporter.tests.beforeRenderEval((req, res, { reporter }) => {
      reporter.assets.options.allowedFiles = 'test/helpers.js'
      reporter.assets.options.rootUrlForLinks = 'http://localhost:123'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'helpers.js',
      link: 'test/helpers.js'
    })
    const res = await reporter.render({
      template: {
        content: '{#asset helpers.js @encoding=link}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.containEql('http://localhost:123/assets/content/test/helpers.js')
  })

  it('should return link based on localhost if not rootUrlForLinks and not url', async () => {
    reporter.assets.options.allowedFiles = 'test/helpers.js'

    await reporter.documentStore.collection('assets').insert({
      name: 'helpers.js',
      link: 'test/helpers.js'
    })
    const res = await reporter.render({
      template: {
        content: '{#asset helpers.js @encoding=link}',
        recipe: 'html',
        engine: 'none'
      },
      context: {
        http: { baseUrl: 'https://localhost' }
      }
    })
    res.content.toString().should.containEql('https://localhost/assets/content/test/helpers.js')
  })

  it('should fail if asset doesn\'t exist', () => {
    return reporter.render({
      template: {
        content: '{#asset a.html}',
        recipe: 'html',
        engine: 'none'
      }
    }).catch(function (e) {
      return 'ok'
    }).then(function (m) {
      m.should.be.eql('ok')
    })
  })

  it('should not duplicate shared helpers', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      isSharedHelper: true,
      content: 'const a = 1'
    })
    return reporter.render({
      template: {
        content: ' ',
        recipe: 'html',
        engine: 'jsrender',
        helpers: 'const a = 1'
      }
    })
  })

  it('should extract static asset and strip bom', async () => {
    reporter.assets.options.allowedFiles = '**/*.*'
    reporter.assets.options.searchOnDiskIfNotFoundInStore = true

    reporter.tests.beforeRenderEval((req, res, { reporter }) => {
      reporter.assets.options.allowedFiles = '**/*.*'
      reporter.assets.options.searchOnDiskIfNotFoundInStore = true
    })

    const res = await reporter.render({
      template: {
        content: '{#asset test/testbom.html}',
        recipe: 'html',
        engine: 'none'
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should expose jsrender asset helper and support encoding param', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })
    const res = await reporter.render({
      template: {
        content: '{{:~asset(\'foo.html\', \'base64\')}}',
        recipe: 'html',
        engine: 'jsrender'
      }
    })
    res.content.toString().should.be.eql(Buffer.from('hello').toString('base64'))
  })

  it('should expose jsrender asset helper and have default utf8 encoding', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })
    const res = await reporter.render({
      template: {
        content: '{{:~asset(\'foo.html\')}}',
        recipe: 'html',
        engine: 'jsrender'
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should expose handlebars asset helper and support encoding param', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })
    const res = await reporter.render({
      template: {
        content: '{{asset "foo.html" "base64"}}',
        recipe: 'html',
        engine: 'handlebars'
      }
    })
    res.content.toString().should.be.eql(Buffer.from('hello').toString('base64'))
  })

  it('should expose handlebars asset helper and have default utf8 encoding', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })
    const res = await reporter.render({
      template: {
        content: '{{asset "foo.html"}}',
        recipe: 'html',
        engine: 'handlebars'
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should provide asset relative to the current asset (asset code calling another asset)', async () => {
    const f1 = await reporter.documentStore.collection('folders').insert({
      name: 'assets'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'sometext.txt',
      content: 'hello world',
      folder: {
        shortid: f1.shortid
      }
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'mymodule.js',
      content: `
        const jsreport = require('jsreport-proxy')
        module.exports = async () => {
            return jsreport.assets.read('./sometext.txt')
        }
      `,
      folder: {
        shortid: f1.shortid
      }
    })

    const res = await reporter.render({
      template: {
        content: '{{foo}}',
        helpers: `
          const jsreport = require('jsreport-proxy')
          const mymodule = await jsreport.assets.require('./assets/mymodule.js')

          function foo() {
              return mymodule()
          }
        `,
        recipe: 'html',
        engine: 'handlebars'
      }
    })

    res.content.toString().should.be.eql('hello world')
  })

  it('should provide asset relative to the current asset (asset code calling another asset with require)', async () => {
    const f1 = await reporter.documentStore.collection('folders').insert({
      name: 'assets'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'sometext.txt',
      content: 'hello world',
      folder: {
        shortid: f1.shortid
      }
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'mymodule.js',
      content: `
        const jsreport = require('jsreport-proxy')
        const text = await jsreport.assets.read('./sometext.txt')
        module.exports = async () => {
            return text
        }
      `,
      folder: {
        shortid: f1.shortid
      }
    })

    const res = await reporter.render({
      template: {
        content: '{{foo}}',
        helpers: `
          const jsreport = require('jsreport-proxy')
          const mymodule = await jsreport.assets.require('./assets/mymodule.js')

          function foo() {
              return mymodule()
          }
        `,
        recipe: 'html',
        engine: 'handlebars'
      }
    })

    res.content.toString().should.be.eql('hello world')
  })

  it('should proxy methods resolve correctly jsreportProxy.currentPath and jsreportProxy.currentDirectoryPath', async () => {
    const f1 = await reporter.documentStore.collection('folders').insert({
      name: 'assets'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'sometext.txt',
      content: 'hello world',
      folder: {
        shortid: f1.shortid
      }
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'mymodule.js',
      content: `
        const jsreport = require('jsreport-proxy')
        module.exports = async () => {
            const currentDirectoryPath = await jsreport.currentDirectoryPath()
            const currentPath = await jsreport.currentPath()
            const content = await jsreport.assets.read('./sometext.txt')
            return {
              currentDirectoryPath,
              currentPath,
              content
            }
        }
      `,
      folder: {
        shortid: f1.shortid
      }
    })

    await reporter.documentStore.collection('templates').insert({
      name: 'template',
      content: '{{foo}}',
      helpers: `
        const jsreport = require('jsreport-proxy')
        const mymodule = await jsreport.assets.require('./assets/mymodule.js')

        async function foo() {
          const currentDirectoryPath = await jsreport.currentDirectoryPath()
          const currentPath = await jsreport.currentPath()
          const results = [currentDirectoryPath, currentPath]
          const result = await mymodule()

          results.push(result.currentDirectoryPath)
          results.push(result.currentPath)
          results.push(result.content)

          return results.join('\\n')
        }
      `,
      recipe: 'html',
      engine: 'handlebars'
    })

    const res = await reporter.render({
      template: {
        name: 'template'
      }
    })

    res.content.toString().should.be.eql(['/', '/template', '/assets', '/assets/mymodule.js', 'hello world'].join('\n'))
  })

  describe('folders', () => {
    it('should throw error when duplicated results are found', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'a',
        shortid: 'a'
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'b',
        shortid: 'b'
      })

      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello',
        folder: {
          shortid: 'a'
        }
      })

      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello',
        folder: {
          shortid: 'b'
        }
      })

      try {
        await reporter.render({
          template: {
            content: '{#asset foo.html}',
            recipe: 'html',
            engine: 'none'
          }
        })

        throw new Error('should have failed when duplicates are found')
      } catch (e) {
        e.message.includes('Duplicated assets').should.be.true()
      }
    })

    it('should resolve asset using folders absolute path {#asset /folder1/folder2/foo.html}', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2',
        folder: {
          shortid: 'folder1'
        }
      })
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello',
        folder: {
          shortid: 'folder2'
        }
      })

      const res = await reporter.render({
        template: {
          content: '{#asset /folder1/folder2/foo.html}',
          recipe: 'html',
          engine: 'none'
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should resolve asset using folders absolute path {#asset /foo.html}', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello'
      })

      const res = await reporter.render({
        template: {
          content: '{#asset /foo.html}',
          recipe: 'html',
          engine: 'none'
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should resolve asset using folders absolute path and leading space {#asset /foo.html}', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello'
      })

      const res = await reporter.render({
        template: {
          content: '{#asset  /foo.html}',
          recipe: 'html',
          engine: 'none'
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should resolve asset using folders absolute path and trailing space {#asset /foo.html}', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello'
      })

      const res = await reporter.render({
        template: {
          content: '{#asset /foo.html }',
          recipe: 'html',
          engine: 'none'
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should resolve asset at specified path {#asset /folder2/foo.html} when there are others with same name', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello folder1',
        folder: {
          shortid: 'folder1'
        }
      })

      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello folder2',
        folder: {
          shortid: 'folder2'
        }
      })

      const res = await reporter.render({
        template: {
          content: '{#asset /folder2/foo.html}',
          recipe: 'html',
          engine: 'none'
        }
      })
      res.content.toString().should.be.eql('hello folder2')
    })

    it('should resolve asset just by name {#asset foo.html} no matter its location if there is no other template with same name (template at folder and asset at root)', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'template',
        content: '{#asset foo.html}',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'folder1'
        }
      })
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'root'
      })

      const res = await reporter.render({
        template: {
          name: 'template'
        }
      })
      res.content.toString().should.be.eql('root')
    })

    it('should resolve asset just by name {#asset foo.html} no matter its location if there is no other template with same name (anonymous template and asset at root)', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'root'
      })

      const res = await reporter.render({
        template: {
          content: '{#asset foo.html}',
          engine: 'none',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('root')
    })

    it('should resolve asset just by name {#asset foo.html} no matter its location if there is no other template with same name (template at folder and asset at another folder)', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'template',
        content: '{#asset foo.html}',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'folder1'
        }
      })
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'folder2',
        folder: {
          shortid: 'folder2'
        }
      })

      const res = await reporter.render({
        template: {
          name: 'template'
        }
      })
      res.content.toString().should.be.eql('folder2')
    })

    it('should resolve asset just by name {#asset foo.html} no matter its location if there is no other template with same name (anonymous template and asset at folder)', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'folder1',
        folder: {
          shortid: 'folder1'
        }
      })

      const res = await reporter.render({
        template: {
          content: '{#asset foo.html}',
          engine: 'none',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('folder1')
    })

    it('should prefer resolving to asset {#asset foo.html} that is in same folder level of rendered template', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'template',
        content: '{#asset foo.html}',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'folder1'
        }
      })
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'root'
      })

      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'folder1',
        folder: {
          shortid: 'folder1'
        }
      })

      const res = await reporter.render({
        template: {
          name: '/folder1/template'
        }
      })
      res.content.toString().should.be.eql('folder1')
    })

    it('should resolve asset using folders absolute path {#asset /folder1/foo.html} from nested template', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'folder1',
        shortid: 'folder1'
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'folder2',
        shortid: 'folder2'
      })

      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'foo',
        folder: { shortid: 'folder1' }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 't1',
        content: '{#asset /folder1/foo.html}',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'folder2'
        }
      })

      const res = await reporter.render({
        template: { name: '/folder2/t1', engine: 'none', recipe: 'html' }
      })
      res.content.toString().should.be.eql('foo')
    })

    it('should resolve asset using folders relative path {#asset ../company/assets/foo.html}', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'company',
        shortid: 'company'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'assets',
        shortid: 'assets',
        folder: {
          shortid: 'company'
        }
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'templates',
        shortid: 'templates',
        folder: {
          shortid: 'company'
        }
      })
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello',
        folder: {
          shortid: 'assets'
        }
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'template',
        content: '{#asset ../assets/foo.html}',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'templates'
        }
      })

      const res = await reporter.render({
        template: {
          name: 'template'
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should resolve asset using folders relative path {#asset ./foo.html} (template at root, asset at root)', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello'
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'template',
        content: '{#asset ./foo.html}',
        engine: 'none',
        recipe: 'html'
      })

      const res = await reporter.render({
        template: {
          name: 'template'
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should resolve asset using folders relative path {#asset ./foo.html} (anonymous template, asset at root)', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello'
      })

      const res = await reporter.render({
        template: {
          content: '{#asset ./foo.html}',
          engine: 'none',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should resolve asset using folders relative path {#asset ./assets/foo.html} (template at folder and asset at folder)', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'company',
        shortid: 'company'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'templates',
        shortid: 'templates',
        folder: {
          shortid: 'company'
        }
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'assets',
        shortid: 'assets',
        folder: {
          shortid: 'templates'
        }
      })
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello',
        folder: {
          shortid: 'assets'
        }
      })
      await reporter.documentStore.collection('templates').insert({
        name: 'template',
        content: '{#asset ./assets/foo.html}',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'templates'
        }
      })

      const res = await reporter.render({
        template: {
          name: 'template'
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should resolve asset using folders relative path {#asset ./company/assets/foo.html} from anonymous template', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'company',
        shortid: 'company'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'assets',
        shortid: 'assets',
        folder: {
          shortid: 'company'
        }
      })
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello',
        folder: {
          shortid: 'assets'
        }
      })

      const res = await reporter.render({
        template: {
          content: '{#asset ./company/assets/foo.html}',
          engine: 'none',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should resolve asset using folders relative path {#asset assets/foo.html}', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'company',
        shortid: 'company'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'assets',
        shortid: 'assets',
        folder: {
          shortid: 'company'
        }
      })
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello',
        folder: {
          shortid: 'assets'
        }
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'template',
        content: '{#asset assets/foo.html}',
        engine: 'none',
        recipe: 'html',
        folder: {
          shortid: 'company'
        }
      })

      const res = await reporter.render({
        template: {
          name: '/company/template'
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should resolve template name using folders relative path {#asset company/foo.html} from anonymous template', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'company',
        shortid: 'company'
      })
      await reporter.documentStore.collection('folders').insert({
        name: 'assets',
        shortid: 'assets',
        folder: {
          shortid: 'company'
        }
      })
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello',
        folder: {
          shortid: 'assets'
        }
      })

      const res = await reporter.render({
        template: {
          content: '{#asset company/assets/foo.html}',
          engine: 'none',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should not resolve asset using folders absolute path {#asset /foo.html} when asset is nested', async () => {
      await reporter.documentStore.collection('templates').insert({
        name: 'template',
        content: '{#asset /foo.html @encoding=utf8}',
        recipe: 'html',
        engine: 'none'
      })

      await reporter.documentStore.collection('folders').insert({
        name: 'assets',
        shortid: 'assets'
      })

      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'foo',
        folder: {
          shortid: 'assets'
        }
      })

      return reporter.render({
        template: {
          name: 'template'
        }
      }).should.be.rejectedWith(/Asset \/foo\.html not found/)
    })

    it('should not resolve asset using folders relative path {#asset assets/foo.html} when there is no parent folder from template', async () => {
      await reporter.documentStore.collection('templates').insert({
        name: 'template',
        content: '{#asset assets/foo.html @encoding=utf8}',
        recipe: 'html',
        engine: 'none'
      })

      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'foo'
      })

      return reporter.render({
        template: {
          name: 'template'
        }
      }).should.be.rejectedWith(/Asset assets\/foo\.html not found/)
    })

    it('should not resolve asset using folders relative path {#asset assets/nested/folder/foo.html} when there is no parent folder from template', async () => {
      await reporter.documentStore.collection('templates').insert({
        name: 'template',
        content: '{#asset assets/nested/folder/foo.html @encoding=utf8}',
        recipe: 'html',
        engine: 'none'
      })

      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'foo'
      })

      return reporter.render({
        template: {
          name: 'template'
        }
      }).should.be.rejectedWith(/Asset assets\/nested\/folder\/foo\.html not found/)
    })

    it('should not resolve asset using folders relative path {#asset assets/foo.html} when there is no parent folder from nested template', async () => {
      await reporter.documentStore.collection('folders').insert({
        name: 'templates',
        shortid: 'templates'
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'template',
        content: '{#asset assets/foo.html @encoding=utf8}',
        recipe: 'html',
        engine: 'none',
        folder: {
          shortid: 'templates'
        }
      })

      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'foo'
      })

      return reporter.render({
        template: {
          name: '/templates/template'
        }
      }).should.be.rejectedWith(/Asset assets\/foo\.html not found/)
    })

    it('should not resolve asset using folders relative path {#asset assets/foo.html} when there is no parent folder from anonymous template', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'foo'
      })

      return reporter.render({
        template: {
          content: '{#asset assets/foo.html @encoding=utf8}',
          recipe: 'html',
          engine: 'none'
        }
      }).should.be.rejectedWith(/Asset assets\/foo\.html not found/)
    })

    it('should throw error when using invalid paths', async () => {
      try {
        await reporter.render({
          template: {
            content: '{#asset /}',
            engine: 'none',
            recipe: 'html'
          }
        })

        throw new Error('should have failed when passing invalid path')
      } catch (e) {
        e.message.includes('Invalid asset path').should.be.true()
      }

      try {
        await reporter.render({
          template: {
            content: '{#asset ///}',
            engine: 'none',
            recipe: 'html'
          }
        })

        throw new Error('should have failed when passing invalid path')
      } catch (e) {
        e.message.includes('Invalid asset path').should.be.true()
      }
    })

    it('should export proxy.asset.read', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.html',
        content: 'hello'
      })

      const res = await reporter.render({
        template: {
          content: '{{:~helper()}}',
          recipe: 'html',
          engine: 'jsrender',
          helpers: 'function helper() { return require(\'jsreport-proxy\').assets.read(\'foo.html\') }'
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should export proxy.asset.require', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.js',
        content: 'module.exports.fn = () => \'hello\''
      })

      const res = await reporter.render({
        template: {
          content: '{{:~helper()}}',
          recipe: 'html',
          engine: 'jsrender',
          helpers: `
            const jsreport = require('jsreport-proxy')
            const foo = await jsreport.assets.require('foo.js')
            function helper() {
              return foo.fn()
            }
          `
        }
      })
      res.content.toString().should.be.eql('hello')
    })

    it('should throw error with lineNumber when code in proxy.asset.require fails', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.js',
        content: `module.exports.fn = () => {
          throw new Error('xxx')
        }`
      })

      await reporter.documentStore.collection('templates').insert({
        name: 'mytemplate',
        content: '{{:~helper()}}',
        recipe: 'html',
        engine: 'jsrender',
        helpers: `
          const jsreport = require('jsreport-proxy')
          const foo = await jsreport.assets.require('foo.js')
          function helper() {
            return foo.fn()
          }
        `
      })

      try {
        await reporter.render({
          template: { name: 'mytemplate' }
        })
        throw new Error('should have failed')
      } catch (e) {
        e.message.should.containEql('throw new Error')
        e.lineNumber.should.be.eql(2)
        e.entity.name.should.be.eql('foo.js')
      }
    })

    it('should expose jsreport.assets.registerHelpers', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.js',
        content: `function fn() {
          return new Promise((resolve) => setTimeout(() => resolve('foo'), 100))
        }`
      })

      const res = await reporter.render({
        template: {
          content: '{{:~fn()}}',
          recipe: 'html',
          engine: 'jsrender',
          helpers: `
            const jsreport = require('jsreport-proxy')
            await jsreport.assets.registerHelpers('foo.js')
          `
        }
      })
      res.content.toString().should.be.eql('foo')
    })

    it('should expose jsreport.assets.registerHelpers and make them callable by other helpers', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.js',
        content: `function fn() {
          return new Promise((resolve) => setTimeout(() => resolve('foo'), 100))
        }`
      })

      const res = await reporter.render({
        template: {
          content: '{{:~mainFn()}}',
          recipe: 'html',
          engine: 'jsrender',
          helpers: `
            const jsreport = require('jsreport-proxy')
            await jsreport.assets.registerHelpers('foo.js')

            async function mainFn () {
              const fnResult = await fn()
              return fnResult + ' bar'
            }
          `
        }
      })
      res.content.toString().should.be.eql('foo bar')
    })

    it('jsreport.assets.registerHelpers should support async scope inside', async () => {
      await reporter.documentStore.collection('assets').insert({
        name: 'foo.js',
        content: `
        const val = await new Promise((resolve) => setTimeout(() => resolve('foo'), 100))
        function fn() {
          return val
        }`
      })

      const res = await reporter.render({
        template: {
          content: '{{:~fn()}}',
          recipe: 'html',
          engine: 'jsrender',
          helpers: `
            const jsreport = require('jsreport-proxy')
            await jsreport.assets.registerHelpers('foo.js')
          `
        }
      })
      res.content.toString().should.be.eql('foo')
    })
  })
})

describe('isAssetPathValid', () => {
  it('* match test.js', () => {
    isAssetPathValid('**/*.*', '../test.js', '/data/root/test.js').should.be.true()
  })

  it('test.js should not match foo.js', () => {
    isAssetPathValid('test.js', '../foo.js', '/data/root/foo.js').should.be.false()
  })

  it('**/test.js should match data/test.js', () => {
    isAssetPathValid('**/test.js', 'data/test.js', '/foo/data/test.js').should.be.true()
  })

  it('data/test.js should match data/test.js', () => {
    isAssetPathValid('data/test.js', 'data/test.js', '/foo/data/test.js').should.be.true()
  })

  it('+(bar|foo)/test.js should match both bar/test.js and foo/test.js but not data/test.js', () => {
    isAssetPathValid('+(bar|foo)/test.js', 'bar/test.js', '/foo/bar/test.js').should.be.true()
    isAssetPathValid('+(bar|foo)/test.js', 'foo/test.js', '/foo/fioo/test.js').should.be.true()
    isAssetPathValid('+(bar|foo)/test.js', 'data/test.js', '/foo/data/test.js').should.be.false()
  })

  it('+(bar|foo)/+(*.js|*.css) should match both bar/test.js and foo/test.css but not bar/test.txt', () => {
    isAssetPathValid('+(bar|foo)/+(*.js|*.css)', 'bar/test.js', '/foo/bar/test.js').should.be.true()
    isAssetPathValid('+(bar|foo)/+(*.js|*.css)', 'foo/test.css', '/foo/fioo/test.css').should.be.true()
    isAssetPathValid('+(bar|foo)/+(*.js|*.css)', 'bar/test.txt', 'foo/bar/test.txt').should.be.false()
  })

  it('undefined allowedFiles should not match', () => {
    isAssetPathValid(undefined, 'test/test.html', 'E:\\work\\jsreport\\jsreport-assets\\test\\test.html').should.be.false()
  })
})

describe('assets with trustUserCode enabled', () => {
  let reporter

  beforeEach(() => {
    reporter = Reporter({
      rootDirectory: process.cwd(),
      trustUserCode: true
    })
      .use(require('@jsreport/jsreport-jsrender')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('../')())

    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('should be able to require an npm module from inside proxy.asset.require', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.js',
      content: `
      module.exports.fn = () => typeof require('moment')
    `
    })

    const res = await reporter.render({
      template: {
        content: '{{:~helper()}}',
        recipe: 'html',
        engine: 'jsrender',
        helpers: `
        const jsreport = require('jsreport-proxy')
        const foo = await jsreport.assets.require('foo.js')
        function helper() {
          return foo.fn()
        }
      `
      }
    })
    res.content.toString().should.be.eql('function')
  })
})

describe('assets with express', function () {
  let reporter

  beforeEach(() => {
    reporter = Reporter({
      rootDirectory: require('process').cwd()
    })
      .use(require('@jsreport/jsreport-express')())
      .use(require('../')())
      .use(Reporter.tests.listeners())

    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('should expose odata endpoint', () => {
    return request(reporter.express.app)
      .get('/odata/assets')
      .expect(200)
  })

  it('/assets/content/foo.html should return content with correct headers', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })

    return request(reporter.express.app)
      .get('/assets/content/foo.html')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Last-Modified', /.+/)
      .expect('ETag', /.+/)
      .expect('hello')
  })

  it('/assets/id/content/foo.html should return content with correct headers', async () => {
    const asset = await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })

    return request(reporter.express.app)
      .get(`/assets/${asset._id}/content/foo.html`)
      .expect(200)
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Last-Modified', /.+/)
      .expect('ETag', /.+/)
      .expect('hello')
  })

  it('/assets/content/test.html should return content with correct headers for linked file', async () => {
    reporter.assets.options.allowedFiles = '**/test.html'

    await reporter.documentStore.collection('assets').insert({
      name: 'test.html',
      link: 'test/test.html'
    })

    return request(reporter.express.app)
      .get('/assets/content/test.html')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Last-Modified', /.+/)
      .expect('ETag', /.+/)
      .expect('hello')
  })

  it('/assets/content/test/test.html) should return content with correct headers for external file', () => {
    reporter.assets.options.searchOnDiskIfNotFoundInStore = true
    reporter.assets.options.allowedFiles = 'test/test.html'

    return request(reporter.express.app)
      .get('/assets/content/test/test.html')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Last-Modified', /.+/)
      .expect('ETag', /.+/)
      .expect('hello')
  })

  it('/assets/link/test/test.html should return link', () => {
    reporter.assets.options.searchOnDiskIfNotFoundInStore = true
    reporter.assets.options.allowedFiles = 'test/test.html'

    return request(reporter.express.app)
      .get('/assets/link/test/test.html')
      .expect(200)
      .expect(/test.html/)
  })

  it('/assets/content/test/test with space.html) should return content with correct headers for external file', () => {
    reporter.assets.options.searchOnDiskIfNotFoundInStore = true
    reporter.assets.options.allowedFiles = 'test/test with space.html'

    return request(reporter.express.app)
      .get('/assets/content/test/test with space.html')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Last-Modified', /.+/)
      .expect('ETag', /.+/)
      .expect('hello')
  })

  it('/assets/content/foo.html&download=true should return content as attachment', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })

    return request(reporter.express.app)
      .get('/assets/content/foo.html?download=true')
      .expect(200)
      .expect('Content-Disposition', 'attachment;filename=foo.html')
      .expect('hello')
  })

  it('should return link based on the originalUrl with query string', async () => {
    reporter.assets.options.allowedFiles = 'foo.html'
    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })

    const response = await request(reporter.express.app)
      .post('/api/report?a=b')
      .set('host', 'localhost')
      .send({
        template: {
          content: '{#asset foo.html @encoding=link}',
          recipe: 'html',
          engine: 'none'
        }
      })
      .expect(200)

    response.text.should.be.eql('http://localhost/assets/content/foo.html')
  })

  it('should return link based on the originalUrl and app path config', async () => {
    reporter.assets.options.allowedFiles = 'foo.html'
    reporter.options.appPath = '/reporting'

    await reporter.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: 'hello'
    })

    const response = await request(reporter.express.app)
      .post('/api/report?a=b')
      .set('host', 'localhost')
      .send({
        template: {
          content: '{#asset foo.html @encoding=link}',
          recipe: 'html',
          engine: 'none'
        }
      })
      .expect(200)

    response.text.should.be.eql('http://localhost/reporting/assets/content/foo.html')
  })
})
