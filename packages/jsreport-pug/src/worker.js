const createEngine = require('./pugEngine')

module.exports = (reporter, definition) => {
  const { compile, execute } = createEngine()

  reporter.options.sandbox.modules.push({
    alias: 'pug',
    path: require.resolve('pug')
  })

  reporter.extensionsManager.engines.push({
    name: 'pug',
    compile,
    execute
  })
}
