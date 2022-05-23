const fs = require('fs').promises
const path = require('path')

module.exports = (reporter) => {
  let helpersScript

  reporter.registerHelpersListeners.add('core-helpers', () => {
    return helpersScript
  })

  reporter.initializeListeners.add('core-helpers', async () => {
    helpersScript = await fs.readFile(path.join(__dirname, '../../static/helpers.js'), 'utf8')
  })

  reporter.extendProxy((proxy, req, { sandboxRequire }) => {
    proxy.module = async (module) => {
      if (!reporter.options.trustUserCode && reporter.options.sandbox.allowedModules !== '*') {
        if (reporter.options.sandbox.allowedModules.indexOf(module) === -1) {
          throw reporter.createError(`require of module ${module} was rejected. Either set trustUserCode=true or sandbox.allowLocalModules='*' or sandbox.allowLocalModules=['${module}'] `, { status: 400 })
        }
      }

      const resolve = require('enhanced-resolve')

      const moduleResolve = resolve.create({
        extensions: ['.js', '.json']
      })

      const modulePath = await new Promise((resolve, reject) => {
        moduleResolve(reporter.options.rootDirectory, module, (err, result) => {
          if (err) {
            err.message = `module read error. ${err.message}`
            return reject(err)
          }

          resolve(result)
        })
      })

      const buf = await fs.readFile(modulePath)

      return buf.toString()
    }
  })
}
