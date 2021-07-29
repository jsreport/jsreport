'use strict'

module.exports = function normalizeSocketPath (socketPath) {
  if (process.platform === 'win32') {
    socketPath = '\\\\.\\pipe\\' + socketPath
  }

  return socketPath
}
