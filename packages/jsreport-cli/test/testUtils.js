const path = require('path')
const fs = require('fs')

module.exports = ({
  baseDir,
  rootDirectory,
  defaultOpts,
  defaultExtensions = [],
  cliModuleName = 'jsreport-cli',
  deps
}) => {
  const {
    extend,
    mkdirp,
    rimraf,
    execa
  } = deps

  return {
    getTempDir: getTempDir.bind(undefined, baseDir),
    cleanTempDir: cleanTempDir.bind(undefined, baseDir),
    createTempDir: createTempDir.bind(undefined, baseDir),
    setup: setup.bind(undefined, baseDir),
    init: init.bind(undefined, baseDir),
    exec: exec.bind(undefined, baseDir)
  }

  function getTempDir (baseDir, dir) {
    return path.join(baseDir, dir)
  }

  function cleanTempDir (baseDir, dir) {
    const fullDir = getTempDir(baseDir, dir)
    let dirs

    try {
      dirs = fs.readdirSync(fullDir)
    } catch (e) {}

    if (!dirs) {
      return
    }

    dirs.forEach((d) => {
      rimraf.sync(path.join(fullDir, d))
    })
  }

  function createTempDir (baseDir, dir) {
    const fullDir = getTempDir(baseDir, dir)
    mkdirp.sync(fullDir)
    return fullDir
  }

  async function setup (baseDir, dir, extensions = [], cliRunnerExtension, opts) {
    cleanTempDir(baseDir, dir)

    const tempDir = createTempDir(baseDir, dir)

    const tempDataDir = createTempDir(baseDir, `${dir}/data`)

    let optionsToUse = extend(true, {
      rootDirectory,
      migrateEntitySetsToFolders: false,
      store: {
        provider: 'memory'
      },
      extensions: {
        'fs-store': {
          dataDirectory: tempDataDir
        }
      }
    }, defaultOpts)

    if (opts) {
      optionsToUse = extend(true, {}, optionsToUse, opts)
    }

    fs.writeFileSync(
      path.join(tempDir, './package.json'),
      JSON.stringify({
        name: dir,
        dependencies: {
          'jsreport-core': '*'
        },
        jsreport: {
          entryPoint: 'server.js'
        }
      }, null, 2)
    )

    fs.writeFileSync(
      path.join(tempDir, './instance.js'),
      `
        process.env.cli_instance_lookup_fallback = process.env.cli_instance_lookup_fallback != null ? process.env.cli_instance_lookup_fallback : 'enabled'

        const defaultOpts = ${optionsToUse != null ? JSON.stringify(optionsToUse) : 'undefined'}

        module.exports = (initOpts) => {
          return (
            require('jsreport-core')(initOpts != null ? initOpts : defaultOpts)
              .use(require(\`${escapePath(cliModuleName)}\`)())
              ${defaultExtensions && defaultExtensions.length > 0 ? defaultExtensions.map((e) => `.use(require(\`${escapePath(e)}\`)())`).join('') : ''}
              ${extensions && extensions.length > 0 ? extensions.map((e) => `.use(require(\`${escapePath(e)}\`)())`).join('') : ''}
          )
        }

        module.exports.defaultOpts = defaultOpts
      `
    )

    fs.writeFileSync(
      path.join(tempDir, './server.js'),
      `
        const createJsreport = require('./instance')

        if (process.env.JSREPORT_CLI) {
          module.exports = createJsreport()
        } else {
          createJsreport().init().catch(function (e) {
            console.error("error on jsreport init")
            console.error(e.stack)
            process.exit(1)
          })
        }
      `
    )

    fs.writeFileSync(
      path.join(tempDir, './cliRunner.js'),
      `
      const createJsreport = require('./instance')

      const commander = require(\`${escapePath(cliModuleName)}\`).commander(undefined, {
        instance: process.env.noDefaultInstance != null ? undefined : createJsreport()
      })

      ${cliRunnerExtension != null ? cliRunnerExtension : ''}

      commander.start(process.argv.slice(2))
      `
    )
  }

  async function init (baseDir, dir, opts) {
    const fullDir = getTempDir(baseDir, dir)

    const createJsreport = require(path.join(fullDir, 'instance.js'))

    const jsreport = createJsreport(
      extend(true, {}, createJsreport.defaultOpts, opts)
    )

    await jsreport.init()

    return jsreport
  }

  function exec (baseDir, dir, cmd = '', opts) {
    const defaultCWD = getTempDir(baseDir, dir)
    const cliRunner = path.join(defaultCWD, 'cliRunner.js')

    const file = process.execPath
    const fullCmd = `${process.env.debugCLI ? '--inspect-brk ' : ''}${cliRunner} ${cmd}`

    // this should be replaced when execa.command (v2) is released
    const args = (
      fullCmd
        .trim()
        .split(/ +/g)
        .reduce((tokens, token, index) => {
          if (index === 0) {
            return [token]
          }

          const previousToken = tokens[tokens.length - 1]

          if (previousToken.endsWith('\\')) {
            return [...tokens.slice(0, -1), `${previousToken.slice(0, -1)} ${token}`]
          }

          return [...tokens, token]
        }, [])
    )

    return execa(file, args, {
      env: Object.assign({ DEBUG: 'jsreport' }, opts != null ? opts.env : undefined),
      cwd: opts && opts.cwd != null ? opts.cwd : defaultCWD,
      windowsHide: true
    })
  }
}

function escapePath (pathStr) {
  return pathStr.replace(/\\/g, '\\\\')
}
