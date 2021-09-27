const fs = require('fs').promises
const path = require('path')

module.exports = (reporter) => {
  let helpersScript
  reporter.beforeRenderListeners.add('core-helpers', async (req) => {
    if (!helpersScript) {
      helpersScript = await fs.readFile(path.join(__dirname, '../../static/helpers.js'), 'utf8')
    }
    req.context.systemHelpers += helpersScript + '\n'
  })

  reporter.extendProxy((proxy, req, { safeRequire }) => {
    proxy.module = async (module) => {
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
