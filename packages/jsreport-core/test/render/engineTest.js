const path = require('path')
const should = require('should')
const extend = require('node.extend.without.arrays')
const core = require('../../index')

describe('engine', () => {
  let reporter

  beforeEach(async () => {
    reporter = createReporter()
    reporter.use(core.tests.listeners())
    await reporter.init()
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  it('should be able to return from none engine', async () => {
    const res = await reporter.render({
      template: {
        content: 'content',
        engine: 'none',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('content')
  })

  it('should send compiled helpers to the engine', async () => {
    const res = await reporter.render({
      template: {
        content: 'content',
        helpers: 'function a() { return "foo"; }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('foo')
  })

  it('should be able to run async helper', async () => {
    const res = await reporter.render({
      template: {
        content: 'content',
        helpers: 'function a() { return new Promise((resolve) => resolve("foo")); }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('foo')
  })

  it('should be able to use waitForAsyncHelper in async helper', async () => {
    const res = await reporter.render({
      template: {
        content: 'content',
        helpers: `
        const jsreport = require('jsreport-proxy')
        async function b() {
          return new Promise((resolve) => resolve("foo"));
        }

        async function a(helpers) {
          return jsreport.templatingEngines.waitForAsyncHelper(helpers.b() + helpers.b() + helpers.b())
        }
        `,
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('foofoofoo')
  })

  it('should be able to pass async result as a value to another evaluation', async () => {
    const res = await reporter.render({
      template: {
        content: 'content',
        helpers: `
        const jsreport = require('jsreport-proxy')

        async function b() {
          return 'foo'
        }

        function a(helpers) {
          return jsreport.templatingEngines.evaluate({
            engine: 'data',
            content: '',
            helpers: '',
            data: {
              a: { val: helpers.b() }
            }
          }, {
            entity: { _id: 'x' },
            entitySet: 'templates'
          })
        }`,
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('foo')
  })

  it('should throw valid Error when error from async helper', async () => {
    return should(reporter.render({
      template: {
        content: 'content',
        helpers: 'async function a() { throw new Error("async error") }',
        engine: 'helpers',
        recipe: 'html'
      }
    })).be.rejectedWith(/async error/)
  })

  it('should await if the scope awaits promise', async () => {
    const res = await reporter.render({
      template: {
        content: 'content',
        helpers: `
        const val = await new Promise((resolve) => resolve('foo'))
        function a() {
            return val;
        }`,
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('foo')
  })

  it('should send custom require to engine', async () => {
    const res = await reporter.render({
      template: {
        content: 'content',
        engine: 'passRequire',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('content_require_complete')
  })

  it('should send data to the engine', async () => {
    const res = await reporter.render({
      template: {
        content: '',
        engine: 'data',
        recipe: 'html'
      },
      data: {
        a: {
          val: 'foo'
        }
      }
    })

    should(res.content.toString()).be.eql('foo')
  })

  it('should block not allowed modules', async () => {
    return should(reporter.render({
      template: {
        content: '',
        helpers: 'function a() { require("fs"); }',
        engine: 'helpers',
        recipe: 'html'
      }
    })).be.rejectedWith(/module has been blocked/)
  })

  it('should unblock all modules with *', async () => {
    const reporter2 = createReporter({
      sandbox: {
        allowedModules: '*'
      }
    })

    await reporter2.init()

    const res = await reporter2.render({
      template: {
        content: '',
        helpers: 'function a() { require("fs"); return "foo" }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('foo')

    await reporter2.close()
  })

  it('should be able to extend allowed modules', async () => {
    const reporter2 = createReporter({
      sandbox: {
        allowedModules: ['fs']
      }
    })

    await reporter2.init()

    const res = await reporter2.render({
      template: {
        content: '',
        helpers: 'function a() { require("fs"); return "foo" }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('foo')

    await reporter2.close()
  })

  it('should be able to use native modules', async () => {
    const res = await reporter.render({
      template: {
        content: '',
        helpers: 'function a() { return "foo_" + String(typeof uuid != "undefined") }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('foo_true')
  })

  it('should extract references from input string', async () => {
    const res = await reporter.render({
      template: {
        content: '',
        engine: 'data',
        recipe: 'html'
      },
      data: {
        $id: 0,
        b: { $id: '1', val: 'foo' },
        a: { $ref: '1' }
      }
    })

    should(res.content.toString()).be.eql('foo')
  })

  it('should not fail when extracting references from array containing null', async () => {
    return should(reporter.render({
      template: {
        content: '',
        engine: 'none',
        recipe: 'html'
      },
      data: {
        arr: [null]
      }
    })).be.fulfilled()
  })

  it('should work with $ref schema and array with primitive', async () => {
    const input = {
      $id: '1',
      foo: [1, 2, 3]
    }

    const expected = { foo: [1, 2, 3] }

    const res = await reporter.render({
      template: {
        content: '',
        engine: 'data2',
        recipe: 'html'
      },
      data: input
    })

    const rawContent = JSON.parse(res.content.toString())
    const content = {}

    for (const [key, value] of Object.entries(rawContent)) {
      if (key.startsWith('__')) {
        continue
      }

      content[key] = value
    }

    should(JSON.stringify(content)).be.eql(JSON.stringify(expected))
  })

  it('should be able use local modules if enabled in allowedModules', async () => {
    const reporter2 = createReporter({
      rootDirectory: __dirname,
      appDirectory: __dirname,
      sandbox: {
        allowedModules: ['helperB']
      }
    })

    await reporter2.init()

    const res = await reporter2.render({
      template: {
        content: '',
        helpers: 'function a() { return require("helperB")(); }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('b')

    await reporter2.close()
  })

  it('should be able use local modules if enabled in allowedModules and rootDirectory path points there', async () => {
    const reporter2 = createReporter({
      rootDirectory: __dirname,
      appDirectory: 'foo',
      sandbox: {
        allowedModules: ['helperB']
      }
    })

    await reporter2.init()

    const res = await reporter2.render({
      template: {
        content: '',
        helpers: 'function a() { return require("helperB")(); }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('b')

    await reporter2.close()
  })

  it('should be able use local modules if enabled in allowedModules and appDirectory path points there', async () => {
    const reporter2 = createReporter({
      rootDirectory: path.resolve(__dirname, '../../'),
      appDirectory: __dirname,
      sandbox: {
        allowedModules: ['helperB']
      }
    })

    await reporter2.init()

    const res = await reporter2.render({
      template: {
        content: '',
        helpers: 'function a() { return require("helperB")(); }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('b')

    await reporter2.close()
  })

  it('should be able use local modules if enabled in allowedModules and parentModuleDirectory path points there', async () => {
    const reporter2 = createReporter({
      rootDirectory: path.resolve(__dirname, '../../'),
      appDirectory: path.resolve(__dirname, '../../'),
      parentModuleDirectory: __dirname,
      sandbox: {
        allowedModules: ['helperB']
      }
    })

    await reporter2.init()

    const res = await reporter2.render({
      template: {
        content: '',
        helpers: 'function a() { return require("helperB")(); }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('b')

    await reporter2.close()
  })

  it('should return logs from console', async () => {
    const res = await reporter.render({
      template: {
        content: '',
        helpers: 'function a() { console.log(\'foo\') }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.meta.logs).matchAny((l) => {
      should(l.message).be.containEql('foo')
    })
  })

  it('should return dumped logs from console', async () => {
    const res = await reporter.render({
      template: {
        content: '',
        helpers: 'function a() { console.log({a: 1}) }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.meta.logs).matchAny((l) => {
      should(l.message).be.containEql('{ a: 1 }')
    })
  })

  it('should be able require modules by aliases', async () => {
    const res = await reporter.render({
      template: {
        content: '',
        helpers: 'function a() { return require("module"); }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('foo')
  })

  it('should terminate endless loop after timeout', async () => {
    const reporter2 = createReporter({
      reportTimeout: 500
    })

    await reporter2.init()

    return should(reporter2.render({
      template: {
        content: '',
        helpers: 'function a() { while(true) {} }',
        engine: 'helpers',
        recipe: 'html'
      }
    }).then(() => reporter2.close())).be.rejectedWith(/timeout/)
  })

  it('should be able to reach buffer in global scope', async () => {
    const res = await reporter.render({
      template: {
        content: '',
        helpers: 'function a() { return typeof Buffer; }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('function')
  })

  it('should throw valid Error when templating engine throws', async () => {
    return should(reporter.render({
      template: {
        content: '',
        engine: 'helpers',
        recipe: 'html'
      }
    })).be.rejectedWith(/helpers\.a is not a function/)
  })

  it('should disallow throwing values that are not errors (startup)', async () => {
    return should(reporter.render({
      template: {
        content: '',
        helpers: 'throw 2',
        engine: 'helpers',
        recipe: 'html'
      }
    })).be.rejectedWith(/threw with non-Error/)
  })

  it('should disallow throwing values that are not errors (runtime)', async () => {
    return should(reporter.render({
      template: {
        content: '',
        helpers: 'function a() { throw 2 }',
        engine: 'helpers',
        recipe: 'html'
      }
    })).be.rejectedWith(/threw with non-Error/)
  })

  it('should fail with helper that tries to avoid sandbox (using global context)', async () => {
    try {
      await reporter.render({
        template: {
          content: '',
          helpers: `
            function a() {
              const ForeignFunction = this.constructor.constructor;
              const process1 = ForeignFunction("return process")();
              const require1 = process1.mainModule.require;
              const console1 = require1("console");
              const fs1 = require1("fs");
              console1.log(fs1.statSync('.'))
            }
          `,
          engine: 'helpers',
          recipe: 'html'
        }
      })
      throw new Error('It should have failed')
    } catch (e) {
      should(
        e.message.includes('is not defined') ||
        e.message.includes('is not a valid constructor')
      ).be.True()
    }
  })

  it('should fail with helper that tries to avoid sandbox from this and __proto__ (using global context #2)', async () => {
    try {
      await reporter.render({
        template: {
          content: '',
          helpers: `
            function a() {
              const ForeignFunction = this.__proto__.constructor.constructor;
              const process1 = ForeignFunction("return process")();
              const require1 = process1.mainModule.require;
              const console1 = require1("console");
              const fs1 = require1("fs");
              console1.log(fs1.statSync('.'))
            }
          `,
          engine: 'helpers',
          recipe: 'html'
        }
      })
      throw new Error('It should have failed')
    } catch (e) {
      should(
        e.message.includes('is not defined') ||
        e.message.includes('is not a valid constructor')
      ).be.True()
    }
  })

  it('should fail with helper that tries to avoid sandbox from arguments (using global context #3)', async () => {
    try {
      await reporter.render({
        template: {
          content: '',
          helpers: `
            function a(options) {
              const ForeignFunction = options.constructor.constructor
              const process1 = ForeignFunction("return process")();
              const require1 = process1.mainModule.require;
              const console1 = require1("console");
              const fs1 = require1("fs");
              console1.log(fs1.statSync('.'))
            }
          `,
          engine: 'helpers',
          recipe: 'html'
        }
      })
      throw new Error('It should have failed')
    } catch (e) {
      should(
        e.message.includes('is not defined') ||
        e.message.includes('is not a valid constructor')
      ).be.True()
    }
  })

  it('should fail with helper that tries to avoid sandbox (using objects exposed in global context)', async () => {
    try {
      await reporter.render({
        template: {
          content: '',
          helpers: `
            function a() {
              const ForeignFunction = require.constructor;
              const process1 = ForeignFunction("return process")();
              const require1 = process1.mainModule.require;
              const console1 = require1("console");
              const fs1 = require1("fs");
              console1.log(fs1.statSync('.'))
            }
          `,
          engine: 'helpers',
          recipe: 'html'
        }
      })
      throw new Error('It should have failed')
    } catch (e) {
      should(
        e.message.includes('is not defined') ||
        e.message.includes('is not a valid constructor')
      ).be.True()
    }
  })

  it('should throw weak error when there is typo in helper', async () => {
    try {
      await reporter.render({
        template: {
          content: '',
          helpers: '{',
          engine: 'helpers',
          recipe: 'html'
        }
      })
      throw new Error('should throw')
    } catch (e) {
      e.statusCode.should.be.eql(400)
      e.weak.should.be.true()
    }
  })

  it('should cache the templating engines', async () => {
    const templateContent = 'content'

    reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
      res.content = Buffer.from(JSON.stringify(reporter.templatingEngines.cache.keys()))
    })

    const res = await reporter.render({
      template: {
        content: templateContent,
        engine: 'none',
        recipe: 'html'
      }
    })

    JSON.parse(res.content.toString()).should.have.length(1)
  })

  it('should return logs from console also on the cache hit', async () => {
    const templateContent = 'content'

    const res = await reporter.render({
      template: {
        content: templateContent,
        helpers: 'function a() { console.log(\'foo\') }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.meta.logs).matchAny((l) => {
      should(l.message).be.containEql('foo')
    })

    const res2 = await reporter.render({
      template: {
        content: templateContent,
        helpers: 'function a() { console.log(\'foo\') }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res2.meta.logs).matchAny((l) => {
      should(l.message).be.containEql('foo')
    })
  })

  it('should not change the helpers string into object on the original template', async () => {
    const template = {
      content: 'content',
      helpers: 'function a() { return "b"; }',
      engine: 'helpers',
      recipe: 'html'
    }

    const res = await reporter.render({
      template
    })

    should(res.content.toString()).be.eql('b')
    should(template.helpers).be.type('string')
  })

  it('should throw error with proper line numbers', async () => {
    const template = {
      content: 'content',
      helpers: `function a() {
        //another line
        throw new Error('error');
      }`,
      engine: 'helpers',
      recipe: 'html'
    }

    return reporter.render({
      template
    }).should.be.rejectedWith(/line 3/)
  })

  it('should be able call jsreport proxy from helper', async () => {
    const res = await reporter.render({
      template: {
        content: 'content',
        helpers: `async function a() {
          const jsreport = require('jsreport-proxy')
          const res = await jsreport.render({
            template: {
              content: 'foo',
              engine: 'none',
              recipe: 'html'
            }
          })
          return res.content.toString()
        }`,
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).be.eql('foo')
  })

  it('should be able to run system helper from the top level of template helper', async () => {
    const res = await reporter.render({
      template: {
        content: 'content',
        helpers: 'const staticValue = toJS({ a: 1 }); function a() { return staticValue }',
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).containEql('JSON.parse(')
  })

  it('async helper rejections when main eval exits before should be handled', async () => {
    // ses handles unhandled rejections so we need to skip it
    const reporter2 = createReporter({
      trustUserCode: true
    })

    await reporter2.init()

    let workerCrashed = false
    const originalLog = console.log.bind(console)
    console.log = function (msg) {
      if (msg.includes('Worker crashed')) {
        workerCrashed = true
      }
      originalLog(msg)
    }
    try {
      await reporter2.render({
        template: {
          engine: 'helpers2',
          content: 'foo',
          recipe: 'html',
          helpers: `async function a1() {
            await new Promise((resolve) => setTimeout(resolve, 100))
            throw new Error('x')
          }
          function a2() {
            throw new Error('a2')
          }`
        }
      })
    } catch (e) {
    }

    await new Promise((resolve) => setTimeout(resolve, 300))
    await reporter2.close()
    console.log = originalLog
    workerCrashed.should.be.false()
  })

  it('should expose jsreport.templatingEngines.createStream', async () => {
    const res = await reporter.render({
      template: {
        content: 'content',
        helpers: `async function a() {
          const jsreport = require('jsreport-proxy')
          const stream = await jsreport.templatingEngines.createStream()
          await stream.write('hello')
          return await stream.toResult()
        }`,
        engine: 'helpers',
        recipe: 'html'
      }
    })

    should(res.content.toString()).containEql('hello')
  })

  it('should fail when jsreport.templatingEngines.createStream called more than 100x', () => {
    return reporter.render({
      template: {
        content: 'content',
        helpers: `async function a() {
          const jsreport = require('jsreport-proxy')
          let r = ''
          for (let i = 0; i < 1005; i++) {
            const stream = await jsreport.templatingEngines.createStream()
            await stream.write('hello')
            r += await stream.toResult()
          }
          return r
        }`,
        engine: 'helpers',
        recipe: 'html'
      }
    }).should.be.rejectedWith(/max/)
  })
})

function createReporter (options) {
  const reporter = core(extend(true, { discover: false }, options))

  reporter.use({
    name: 'engine-testing',
    directory: __dirname,
    main: 'engineExtMain.js',
    worker: 'engineExtWorker.js'
  })

  return reporter
}
