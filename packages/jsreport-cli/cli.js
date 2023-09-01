#!/usr/bin/env node
'use strict'

// eslint-disable-next-line no-var
var semver = require('semver')
// eslint-disable-next-line no-var
var cliPackageJson = require('./package.json')

if (!semver.satisfies(process.versions.node, cliPackageJson.engines.node)) {
  console.error(
    'jsreport cli requires to have installed a nodejs version of at least ' +
    cliPackageJson.engines.node +
    ' but you have installed version ' + process.versions.node + '. please update your nodejs version and try again'
  )

  process.exit(1)
}

const path = require('path')
const Liftoff = require('liftoff')
const commander = require('./lib/commander')
const { printError } = require('./lib/utils/error')
const help = require('./lib/commands/help')
const init = require('./lib/commands/init')
const repair = require('./lib/commands/repair')
const configure = require('./lib/commands/configure')
const render = require('./lib/commands/render')

const cli = new Liftoff({
  processTitle: 'jsreport',
  moduleName: '@jsreport/jsreport-cli',
  configName: '.jsreport'
})

cli.prepare({}, (env) => {
  cli.execute(env, initCLI)
})

function initCLI (env) {
  const isCLIDev = process.env.JSREPORT_CLI_DEV === 'enabled'
  const args = process.argv.slice(2)
  const cwd = process.cwd()
  let localCommander

  if (!isCLIDev && !env.modulePath) {
    // if no local installation is found,
    // try to detect if some global command was specified
    const globalCliHandler = commander(cwd, {
      cliName: 'jsreport',
      builtInCommands: [help, init, repair, configure, render]
    })

    globalCliHandler.on('started', (err, info) => {
      if (err) {
        printError(err, console)
        return process.exit(1)
      }

      if (!info.handled) {
        if (info.mainCommand != null) {
          console.error('"' + info.mainCommand + '" command not found')
          console.error('Local jsreport-cli not found in:', env.cwd)
          console.error('Try installing jsreport-cli or jsreport package to have more commands available')

          return process.exit(1)
        }

        console.error('Local jsreport-cli not found in:', env.cwd)
        console.error('Try installing jsreport-cli or jsreport package')

        return process.exit(1)
      }
    })

    globalCliHandler.start(args)
  } else {
    if (isCLIDev) {
      localCommander = require(path.join(cwd, 'lib/commander'))(cwd, { cliName: 'jsreport' })
    } else {
      // Check for semver difference between global cli and local installation
      if (semver.gt(cliPackageJson.version, env.modulePackage.version)) {
        console.log('Warning: jsreport-cli version mismatch:')
        console.log('Global jsreport-cli is', cliPackageJson.version)
        console.log('Local jsreport-cli is', env.modulePackage.version)
      }

      localCommander = require(path.join(path.dirname(env.modulePath), 'lib/commander'))(cwd, {
        cliName: 'jsreport'
      })
    }

    // start processing
    localCommander.start(args)
  }
}
