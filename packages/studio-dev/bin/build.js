#!/usr/bin/env node
const path = require('path')
const argsParser = require('yargs-parser')
const webpack = require('webpack')
const extensionBuildConfig = require('../extensionBuildConfig')

const argv = argsParser(process.argv.slice(2), {
  // additionally to config args, we expect any option passed to "stats." to be parsed
  string: ['config', 'name'],
  boolean: ['verbose', 'analyze', 'errorDetails'],
  array: ['removeSourceMapUrl'],
  alias: {
    verbose: ['v']
  },
  default: {
    removeSourceMapUrl: []
  },
  coerce: {
    stats: function (arg) {
      const newArg = {}

      if (arg != null && typeof arg === 'object') {
        Object.entries(arg).forEach(([key, value]) => {
          if (value == null) {
            return
          }

          if (typeof value === 'boolean') {
            newArg[key] = value
          } else if (value === 'true' || value === 1 || value === '1') {
            newArg[key] = true
          } else if (value === 'false' || value === 0 || value === '0') {
            newArg[key] = false
          } else if (value === 'undefined') {
            newArg[key] = undefined
          } else {
            newArg[key] = value
          }
        })
      }

      return newArg
    }
  }
})

let config

if (argv.config) {
  console.log(`using custom webpack config at: ${argv.config}`)

  try {
    config = require(path.resolve(process.cwd(), argv.config))
  } catch (e) {
    throw new Error(`Error while trying to use config in ${argv.config}: ${e.message}`)
  }
} else {
  config = extensionBuildConfig(argv.name, {
    removeSourceMapUrl: argv.removeSourceMapUrl
  })
}

if (argv.analyze) {
  const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
  config.plugins = config.plugins || []
  config.plugins.push(new BundleAnalyzerPlugin())
}

webpack(config, (err, stats) => {
  if (err) {
    console.error(err)
    return process.exit(1)
  }

  const jsonStats = stats.toJson()

  const defaultErrorDetails = argv.errorDetails != null ? Boolean(argv.errorDetails) : argv.errorDetails
  let statsOpts = argv.stats != null && typeof argv === 'object' ? argv.stats : {}

  statsOpts = {
    ...statsOpts,
    hash: hasProp(statsOpts, 'hash') ? statsOpts.hash : true,
    builtAt: hasProp(statsOpts, 'builtAt') ? statsOpts.builtAt : true,
    colors: hasProp(statsOpts, 'colors') ? statsOpts.colors : true,
    chunks: hasProp(statsOpts, 'chunks') ? statsOpts.chunks : false,
    cachedModules: hasProp(statsOpts, 'cachedModules') ? statsOpts.cachedModules : false,
    warnings: hasProp(statsOpts, 'warnings') ? statsOpts.warnings : true,
    errors: hasProp(statsOpts, 'errors') ? statsOpts.errors : true,
    errorDetails: hasProp(statsOpts, 'errorDetails') ? statsOpts.errorDetails : defaultErrorDetails,
    assetsSpace: hasProp(statsOpts, 'assetsSpace') ? statsOpts.assetsSpace : Infinity,
    modulesSpace: hasProp(statsOpts, 'modulesSpace') ? statsOpts.modulesSpace : Infinity,
    chunkModulesSpace: hasProp(statsOpts, 'chunkModulesSpace') ? statsOpts.chunkModulesSpace : Infinity,
    // by default we show all modules included except for the ones that are
    // from node_modules
    excludeModules: hasProp(statsOpts, 'excludeModules')
      ? statsOpts.excludeModules
      : (moduleSource) => {
          if (moduleSource == null) {
            return false
          }

          return moduleSource.includes('node_modules')
        }
  }

  if (argv.verbose) {
    console.log('stats options used:')
    console.log(statsOpts)
    console.log('\n')
  }

  console.log(stats.toString(statsOpts))

  if (jsonStats.errors.length > 0) {
    console.log('webpack build has ERRORS')
    process.exit(1)
  } else if (jsonStats.warnings.length > 0) {
    console.log('webpack build OK but with WARNINGS')
  } else {
    console.log('webpack build OK')
  }
})

function hasProp (statsOpts, propName) {
  return Object.prototype.hasOwnProperty.call(statsOpts, propName)
}
