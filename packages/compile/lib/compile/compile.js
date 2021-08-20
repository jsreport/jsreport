process.env.DEBUG = process.env.DEBUG || 'jsreport'

const debug = require('debug')('jsreport')
const util = require('util')
const path = require('path')
const shortid = require('shortid')
const fs = require('fs')
const pkg = require('@bjrmatos/pkg')
const rimraf = require('rimraf')
const rimrafAsync = util.promisify(rimraf)
const readFileAsync = util.promisify(fs.readFile)
const writeFileAsync = util.promisify(fs.writeFile)
const statAsync = util.promisify(fs.stat)
const unlinkAsync = util.promisify(fs.unlink)

async function collectConfig (input) {
  debug('Temporary starting jsreport instance to collect configuration')

  process.env.JSREPORT_CLI = true

  const reporter = require(input)

  if (!reporter) {
    throw new Error(`Script ${input} needs to module.exports a jsreport instance`)
  }

  const config = {
    version: undefined,
    resources: {}
  }

  // extend reporter with functions used by extension to include external modules and resources into the executable
  reporter.compilation = {
    script: function (name, p) {
      const projectDir = process.cwd()

      const pathRelativeToProject = path.relative(projectDir, p)
      const isInsideProjectPath = pathRelativeToProject.length > 0 && !pathRelativeToProject.startsWith('..') && !path.isAbsolute(pathRelativeToProject)

      if (!isInsideProjectPath) {
        throw new Error(`script resource can only be a file inside project "${projectDir}", resource path: ${p}. make sure to pass file that is part of project`)
      }

      config.resources[name] = { path: p, script: true }
    },
    // add file as asset to the compilation
    resource: function (name, p) {
      const projectDir = process.cwd()

      const pathRelativeToProject = path.relative(projectDir, p)
      const isInsideProjectPath = pathRelativeToProject.length > 0 && !pathRelativeToProject.startsWith('..') && !path.isAbsolute(pathRelativeToProject)

      if (!isInsideProjectPath) {
        throw new Error(`resource can only be a file inside project "${projectDir}", resource path: ${p}. make sure to pass file that is part of project`)
      }

      config.resources[name] = { path: p }
    },
    // add file as asset to the compilation but copy it to temp directory at startup
    resourceInTemp: function (name, p) {
      config.resources[name] = { path: p, temp: true }
    }
  }

  await reporter.init()

  // set the version to use in the executable from the reporter version
  config.version = reporter.version
  // includes all the extensions detected, included the disabled ones, because they can be enabled with configuration
  // and we need to include those extensions too in the compilation
  config.extensions = reporter.extensionsManager.availableExtensions

  debug('%s extensions will be bundled in', config.extensions.length)

  if (reporter.cli) {
    config.extensionsCommands = await reporter.cli.findCommandsInExtensions()
  } else {
    config.extensionsCommands = []
  }

  return config
}

// use template startupTemplate.js to built startup script using string replacement
async function writeStartup (config, options) {
  const startupFilePath = path.join(process.cwd(), 'jsreportStartup.js')
  const entryPointPath = options.input
  const runtimePath = path.join(__dirname, '../runtime/runtime.js')

  options.exeInput = 'jsreportStartup.js'

  debug('Writing startup code into %s', startupFilePath)

  // append static require of the extensions detected: jsreport.use(require('@jsreport/jsreport-templates')())
  const extensions = `function requireExtensions() { return [\n${
    config.extensions.length === 0
    ? ''
    : config.extensions.map((e) => {
      const extWithCommands = config.extensionsCommands.find((ex) => ex.extension === e.name)

      let cliModulePath

      if (extWithCommands != null) {
        cliModulePath = extWithCommands.cliModulePath
      }

      return `Object.assign(require('./${
        path.relative(process.cwd(), e.directory).replace(/\\/g, '/')
      }'), { source: '${e.source}', version: '${e.version}', cliModule: ${
        cliModulePath == null
        ? 'false'
        : `require('./${
        path.relative(process.cwd(), cliModulePath).replace(/\\/g, '/')
      }')`} })`
    }).join(',\n')
  }\n] }`

  const cliExtensionsCommands = `function requireCliExtensionsCommands() { return [\n${
    config.extensionsCommands.length === 0
    ? ''
    : config.extensionsCommands.map((e) => {
      const cliModulePath = e.cliModulePath

      return `require('./${
        path.relative(process.cwd(), cliModulePath).replace(/\\/g, '/')
      }')`
    }).join(',\n')
  }\n] }`

  let content = fs.readFileSync(path.join(__dirname, './startupTemplate.js'))

  content = content.toString()
    .replace('$originalProjectDir', JSON.stringify(process.cwd()))
    .replace('$shortid', config.shortid)
    .replace('$version', config.version)
    .replace('$resources', JSON.stringify(config.resources))
    .replace('$handleArguments', options.handleArguments !== false)
    .replace('$requireExtensions', extensions)
    .replace('$requireCliExtensionsCommands', cliExtensionsCommands)
    .replace('$runtime', 'require(\'./' + path.relative(process.cwd(), runtimePath).replace(/\\/g, '/') + '\')')
    .replace('$entryPoint', 'require(\'./' + path.relative(process.cwd(), entryPointPath).replace(/\\/g, '/') + '\')')

  // final startup script available
  fs.writeFileSync(startupFilePath, content)
}

async function validateResources (resources) {
  await Promise.all(Object.keys(resources).map(async (rk) => {
    try {
      await statAsync(resources[rk].path)
    } catch (e) {
      throw new Error(`Resource ${resources[rk].path} was not found`)
    }
  }))
}

async function copyTempResourcesToProject (resources) {
  const tempResources = Object.keys(resources).filter((rName) => {
    return resources[rName].temp === true
  })

  const tempResourcesDirectory = path.join(process.cwd(), 'exe-temp-resources')

  try {
    fs.mkdirSync(tempResourcesDirectory)
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e
    }
  }

  await Promise.all(tempResources.map(async (tempRName) => {
    const resource = resources[tempRName]
    const pathInProject = path.join(tempResourcesDirectory, tempRName)

    resource.pathInProject = pathInProject

    const resourceContent = await readFileAsync(resource.path)

    await writeFileAsync(pathInProject, resourceContent)
  }))
}

// finally run pkg to produce the exe
async function compileExe (label, config, options) {
  debug(`Compiling ${label} executable`)

  const execArgs = [options.exeInput]

  if (options.debug) {
    execArgs.push('--debug')
  }

  execArgs.push('--target')
  execArgs.push(`node${options.nodeVersion}`)

  const scripts = []
  const assets = []

  // add the main and worker entry points of extensions, it needs to be done this way
  // to tell pkg that these files should be analyzable and inspect its require calls, etc
  config.extensions.forEach((ext) => {
    const rootDir = path.relative(process.cwd(), ext.directory)

    if (fs.existsSync(path.join(rootDir, 'jsreport.config.js'))) {
      const conf = require(path.join(process.cwd(), rootDir, 'jsreport.config.js'))

      if (conf.main) {
        scripts.push(path.relative(process.cwd(), path.join(rootDir, conf.main)))
      }

      if (conf.worker) {
        scripts.push(path.relative(process.cwd(), path.join(rootDir, conf.worker)))
      }
    }
  })

  let filesToIgnore = []

  const ignoredConfigFiles = [
    'Jenkinsfile',
    'Makefile',
    'Gulpfile.js',
    'Gruntfile.js',
    'gulpfile.js',
    '.DS_Store',
    '.tern-project',
    '.gitignore',
    '.gitkeep',
    '.gitattributes',
    '.editorconfig',
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.json',
    '.eslintrc.yml',
    '.eslintignore',
    '.stylelintrc',
    'stylelint.config.js',
    '.stylelintrc.json',
    '.stylelintrc.yaml',
    '.stylelintrc.yml',
    '.stylelintrc.js',
    '.htmllintrc',
    '.lint',
    '.npmrc',
    '.npmignore',
    '.jshintrc',
    '.flowconfig',
    '.documentup.json',
    '.yarn-metadata.json',
    '.travis.yml',
    'appveyor.yml',
    '.gitlab-ci.yml',
    'circle.yml',
    '.coveralls.yml',
    'README',
    'CHANGES',
    'changelog',
    'usage.txt',
    'LICENSE.txt',
    'LICENSE',
    'LICENSE-MIT',
    'LICENSE-MIT.txt',
    'LICENSE.BSD',
    'license',
    'LICENCE.txt',
    'LICENCE',
    'LICENCE-MIT',
    'LICENCE-MIT.txt',
    'LICENCE.BSD',
    'licence',
    'AUTHORS',
    'VERSION',
    'CONTRIBUTORS',
    'yarn.lock',
    '.yarn-integrity',
    '.yarnclean',
    '_config.yml',
    '.babelrc',
    '.yo-rc.json',
    'mocha.opts',
    'jest.config.js',
    'karma.conf.js',
    'wallaby.js',
    'wallaby.conf.js',
    '.prettierrc',
    '.prettierrc.yml',
    '.prettierrc.toml',
    '.prettierrc.js',
    '.prettierrc.json',
    'prettier.config.js',
    '.appveyor.yml',
    'tsconfig.json',
    'tslint.json'
  ]

  filesToIgnore.push(`**/node_modules/**/{${ignoredConfigFiles.join(',')}}`)
  filesToIgnore.push('**/node_modules/**/*.{markdown,md,mkd,ts,d.ts,js.flow,coffee,swp,tgz,sh}')
  filesToIgnore.push('**/*.{map,css.map,js.map,min.js.map}')
  filesToIgnore.push('**/node_modules/**/{test,bin,tests,__tests__,test_files,.idea,.vscode,.github}/**/*')
  filesToIgnore.push('**/node_modules/@types/**')
  filesToIgnore.push('**/node_modules/bluebird/js/browser/**')
  filesToIgnore.push('**/node_modules/buble/bin/**')
  filesToIgnore.push('**/node_modules/pkg-fetch/**')
  filesToIgnore.push('**/node_modules/@bjrmatos/pkg/**')
  filesToIgnore.push('**/node_modules/socket.io-client/dist/**')
  filesToIgnore.push('**/node_modules/jsreport-exceljs/dist/**')
  filesToIgnore.push('**/node_modules/mingo/dist/**')
  filesToIgnore.push('!**/node_modules/mingo/dist/mingo.js')
  filesToIgnore.push('**/node_modules/hdr-histogram-js/dist/**')
  filesToIgnore.push('**/node_modules/hdr-histogram-js/benchmark/**')
  filesToIgnore.push('**/node_modules/hdr-histogram-js/**/*.spec.js')
  filesToIgnore.push('**/node_modules/opentype.js/dist/**')
  filesToIgnore.push('!**/node_modules/opentype.js/dist/opentype.js')
  filesToIgnore.push('**/node_modules/diff2html/dist/**')
  filesToIgnore.push('**/node_modules/source-map/dist/**')
  filesToIgnore.push('**/node_modules/buble/dist/buble.es.js')
  filesToIgnore.push('**/node_modules/async/dist/async.min.js')
  filesToIgnore.push('**/node_modules/pako/dist/**')
  filesToIgnore.push('**/node_modules/ajv/dist/**')
  filesToIgnore.push('**/node_modules/handlebars/{bin,lib,print-script}')
  filesToIgnore.push('!**/node_modules/handlebars/lib/index.js')
  filesToIgnore.push('**/node_modules/handlebars/dist/**')
  filesToIgnore.push('!**/node_modules/handlebars/dist/cjs')
  filesToIgnore.push('**/node_modules/silent-spawn/WinRun.exe')

  filesToIgnore = config.extensions.reduce((acu, ext) => {
    const rootDir = path.relative(process.cwd(), ext.directory)

    acu.push(path.join(rootDir, 'studio'))
    acu.push(`!${path.join(rootDir, 'studio/main.js')}`)
    acu.push(`!${path.join(rootDir, 'studio/main.css')}`)

    if (ext.name === 'studio') {
      acu.push(path.join(rootDir, 'src'))
      acu.push(path.join(rootDir, 'webpack'))
    }

    return acu
  }, filesToIgnore)

  if (Object.keys(config.resources).length > 0) {
    Object.keys(config.resources).filter((rName) => {
      return config.resources[rName].script === true
    }).forEach((rName) => {
      const resource = config.resources[rName]

      // the path in pkg configuration should be relative to project dir
      const newPath = path.relative(process.cwd(), resource.path)

      if (!scripts.includes(newPath)) {
        scripts.push(newPath)
      }
    })

    Object.keys(config.resources).filter((rName) => {
      return config.resources[rName].script !== true
    }).forEach((rName) => {
      const resource = config.resources[rName]
      let pathToUse

      if (resource.temp === true) {
        pathToUse = resource.pathInProject
      } else {
        pathToUse = resource.path
      }

      // the path in pkg configuration should be relative to project dir
      assets.push(path.relative(process.cwd(), pathToUse))
    })
  }

  const pkfConfigJSONPath = path.join(process.cwd(), 'jsreportPkgConfig.json')

  await writeFileAsync(pkfConfigJSONPath, JSON.stringify({
    pkg: {
      scripts,
      assets,
      ignore: filesToIgnore
    }
  }, null, 2))

  execArgs.push('--config')
  execArgs.push(pkfConfigJSONPath)

  if (options.debug) {
    execArgs.push('--vfsOutput')
    execArgs.push(path.join(process.cwd(), 'vfs.json'))
  }

  execArgs.push('--externalModules')

  execArgs.push('--output')
  execArgs.push(options.output)

  debug(`Calling pkg compilation with args: ${execArgs.join(' ')}`)

  await pkg.exec(execArgs)

  debug(`Compile ${label} successful, the output can be found at ${path.join(process.cwd(), options.output)}`)
}

async function prepareJsreport (id, options) {
  const config = await collectConfig(options.input)
  return config
}

module.exports = async (options) => {
  const id = shortid()

  options.input = path.resolve(process.cwd(), options.input)

  try {
    // starting a jsreport instance to collect config
    const config = await prepareJsreport(id, options)

    config.shortid = id

    await validateResources(config.resources)

    await copyTempResourcesToProject(config.resources)

    await writeStartup(config, options)

    // compile jsreport binary
    await compileExe('jsreport', config, options)

    await cleanup()
  } catch (e) {
    await cleanup()

    console.error(e)
    throw e
  }

  function cleanup () {
    if (options.debug) {
      return Promise.resolve()
    }

    return Promise.all([
      unlinkAsync(path.join(process.cwd(), 'jsreportStartup.js')).catch(() => {}),
      unlinkAsync(path.join(process.cwd(), 'jsreportPkgConfig.json')).catch(() => {}),
      rimrafAsync(path.join(process.cwd(), 'exe-temp-resources')).catch(() => {})
    ])
  }
}
