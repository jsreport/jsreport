'use strict'

const path = require('path')
const fs = require('fs')
const { nanoid } = require('nanoid')
const nssocket = require('nssocket')
const normalizeSocketPath = require('./normalizeSocketPath')

/**
 * Starts a server using a socket file randomly generated
 * and resolves when it is ready to listen connections
 */
module.exports = function startSocketServer (options, cb) {
  const socketPath = options.socketPath
  const socketPrefix = options.socketPrefix || ''
  const createSymbolicForSocket = options.createSymbolicForSocket
  const protocol = options.protocol
  const uid = nanoid(7)
  const server = nssocket.createServer(protocol)

  const socketFile = path.join(socketPath, [
    socketPrefix,
    uid,
    'sock'
  ].join('.'))

  if (createSymbolicForSocket) {
    fs.openSync(socketFile, 'w')
  }

  const normalizedSocketFile = normalizeSocketPath(socketFile)

  server.on('listening', () => {
    cb(null, {
      uid: uid,
      socketFile: socketFile,
      normalizedSocketFile: normalizedSocketFile,
      server: server
    })
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      return startSocketServer(options, cb)
    } else {
      cb(err)
    }
  })

  server.listen(normalizedSocketFile)

  return server
}
