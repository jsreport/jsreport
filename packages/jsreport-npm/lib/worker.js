const path = require('path')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const fs = require('fs').promises
const lockFile = require('lockfile')
const callLock = util.promisify(lockFile.lock)
const callUnlock = util.promisify(lockFile.unlock)

function exists (p) {
  return fs.access(p).then(() => true).catch(() => false)
}

module.exports = (reporter, definition) => {
  const rootPrefix = path.join(reporter.options.tempDirectory, 'npm')

  let helpersScript

  reporter.registerHelpersListeners.add(`${definition.name}-helpers`, () => {
    return helpersScript
  })

  reporter.initializeListeners.add(definition.name, async () => {
    helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
  })

  function parseModuleSpec (moduleSpec) {
    const moduleName = moduleSpec.substring(0, moduleSpec.lastIndexOf('@'))
    let moduleVersion
    let pathInModule

    if (moduleSpec.substring(moduleSpec.lastIndexOf('@') + 1).includes('/')) {
      const versionAndPath = moduleSpec.substring(moduleSpec.lastIndexOf('@') + 1)
      moduleVersion = versionAndPath.substring(0, versionAndPath.indexOf('/'))
      pathInModule = versionAndPath.substring(versionAndPath.indexOf('/'))
    } else {
      moduleVersion = moduleSpec.substring(moduleSpec.lastIndexOf('@') + 1)
    }
    const moduleNameAndVersion = moduleName + '@' + moduleVersion
    const prefix = path.join(rootPrefix, 'modules', moduleNameAndVersion.replace(/\//g, '-'))
    const modulePath = path.join(prefix, 'node_modules', moduleName)

    return {
      moduleName,
      pathInModule,
      moduleNameAndVersion,
      prefix,
      modulePath
    }
  }

  reporter.extendProxy((proxy, req, { sandboxRequire }) => {
    proxy.npm = {
      async require (moduleSpec) {
        if (!moduleSpec || !moduleSpec.includes('@')) {
          throw reporter.createError(`require of module ${moduleSpec} was rejected. The parameter needs to be in format packageName@version`, { status: 400 })
        }

        const {
          moduleName,
          pathInModule,
          moduleNameAndVersion,
          prefix,
          modulePath
        } = parseModuleSpec(moduleSpec)

        if (!reporter.options.trustUserCode && definition.options.allowedModules !== '*') {
          if (!definition.options.allowedModules || !definition.options.allowedModules.includes(moduleName)) {
            throw reporter.createError(`require of npm module ${moduleName} was rejected. Either set trustUserCode=true or extensions.npm.allowedModules='*' or extensions.npm.allowedModules=['${moduleName}'] `, { status: 400 })
          }
        }

        const l = await acquireLock()

        try {
          reporter.logger.debug(`require of npm ${moduleNameAndVersion}`, req)

          // we are including check for package.json, because sometimes the files in the module are missing because of some auto os temp cleanup
          if (!(await exists(path.join(modulePath, 'package.json')))) {
            const npmInstallProfilerEvent = reporter.profiler.emit({
              type: 'operationStart',
              subtype: 'npm',
              name: `npm install ${moduleNameAndVersion}`,
              doDiffs: false
            }, req)

            reporter.logger.debug(`npm install started ${moduleNameAndVersion}`, req)
            const { stdout, stderr } = await exec(`npm i --prefix=${prefix} ${moduleNameAndVersion}`, {
              env: {
                ...process.env,
                npm_config_cache: path.join(rootPrefix, 'cache')
              }
            })
            reporter.logger.debug(`npm install finished ${moduleNameAndVersion}; npm output: ${stdout} ${stderr}`, req)
            reporter.profiler.emit({
              type: 'operationEnd',
              operationId: npmInstallProfilerEvent.operationId,
              doDiffs: false
            }, req)
          }

          return sandboxRequire(modulePath + (pathInModule || ''))
        } finally {
          await releaseLock(l)
        }
      },
      async module (moduleSpec) {
        await this.require(moduleSpec)
        const resolve = require('enhanced-resolve')

        const moduleResolve = resolve.create({
          extensions: ['.js', '.json']
        })

        const {
          moduleName,
          pathInModule,
          modulePath
        } = parseModuleSpec(moduleSpec)

        const filePath = await new Promise((resolve, reject) => {
          moduleResolve(modulePath, moduleName + (pathInModule || ''), (err, result) => {
            if (err) {
              err.message = `npm module read error. ${err.message}`
              return reject(err)
            }

            resolve(result)
          })
        })

        const buf = await fs.readFile(filePath)

        return buf.toString()
      }
    }
  })

  async function acquireLock () {
    try {
      await callLock(path.join(rootPrefix, 'npm.lock'), Object.assign({}, definition.options.lock))
    } catch (e) {
      throw new Error('Failed to acquire npm lock.', { cause: e })
    }

    // refreshing the lock so we can have a long running transaction
    const refreshInterval = setInterval(() => touch(path.join(rootPrefix, 'npm.lock')), definition.options.lock.stale / 2)
    refreshInterval.unref()
    const undelegateWait = definition.options.lock.wait * (definition.options.lock.retries || 1) + ((definition.options.lock.retries || 1) * (definition.options.lock.retryWait || 0))

    const clearRefreshIntervalTimeout = setTimeout(() => clearInterval(refreshInterval), undelegateWait)
    clearRefreshIntervalTimeout.unref()

    return { refreshInterval, clearRefreshIntervalTimeout }
  }

  async function releaseLock (l) {
    clearInterval(l.refreshInterval)
    clearTimeout(l.clearRefreshIntervalTimeout)
    await callUnlock(path.join(rootPrefix, 'npm.lock'))
  }
}

let touchRunning = false
async function touch (filename) {
  if (touchRunning) {
    return
  }

  const time = new Date()

  try {
    touchRunning = true
    await fs.utimes(filename, time, time)
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.warn('Failed to refresh the file system lock', e)
    }
  } finally {
    touchRunning = false
  }
}
