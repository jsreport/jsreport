const should = require('should')
const path = require('path')
const childProcess = require('child_process')
const jsreport = require('../')
const packageJson = require('../package.json')

const jsreportExtensions = Object.keys(packageJson.dependencies).filter((extName) => {
  return extName !== '@jsreport/jsreport-core' && extName.startsWith('@jsreport')
})

describe('all extensions', function () {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      discover: false,
      rootDirectory: path.join(__dirname, '../'),
      loadConfig: false
    })

    for (const extName of jsreportExtensions) {
      reporter = reporter.use(require(extName)())
    }

    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

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

describe('ESM', function () {
  it('should be able to init', async () => {
    await new Promise((resolve, reject) => {
      try {
        const proc = childProcess.fork(path.join(__dirname, './fromESM.mjs'))

        proc.on('error', (e) => reject(e))

        proc.on('exit', (code) => {
          if (code === 1) {
            reject(new Error('child process exited with code 1'))
          } else {
            resolve()
          }
        })
      } catch (error) {
        reject(error)
      }
    })
  })
})

describe('xlsx templates to assets migration', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      discover: false,
      rootDirectory: path.join(__dirname, '../'),
      loadConfig: false
    })

    for (const extName of jsreportExtensions) {
      reporter = reporter.use(require(extName)())
    }

    reporter = reporter.use({
      name: 'xlsx-templates-to-assets-migration',
      directory: __dirname,
      main: './xlsxTemplatesToAssetsMigration.js',
      options: {}
    })

    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('should convert xlsxTemplates to assets', async () => {
    const xlsxTemplates = await reporter.documentStore.collection('xlsxTemplates').find({})

    xlsxTemplates.length.should.be.eql(0)

    const assets = await reporter.documentStore.collection('assets').find({})

    assets.length.should.be.eql(1)

    assets[0].name.should.be.eql('table-chart.xlsx')
  })

  it('should convert templates with .xlsxTemplate information', async () => {
    const t1 = await reporter.documentStore.collection('templates').findOne({ name: 'test' })

    should(t1.xlsxTemplates).be.not.ok()

    const assets = await reporter.documentStore.collection('assets').find({})
    assets.length.should.be.eql(1)

    t1.xlsx.templateAssetShortid.should.be.eql(assets[0].shortid)
  })

  it('should convert templates with .baseXlsxTemplate information', async () => {
    const t1 = await reporter.documentStore.collection('templates').findOne({ name: 'test2' })

    should(t1.baseXlsxTemplate).be.not.ok()

    const assets = await reporter.documentStore.collection('assets').find({})
    assets.length.should.be.eql(1)

    t1.htmlToXlsx.templateAssetShortid.should.be.eql(assets[0].shortid)
  })
})

describe('resources to assets migration', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      discover: false,
      rootDirectory: path.join(__dirname, '../'),
      loadConfig: false
    })

    for (const extName of jsreportExtensions) {
      reporter = reporter.use(require(extName)())
    }

    reporter = reporter.use({
      name: 'resources-to-assets-migration',
      directory: __dirname,
      main: './resourcesToAssetsMigration.js',
      options: {}
    })

    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('should convert select data resources to assets', async () => {
    const dataEntities = await reporter.documentStore.collection('data').find({})

    dataEntities.length.should.be.eql(0)

    const assets = await reporter.documentStore.collection('assets').find({})

    assets.length.should.be.eql(2)

    assets.should.matchEach((a) => a.name.should.endWith('.json'))
  })

  it('should remove resource information from template', async () => {
    const t1 = await reporter.documentStore.collection('templates').findOne({ name: 'main' })
    should(t1.resources).be.not.ok()
  })

  it('should contain script in template', async () => {
    const t1 = await reporter.documentStore.collection('templates').findOne({ name: 'main' })
    t1.scripts.should.have.length(1)

    const scriptShortid = t1.scripts[0].shortid
    const script = await reporter.documentStore.collection('scripts').findOne({ shortid: scriptShortid })

    should(script).be.ok()
    script.name.should.be.eql('main_resources')
  })

  it('should expose resource information for back-compatibility', async () => {
    const res = await reporter.render({
      template: {
        name: 'debug'
      }
    })

    const parsed = JSON.parse(res.content.toString())

    parsed.$resources.should.be.ok()
    parsed.$resource.should.be.ok()
    parsed.$localizedResources.should.be.ok()
    parsed.$localizedResource.should.be.ok()
  })

  it('should continue to work when using options.language', async () => {
    const res = await reporter.render({
      template: {
        name: 'main'
      },
      options: {
        language: 'en'
      }
    })

    const result = res.content.toString()
    result.should.be.eql('Hello World')
  })

  it('should considered stored default language for back-compatibility', async () => {
    // when no explicit language passed the script should contain the default language
    // which in this case should match "de"
    const res = await reporter.render({
      template: {
        name: 'main'
      }
    })

    const result = res.content.toString()
    result.should.be.eql('Hallo Welt')
  })
})
