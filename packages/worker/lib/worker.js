const path = require('path')
const fs = require('fs')
const Koa = require('koa')
const nconf = require('nconf')
const serializator = require('@jsreport/serializator')
const ListenerCollection = require('listener-collection')
const WorkersManager = require('@jsreport/advanced-workers')
const WorkerRequest = require('./workerRequest')
const { Lock } = require('semaphore-async-await')
const camelCase = require('camelcase')
process.env.DEBUG = 'worker'
const debug = require('debug')('worker')
const bootstrapFiles = []
const currentRequests = {}

const workerInitListeners = new ListenerCollection()

const rootDir = path.join(__dirname, '../bootstrap')

fs.readdirSync(rootDir).forEach((f) => {
  if (f.endsWith('.reporter.js')) {
    const bootstrapFile = path.join(rootDir, f)
    debug(`found bootstrap file ${bootstrapFile}`)
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
    debug('Debugging session is enabled')
  }

  options.workerInputRequestLimit = options.workerInputRequestLimit || '20mb'

  let workersManager

  const app = new Koa()

  app.on('error', err => {
    debug('server error', err)
  })

  debug(`worker input request limits is configured to: ${options.workerInputRequestLimit}`)

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
        debug('initializing worker')

        const workerOptions = reqBody.workerOptions

        const chromeLaunchOptions = workerOptions.options.chrome?.launchOptions || {}
        workerOptions.options.chrome = {
          ...workerOptions.options.chrome,
          launchOptions: chromeLaunchOptions
        }

        // we need defaults that we know work with chrome in docker, but we still want to allow user to change this in the main config
        if (chromeLaunchOptions.args == null || chromeLaunchOptions.args.length === 0) {
          chromeLaunchOptions.args = ['--no-sandbox', '--disable-dev-shm-usage', '--disable-dev-profile']
        }

        if (chromeLaunchOptions.executablePath == null) {
          chromeLaunchOptions.executablePath = '/usr/bin/chromium'
        }

        if (options.useChromiumMacosWorkaround) {
          debug('using chromiumMacosWorkaround')
          chromeLaunchOptions.args = ['--no-sandbox', '--disable-dev-shm-usage', '--disable-dev-profile', '--no-zygote', '--disable-gpu', '--disable-audio-output', '--disable-setuid-sandbox', '--single-process']
        }

        chromeLaunchOptions.executablePath = '/usr/bin/chromium'

        for (const def of workerOptions.extensionsDefs) {
          if (options.overwriteExtensionPaths !== false) {
            def.directory = options.extensions[camelCase(def.name)]
          }

          if (!def.directory) {
            def.options.enabled = false
          }

          if (def.name === 'chrome-pdf') {
            def.options.launchOptions = { ...def.options.launchOptions }

            if (def.options.launchOptions.executablePath == null) {
              def.options.launchOptions.executablePath = chromeLaunchOptions.executablePath
            }

            if (def.options.launchOptions.args == null || def.options.launchOptions.args.length === 0) {
              def.options.launchOptions.args = chromeLaunchOptions.args
            }
          }
        }

        let rootDirectory

        if (options.rootDirectory) {
          rootDirectory = options.rootDirectory
        } else {
          if (process.env.WORKDIR == null) {
            throw new Error('env var WORKDIR is not defined, define it to allow correct setup of worker rootDirectory')
          }

          rootDirectory = process.env.WORKDIR
        }

        workerOptions.options.rootDirectory = rootDirectory
        workerOptions.options.appDirectory = rootDirectory
        workerOptions.options.parentModuleDirectory = rootDirectory
        workerOptions.options.tempDirectory = options.tempDirectory || '/tmp/jsreport'
        workerOptions.options.tempCoreDirectory = options.tempCoreDirectory || '/tmp/jsreport/core'
        workerOptions.options.tempAutoCleanupDirectory = options.tempAutoCleanupDirectory || '/tmp/jsreport/autocleanup'

        await fs.promises.mkdir(workerOptions.options.tempDirectory, {
          recursive: true
        })
        await fs.promises.mkdir(workerOptions.options.tempCoreDirectory, {
          recursive: true
        })
        await fs.promises.mkdir(workerOptions.options.tempAutoCleanupDirectory, {
          recursive: true
        })

        const workerSystemOptions = reqBody.workerSystemOptions
        workerSystemOptions.workerModule = require.resolve('@jsreport/jsreport-core/lib/worker/workerHandler.js')

        await workerInitListeners.fire(workerOptions, workerSystemOptions)

        workersManager = WorkersManager(workerOptions, workerSystemOptions)
        await workersManager.init()
        ctx.body = '{}'
        debug('worker initialized')
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

                if (r && r.error) {
                  const { message, stack, ...rest } = r.error
                  const callbackErr = new Error(message)
                  callbackErr.stack = stack
                  Object.assign(callbackErr, rest)
                  throw callbackErr
                }

                return r
              } catch (e) {
                debug('Error when invoking callback', e)
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
      debug('Error when processing worker request', e)
      ctx.status = 400
      ctx.body = { message: e.message, stack: e.stack, ...e }
    }
  })

  Promise.all(bootstrapExports.map((bootstrapFn) => bootstrapFn({
    options,
    eventsManager: {
      addWorkerInitListener (...args) {
        workerInitListeners.add(...args)
      },
      removeInitListener (...args) {
        workerInitListeners.remove(...args)
      }
    }
  })))

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
