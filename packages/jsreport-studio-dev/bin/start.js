#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync
const argsParser = require('yargs-parser')

const argv = argsParser(process.argv.slice(2), {
  boolean: ['run-only', 'ignore-jsreport-install', 'ignore-jsreport-studio-install'],
  string: ['entry-point'],
  default: {
    'run-only': false,
    'ignore-jsreport-install': false,
    'ignore-jsreport-studio-install': false
  }
})

if (!argv.ignoreJsreportInstall) {
  console.log('Checking if jsreport installed')

  try {
    fs.statSync(path.join(process.cwd(), 'node_modules', 'jsreport'))
  } catch (e) {
    console.log('Installing the latest jsreport, this takes few minutes')
    execSync('npm install jsreport --no-save', { stdio: [0, 1, 2] })
  }
}

if (!argv.runOnly) {
  if (!argv.ignoreJsreportStudioInstall) {
    console.log('Making sure jsreport-studio has dev dependencies installed')
    installStudioIfRequired(path.join(process.cwd(), 'node_modules', 'jsreport', 'node_modules', 'jsreport-studio'))
    installStudioIfRequired(path.join(process.cwd(), 'node_modules', 'jsreport-studio'))
  }
}

console.log('Starting ...')

if (!argv.runOnly) {
  process.env.NODE_ENV = 'jsreport-development'
}

if (!argv.entryPoint) {
  let currentExtension = null

  if (fs.existsSync(path.join(process.cwd(), 'jsreport.config.js'))) {
    currentExtension = require(path.join(process.cwd(), 'jsreport.config.js')).name
  }

  // define at startup what is the current extension,
  // so studio can concat this value with another configuration passed
  // to get all extensions configured in dev mode
  process.env.JSREPORT_CURRENT_EXTENSION = currentExtension

  const jsreport = require(path.join(process.cwd(), 'node_modules', 'jsreport'))

  jsreport({
    rootDirectory: process.cwd()
  }).init().catch(function (e) {
    console.error(e)
  })
} else {
  const entryPath = path.resolve(process.cwd(), argv.entryPoint)

  console.log(`Using custom entry point at ${entryPath}`)
  require(entryPath)
}

function tryRequire (module) {
  try {
    return fs.statSync(module)
  } catch (e) {
    return false
  }
}

function installStudio (p) {
  console.log(`Installing jsreport-studio dev dependencies at ${p}`)
  return execSync('npm install', { stdio: [0, 1, 2], cwd: p })
}

function installStudioIfRequired (p) {
  let packageJson

  try {
    packageJson = JSON.parse(fs.readFileSync(path.join(p, 'package.json'), 'utf8'))
  } catch (e) {
    return
  }

  for (let k in packageJson.devDependencies) {
    if (!tryRequire(path.join(p, 'node_modules', k))) {
      // somehow npm install failes on EBUSY error if this field is not deleted
      delete packageJson._requiredBy
      fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf8')
      return installStudio(p)
    }
  }
}
