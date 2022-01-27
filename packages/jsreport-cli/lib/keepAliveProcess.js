'use strict'

const util = require('util')
const path = require('path')
const fs = require('fs')
const spawn = require('silent-spawn')
const lockfile = require('lockfile')
const omit = require('lodash.omit')
const { addStack } = require('./utils/error')
const getTempPaths = require('./utils/getTempPaths')
const startSocketServer = require('./utils/startSocketServer')
const daemonHandler = require('./daemonHandler')

const lock = util.promisify(lockfile.lock.bind(lockfile))
const unlock = util.promisify(lockfile.unlock.bind(lockfile))

const IS_WINDOWS = process.platform === 'win32'

module.exports = async function keepAliveProcess (options) {
  const daemonExec = options.daemonExec || {}
  const mainSockPath = options.mainSockPath
  const workerSockPath = options.workerSockPath
  const cwd = options.cwd
  const verbose = options.verbose
  const daemonInstancePath = daemonExec.scriptPath || path.join(__dirname, './daemonInstance.js')
  const lockfilePath = path.join(getTempPaths().cliPath, 'jsreport-keepAlive-start.lock')

  // we acquire a lock first to ensure that calls across multiple process executes just once at
  // a time and waits for the others to finish first
  await lock(lockfilePath, {
    stale: 16000,
    retries: 400,
    retryWait: 50
  })

  try {
    // check if the process was already created after the lock was released
    let processInfo = await daemonHandler.findProcessByCWD(workerSockPath, cwd)

    if (processInfo) {
      // if yes then just return the processInfo
      return processInfo
    }

    // activate env var JSREPORT_CLI_DAEMON_STD_FILES when you want to debug messages
    // in the child process
    const processStdToFiles = process.env.JSREPORT_CLI_DAEMON_STD_FILES === 'enabled'
    let targetStdio = 'ignore'

    if (processStdToFiles) {
      const stdStreams = await createStdFiles()
      targetStdio = ['ignore', stdStreams[0], stdStreams[1]]
    }

    processInfo = await new Promise((resolve, reject) => {
      let initOptions
      let child
      const daemonProcess = {}

      // we are starting a temporary server for communication with the child
      // that it's gonna be spawned below, we can't use an IPC channel between
      // the processes because we are using "silent-spawn" package
      // that uses a little hack to be able to have a detached process without
      // creating a new console in windows, an because of that the built-in IPC
      // will not work.
      const socketServer = startSocketServer({
        socketPath: mainSockPath,
        socketPrefix: 'c',
        protocol: daemonInstanceProtocol
      }, (err, serverInfo) => {
        if (err) {
          const error = new Error('Error while trying to start socket server')
          error.originalError = err
          return reject(error)
        }

        initOptions = {
          sockPath: workerSockPath,
          cwd: cwd,
          verbose: verbose
        }

        const socketFile = serverInfo.normalizedSocketFile

        if (daemonExec.path) {
          daemonProcess.path = daemonExec.path
        } else {
          daemonProcess.path = process.execPath
        }

        daemonProcess.args = [
          daemonInstancePath,
          socketFile
        ]

        if (Array.isArray(daemonExec.args)) {
          daemonProcess.args = daemonProcess.args.concat(daemonExec.args)
        } else if (typeof daemonExec.args === 'function') {
          const customArgs = daemonExec.args(daemonProcess.args)

          if (Array.isArray(customArgs)) {
            daemonProcess.args = customArgs
          }
        }

        // spacing arguments in windows
        if (IS_WINDOWS) {
          daemonProcess.args = daemonProcess.args.map((arg) => {
            return '"' + arg + '"'
          })
        }

        daemonProcess.opts = {
          stdio: targetStdio,
          detached: true,
          cwd: cwd
        }

        daemonProcess.opts.env = Object.assign({}, process.env, { JSREPORT_CLI: true, JSREPORT_CLI_DAEMON_PROCESS: true })

        if (daemonExec.opts) {
          daemonProcess.opts = Object.assign(daemonProcess.opts, daemonExec.opts)
          daemonProcess.opts.env = Object.assign(daemonProcess.opts.env, daemonProcess.opts.env)
        }

        // start a daemonized process
        child = spawn(
          daemonProcess.path,
          daemonProcess.args,
          daemonProcess.opts
        )

        child.on('exit', (code) => {
          reject(new Error('Child process died to soon with exit code ' + code))
        })
      })

      function daemonInstanceProtocol (socket) {
        socket.on('error', () => {
          socket.destroy()
          socketServer.close()
        })

        socket.dataOnce(['alive'], () => {
          socket.send(['init'], initOptions, (err) => {
            if (err) {
              return reject(err)
            }
          })
        })

        socket.dataOnce(['init'], (result) => {
          socket.end()
          socketServer.close()

          if (result.error) {
            const error = new Error(result.error)

            if (result.meta != null) {
              Object.assign(error, omit(result.meta, ['message', 'stack']))
            }

            if (Array.isArray(result.stacks)) {
              result.stacks.forEach((stk) => {
                addStack(error, stk, {
                  stackPrefix: 'Remote Instance Error: ',
                  stripMessage: true
                })
              })
            }

            error.message = `An error occurred while trying to start daemonized process: ${error.message}`

            reject(error)
          } else {
            // remove error prop from result
            delete result.error

            resolve(resolve(Object.assign({}, result, {
              // result.pid and child.pid can be different on windows, because the detached mode
              pid: result.pid,
              proc: child
            })))
          }
        })
      }
    })

    return processInfo
  } finally {
    await unlock(lockfilePath)
  }
}

async function createStdFiles () {
  return new Promise((resolve) => {
    const fileStream = fs.createWriteStream('jsreport-daemon-log.txt')

    function ready () {
      resolve([fileStream, fileStream])
    }

    fileStream.on('open', ready)
  })
}
