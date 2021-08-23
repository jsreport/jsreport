const path = require('path')

module.exports = (options) => {
  const customTempDirectory = getCustomTempDirectory()

  if (customTempDirectory) {
    process.env.cli_tempDirectory = customTempDirectory
    process.env.binary_tempDirectory = customTempDirectory
  }

  const getJsreport = prepareJsreport(options)

  if (options.handleArguments === false) {
    return getJsreport()
  }

  if (process.argv.length === 5 && process.argv[4] === '--node-process') {
    // the process is started from keep-alive spawn
    // we just pass control to cli daemon script
    require(process.argv[2])(getJsreport, process.argv[3])
  } else {
    // we do an optimization for render with keepAlive case,
    // instead of going the normal flow of cli execution we delegate the handling
    // to a server route defined by CLI that does the render work, this assumes that there is a background already running,
    // if there is no background process then it fallbacks to normal CLI execution
    if (
      process.argv[2] === 'render' &&
      (process.argv.includes('--keepAlive') || process.argv.includes('-k'))
    ) {
      const delegateRender = require('./delegateRender')

      delegateRender({
        cwd: process.cwd(),
        args: process.argv.slice(2),
        instanceVersion: options.version
      }).then(({ processFound, failure }) => {
        if (!processFound) {
          startCLI(getJsreport, customTempDirectory, options)
        } else if (failure) {
          process.exit(1)
        }
      }).catch((err) => {
        console.error(err.stack != null ? err.stack : err.message)
        process.exit(1)
      })
    } else {
      startCLI(getJsreport, customTempDirectory, options)
    }
  }
}

function startCLI (getJsreport, customTempDirectory, options) {
  const Execution = require('./execution')

  const execution = new Execution(
    options.originalProjectDir,
    options.resources,
    options.version,
    options.shortid,
    customTempDirectory
  )

  const cliExtension = require('@jsreport/jsreport-cli')

  execution.ensureTmpResources().then(() => {
    const cli = cliExtension.commander(process.cwd(), {
      cliName: path.basename(process.execPath),
      disabledCommands: ['init', 'repair'],
      jsreportVersion: options.version,
      instance: getJsreport,
      execution,
      appInfo: {
        path: process.cwd(),
        name: 'jsreport-server-exe',
        description: 'javascript based reporting platform',
        startcmd: `"${process.execPath}" start`
      },
      // we cli to spawn another jsreport.exe when rendering with keep-alive
      daemonExecPath: process.execPath,
      // resolve bundle path to additionaly included script
      // daemonExecScriptPath: execution.resolve('daemonInstance'),
      // ask cli to add extra argument to the process so we can distinguisg between full and daemon run
      daemonExecArgs: (args) => {
        const newArgs = [...args]

        newArgs.unshift(process.pkg.defaultEntrypoint)
        newArgs.push('--node-process')

        return newArgs
      }
    })

    if (options.requireCliExtensionsCommands) {
      const extensionCommands = options.requireCliExtensionsCommands()

      extensionCommands.forEach((extCmdModule) => {
        if (Array.isArray(extCmdModule)) {
          extCmdModule.forEach((cmdModule) => cli.registerCommand(cmdModule))
        } else {
          cli.registerCommand(extCmdModule)
        }
      })
    }

    cli.start(process.argv.slice(2))
  })
}

function prepareJsreport (options) {
  // we return a function to lazily create a jsreport instance when needed
  return function () {
    return require('../runtime/runtimeJsreport')(options)
  }
}

function getCustomTempDirectory () {
  const args = process.argv.slice(2)
  let directory

  if (process.env.tempDirectory) {
    directory = process.env.tempDirectory
  }

  args.some((a, idx) => {
    let fromArg = false

    if (a === '--tempDirectory' && args[idx + 1] != null) {
      fromArg = true
      directory = args[idx + 1]
    } else if (a.startsWith('--tempDirectory=')) {
      fromArg = true
      directory = a.slice(a.indexOf('=') + 1)
    }

    if (!fromArg) {
      return false
    }

    if (directory != null && directory.includes('"')) {
      if (directory.startsWith('"') && directory.endsWith('"')) {
        directory = directory.slice(1, -1)
      } else {
        directory = null
      }
    }

    if (directory !== '' && directory != null) {
      return true
    }

    return false
  })

  if (directory != null) {
    return path.resolve(process.cwd(), directory)
  }

  return null
}
