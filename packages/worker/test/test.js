const path = require('path')
const Worker = require('../')
require('should')
const jsreport = require('@jsreport/jsreport-core')
const axios = require('axios')
const serializator = require('serializator')

const workerTempDirectory = path.join(require('os').tmpdir(), 'test-jsreport-worker')
const workerTempAutoCleanupDirectory = path.join(workerTempDirectory, 'autocleanup')

describe('worker', () => {
  let worker
  let reporter

  beforeEach(async () => {
    reporter = await jsreport()
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-chrome-pdf')())
      .use(require('@jsreport/jsreport-docker-workers')({
        customContainersPoolFactory: () => {
          return {
            containers: [{
              id: 'a',
              remove: () => {},
              restart: () => {},
              url: 'http://localhost:3000'
            }],
            start: () => {},
            remove: () => {}
          }
        }
      })).init()

    worker = Worker({
      overwriteExtensionPaths: false,
      httpPort: 3000,
      tempDirectory: workerTempDirectory,
      tempAutoCleanupDirectory: workerTempAutoCleanupDirectory
    })
    await worker.init()

    const serializedData = serializator.serialize({
      workerOptions: reporter.dockerManager.workerOptions,
      workerSystemOptions: reporter.dockerManager.workerSystemOptions
    })

    await axios({
      method: 'POST',
      url: 'http://localhost:3000',
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      responseType: 'text',
      transformResponse: [data => data],
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(serializedData)
      },
      data: serializedData
    })
  })

  afterEach(async () => {
    await reporter.close()
    await worker.close()
  })

  it('should be able to render basic template', async () => {
    const res = await reporter.render({
      template: {
        content: 'hello',
        engine: 'none',
        recipe: 'html'
      }
    })
    res.content.toString().should.be.eql('hello')
  })

  it('should propagate errors from engines', async () => {
    try {
      await
      reporter.render({
        template: {
          content: '{{#each}}',
          engine: 'handlebars',
          recipe: 'html'
        }
      })
      throw new Error('should have failed')
    } catch (e) {
      e.message.should.containEql('{{#each')
      e.stack.should.containEql('handlebars')
      e.weak.should.be.eql(true)
    }
  })

  it('should be able to render from string', async () => {
    const res = await reporter.render(
      {
        rawContent: JSON.stringify({
          template: {
            content: '{{message}}',
            engine: 'handlebars',
            recipe: 'html'
          },
          data: {
            message: 'hello'
          }
        })
      })
    res.content.toString().should.be.eql('hello')
  })
})

describe('worker with small timeout', () => {
  let worker
  let reporter

  beforeEach(async () => {
    reporter = await jsreport({
      reportTimeout: 500
    })
      .use(jsreport.tests.listeners())
      .use(require('@jsreport/jsreport-docker-workers')({
        customContainersPoolFactory: () => {
          return {
            containers: [{
              id: 'a',
              tempAutoCleanupLocalDirectoryPath: workerTempAutoCleanupDirectory,
              remove: () => {},
              restart: () => {},
              url: 'http://localhost:3000'
            }],
            start: () => {},
            remove: () => {}
          }
        }
      })).init()

    worker = Worker({
      overwriteExtensionPaths: false,
      httpPort: 3000,
      tempDirectory: workerTempDirectory,
      tempAutoCleanupDirectory: workerTempAutoCleanupDirectory
    })
    await worker.init()

    const serializedData = serializator.serialize({
      workerOptions: reporter.dockerManager.workerOptions,
      workerSystemOptions: reporter.dockerManager.workerSystemOptions
    })

    await axios({
      method: 'POST',
      url: 'http://localhost:3000',
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      responseType: 'text',
      transformResponse: [data => data],
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(serializedData)
      },
      data: serializedData
    })
  })

  afterEach(async () => {
    await reporter.close()
    await worker.close()
  })

  it('should not hang when main action hangs', async () => {
    reporter.registerMainAction('test-freeze', async (spec, originalReq) => {
      return new Promise((resolve) => {})
    })

    reporter.tests.beforeRenderEval((req, res, { reporter }) => {
      return reporter.executeMainAction('test-freeze', {}, req)
    })

    return reporter.render({
      template: {
        content: 'hello',
        engine: 'none',
        recipe: 'html'
      }
    }).should.be.rejectedWith(/Timeout when communicating with worker/)
  })
})
