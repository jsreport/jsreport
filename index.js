/*!
 * Copyright(c) 2018 Jan Blaha
 */

const extend = require('node.extend')
const path = require('path')
const core = require('jsreport-core')
const main = require('./lib/main')

const renderDefaults = {
  connectionString: {name: 'memory'},
  dataDirectory: path.join(__dirname, '../../', 'data'),
  blobStorage: 'inMemory',
  rootDirectory: path.join(__dirname, '../../'),
  logger: {
    console: { silent: true },
    file: { silent: true },
    error: { silent: true }
  },
  express: { enabled: false },
  scheduling: { enabled: false },
  'public-templates': { enabled: false }
}

function render (req) {
  if (!core.Reporter.instance) {
    renderDefaults.parentModuleDirectory = renderDefaults.parentModuleDirectory || path.dirname(module.parent.filename)

    return main(renderDefaults).init().then(function () {
      return core.Reporter.instance.render(req)
    })
  }

  return core.Reporter.instance.render(req)
}

function extendDefaults (config) {
  return extend(true, renderDefaults, config)
}

module.exports = function (options) {
  options = options || {}
  options.parentModuleDirectory = path.dirname(module.parent.filename)
  return main(options)
}

module.exports.Reporter = core.Reporter
module.exports.renderDefaults = renderDefaults
module.exports.render = render
module.exports.extendDefaults = extendDefaults
module.exports.reporter = core.Reporter.instance
module.exports.core = core
