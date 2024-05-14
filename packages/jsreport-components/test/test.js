require('should')
const Reporter = require('@jsreport/jsreport-core')

describe('components', function () {
  describe('default trustUserCode', function () {
    common()
  })

  describe('trustUserCode: true', function () {
    common({ trustUserCode: true })
  })
})

function common (options) {
  let reporter

  beforeEach(async () => {
    reporter = await initReporter(options)
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

  it('should evaluate recursive component using handlebars', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: '{{#each children}}{{component "c1"}}{{/each}}{{name}}',
      engine: 'handlebars'
    })

    const res = await reporter.render({
      template: {
        content: '{{component "c1"}}',
        recipe: 'html',
        engine: 'handlebars'
      },
      data: {
        children: [
          {
            children: [
              {
                name: 'john'
              },
              {
                name: 'peter'
              }
            ]
          }
        ]
      }
    })

    res.content.toString().should.be.eql('johnpeter')
  })

  it('should evaluate recursive component using handlebars and waitForAsyncHelper should work ', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: '{{#if (isOurTargetItem children)}}{{delay 3000}}{{/if}}{{#each children}}{{component "c1"}}{{/each}}{{name}}{{#if (isOurTargetItem children)}}{{wait (delay 1000)}}{{/if}}',
      helpers: `
        function isOurTargetItem (input) {
          return Array.isArray(input) && input.find((item) => item.name === 'peter') != null
        }

        async function delay (time) {
          await new Promise((resolve) => {
            setTimeout(() => resolve(), time)
          })

          console.log("delay " + time + " finished")
          return ''
        }

        async function wait (input) {
          const jsreport = require('jsreport-proxy')

          await jsreport.templatingEngines.waitForAsyncHelper(input)
          console.log('wait finished')
          return ''
        }
      `,
      engine: 'handlebars'
    })

    const res = await reporter.render({
      template: {
        content: '{{component "c1"}}',
        recipe: 'html',
        engine: 'handlebars'
      },
      data: {
        children: [
          {
            children: [
              {
                name: 'john'
              },
              {
                name: 'peter'
              }
            ]
          }
        ]
      }
    })

    res.content.toString().should.be.eql('johnpeter')

    const firstLogIdx = res.meta.logs.findIndex((item) => item.message.endsWith('delay 1000 finished'))

    firstLogIdx.should.be.not.eql(-1)

    res.meta.logs[firstLogIdx + 1].message.should.containEql('wait finished')
    res.meta.logs[firstLogIdx + 2].message.should.containEql('delay 3000 finished')
  })

  it('should evaluate recursive component using handlebars and waitForAsyncHelpers should work ', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: '{{#if (isOurTargetItem children)}}{{delay 3000}}{{/if}}{{#each children}}{{component "c1"}}{{/each}}{{name}}{{#if (isOurTargetItem children)}}{{wait}}{{/if}}',
      helpers: `
        function isOurTargetItem (input) {
          return Array.isArray(input) && input.find((item) => item.name === 'peter') != null
        }

        async function delay (time) {
          await new Promise((resolve) => {
            setTimeout(() => resolve(), time)
          })

          console.log("delay " + time + " finished")
          return ''
        }

        async function wait () {
          const jsreport = require('jsreport-proxy')

          await delay(1000)

          await jsreport.templatingEngines.waitForAsyncHelpers()
          console.log('wait finished')
          return ''
        }
      `,
      engine: 'handlebars'
    })

    const res = await reporter.render({
      template: {
        content: '{{component "c1"}}',
        recipe: 'html',
        engine: 'handlebars'
      },
      data: {
        children: [
          {
            children: [
              {
                name: 'john'
              },
              {
                name: 'peter'
              }
            ]
          }
        ]
      }
    })

    res.content.toString().should.be.eql('johnpeter')

    const firstLogIdx = res.meta.logs.findIndex((item) => item.message.endsWith('delay 1000 finished'))

    firstLogIdx.should.be.not.eql(-1)

    res.meta.logs[firstLogIdx + 1].message.should.containEql('delay 3000 finished')
    res.meta.logs[firstLogIdx + 2].message.should.containEql('wait finished')
  })

  it('should evaluate recursive component wrapped by async helper using handlebars', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'student',
      content: 'name: {{name}}, {{#with address}}{{component "./address"}}{{/with}}',
      engine: 'handlebars'
    })

    await reporter.documentStore.collection('components').insert({
      name: 'address',
      content: 'street: {{street}}, city: {{city}}',
      engine: 'handlebars'
    })

    const students = [
      {
        name: 'John Lennon',
        address: {
          street: 'Abbey Road 23',
          city: 'London'
        }
      },
      {
        name: 'Eddie Vedder',
        address: {
          street: 'Jeremy street',
          city: 'Seatle'
        }
      }
    ]

    const res = await reporter.render({
      template: {
        content: '{{#each students}}{{#componentExists "./student"}}{{component "./student"}}{{/componentExists}}{{/each}}',
        helpers: `
          const jsreport = require('jsreport-proxy');

          async function componentExists(componentName, options) {
              const component = await jsreport.folders.resolveEntityFromPath(componentName, 'components');
              return component ? options.fn(this): options.inverse(this);
          }
        `,
        recipe: 'html',
        engine: 'handlebars'
      },
      data: {
        students
      }
    })

    const expected = students.map((student) => `name: ${student.name}, street: ${student.address.street}, city: ${student.address.city}`).join('')

    res.content.toString().should.be.eql(expected)
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

  it('hash params should be passed as data to component', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: 'c1 {{foo}}',
      engine: 'handlebars'
    })

    const res = await reporter.render({
      template: {
        content: '{{component "c1" foo="hello"}}',
        recipe: 'html',
        engine: 'handlebars'
      }
    })
    res.content.toString().should.containEql('c1 hello')
  })

  it('should cache entities', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: '{{message}}',
      engine: 'handlebars'
    })

    const col = reporter.documentStore.collection('components')
    const originalFind = col.find.bind(col)
    let counter = 0
    col.find = (...args) => {
      counter++
      return originalFind(...args)
    }

    const res = await reporter.render({
      template: {
        content: '{{component "c1"}}{{component "c1"}}',
        engine: 'handlebars',
        recipe: 'html'
      },
      data: {
        message: 'hello'
      }
    })
    res.content.toString().should.be.eql('hellohello')
    counter.should.be.eql(1)
  })
}

async function initReporter (options) {
  const reporter = Reporter({
    ...options,
    rootDirectory: process.cwd()
  })
    .use(require('@jsreport/jsreport-assets')())
    .use(require('@jsreport/jsreport-jsrender')())
    .use(require('@jsreport/jsreport-handlebars')())
    .use(require('../')())
    .use(Reporter.tests.listeners())

  await reporter.init()

  return reporter
}
