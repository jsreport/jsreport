const jsreport = require('@jsreport/jsreport-core')
const os = require('os')
const path = require('path')
const Koa = require('koa')
const serializator = require('serializator')
const should = require('should')

function createPool ({
  port,
  numberOfWorkers
}) {
  const containers = []
  for (let i = 1; i <= (numberOfWorkers || 2); i++) {
    const container = {
      id: i,
      tempAutoCleanupLocalDirectoryPath: path.join(os.tmpdir(), 'jsreport', 'autocleanup'),
      url: `http://localhost:${port + i}`
    }
    containers.push(container)
    container.app = new Koa()
    container.app.use(require('koa-bodyparser')({
      enableTypes: ['text']
    }))

    container._handleReq = async (ctx) => {
      ctx.response.status = 201
      ctx.body = serializator.serialize({
        content: Buffer.from('from worker ' + i)
      })
    }
    container.handleReq = (fn) => (container._handleReq = fn)
    container.app.use((ctx) => container._handleReq(ctx))

    container.server = container.app.listen(port + i)
    container.remove = () => container.server.close()
    container.restart = () => {}
  }

  return {
    containers,
    start: () => {},
    remove: () => {
      for (const c of containers) {
        c.remove()
      }
    }
  }
}

describe('docker manager', () => {
  let reporter
  let containers
  beforeEach(() => {
    const pool = createPool({
      port: 5000
    })
    containers = pool.containers

    reporter = jsreport()
      .use(require('../')({
        customContainersPoolFactory: () => pool,
        discriminatorPath: 'context.tenant'
      }))
      .use(require('@jsreport/jsreport-express')())
      .use(jsreport.tests.listeners())

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should be able to render report', async () => {
    let allocated = false
    let executed = false
    containers[0].handleReq(async (ctx) => {
      const reqData = serializator.parse(ctx.request.rawBody)
      if (!allocated) {
        reqData.systemAction.should.be.eql('allocate')
        ctx.response.status = 201
        ctx.body = '{}'
        allocated = true
      } else {
        if (!executed) {
          reqData.actionName.should.be.eql('render')
          reqData.req.template.content.should.be.eql('hello')
          ctx.response.status = 201
          ctx.body = serializator.serialize({
            content: Buffer.from('from worker')
          })
          executed = true
        } else {
          reqData.systemAction.should.be.eql('release')
          ctx.response.status = 201
          ctx.body = '{}'
        }
      }
    })

    const res = await reporter.render({
      template: {
        recipe: 'html',
        engine: 'none',
        content: 'hello'
      },
      context: {
        tenant: 'a'
      }
    })
    res.content.toString().should.be.eql('from worker')
  })

  it('should be able to render report through string based request', async () => {
    let allocated = false
    let executed = false
    let parsed = false
    containers[0].handleReq(async (ctx) => {
      const reqData = serializator.parse(ctx.request.rawBody)
      if (!allocated) {
        reqData.systemAction.should.be.eql('allocate')
        ctx.response.status = 201
        ctx.body = '{}'
        allocated = true
        return
      }

      if (!executed) {
        if (!parsed) {
          reqData.actionName.should.be.eql('parse')
          ctx.response.status = 201
          ctx.body = serializator.serialize({
            ...JSON.parse(reqData.req.rawContent),
            context: reqData.req.context
          })
          parsed = true
          return
        } else {
          reqData.actionName.should.be.eql('render')
          reqData.req.template.content.should.be.eql('hello')
          ctx.response.status = 201
          ctx.body = serializator.serialize({
            content: Buffer.from('from worker')
          })
          executed = true
          return
        }
      }
      reqData.systemAction.should.be.eql('release')
      ctx.response.status = 201
      ctx.body = '{}'
    })

    const res = await reporter.render({
      rawContent: JSON.stringify({
        template: {
          recipe: 'html',
          engine: 'none',
          content: 'hello'
        }
      }),
      context: {
        tenant: 'a'
      }
    })
    res.content.toString().should.be.eql('from worker')
  })

  it('should be able to callback to main', async () => {
    containers[0].handleReq(async (ctx) => {
      const reqData = serializator.parse(ctx.request.rawBody)
      if (reqData.actionName === 'render') {
        ctx.response.status = 200
        ctx.body = serializator.serialize({
          actionName: 'documentStore.collection.insert',
          data: {
            collection: 'templates',
            doc: {
              recipe: 'html',
              engine: 'none',
              content: 'from worker',
              name: 'from worker'
            }
          }
        })
      } else {
        ctx.response.status = 201
        ctx.body = serializator.serialize({
          content: Buffer.from('from worker')
        })
      }
    })

    await reporter.render({
      template: {
        recipe: 'html',
        engine: 'none',
        content: 'hello'
      },
      context: {
        tenant: 'a'
      }
    })
    const template = reporter.documentStore.collection('templates').findOne({
      name: 'from worker'
    })
    template.should.be.ok()
  })

  it('should find LRU worker', async () => {
    containers[0].lastUsed = new Date()
    containers[1].lastUsed = new Date(Date.now() - 60000)

    const res = await reporter.render({
      template: {
        recipe: 'html',
        engine: 'none',
        content: 'hello'
      },
      context: {
        tenant: 'a'
      }
    })

    res.content.toString().should.be.eql('from worker 2')
  })

  it('should set tenant to worker ip', async () => {
    await reporter.render({
      template: {
        recipe: 'html',
        engine: 'none',
        content: 'hello'
      },
      context: {
        tenant: 'a'
      }
    })

    const tenantWorker = await reporter.documentStore.internalCollection('tenantWorkers').findOne({
      tenant: 'a',
      stack: reporter.options.stack
    })

    tenantWorker.should.be.ok()
    tenantWorker.ip.should.be.eql(reporter.options.ip)
  })

  it('should release the last used worker when all workers allocated', async () => {
    await reporter.render({
      template: {
        recipe: 'html',
        engine: 'none',
        content: 'hello'
      },
      context: {
        tenant: 'a'
      }
    })

    await reporter.render({
      template: {
        recipe: 'html',
        engine: 'none',
        content: 'hello'
      },
      context: {
        tenant: 'b'
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    const tenantWorker = await reporter.documentStore.internalCollection('tenantWorkers').findOne({
      tenant: 'a',
      stack: reporter.options.stack
    })

    should(tenantWorker).be.null()
  })

  it('should run two parallel requests for tenant', () => {
    return Promise.all([
      reporter.render({
        template: {
          recipe: 'html',
          engine: 'none',
          content: 'hello'
        },
        context: {
          tenant: 'a'
        }
      }),
      reporter.render({
        template: {
          recipe: 'html',
          engine: 'none',
          content: 'hello'
        },
        context: {
          tenant: 'a'
        }
      })
    ])
  })

  it('should queue request when all workers are busy', async () => {
    let queued = false
    const busyQueue = reporter.dockerManager.containersManager.busyQueue
    const originalPush = busyQueue.push.bind(busyQueue)
    busyQueue.push = (...args) => {
      queued = true
      return originalPush(...args)
    }
    await Promise.all([
      reporter.render({
        template: {
          recipe: 'html',
          engine: 'none',
          content: 'hello'
        },
        context: {
          tenant: 'a'
        }
      }),
      reporter.render({
        template: {
          recipe: 'html',
          engine: 'none',
          content: 'hello'
        },
        context: {
          tenant: 'b'
        }
      }),
      reporter.render({
        template: {
          recipe: 'html',
          engine: 'none',
          content: 'hello'
        },
        context: {
          tenant: 'c'
        }
      })
    ])

    queued.should.be.true()
  })

  it('should restart worker before switching from other tenant', async () => {
    containers[0].tenant = 'usedTenantA'
    containers[1].tenant = 'usedTenantB'

    await reporter.render({
      template: {
        recipe: 'html',
        engine: 'none',
        content: 'hello'
      },
      context: {
        tenant: 'c'
      }
    })

    containers[0].numberOfRestarts.should.be.eql(1)
  })

  it('should restart last used worker after process', async () => {
    await reporter.render({
      template: {
        recipe: 'html',
        engine: 'none',
        content: 'hello'
      },
      context: {
        tenant: 'a'
      }
    })
    await reporter.render({
      template: {
        recipe: 'html',
        engine: 'none',
        content: 'hello'
      },
      context: {
        tenant: 'b'
      }
    })

    // warming next old container is async
    await new Promise((resolve) => setTimeout(resolve, 200))
    containers[0].numberOfRestarts.should.be.eql(1)
  })

  it('should restart if worker response doesnt have week attribute', async () => {
    containers[0].handleReq(async (ctx) => {
      const reqData = serializator.parse(ctx.request.rawBody)
      if (reqData.actionName === 'render') {
        ctx.status = 500
        ctx.body = serializator.serialize({
          message: 'handlebars failure'
        })
      } else {
        ctx.status = 201
        ctx.body = '{}'
      }
    })

    await reporter.render({
      template: {
        recipe: 'html',
        engine: 'none',
        content: 'hello'
      },
      context: {
        tenant: 'a'
      }
    }).should.be.rejected()

    containers[0].numberOfRestarts.should.be.eql(1)
  })

  it('should not restart if worker response have week attribute', async () => {
    containers[0].handleReq(async (ctx) => {
      ctx.status = 400
      ctx.body = serializator.serialize({
        message: 'handlebars failure',
        weak: true
      })
    })

    await reporter.render({
      template: {
        recipe: 'html',
        engine: 'none',
        content: 'hello'
      },
      context: {
        tenant: 'a'
      }
    }).should.be.rejected()

    containers[0].numberOfRestarts.should.be.eql(0)
  })

  describe('remote', () => {
    let remoteReporter
    let remoteContainers
    const remoteIp = '127.0.0.1'
    beforeEach(async () => {
      const pool = createPool({
        port: 6000
      })
      remoteContainers = pool.containers

      remoteReporter = jsreport({
        ip: remoteIp,
        httpPort: 5489
      })
        .use(require('../')({
          customContainersPoolFactory: () => pool,
          discriminatorPath: 'context.tenant'
        }))
        .use(require('@jsreport/jsreport-express')())
        .use(jsreport.tests.listeners())

      await remoteReporter.init()

      await reporter.documentStore.internalCollection('servers').update({
        ip: remoteIp,
        stack: reporter.options.stack
      }, {
        $set: {
          ip: remoteIp,
          ping: new Date(),
          stack: reporter.options.stack
        }
      }, { upsert: true })

      await reporter.dockerManager.serversChecker.refreshServersCache()
      await remoteReporter.dockerManager.serversChecker.refreshServersCache()
    })

    afterEach(() => remoteReporter.close())

    it('should proxy request to remote server when tenant has active worker', async () => {
      remoteContainers[0].handleReq(async (ctx) => {
        ctx.response.status = 201
        ctx.body = serializator.serialize({
          content: Buffer.from('from remote worker')
        })
      })

      await reporter.documentStore.internalCollection('tenantWorkers').insert({
        ip: remoteIp,
        port: 5489,
        stack: reporter.options.stack,
        tenant: 'a',
        updateAt: new Date()
      })

      const res = await reporter.render({
        template: {
          recipe: 'html',
          engine: 'none',
          content: 'hello'
        },
        context: {
          tenant: 'a'
        }
      })
      res.content.toString().should.be.eql('from remote worker')
    })

    it('should process request when tenant has worker assigned but it is not active', async () => {
      await reporter.documentStore.internalCollection('tenantWorkers').insert({
        ip: remoteIp,
        port: 5489,
        stack: reporter.options.stack,
        tenant: 'a',
        updateAt: new Date()
      })

      reporter.dockerManager.serversChecker.stopPingInterval()
      remoteReporter.dockerManager.serversChecker.stopPingInterval()

      await reporter.documentStore.internalCollection('servers').update({
        ip: remoteIp,
        stack: reporter.options.stack
      }, {
        $set: {
          // makes the server to fail the status check
          ping: new Date(Date.now() - 300000)
        }
      })

      await reporter.dockerManager.serversChecker.refreshServersCache()

      containers[0].handleReq(async (ctx) => {
        ctx.response.status = 201
        ctx.body = serializator.serialize({
          content: Buffer.from('from local worker')
        })
      })

      const res = await reporter.render({
        template: {
          recipe: 'html',
          engine: 'none',
          content: 'hello'
        },
        context: {
          tenant: 'a'
        }
      })

      res.content.toString().should.be.eql('from local worker')
    })
  })

  describe('servers checker', () => {
    it('current server should have ok status', () => reporter.dockerManager.serversChecker.status(reporter.options.ip).should.be.ok())
    it('not existing server should have false status', () => should(reporter.dockerManager.serversChecker.status('foo')).not.be.ok())

    it('current server should not be ok for healthyInterval 0', () => {
      reporter.dockerManager.serversChecker.healthyInterval = 0
      should(reporter.dockerManager.serversChecker.status('0.0.0.0')).not.be.ok()
    })
  })
})
