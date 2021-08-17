const createEngine = require('./ejsEngine')

module.exports = (reporter, definition) => {
  const { compile, execute } = createEngine()

  reporter.options.sandbox.modules.push({
    alias: 'ejs',
    path: require.resolve('ejs')
  })

  reporter.extensionsManager.engines.push({
    name: 'ejs',
    compile,
    execute
  })
}
