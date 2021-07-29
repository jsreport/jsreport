
const createEngine = require('./jsrenderEngine')

module.exports = (reporter, definition) => {
  const { compile, execute } = createEngine()

  reporter.options.sandbox.modules.push({
    alias: 'jsrender',
    path: require.resolve('jsrender')
  })

  reporter.extensionsManager.engines.push({
    name: 'jsrender',
    compile,
    execute
  })
}
