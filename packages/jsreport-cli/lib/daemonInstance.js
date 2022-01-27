'use strict'

const fs = require('fs')
const HttpsServer = require('https').Server
const ipAddress = require('ip-address')
const nssocket = require('nssocket')
const instanceHandler = require('./instanceHandler')
const startSocketServer = require('./utils/startSocketServer')
const { getErrors } = require('./utils/error')

const PID = process.pid

let socketServer

function start (customInstance, socketFile) {
  const socketToMaster = new nssocket.NsSocket()
  let parentSocketFile
  let processInfo
  let reporterInstance

  console.log('PID of daemon instance:', PID)

  if (socketFile) {
    parentSocketFile = socketFile
  } else {
    parentSocketFile = process.argv[2]
  }

  // connect to parent socket for parent-child communication
  socketToMaster.connect(parentSocketFile, (err) => {
    // in case of connection error exit the process immediately
    // to notify parent
    if (err) {
      return process.exit(1)
    }

    // parent process will pass options in the "init" event
    socketToMaster.dataOnce(['init'], (options) => {
      const sockPath = options.sockPath
      const cwd = options.cwd
      const verbose = options.verbose
      let getInstanceAsync

      if (customInstance) {
        getInstanceAsync = Promise.resolve({
          instance: typeof customInstance === 'function' ? customInstance() : customInstance
        })
      } else {
        getInstanceAsync = instanceHandler.find(cwd)
      }

      // find and initialize a jsreport instance
      getInstanceAsync
        .then((instanceInfo) => {
          return instanceHandler.initialize(instanceInfo.instance, verbose)
        })
        .then((instance) => {
          let adminAuthentication
          let jsreportServer
          let address
          let hostname
          let protocol
          let appPath

          reporterInstance = instance

          if (
            instance.options.extensions &&
            instance.options.extensions.authentication &&
            instance.options.extensions.authentication.admin
          ) {
            adminAuthentication = instance.options.extensions.authentication.admin
          }

          if (instance.express && instance.express.server) {
            jsreportServer = instance.express.server
            address = jsreportServer.address()
          } else {
            throw new Error(
              'jsreport instance detected does not have jsreport-express extension enabled, ' +
              'either install or enable it first to use keepAlive option'
            )
          }

          appPath = instance.options.appPath || ''

          if (appPath === '/') {
            appPath = ''
          }

          // normalizing ipv6 to ipv4
          if (address.family === 'IPv6') {
            hostname = new ipAddress.Address6(address.address).to4()

            if (typeof hostname !== 'string') {
              hostname = hostname.address
            }
          } else {
            hostname = address.address
          }

          // normalizing host, on windows connecting to "0.0.0.0" doesn't work
          if (hostname === '0.0.0.0') {
            hostname = 'localhost'
          }

          if (jsreportServer instanceof HttpsServer) {
            protocol = 'https'
          } else {
            protocol = 'http'
          }

          const urlToServer = `${protocol}://${hostname}:${address.port}/${appPath}`

          // starting a server in a new socket to allow the monitoring
          // and query of this process from the CLI
          socketServer = startSocketServer({
            socketPath: sockPath,
            socketPrefix: 'm',
            // Create 'symbolic' file on the system, so it can be later
            // found, since the `\\.pipe\\*` "files" can't
            // be enumerated because ... Windows.
            createSymbolicForSocket: process.platform === 'win32',
            protocol: monitorProtocol
          }, (socketInitErr, serverInfo) => {
            if (socketInitErr) {
              return socketToMaster.send(['init'], {
                error: socketInitErr.message,
                stacks: getErrors(socketInitErr).map(e => e.stack)
              })
            }

            // collecting all the information about this process
            // for later queries
            processInfo = {
              uid: serverInfo.uid,
              pid: PID,
              cwd: cwd,
              version: instance.version,
              socketFile: serverInfo.socketFile,
              normalizedSocketFile: serverInfo.normalizedSocketFile,
              url: urlToServer,
              adminAuthentication: adminAuthentication
            }

            socketToMaster.send(['init'], Object.assign({}, processInfo, { error: null }))
          })
        })
        .catch((err) => {
          const meta = {}

          if (err.code != null) {
            meta.code = err.code
          }

          socketToMaster.send(['init'], {
            error: err.message,
            stacks: getErrors(err).map(e => e.stack),
            meta: Object.keys(meta).length > 0 ? meta : undefined
          })

          setImmediate(() => {
            process.exit(1)
          })
        })
    })

    socketToMaster.send(['alive'])
  })

  socketToMaster.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      try {
        fs.unlinkSync(parentSocketFile)
      } catch (e) {}
    }

    process.exit(1)
  })

  function monitorProtocol (socket) {
    socket.on('error', (err) => {
      console.error('socket error:', err)
      socket.destroy()
    })

    socket.data(['info'], () => {
      socket.send(['info'], processInfo)
    })

    socket.data(['kill'], () => {
      if (process.platform === 'win32') {
        //
        // On Windows, delete the 'symbolic' sock file. This
        // file is used for exploration as a mapping to the
        // `\\.pipe\\*` "files" that can't
        // be enumerated because ... Windows.
        //
        try {
          fs.unlinkSync(processInfo.socketFile)
        } catch (e) {}
      }

      // close the server to prevent accepting new connections,
      // such situation can happen when doing concurrent calls to kill the server
      if (socketServer) {
        socketServer.close()
      }

      const exit = () => process.exit()

      if (reporterInstance) {
        reporterInstance.close().then(exit, exit)
      } else {
        exit()
      }
    })
  }
}

if (require.main === module) {
  start()
} else {
  module.exports = start
}
