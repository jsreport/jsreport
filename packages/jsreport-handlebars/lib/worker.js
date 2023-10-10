const path = require('path')

module.exports = (reporter, definition) => {
  reporter.addRequestContextMetaConfig('asyncHandlebars', { sandboxHidden: true })
  const hbRawPath = definition.options.handlebarsModulePath != null ? definition.options.handlebarsModulePath : require.resolve('handlebars')
  const hbPath = path.join(path.dirname(hbRawPath), '../')

  if (reporter.options.sandbox.allowedModules !== '*') {
    reporter.options.sandbox.allowedModules.push(hbPath)
    reporter.options.sandbox.allowedModules.push('handlebars')
  }

  let engine
  const lazyGetEngine = () => {
    if (engine) {
      return engine
    }
    engine = require('./handlebarsEngine')({
      handlebarsModulePath: hbPath
    })
    return engine
  }

  reporter.extensionsManager.engines.push({
    name: 'handlebars',
    compile: (...args) => lazyGetEngine().compile(...args),
    execute: (...args) => lazyGetEngine().execute(...args),
    createContext: (...args) => lazyGetEngine().createContext(...args),
    onRequire: (...args) => lazyGetEngine().onRequire(...args),
    unescape: (...args) => lazyGetEngine().unescape(...args),
    getWrappingHelpersEnabled: (req) => req.context.asyncHandlebars !== true,
    wrapHelper: (...args) => lazyGetEngine().wrapHelper(...args),
    buildTemplateCacheKey: (...args) => lazyGetEngine().buildTemplateCacheKey(...args)
  })
}
