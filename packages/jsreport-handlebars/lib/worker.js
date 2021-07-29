const path = require('path')
const createEngine = require('./handlebarsEngine')

module.exports = (reporter, definition) => {
  const hbRawPath = definition.options.handlebarsModulePath != null ? definition.options.handlebarsModulePath : require.resolve('handlebars')
  const hbPath = path.join(path.dirname(hbRawPath), '../')

  if (reporter.options.sandbox.allowedModules !== '*') {
    reporter.options.sandbox.allowedModules.push(hbPath)
    reporter.options.sandbox.allowedModules.push('handlebars')
  }

  const { compile, execute, createContext, onRequire } = createEngine({
    handlebarsModulePath: hbPath
  })

  reporter.extensionsManager.engines.push({
    name: 'handlebars',
    compile,
    execute,
    createContext,
    onRequire
  })
}
