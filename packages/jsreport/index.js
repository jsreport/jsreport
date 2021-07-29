'use strict'

/*!
 * Copyright(c) 2018 Jan Blaha
 */

const semver = require('semver')
const packageJson = require('./package.json')

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
module.exports.extendDefaults = extendDefaults
module.exports.core = core
