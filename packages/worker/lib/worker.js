const path = require('path')
const fs = require('fs')
const Koa = require('koa')
const nconf = require('nconf')
const serializator = require('serializator')
const WorkersManager = require('advanced-workers')
const WorkerRequest = require('./workerRequest')
const { Lock } = require('semaphore-async-await')
const camelCase = require('camelcase')
const bootstrapFiles = []
const currentRequests = {}

const rootDir = path.join(__dirname, '../bootstrap')

fs.readdirSync(rootDir).forEach((f) => {
  if (f.endsWith('.reporter.js')) {
    const bootstrapFile = path.join(rootDir, f)
    console.log(`found bootstrap file ${bootstrapFile}`)
    bootstrapFiles.push(bootstrapFile)
  }
})

const callbackLock = new Lock()

module.exports = (options = {}) => {
  const bootstrapExports = []

  if (bootstrapFiles.length > 0) {
    for (const file of bootstrapFiles) {
      try {
        bootstrapExports.push(require(file))
      } catch (e) {
        e.message = `Error while trying to require bootstrap file in ${file}. ${e.message}`
        throw e
      }
    }
  }

  options = nconf.overrides(options).argv().env({ separator: ':' }).env({ separator: '_' }).get()
  options.httpPort = options.httpPort || 2000

  if (options.workerDebuggingSession) {
    console.log('Debugging session is enabled')
  }

  options.workerInputRequestLimit = options.workerInputRequestLimit || '20mb'

  let workersManager

  const app = new Koa()

  app.on('error', err => {
    console.error('server error', err)
  })

  console.log(`worker input request limits is configured to: ${options.workerInputRequestLimit}`)

  app.use(require('koa-bodyparser')({
    enableTypes: ['text'],
    textLimit: options.workerInputRequestLimit
  }))

  app.use(async ctx => {
    if (ctx.method === 'GET') {
      ctx.body = 'ok'
      return
    }

    if (options.workerDebuggingSession) {
      // this line is useful for debugging, because it makes the request never
      // be aborted, which give us time to debug easily
      ctx.req.setTimeout(0)
    }

    let reqId
    try {
      const reqBody = serializator.parse(ctx.request.rawBody)

      if (!workersManager) {
        const workerOptions = reqBody.workerOptions
        for (const def of workerOptions.extensionsDefs) {
          if (options.overwriteExtensionPaths !== false) {
            def.directory = options.extensions[camelCase(def.name)]
          }

          if (!def.directory) {
            def.options.enabled = false
          }
          // the worker gets already merged configs so we cant it just have in ENV in dockerfile
          // TODO solve this somehow
          if (def.name === 'chrome-pdf') {
            def.options.launchOptions = {
              executablePath: 'google-chrome-stable',
              args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-dev-profile']
            }
          }
        }
        workerOptions.options.chrome = {
          ...workerOptions.options.chrome,
          launchOptions: {
            executablePath: 'google-chrome-stable',
            args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-dev-profile']
          }
        }

        workerOptions.options.tempDirectory = options.tempDirectory || '/tmp/jsreport'
        workerOptions.options.tempAutoCleanupDirectory = options.tempAutoCleanupDirectory || '/tmp/jsreport/autocleanup'
        await fs.promises.mkdir(workerOptions.options.tempDirectory, {
          recursive: true
        })
        await fs.promises.mkdir(workerOptions.options.tempAutoCleanupDirectory, {
          recursive: true
        })
        const workerSystemOptions = reqBody.workerSystemOptions
        workerSystemOptions.workerModule = require.resolve('@jsreport/jsreport-core/lib/worker/workerHandler.js')
        workersManager = WorkersManager(workerOptions, workerSystemOptions)
        await workersManager.init()
        ctx.body = '{}'
        return
      }

      reqId = reqBody?.req?.context?.rootId

      if (!reqId) {
        throw new Error('Wrong worker request body')
      }

      let workerRequest = currentRequests[reqId]

      if (!workerRequest) {
        const worker = await workersManager.allocate()
        workerRequest = currentRequests[reqId] = WorkerRequest({ uuid: reqId, data: reqBody, worker })
        ctx.body = '{}'
        ctx.status = 201
        ctx.set('Content-Type', 'text/plain')
        return
      }

      if (reqBody.systemAction === 'release') {
        await currentRequests[reqId].worker.release()
        delete currentRequests[reqId]
        ctx.body = '{}'
        ctx.status = 201
        ctx.set('Content-Type', 'text/plain')
        return
      }

      if (reqBody.systemAction === 'execute') {
        const actionResult = await workerRequest.process(() => {
          return workerRequest.worker.execute(reqBody, {
            timeout: reqBody.timeout,
            executeMain: async (data) => {
              try {
                await callbackLock.acquire()
                const r = await workerRequest.callback(data)
                return r
              } catch (e) {
                console.error('Error when invoking callback', e)
                throw e
              } finally {
                callbackLock.release()
              }
            }
          })
        })
        workersManager.convertUint8ArrayToBuffer(actionResult)
        ctx.body = serializator.serialize(actionResult)
        ctx.status = actionResult.actionName ? 200 : 201
        ctx.set('Content-Type', 'text/plain')
        return
      }

      if (reqBody.systemAction === 'callback-response') {
        const callbackResult = await workerRequest.processCallbackResponse({ data: reqBody.data })
        workersManager.convertUint8ArrayToBuffer(callbackResult)
        ctx.body = serializator.serialize(callbackResult)
        ctx.status = callbackResult.actionName ? 200 : 201
        ctx.set('Content-Type', 'text/plain')
        return
      }
    } catch (e) {
      console.error('Error when processing worker request', e)
      ctx.status = 400
      ctx.body = { message: e.message, stack: e.stack, ...e }
    }
  })

  Promise.all(bootstrapExports.map((bootstrapFn) => bootstrapFn({ todo: true })))

  return ({
    async init () {
      this.server = app.listen(options.httpPort)
    },
    async close () {
      this.server.close()
      await workersManager.close()
    }
  })
}
