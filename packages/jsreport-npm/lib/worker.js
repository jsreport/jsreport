const path = require('path')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const fs = require('fs').promises
const { Lock } = require('semaphore-async-await')

function exists (p) {
  return fs.access(p).then(() => true).catch(() => false)
}

module.exports = (reporter, definition) => {
  const requireLock = new Lock()
  const rootPrefix = path.join(reporter.options.tempDirectory, 'npm')

  let helpersScript

  reporter.registerHelpersListeners.add(`${definition.name}-helpers`, (req) => {
    return helpersScript
  })

  reporter.initializeListeners.add(definition.name, async () => {
    helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
  })

  reporter.extendProxy((proxy, req, { safeRequire }) => {
    proxy.npm = {
      async require (module) {
        if (!module || !module.includes('@')) {
          throw reporter.createError(`require of module ${module} was rejected. The parameter needs to be in format packageName@version`, { status: 400 })
        }

        if (!reporter.options.allowLocalFilesAccess && definition.options.allowedModules !== '*') {
          if (!definition.options.allowedModules || !definition.options.allowedModules.includes(module)) {
            throw reporter.createError(`require of npm module ${module} was rejected. Either set allowLocalFilesAccess=true or extensions.npm.allowLocalModules='*' or extensions.npm.allowLocalModules=['${module}'] `, { status: 400 })
          }
        }

        try {
          await requireLock.acquire()
          const prefix = path.join(rootPrefix, 'modules', module.replace(/\//g, '-'))

          reporter.logger.debug(`require of npm ${module}`, req)
          const modulePath = path.join(prefix, 'node_modules', module.split('@')[0])
          // we are including check for package.json, because sometimes the files in the module are missing because of some auto os temp cleanup
          if (!(await exists(path.join(modulePath, 'package.json')))) {
            const npmInstallProfilerEvent = reporter.profiler.emit({
              type: 'operationStart',
              subtype: 'npm',
              name: `npm install ${module}`,
              doDiffs: false
            }, req)

            reporter.logger.debug(`npm install started ${module}`, req)
            const { stdout, stderr } = await exec(`npm i --prefix=${prefix} ${module}`, {
              env: {
                ...process.env,
                npm_config_cache: path.join(rootPrefix, 'cache')
              }
            })
            reporter.logger.debug(`npm install finished ${module}; npm output: ${stdout} ${stderr}`, req)
            reporter.profiler.emit({
              type: 'operationEnd',
              operationId: npmInstallProfilerEvent.operationId,
              doDiffs: false
            }, req)
          }

          return safeRequire(modulePath)
        } finally {
          requireLock.release()
        }
      },
      async module (module) {
        await this.require(module)
        const resolve = require('enhanced-resolve')

        const moduleResolve = resolve.create({
          extensions: ['.js', '.json']
        })

        const moduleName = module.split('@')[0]

        const modulePath = await new Promise((resolve, reject) => {
          moduleResolve(path.join(rootPrefix, 'modules', module.replace(/\//g, '-')), moduleName, (err, result) => {
            if (err) {
              err.message = `npm module read error. ${err.message}`
              return reject(err)
            }

            resolve(result)
          })
        })

        const buf = await fs.readFile(modulePath)

        return buf.toString()
      }
    }
  })
}
