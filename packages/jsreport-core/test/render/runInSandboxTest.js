const path = require('path')
const should = require('should')
const jsreport = require('../../index')

describe('sandbox', () => {
  let reporter

  const FILE_IN_WORKER_MAIN_DIR = 'callbacksQueue.js'
  process.env.FILE_IN_WORKER_MAIN_DIR = FILE_IN_WORKER_MAIN_DIR

  describe('safe', () => {
    beforeEach(async () => {
      reporter = jsreport()
      reporter.use(jsreport.tests.listeners())

      await reporter.init()
    })

    common(true)
  })

  describe('unsafe', () => {
    beforeEach(async () => {
      reporter = jsreport({ trustUserCode: true })
      reporter.use(jsreport.tests.listeners())

      await reporter.init()
    })

    common(false)
  })

  describe('isolated require - safe', () => {
    const options = { safe: true, isolate: true }

    beforeEach(async () => {
      reporter = createReporterForRequireTests(options)
      await reporter.init()
    })

    commonRequire(options)
  })

  describe('isolated require - unsafe', () => {
    const options = { safe: false, isolate: true }

    beforeEach(async () => {
      reporter = createReporterForRequireTests(options)
      await reporter.init()
    })

    commonRequire(options)
  })

  describe('standard require - safe', () => {
    const options = { safe: true, isolate: false }

    beforeEach(async () => {
      reporter = createReporterForRequireTests(options)
      await reporter.init()
    })

    commonRequire(options)
  })

  describe('standard require - unsafe', () => {
    const options = { safe: false, isolate: false }

    beforeEach(async () => {
      reporter = createReporterForRequireTests(options)
      await reporter.init()
    })

    commonRequire(options)
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  after(() => {
    delete process.env.FILE_IN_WORKER_MAIN_DIR
  })

  function common (safe) {
    it('should be able to read normal sandbox props', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: 'foo'
          },
          userCode: '',
          executionFn: ({ context }) => {
            return `${context.a}_end`
          }
        }, req)
        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('foo_end')
    })

    it('should be able to set normal sandbox props', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: 'foo'
          },
          userCode: 'a = \'value\'',
          executionFn: ({ context }) => {
            return context.a
          }
        }, req)
        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('value')
    })

    it('should be able to set normal nested sandbox props', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: {
              b: 'a'
            }
          },
          userCode: "a.b = 'x';",
          executionFn: ({ context }) => {
            return context.a.b
          }
        }, req)
        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      res.content.toString().should.be.eql('x')
    })

    it('should be able to set props with sandboxReadOnly=false', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: 'a'
          },
          userCode: "a = 'x';",
          executionFn: ({ context }) => {
            return context.a
          },
          propertiesConfig: {
            a: {
              sandboxReadOnly: false
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      res.content.toString().should.be.eql('x')
    })

    it('should hide simple props', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: 'foo'
          },
          userCode: 'this.b = typeof a',
          executionFn: ({ context }) => {
            return context.b
          },
          propertiesConfig: {
            a: {
              sandboxHidden: true
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      res.content.toString().should.be.eql('undefined')
    })

    it('should hide nested props', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: { b: 'foo' }
          },
          userCode: 'this.b = typeof a.b',
          executionFn: ({ context }) => {
            return context.b
          },
          propertiesConfig: {
            'a.b': {
              sandboxHidden: true
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      res.content.toString().should.be.eql('undefined')
    })

    it('should make top level prop readonly', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: { b: { c: 'foo' } }
          },
          userCode: 'a.b.d = "add"',
          executionFn: ({ context }) => {
            return JSON.stringify(context.a.b)
          },
          propertiesConfig: {
            'a.b': {
              sandboxReadOnly: true
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      return reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      }).should.be.rejectedWith(/Can't add/)
    })

    it('should make simple props readonly', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: { b: 'foo' }
          },
          userCode: 'a.b = "change"',
          executionFn: ({ context }) => {
            return context.a.b
          },
          propertiesConfig: {
            'a.b': {
              sandboxReadOnly: true
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      return reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      }).should.be.rejectedWith(/Can't modify read only property/)
    })

    it('should make props readonly one level recursively', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: { b: { c: 'foo' } }
          },
          userCode: 'a.b.c = "change"',
          executionFn: ({ context }) => {
            return context.a.b
          },
          propertiesConfig: {
            'a.b': {
              sandboxReadOnly: true
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      return reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      }).should.be.rejectedWith(/Can't add or modify/)
    })

    it('should make props readonly deeply', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: { b: { c: 'foo' } }
          },
          userCode: 'a.b.bar = "change"',
          executionFn: ({ context }) => {
            return JSON.stringify(context.a.b)
          },
          propertiesConfig: {
            a: {
              sandboxReadOnly: true
            },
            'a.b': {
              sandboxReadOnly: true
            },
            'a.b.c': {
              sandboxHidden: true
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      return reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      }).should.be.rejectedWith(/Can't add or modify/)
    })

    it('should make props readonly deeply #2', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: { b: { c: { d: 'foo' } } }
          },
          userCode: 'a.b.bar = "change"',
          executionFn: ({ context }) => {
            return JSON.stringify(context.a.b)
          },
          propertiesConfig: {
            'a.b': {
              sandboxReadOnly: true
            },
            'a.b.c': {
              sandboxReadOnly: true
            },
            'a.b.c.d': {
              sandboxHidden: true
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      return reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      }).should.be.rejectedWith(/Can't add or modify/)
    })

    it('should allow configure top level and inner level properties at the same time', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: { b: { c: 'foo' } }
          },
          userCode: 'globalThis.b = typeof a.b.c',
          executionFn: ({ context }) => {
            return context.b
          },
          propertiesConfig: {
            'a.b': {
              sandboxReadOnly: true
            },
            'a.b.c': {
              sandboxHidden: true
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('undefined')

      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: { b: { c: 'foo' } }
          },
          userCode: 'a.b.c = "change"',
          executionFn: ({ context }) => {
            return context.b
          },
          propertiesConfig: {
            'a.b': {
              sandboxReadOnly: true
            },
            'a.b.c': {
              sandboxHidden: true
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      return reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      }).should.be.rejectedWith(/Can't add or modify/)
    })

    it('should allow configure top level as read only and inner level as hidden deeply at the same time', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: { b: { c: 'foo' } }
          },
          userCode: 'globalThis.b = typeof a.b.c',
          executionFn: ({ context }) => {
            return context.b
          },
          propertiesConfig: {
            a: {
              sandboxReadOnly: true
            },
            'a.b': {
              sandboxReadOnly: true
            },
            'a.b.c': {
              sandboxHidden: true
            }
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('undefined')
    })

    it('should not fail when configuring top level and inner level properties but parent value is empty', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: {}
          },
          userCode: '',
          executionFn: ({ context }) => {
            return typeof context.a
          },
          propertiesConfig: {
            'a.b': {
              sandboxReadOnly: true
            },
            'a.b.c': {
              sandboxHidden: true
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('object')
    })

    it('restore should reveal hidden props', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const sandboxManager = {}
        const r = await reporter.runInSandbox({
          manager: sandboxManager,
          context: {
            a: { b: 'foo' }
          },
          userCode: '',
          executionFn: ({ context }) => {
            const beforeRestore = typeof context.a.b
            const restoredContext = sandboxManager.restore()
            const afterRestore = typeof restoredContext.a.b

            return beforeRestore + afterRestore
          },
          propertiesConfig: {
            'a.b': {
              sandboxHidden: true
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('undefinedstring')
    })

    it('be able to stringify object when non-existent properties are configured', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            a: { b: 'foo' }
          },
          userCode: '',
          executionFn: ({ context }) => {
            return JSON.stringify(context)
          },
          propertiesConfig: {
            'a.d': {
              sandboxHidden: true
            },
            'a.c': {
              sandboxReadOnly: true
            }
          }
        }, req)
        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })
      res.content.toString().should.containEql('foo')
    })

    it('should be able to use Buffer', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {},
          userCode: "this.result = Buffer.from('xxx').toString()",
          executionFn: ({ context }) => {
            return context.result
          }
        }, req)
        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      should(res.content.toString()).be.eql('xxx')
    })

    it('should be able to use Date', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {},
          userCode: `this.result = { now: Date.now(), customDateStr: new Date('${req.data.dateInputStr}').toString() }`,
          executionFn: ({ context }) => {
            return context.result
          }
        }, req)

        res.content = Buffer.from(JSON.stringify(r))
      })

      const dateInputStr = '2023-08-23'

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        },
        data: {
          dateInputStr
        }
      })

      const output = JSON.parse(res.content.toString())

      should(output.now).be.Number()
      should(output.customDateStr).be.eql(new Date(dateInputStr).toString())
    })

    it('should be able to use Math', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {},
          userCode: 'this.result = { min: Math.min(1, 2), random: Math.random() }',
          executionFn: ({ context }) => {
            return context.result
          }
        }, req)

        res.content = Buffer.from(JSON.stringify(r))
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const output = JSON.parse(res.content.toString())

      should(output.min).be.eql(1)
      should(output.random).be.Number()
    })

    it('should be able to use Intl', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {},
          userCode: `
            const numberFormatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
            const dateFormatter = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
            this.result = { penAmountStr: numberFormatter.format(1125.50), shortDateStr: dateFormatter.format(new Date('2023-08-23T00:00:00.000-05:00')) }
          `,
          executionFn: ({ context }) => {
            return context.result
          }
        }, req)

        res.content = Buffer.from(JSON.stringify(r))
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const output = JSON.parse(res.content.toString())

      should(output.penAmountStr).be.eql('S/\u00A01,125.50')
      should(output.shortDateStr).be.eql('23 de agosto de 2023')
    })

    it('should be able to use setTimeout/clearTimeout', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {},
          userCode: `
            const value = await new Promise((resolve) => setTimeout(() => resolve(1), 300))
            this.result = { value, clearExists: typeof clearTimeout === 'function' }
          `,
          executionFn: ({ context }) => {
            return context.result
          }
        }, req)

        res.content = Buffer.from(JSON.stringify(r))
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const output = JSON.parse(res.content.toString())

      should(output.value).be.eql(1)
      should(output.clearExists).be.True()
    })

    if (safe) {
      it('should prevent constructor hacks', async () => {
        reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
          const r = await reporter.runInSandbox({
            context: {},
            userCode: 'this.constructor.constructor(\'return process\')().exit()',
            executionFn: ({ context }) => {
              return JSON.stringify(context)
            },
            propertiesConfig: {
              'a.d': {
                sandboxHidden: true
              },
              'a.c': {
                sandboxReadOnly: true
              }
            }
          }, req)
          res.content = Buffer.from(r)
        })

        return reporter.render({
          template: {
            engine: 'none',
            content: ' ',
            recipe: 'html'
          }
        }).should.be.rejectedWith(/(process is not defined)|(is not a valid constructor)/)
      })

      it('should prevent constructor hacks #2', async () => {
        reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
          const r = await reporter.runInSandbox({
            context: {},
            userCode: `
              function stack() {
                new Error().stack;
                stack();
              }

              try {
                stack();
              } catch (e) {
                console.log(e.constructor.constructor("return process")())
              }
            `,
            executionFn: ({ context }) => {
              return JSON.stringify(context)
            }
          }, req)
          res.content = Buffer.from(r)
        })

        return reporter.render({
          template: {
            engine: 'none',
            content: ' ',
            recipe: 'html'
          }
        }).should.be.rejectedWith(/(process is not defined)|(is not a valid constructor)/)
      })

      it('should prevent constructor hacks #3', async () => {
        reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
          const r = await reporter.runInSandbox({
            context: {},
            userCode: `
              function getRandom() {
                Error.prepareStackTrace = (e, frames) => {
                  frames.constructor.constructor('return process')().mainModule.require('child_process').execSync('testing');
                };
                (async() => {}).constructor('return process')()
                return Math.random()
              }

              getRandom()
            `,
            executionFn: ({ context }) => {
              return JSON.stringify(context)
            }
          }, req)
          res.content = Buffer.from(r)
        })

        return reporter.render({
          template: {
            engine: 'none',
            content: ' ',
            recipe: 'html'
          }
        }).should.be.rejectedWith(/(process is not defined)|(is not a valid constructor)/)
      })
    }

    it('should allow top level await in sandbox eval', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {},
          userCode: 'await new Promise((resolve) => resolve()); globalThis.a = "foo"',
          executionFn: ({ context }) => {
            return context.a
          }
        }, req)
        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })
      res.content.toString().should.be.eql('foo')
    })

    it('should not fail if code ends with comments', async () => {
      return should(reporter.render({
        template: {
          engine: 'none',
          content: 'test',
          recipe: 'html',
          helpers: '// await'
        }
      })).not.be.rejected()
    })
  }

  function commonRequire ({ safe, isolate }) {
    // these tests in the region are just here to document how the constructors
    // and instanceof checks already work in the current implementation,
    // when we decide to change the implementation
    // (perhaps when node vm gets better and let us isolate more things)
    // we can use these tests to decide
    // how much it will affect user code
    // #region constructors-checks
    it('instanceof checks', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null
          },
          userCode: `
            const createStringObject = require('moduleCreateStringObject')
            const strObj = createStringObject(2)
            RESULT = strObj instanceof String
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({ result: context.RESULT })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const result = JSON.parse(res.content).result

      should(result).be.eql(safe)
    })

    it('constructor compare', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null
          },
          userCode: `
            const getNumberFromModule = require('moduleGetNumberConstructor')
            const NumberFromModule = getNumberFromModule()
            RESULT = Number === NumberFromModule
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({ result: context.RESULT })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const result = JSON.parse(res.content).result

      should(result).be.eql(safe)
    })

    it('error from builtin module', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null
          },
          userCode: `
            const fs = require('fs')

            try {
              fs.readFileSync('/some/faulty/path', 'utf8')
            } catch (error) {
              RESULT = error instanceof Error
            }
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({ result: context.RESULT })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const result = JSON.parse(res.content).result

      should(result).be.eql(safe)
    })
    // #endregion

    it('throw error when passing invalid args', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            ERROR_TYPE: null,
            ERROR_ARG: null
          },
          userCode: `
            try {
              require(true)
            } catch (err) {
              ERROR_TYPE = err.message
            }

            try {
              require('')
            } catch (err) {
              ERROR_ARG = err.message
            }
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              errorType: context.ERROR_TYPE,
              errorArg: context.ERROR_ARG
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { errorType, errorArg } = JSON.parse(res.content)

      should(errorType != null).be.eql(true, 'expected error about type to exists')

      should(errorType).containEql(safe ? 'module has been blocked' : 'must be of type string')

      should(errorArg != null).be.eql(true, 'expected error about arg value to exists')

      should(errorArg).containEql(safe ? 'module has been blocked' : 'must be a non-empty string')
    })

    it('relative module should not resolve from worker main module as the starting point', async () => {
      reporter.tests.afterRenderEval(async (req, res, { mainModuleFilename, require: workerRequire, reporter }) => {
        const workProcess = workerRequire('process')
        const workerPath = workerRequire('path')
        const workerFs = workerRequire('fs')
        const workerMainDir = workerPath.dirname(mainModuleFilename)

        if (workProcess.env.FILE_IN_WORKER_MAIN_DIR == null) {
          throw new Error('FILE_IN_WORKER_MAIN_DIR env var is not defined in worker, check this variable is set as env var in this test file')
        }

        const workerFileInMainDir = workProcess.env.FILE_IN_WORKER_MAIN_DIR

        const workerFileExists = workerFs.existsSync(workerPath.join(workerMainDir, workerFileInMainDir))

        if (!workerFileExists) {
          throw new Error(`File ${workerFileInMainDir} not found in worker main module directory ${workerMainDir}. perhaps there was a refactor and we need to update test with a file that exists in the worker main module directory`)
        }

        const r = await reporter.runInSandbox({
          context: {
            RESULT: null,
            ERROR_MESSAGE: null
          },
          userCode: `
            RESULT = false

            try {
              const pkg = require('./${workerFileInMainDir}')
              RESULT = true
            } catch (err) {
              ERROR_MESSAGE = err.message
            }
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              result: context.RESULT,
              errorMessage: context.ERROR_MESSAGE
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { result, errorMessage } = JSON.parse(res.content)

      should(result).be.False(`expected module "./${FILE_IN_WORKER_MAIN_DIR}" to not be found`)
      should(errorMessage).be.String()
      should(errorMessage).startWith(`Unable to find module ./${FILE_IN_WORKER_MAIN_DIR}`, 'expected error message to start with specific format')
    })

    it('relative module should resolve from rootDirectory', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null,
            PATHS: null
          },
          userCode: `
            RESULT = false

            try {
              const pkg = require('./modulePathsExport.js')
              RESULT = true
              PATHS = pkg()
            } catch (err) {}
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              result: context.RESULT,
              paths: context.PATHS
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { result, paths } = JSON.parse(res.content)

      should(result).be.True('expected module "./modulePathsExport.js" to be found')
      should(paths.filename).be.eql(path.join(reporter.options.rootDirectory, 'modulePathsExport.js'))
      should(paths.dirname).be.eql(reporter.options.rootDirectory)
    })

    it('module that has #shebang in code should work', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null,
            CONTENT: null
          },
          userCode: `
            RESULT = false

            try {
              const pkg = require('moduleWithShebang')
              RESULT = true
              CONTENT = pkg(1, 2)
            } catch (err) {}
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              result: context.RESULT,
              content: context.CONTENT
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { result, content } = JSON.parse(res.content)

      should(result).be.True('expected module "moduleWithShebang" to be required normally')
      should(content).be.eql(3, 'expected content to be number')
    })

    it('module that uses builtin module should work', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null
          },
          userCode: `
            RESULT = false

            try {
              require('moduleWithBuiltin')
              RESULT = true
            } catch (err) {}
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              result: context.RESULT
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { result } = JSON.parse(res.content)

      should(result).be.True('expected module "moduleWithBuiltin" to be required normally')
    })

    it('module that uses node:builtin module should work', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null
          },
          userCode: `
            RESULT = false

            try {
              require('moduleWithNodeBuiltin')
              RESULT = true
            } catch (err) {}
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              result: context.RESULT
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { result } = JSON.parse(res.content)

      should(result).be.True('expected module "moduleWithNodeBuiltin" to be required normally')
    })

    it('throw error when requiring .mjs module', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null,
            ERR_MSG: null
          },
          userCode: `
            RESULT = false

            try {
              require('moduleWithMJS')()
            } catch (err) {
              RESULT = true
              ERR_MSG = err.message
            }
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              result: context.RESULT,
              errMsg: context.ERR_MSG
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { result, errMsg } = JSON.parse(res.content)

      should(result).be.True('expected module "moduleWithMJS" to not be required normally')
      should(errMsg).containEql('require() of ES Module')
      should(errMsg).containEql('not supported')
    })

    it('throw error when requiring .js that has the scope of type: module in its package.json', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null,
            ERR_MSG: null
          },
          userCode: `
            RESULT = false

            try {
              require('module-with-type-module/index.cjs')()
            } catch (err) {
              RESULT = true
              ERR_MSG = err.message
            }
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              result: context.RESULT,
              errMsg: context.ERR_MSG
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { result, errMsg } = JSON.parse(res.content)

      should(result).be.True('expected module "module-with-type-module" to not be required normally')
      should(errMsg).containEql('require() of ES Module')
      should(errMsg).containEql('not supported')
    })

    it('module that uses .json file should work', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null,
            CONTENT: null
          },
          userCode: `
            RESULT = false

            try {
              const pkg = require('moduleWithJSON')
              RESULT = true
              CONTENT = pkg
            } catch (err) {}
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              result: context.RESULT,
              content: context.CONTENT
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { result, content } = JSON.parse(res.content)

      should(result).be.True('expected module "moduleWithJSON" to be required normally')
      should(typeof content).be.eql('object', 'expected module export to be object')
      should(content.test).be.True('expected module export .test be true')
    })

    it('module that uses .cjs file should work', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null,
            CONTENT: null
          },
          userCode: `
            RESULT = false

            try {
              const pkg = require('moduleWithCJS')
              RESULT = true
              CONTENT = pkg(1, 2)
            } catch (err) {}
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              result: context.RESULT,
              content: context.CONTENT
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { result, content } = JSON.parse(res.content)

      should(result).be.True('expected module "moduleWithCJS" to be required normally')
      should(content).be.eql(3, 'expected content to be number')
    })

    it('module that uses .node file should work', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null,
            CONTENT: null
          },
          userCode: `
            RESULT = false

            try {
              const pkg = require('moduleWithAddon')
              RESULT = true
              CONTENT = await pkg()
            } catch (err) {}
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              result: context.RESULT,
              content: context.CONTENT
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { result, content } = JSON.parse(res.content)

      should(result).be.True('expected module "moduleWithAddon" to be required normally')
      should(typeof content).be.eql('string', 'expected content to be string')
    })

    it('module with circular dependencies should work', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null,
            CONTENT: null
          },
          userCode: `
            RESULT = false

            try {
              const pkg = require('module-with-circular-dependencies/main.js')
              RESULT = true
              CONTENT = pkg
            } catch (err) {}
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              result: context.RESULT,
              content: context.CONTENT
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { result, content } = JSON.parse(res.content)

      should(result).be.True('expected module "module-with-circular-dependencies" to be required normally')
      should(content.a).be.eql(true, 'expected content.a to be true')
      should(content.b).be.eql(true, 'expected content.b to be true')
    })

    it('complex module with circular dependencies should work', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            RESULT: null
          },
          userCode: `
            RESULT = false

            try {
              const pkg = require('request')
              RESULT = true
            } catch (err) {}
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              result: context.RESULT
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { result } = JSON.parse(res.content)

      should(result).be.True('expected module "request" to be required normally')
    })

    it('module and require object should have standard properties', async () => {
      reporter.tests.afterRenderEval(async (req, res, { reporter }) => {
        const r = await reporter.runInSandbox({
          context: {
            CONTENT: null
          },
          userCode: `
            try {
              const pkg = require('modulePropertiesExport')
              CONTENT = pkg()
            } catch (err) {}
          `,
          executionFn: ({ context }) => {
            return JSON.stringify({
              content: context.CONTENT
            })
          }
        }, req)

        res.content = Buffer.from(r)
      })

      const res = await reporter.render({
        template: {
          engine: 'none',
          content: ' ',
          recipe: 'html'
        }
      })

      const { content } = JSON.parse(res.content)

      should(Object.keys(content.module)).matchEach((prop) => {
        // we don't tests module.parent when there is no isolation
        // because in isolated require we set that property different
        // than what node.js does it
        if (!isolate && prop === 'parent') {
          return
        }

        should(content.module[prop]).be.eql(true)
      })

      should(Object.keys(content.require)).matchEach((prop) => {
        should(content.require[prop]).be.eql(true)
      })
    })
  }

  function createReporterForRequireTests ({ safe, isolate } = {}) {
    if (safe == null) {
      throw new Error('safe param is required')
    }

    if (isolate == null) {
      throw new Error('isolate param is required')
    }

    const reporter = jsreport({
      rootDirectory: __dirname,
      appDirectory: __dirname,
      trustUserCode: !safe,
      sandbox: {
        isolateModules: isolate,
        allowedModules: [
          'fs',
          'node:fs',
          'request',
          'moduleCreateStringObject',
          'moduleGetNumberConstructor',
          'moduleWithBuiltin',
          'moduleWithNodeBuiltin',
          'moduleWithShebang',
          'moduleWithJSON',
          'moduleWithMJS',
          'module-with-type-module/index.cjs',
          'module-with-circular-dependencies/main.js',
          'moduleWithCJS',
          'moduleWithAddon',
          'modulePropertiesExport',
          './modulePathsExport.js',
          `./${FILE_IN_WORKER_MAIN_DIR}`
        ]
      }
    })

    reporter.use(jsreport.tests.listeners())

    return reporter
  }
})
