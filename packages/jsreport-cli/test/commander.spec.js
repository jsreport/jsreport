const should = require('should')
const path = require('path')
const fs = require('fs')
const stdMocks = require('std-mocks')
const commander = require('../lib/commander')
const pkg = require('../package.json')
const exitMock = require('./utils/mockProcessExit')

describe('commander', () => {
  describe('when initializing', () => {
    it('should initialize with default options', () => {
      const defaultCommands = ['help', 'init', 'configure', 'start', 'win-install', 'render', 'repair', 'win-uninstall', 'kill']
      const cli = commander()

      should(cli.cwd).be.eql(process.cwd())
      should(cli.context).be.not.undefined()
      should(cli._showHelpWhenNoCommand).be.eql(true)
      should(cli._commandNames).containDeep(defaultCommands)
      should(cli._commandNames.length).be.eql(defaultCommands.length)
      should(cli._cli).not.be.undefined()
    })

    it('should emit event', (done) => {
      const cli = commander()

      cli.on('initialized', done)
    })

    it('should expose cliName', () => {
      const cli = commander()

      should(cli.cliName).be.String()
      should(cli.cliName).not.be.empty()
    })

    it('should allow to customize cliName', () => {
      const cli = commander(undefined, { cliName: 'custom-cli' })

      should(cli.cliName).be.eql('custom-cli')
    })

    it('should have a method to get registered commands', () => {
      const cli = commander()

      should(cli.getCommands()).be.Array()
      should(cli.getCommands().length).be.above(0)
    })

    it('should have an option to register built-in commands', () => {
      const commands = [{
        command: 'push',
        description: 'push command',
        handler: () => {}
      }, {
        command: 'pull',
        description: 'pull command',
        handler: () => {}
      }]

      const cli = commander(undefined, { builtInCommands: commands })

      should(cli.getCommands()).be.eql(['push', 'pull'])
    })

    it('should have an option to disable commands', () => {
      const commands = [{
        command: 'push',
        description: 'push command',
        handler: () => {}
      }, {
        command: 'pull',
        description: 'pull command',
        handler: () => {}
      }]

      const cli = commander(undefined, { builtInCommands: commands, disabledCommands: ['push'] })

      should(cli.getCommands()).be.eql(['pull'])
    })
  })

  describe('when registering command', () => {
    it('should throw error on invalid command module', () => {
      const cli = commander()

      should(function registerInvalidCommands () {
        cli.registerCommand(2)
        cli.registerCommand(true)
        cli.registerCommand(null)
        cli.registerCommand(undefined)
        cli.registerCommand([])
        cli.registerCommand({})
        cli.registerCommand({ command: '' })
        cli.registerCommand({ command: 'command', description: '' })
        cli.registerCommand({ command: 'command', description: 'some description', handler: null })
      }).throw()
    })

    it('should register command', () => {
      const cli = commander()

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {}
      }

      cli.registerCommand(testCommand)

      // test reference equality
      should(cli._commands.test).be.exactly(testCommand)
    })

    it('should register command with positional arguments', () => {
      const cli = commander()

      const testCommand = {
        command: 'test <arg>',
        description: 'test command desc',
        handler: () => {}
      }

      cli.registerCommand(testCommand)

      // test reference equality
      should(cli._commands.test).be.exactly(testCommand)
    })

    it('should return instance', () => {
      const cli = commander()

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {}
      }

      const returnValue = cli.registerCommand(testCommand)

      should(cli).be.exactly(returnValue)
    })

    it('should emit event', function (done) {
      const cli = commander()

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {}
      }

      cli.on('command.register', (cmdName, cmdModule) => {
        should(cmdName).be.eql('test')
        should(cmdModule).be.exactly(testCommand)
        done()
      })

      cli.registerCommand(testCommand)
    })
  })

  describe('when executing command', () => {
    it('should fail on invalid command', () => {
      const cli = commander()

      return should(cli.executeCommand('unknowCmd')).be.rejected()
    })

    it('should pass arguments to command handler', async () => {
      const cli = commander()
      let cmdArgs

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: (args) => {
          return args
        }
      }

      cli.registerCommand(testCommand)

      cli.on('command.init', (cmdName, args) => {
        if (cmdName === 'test') {
          cmdArgs = args
        }
      })

      const result = await cli.executeCommand('test', { args: true })

      should(result).be.exactly(cmdArgs)
    })

    it('should handle command with positional arguments', async () => {
      const cli = commander()

      const testCommand = {
        command: 'test <arg>',
        description: 'test command desc',
        handler: (args) => {
          return args.arg
        }
      }

      cli.registerCommand(testCommand)

      const result = await cli.executeCommand('test', { arg: 'value' })

      should(result).be.eql('value')
    })

    it('should fail when command sync handler fails', () => {
      const cli = commander()

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {
          throw new Error('error in handler')
        }
      }

      cli.registerCommand(testCommand)

      return should(cli.executeCommand('test')).be.rejectedWith({ message: 'error in handler' })
    })

    it('should emit event when command sync handler fails', () => {
      const cli = commander()
      let onInitCalled = false
      let onErrorCalled = false
      let onFinishCalled = false
      let errorInEvent

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {
          throw new Error('error in handler')
        }
      }

      cli.registerCommand(testCommand)

      cli.on('command.init', (cmdName) => {
        if (cmdName === 'test') {
          onInitCalled = true
        }
      })

      cli.on('command.error', (cmdName, error) => {
        if (cmdName === 'test') {
          onErrorCalled = true
          errorInEvent = error
        }
      })

      cli.on('command.finish', (cmdName) => {
        if (cmdName === 'test') {
          onFinishCalled = true
        }
      })

      return cli.executeCommand('test')
        .then(() => {
          throw new Error('command should have failed')
        }, (err) => {
          should(err).be.Error()
          should(err).be.exactly(errorInEvent)
          should(err.message).be.eql('error in handler')
          should(onInitCalled).be.eql(true)
          should(onErrorCalled).be.eql(true)
          should(onFinishCalled).be.eql(true)
        })
    })

    it('should fail when command async handler fails', () => {
      const cli = commander()

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {
          return new Promise((resolve, reject) => {
            reject(new Error('error in handler'))
          })
        }
      }

      cli.registerCommand(testCommand)

      return should(cli.executeCommand('test')).be.rejectedWith({ message: 'error in handler' })
    })

    it('should emit event when command async handler fails', () => {
      const cli = commander()
      let onInitCalled = false
      let onErrorCalled = false
      let onFinishCalled = false
      let errorInEvent

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {
          return new Promise((resolve, reject) => {
            reject(new Error('error in handler'))
          })
        }
      }

      cli.registerCommand(testCommand)

      cli.on('command.init', (cmdName) => {
        if (cmdName === 'test') {
          onInitCalled = true
        }
      })

      cli.on('command.error', (cmdName, error) => {
        if (cmdName === 'test') {
          onErrorCalled = true
          errorInEvent = error
        }
      })

      cli.on('command.finish', (cmdName) => {
        if (cmdName === 'test') {
          onFinishCalled = true
        }
      })

      return (
        cli.executeCommand('test')
          .then(() => {
            throw new Error('command should have failed')
          }, (err) => {
            should(err).be.Error()
            should(err).be.exactly(errorInEvent)
            should(err.message).be.eql('error in handler')
            should(onInitCalled).be.eql(true)
            should(onErrorCalled).be.eql(true)
            should(onFinishCalled).be.eql(true)
          })
      )
    })

    it('should success when command sync handler ends successfully', () => {
      const cli = commander()

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {
          return true
        }
      }

      cli.registerCommand(testCommand)

      return should(cli.executeCommand('test')).be.fulfilledWith(true)
    })

    it('should emit event when command sync handler ends successfully', () => {
      const cli = commander()
      let onInitCalled = false
      let onSuccessCalled = false
      let onFinishCalled = false
      let successValueInEvent

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {
          return true
        }
      }

      cli.registerCommand(testCommand)

      cli.on('command.init', (cmdName) => {
        if (cmdName === 'test') {
          onInitCalled = true
        }
      })

      cli.on('command.success', (cmdName, value) => {
        if (cmdName === 'test') {
          onSuccessCalled = true
          successValueInEvent = value
        }
      })

      cli.on('command.finish', (cmdName) => {
        if (cmdName === 'test') {
          onFinishCalled = true
        }
      })

      return (
        cli.executeCommand('test')
          .then((result) => {
            should(result).be.exactly(successValueInEvent)
            should(onInitCalled).be.eql(true)
            should(onSuccessCalled).be.eql(true)
            should(onFinishCalled).be.eql(true)
          })
      )
    })

    it('should success when command async handler ends successfully', () => {
      const cli = commander()

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {
          return new Promise((resolve, reject) => {
            resolve(true)
          })
        }
      }

      cli.registerCommand(testCommand)

      return should(cli.executeCommand('test')).be.fulfilledWith(true)
    })

    it('should emit event when command async handler ends successfully', () => {
      const cli = commander()
      let onInitCalled = false
      let onSuccessCalled = false
      let onFinishCalled = false
      let successValueInEvent

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {
          return new Promise((resolve) => {
            resolve(true)
          })
        }
      }

      cli.registerCommand(testCommand)

      cli.on('command.init', (cmdName) => {
        if (cmdName === 'test') {
          onInitCalled = true
        }
      })

      cli.on('command.success', (cmdName, value) => {
        if (cmdName === 'test') {
          onSuccessCalled = true
          successValueInEvent = value
        }
      })

      cli.on('command.finish', (cmdName) => {
        if (cmdName === 'test') {
          onFinishCalled = true
        }
      })

      return (
        cli.executeCommand('test')
          .then((result) => {
            should(result).be.exactly(successValueInEvent)
            should(onInitCalled).be.eql(true)
            should(onSuccessCalled).be.eql(true)
            should(onFinishCalled).be.eql(true)
          })
      )
    })
  })

  describe('when starting', () => {
    it('should fail on invalid arguments', async () => {
      const cli = commander()

      const result = await cli.startAndWait()

      should(result.error).be.ok()

      const result2 = await cli.startAndWait(null)
      should(result2.error).be.ok()
    })

    it('should print help by default when command is not present', async () => {
      const cli = commander()
      let helpPrinted = false

      const result = await cli.startAndWait([])
      helpPrinted = result.logs.find((l) => l.message.indexOf('Commands:') !== -1) != null

      should(helpPrinted).be.eql(true)
    })

    it('should not print help when using `showHelpWhenNoCommand` option and command is not present', async () => {
      const cli = commander(process.cwd(), {
        showHelpWhenNoCommand: false
      })

      const result = await cli.startAndWait([])

      should(result.logs.length).be.eql(0)
    })

    it('should handle --help option by default', async () => {
      const cli = commander()
      let helpPrinted = false

      const result = await cli.startAndWait(['--help'])

      helpPrinted = result.logs.find((l) => l.message.indexOf('Commands:') !== -1) != null

      should(helpPrinted).be.eql(true)
    })

    it('should handle --version option by default', async () => {
      const cli = commander()

      const result = await cli.startAndWait(['--version'])
      const versionPrinted = result.logs[0].message

      should(should(versionPrinted.indexOf(pkg.version) !== -1).be.eql(true))
    })

    it('should emit start events', (done) => {
      const cli = commander()
      let startingCalled = false
      let startedCalled = false

      cli.on('starting', () => (startingCalled = true))
      cli.on('started', () => (startedCalled = true))

      cli.on('parsed', () => {
        should(startingCalled).be.eql(true)
        should(startedCalled).be.eql(true)
        done()
      })

      cli.startAndWait([])
    })

    it('should emit parse events', (done) => {
      const cli = commander()
      const cliArgs = ['--some', '--value']
      let argsInEvent
      let contextInEvent

      cli.on('parsing', (args, context) => {
        argsInEvent = args
        contextInEvent = context
      })

      cli.on('parsed', () => {
        should(argsInEvent).be.eql(cliArgs)
        should(contextInEvent).be.not.undefined()
        done()
      })

      cli.startAndWait(cliArgs)
    })

    it('should exit on invalid command', (done) => {
      const cli = commander()
      const cliArgs = ['unknown']

      cli.on('started', (err) => {
        process.nextTick(() => {
          exitMock.restore()

          const exitCode = exitMock.callInfo().exitCode

          should(err).be.Error()
          should(exitCode).be.eql(1)
          done()
        })
      })

      exitMock.enable()

      cli.start(cliArgs)
    })

    it('should exit on invalid option', (done) => {
      const cli = commander()
      const cliArgs = ['--unknown']

      cli.on('parsed', (err) => {
        process.nextTick(() => {
          exitMock.restore()

          const exitCode = exitMock.callInfo().exitCode

          should(err).be.Error()
          should(exitCode).be.eql(1)
          done()
        })
      })

      exitMock.enable()

      cli.start(cliArgs)
    })

    it('should handle a failing sync command', (done) => {
      const cli = commander()

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {
          throw new Error('error testing')
        }
      }

      cli.registerCommand(testCommand)

      cli.on('started', (err) => {
        if (err) {
          return done(err)
        }
      })

      cli.on('command.error', (cmdName, err) => {
        should(cmdName).be.eql('test')
        should(err).be.Error()
        done()
      })

      cli.startAndWait(['test']).then(() => {}).catch(() => {})
    })

    it('should handle a failing async command', (done) => {
      const cli = commander()

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {
          return new Promise((resolve, reject) => reject(new Error('error testing')))
        }
      }

      cli.registerCommand(testCommand)

      cli.on('command.error', (cmdName, err) => {
        setTimeout(() => {
          exitMock.restore()

          const exitCode = exitMock.callInfo().exitCode

          should(cmdName).be.eql('test')
          should(err).be.Error()
          should(exitCode).be.eql(1)
          done()
        }, 200)
      })

      exitMock.enable()

      cli.start(['test'])
    })

    it('should handle a successfully sync command ', (done) => {
      const cli = commander()

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {
          console.log('test output')
          return true
        }
      }

      cli.registerCommand(testCommand)

      cli.on('command.success', (cmdName, result) => {
        setTimeout(() => {
          stdMocks.restore()
          exitMock.restore()

          const output = stdMocks.flush()
          const exitCode = exitMock.callInfo().exitCode

          should(cmdName).be.eql('test')
          should(output.stdout[0].replace(/(?:\r\n|\r|\n)/, '')).be.eql('test output')
          should(result).be.eql(true)
          should(exitCode).be.eql(0)
          done()
        }, 200)
      })

      stdMocks.use()
      exitMock.enable()

      cli.start(['test'])
    })

    it('should handle a successfully async command', (done) => {
      const cli = commander()

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: () => {
          return new Promise((resolve, reject) => {
            console.log('test async output')
            resolve(true)
          })
        }
      }

      cli.registerCommand(testCommand)

      cli.on('command.success', (cmdName, result) => {
        setTimeout(() => {
          stdMocks.restore()
          exitMock.restore()

          const output = stdMocks.flush()
          const exitCode = exitMock.callInfo().exitCode

          should(cmdName).be.eql('test')
          should(output.stdout[0].replace(/(?:\r\n|\r|\n)/, '')).be.eql('test async output')
          should(result).be.eql(true)
          should(exitCode).be.eql(0)
          done()
        }, 200)
      })

      stdMocks.use()
      exitMock.enable()

      cli.start(['test'])
    })

    it('should pass context to command', (done) => {
      const cli = commander()

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: (argv) => {
          return argv.context
        }
      }

      cli.registerCommand(testCommand)

      cli.on('command.success', (cmdName, result) => {
        setTimeout(() => {
          stdMocks.restore()
          stdMocks.flush()
          exitMock.restore()

          should(cmdName).be.eql('test')
          should(result).be.not.undefined()

          should(result).have.properties([
            'cwd',
            'sockPath',
            'workerSockPath'
          ])

          done()
        }, 200)
      })

      stdMocks.use()
      exitMock.enable()

      cli.start(['test'])
    })
  })

  describe('when using jsreport instances', () => {
    const dirName = 'commander-project'

    const { getTempDir, setup } = require('./testUtils')({
      cliModuleName: path.join(__dirname, '../'),
      baseDir: path.join(__dirname, './temp'),
      rootDirectory: path.join(__dirname, '../'),
      defaultExtensions: [
        'jsreport-fs-store'
      ],
      defaultOpts: {
        store: {
          provider: 'fs'
        }
      },
      deps: {
        extend: require('node.extend.without.arrays'),
        mkdirp: require('mkdirp'),
        rimraf: require('rimraf'),
        execa: require('execa')
      }
    })

    beforeEach(async () => {
      const fullDir = getTempDir(dirName)

      try {
        // deleting cache of package.json to allow run the tests on the same project
        delete require.cache[require.resolve(path.join(fullDir, './package.json'))]
      } catch (e) {}

      await setup(dirName)

      // needed because on these tests we don't execute the cli directly,
      // the tests use the commander API
      process.env.cli_instance_lookup_fallback = 'enabled'
    })

    afterEach(() => {
      delete process.env.cli_instance_lookup_fallback
    })

    it('should emit event on instance searching', (done) => {
      const fullDir = getTempDir(dirName)
      const cli = commander(fullDir)

      let instanceLookupCalled = false
      let instanceFoundCalled = false
      let instanceInEvent
      let instanceInHandler

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: async (argv) => {
          instanceInHandler = await argv.context.getInstance()
          return instanceInHandler
        }
      }

      cli.registerCommand(testCommand)

      cli.on('instance.lookup', () => (instanceLookupCalled = true))

      cli.on('instance.found', (instance) => {
        instanceFoundCalled = true
        instanceInEvent = instance
      })

      cli.on('command.success', (cmdName, result) => {
        setTimeout(() => {
          let exitCode

          exitMock.restore()

          exitCode = exitMock.callInfo().exitCode

          should(cmdName).be.eql('test')
          should(exitCode).be.eql(0)
          should(instanceLookupCalled).be.eql(true)
          should(instanceFoundCalled).be.eql(true)
          should(instanceInHandler).be.exactly(instanceInEvent)
          should(result).be.exactly(instanceInHandler)

          if (instanceInHandler.express && instanceInHandler.express.server) {
            instanceInHandler.express.server.close()
          }

          done()
        }, 200)
      })

      exitMock.enable()

      cli.start(['test'])
    })

    it('should emit event when using a default instance', function (done) {
      const fullDir = getTempDir(dirName)
      const cli = commander(fullDir)
      let instanceLookupCalled = false
      let instanceDefaultCalled = false
      let instanceInEvent
      let instanceInHandler

      const pkg = JSON.parse(fs.readFileSync(path.join(fullDir, 'package.json')).toString())

      delete pkg.jsreport

      fs.writeFileSync(path.join(fullDir, 'package.json'), JSON.stringify(pkg, null, 2))
      fs.unlinkSync(path.join(fullDir, 'server.js'))

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: async (argv) => {
          instanceInHandler = await argv.context.getInstance()
          return instanceInHandler
        }
      }

      cli.registerCommand(testCommand)

      cli.on('instance.lookup', () => (instanceLookupCalled = true))

      cli.on('instance.default', (instance) => {
        instanceDefaultCalled = true
        instanceInEvent = instance
      })

      cli.on('command.success', (cmdName, result) => {
        setTimeout(() => {
          let exitCode

          exitMock.restore()

          exitCode = exitMock.callInfo().exitCode

          should(cmdName).be.eql('test')
          should(exitCode).be.eql(0)
          should(instanceLookupCalled).be.eql(true)
          should(instanceDefaultCalled).be.eql(true)
          should(instanceInHandler).be.exactly(instanceInEvent)
          should(result).be.exactly(instanceInHandler)

          done()
        }, 200)
      })

      exitMock.enable()

      cli.start(['test'])
    })

    it('should emit event on instance initialization', (done) => {
      const fullDir = getTempDir(dirName)
      const cli = commander(fullDir)
      let instanceInitializingCalled = false
      let instanceInHandler

      const testCommand = {
        command: 'test',
        description: 'test command desc',
        handler: async (argv) => {
          instanceInHandler = await argv.context.getInstance()
          await argv.context.initInstance(instanceInHandler)
          return instanceInHandler
        }
      }

      cli.registerCommand(testCommand)

      cli.on('instance.initializing', () => (instanceInitializingCalled = true))

      cli.on('instance.initialized', (result) => {
        setTimeout(() => {
          let exitCode

          exitMock.restore()

          exitCode = exitMock.callInfo().exitCode

          should(exitCode).be.eql(0)
          should(instanceInitializingCalled).be.eql(true)
          should(result).be.exactly(instanceInHandler)

          done()
        }, 200)
      })

      exitMock.enable()

      cli.start(['test'])
    })
  })
})
