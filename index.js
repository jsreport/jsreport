'use strict'

/*!
 * Copyright(c) 2018 Jan Blaha
 */

var semver = require('semver')
var packageJson = require('./package.json')

if (!semver.satisfies(process.versions.node, packageJson.engines.node)) {
  console.error(
    'jsreport requires to have installed a nodejs version of at least ' +
    packageJson.engines.node +
    ' but you have installed version ' + process.versions.node + '. please update your nodejs version and try again'
  )

  process.exit(1)
}

const extend = require('node.extend.without.arrays')
const path = require('path')
const core = require('jsreport-core')
const main = require('./lib/main')

const renderDefaults = {
  store: { provider: 'memory' },
  blobStorage: { provider: 'memory' },
  rootDirectory: path.join(__dirname, '../../'),
  logger: {
    console: { silent: true },
    file: { silent: true },
    error: { silent: true }
  },
  extensions: {
    express: { enabled: false },
    scheduling: { enabled: false },
    authentication: { enabled: false },
    authorization: { enabled: false },
    studio: { enabled: false },
    'sample-template': { enabled: false },
    'version-control': { enabled: false },
    'public-templates': { enabled: false }
  }
}

function render (req) {
  if (!core.Reporter.instance) {
    return main({
      parentModuleDirectory: path.dirname(module.parent.filename)
    }, renderDefaults).init().then(function () {
      return core.Reporter.instance.render(req)
    })
  }

  return core.Reporter.instance.render(req)
}

function extendDefaults (config) {
  return extend(true, renderDefaults, config)
}

module.exports = function (options, defaults) {
  options = options || {}

  options.parentModuleDirectory = path.dirname(module.parent.filename)

  return main(options, defaults)
}

module.exports.Reporter = core.Reporter
module.exports.renderDefaults = renderDefaults
module.exports.render = render
module.exports.extendDefaults = extendDefaults
module.exports.reporter = core.Reporter.instance
module.exports.core = core
