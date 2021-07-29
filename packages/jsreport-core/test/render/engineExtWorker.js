const path = require('path')
const createHelpersEngine = require('./helpersEngine')
const createPassRequireEngine = require('./passRequireEngine')
const createDataEngine = require('./dataEngine')
const createDataEngine2 = require('./dataEngine2')

module.exports = (reporter, definition) => {
  const { compile: hCompile, execute: hExecute } = createHelpersEngine()
  const { compile: pCompile, execute: pExecute } = createPassRequireEngine()
  const { compile: dCompile, execute: dExecute } = createDataEngine()
  const { compile: d2Compile, execute: d2Execute } = createDataEngine2()

  reporter.extensionsManager.engines.push({
    name: 'helpers',
    compile: hCompile,
    execute: hExecute
  })

  reporter.extensionsManager.engines.push({
    name: 'passRequire',
    compile: pCompile,
    execute: pExecute
  })

  reporter.extensionsManager.engines.push({
    name: 'data',
    compile: dCompile,
    execute: dExecute
  })

  reporter.extensionsManager.engines.push({
    name: 'data2',
    compile: d2Compile,
    execute: d2Execute
  })

  reporter.options.sandbox.nativeModules.push({
    globalVariableName: 'uuid',
    module: require.resolve('uuid')
  })

  reporter.options.sandbox.modules.push({
    alias: 'module',
    path: path.join(__dirname, 'moduleA.js')
  })
}
