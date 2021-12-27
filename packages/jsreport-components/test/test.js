require('should')
const Reporter = require('@jsreport/jsreport-core')

describe('components', function () {
  let reporter

  beforeEach(() => {
    reporter = Reporter({
      rootDirectory: process.cwd()
    })
      .use(require('@jsreport/jsreport-assets')())
      .use(require('@jsreport/jsreport-jsrender')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('../')())
      .use(Reporter.tests.listeners())

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should evaluate component using handlebars', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: '{{message}}{{myHelper}}',
      engine: 'handlebars',
      helpers: 'function myHelper() { return \'myHelper\' }'
    })

    const res = await reporter.render({
      template: {
        content: '{{component "c1"}}',
        engine: 'handlebars',
        recipe: 'html'
      },
      data: {
        message: 'hello'
      }
    })
    res.content.toString().should.be.eql('hellomyHelper')
  })

  it('should throw when inserting or updating without engine', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: 'foo'
    }).should.be.rejected()

    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: 'foo',
      engine: 'handlebars'
    })

    await reporter.documentStore.collection('components').update({ name: 'c1' }, {
      $set: { engine: null }
    }).should.be.rejected()

    await reporter.documentStore.collection('components').update({ name: 'c1' }, {
      $set: { name: 'c2' }
    })
  })

  it('should evaluate nested components using handlebars', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: 'c1{{component "c2"}}',
      engine: 'handlebars'
    })

    await reporter.documentStore.collection('components').insert({
      name: 'c2',
      content: 'c2{{myHelper}}',
      engine: 'handlebars',
      helpers: 'function myHelper() { return "myHelper" }'
    })

    const res = await reporter.render({
      template: {
        content: '{{component "c1"}}',
        recipe: 'html',
        engine: 'handlebars'
      }
    })
    res.content.toString().should.be.eql('c1c2myHelper')
  })

  it('should propagate logs from nested components', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: 'c1{{component "c2"}}',
      engine: 'handlebars'
    })

    await reporter.documentStore.collection('components').insert({
      name: 'c2',
      content: 'c2{{myHelper}}',
      engine: 'handlebars',
      helpers: 'function myHelper() { return console.log("foo") }'
    })

    const res = await reporter.render({
      template: {
        content: '{{component "c1"}}',
        recipe: 'html',
        engine: 'handlebars'
      }
    })
    JSON.stringify(res.meta.logs).should.containEql('foo')
  })

  it('should be able to mix jsrender and handlebars components', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: 'c1{{message}}',
      engine: 'handlebars'
    })

    await reporter.documentStore.collection('components').insert({
      name: 'c2',
      content: 'c2{{:message}}',
      engine: 'jsrender'
    })

    const res = await reporter.render({
      template: {
        content: '{{component "c1"}} {{component "c2"}}',
        recipe: 'html',
        engine: 'handlebars'
      },
      data: {
        message: 'hello'
      }
    })
    res.content.toString().should.containEql('c1hello c2hello')
  })

  it('should support relative paths for nested components', async () => {
    await reporter.documentStore.collection('folders').insert({
      name: 'folderA',
      shortid: 'folderA'
    })
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: '{{component "./c2"}}',
      engine: 'handlebars',
      folder: { shortid: 'folderA' }
    })

    await reporter.documentStore.collection('components').insert({
      name: 'c2',
      content: 'c2',
      engine: 'handlebars',
      folder: { shortid: 'folderA' }
    })

    const res = await reporter.render({
      template: {
        content: '{{component "folderA/c1"}}',
        recipe: 'html',
        engine: 'handlebars'
      }
    })
    res.content.toString().should.containEql('c2')
  })

  it('should decorate nested components errors', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: 'c1{{component "c2"}}',
      engine: 'handlebars'
    })

    await reporter.documentStore.collection('components').insert({
      name: 'c2',
      content: 'c2{{#if \'xxx\'}}{{/else}}',
      engine: 'handlebars'
    })

    try {
      await reporter.render({
        template: {
          content: 'some line\n{{component "c1"}}',
          recipe: 'html',
          engine: 'handlebars'
        }
      })
      throw new Error('should throw')
    } catch (e) {
      e.entity.name.should.be.eql('c2')
      e.lineNumber.should.be.eql(1)
      e.property.should.be.eql('content')
    }
  })

  it('should decorate errors in helpers', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: 'c1 {{foo}}',
      engine: 'handlebars',
      helpers: `function foo() {
        throw new Error('foo')
      }`
    })

    try {
      await reporter.render({
        template: {
          content: '{{component "c1"}}',
          recipe: 'html',
          engine: 'handlebars'
        }
      })
      throw new Error('should throw')
    } catch (e) {
      e.entity.name.should.be.eql('c1')
      e.lineNumber.should.be.eql(2)
      e.property.should.be.eql('helpers')
    }
  })

  it('assets shared helpers should be propagated also to the templates', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: 'c1 {{foo}}',
      engine: 'handlebars'
    })

    await reporter.documentStore.collection('assets').insert({
      name: 'a1',
      content: 'function foo() { return \'hello\' }',
      isSharedHelper: true
    })

    const res = await reporter.render({
      template: {
        content: '{{component "c1"}}',
        recipe: 'html',
        engine: 'handlebars'
      }
    })
    res.content.toString().should.containEql('hello')
  })

  it('template helpers should not be populated to the component', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: 'c1 {{foo}}',
      engine: 'handlebars'
    })

    const res = await reporter.render({
      template: {
        content: '{{component "c1"}}',
        recipe: 'html',
        engine: 'handlebars',
        helpers: 'function foo() { \'hello\' }'
      }
    })
    res.content.toString().should.not.containEql('hello')
  })
})
