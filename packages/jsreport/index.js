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

const path = require('path')
const core = require('jsreport-core')
const main = require('./lib/main')

module.exports = function (options, defaults) {
  options = options || {}

  options.parentModuleDirectory = path.dirname(module.parent.filename)

  return main(options, defaults)
}

module.exports.Reporter = core.Reporter
module.exports.core = core
