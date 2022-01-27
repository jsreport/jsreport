'use strict'

const util = require('util')
const path = require('path')
const fs = require('fs')
const nssocket = require('nssocket')
const lockfile = require('lockfile')
const getTempPaths = require('./utils/getTempPaths')
const normalizeSocketPath = require('./utils/normalizeSocketPath')

const lock = util.promisify(lockfile.lock.bind(lockfile))
const unlock = util.promisify(lockfile.unlock.bind(lockfile))

exports.findProcessByCWD = findProcessByCWD
exports.findProcessByUidOrPid = findProcessByUidOrPid
exports.getAllProcesses = getAllProcesses
exports.getSockets = getSockets
exports.kill = kill

async function findProcessByCWD (sockPath, cwd) {
  const processes = await getAllProcesses(sockPath)

  const procs = processes.filter((p) => {
    return p.cwd === cwd
  })

  if (procs.length === 0) {
    return null
  }

  return procs[0]
}

async function findProcessByUidOrPid (sockPath, id) {
  const processes = await getAllProcesses(sockPath)

  const procs = search([(p) => {
    return p.uid === id
  }, (p) => {
    return String(p.pid) === String(id)
  }])

  if (procs.length === 0) {
    return null
  }

  return procs[0]

  function search (filters) {
    let result = []

    filters.forEach((filter) => {
      if (result.length > 0) {
        return
      }

      result = processes.filter(filter)
    })

    return result
  }
}

async function kill (proc) {
  const socketFile = proc.normalizedSocketFile
  const lockfilePath = path.join(getTempPaths().cliPath, 'jsreport-keepAlive-kill.lock')

  await lock(lockfilePath, {
    stale: 3500,
    retries: 30,
    retryWait: 100
  })

  try {
    await new Promise((resolve, reject) => {
      const socket = new nssocket.NsSocket()

      socket.connect(socketFile, (err) => {
        if (err) {
          return reject(err)
        }

        socket.send(['kill'], (err) => {
          if (err) {
            return reject(err)
          }

          resolve()
          socket.end()
        })
      })

      socket.on('close', () => {
        // we only care to reject on close when there was no other event fired
        // that resolved the promise.
        // this can happen when we are in the middle of sending data and the socket
        // was detroyed for some reason (like daemon process exit)
        reject(new Error(`connection to socket "${socketFile}" was closed unexpectedly`))
      })

      socket.on('error', (err) => {
        reject(err)
      })
    })
  } finally {
    await unlock(lockfilePath)
  }
}

async function getAllProcesses (sockPath) {
  const sockets = await getSockets(sockPath)

  const processes = await Promise.all(sockets.map(async function getProcess (name) {
    let fullPath = path.join(sockPath, name)
    const socket = new nssocket.NsSocket()

    fullPath = normalizeSocketPath(fullPath)

    return new Promise((resolve, reject) => {
      socket.connect(fullPath, (connectErr) => {
        if (connectErr) {
          return reject(connectErr)
        }

        socket.dataOnce(['info'], (info) => {
          resolve(info)
          socket.end()
        })

        socket.send(['info'], (err) => {
          if (err) {
            return resolve()
          }
        })
      })

      socket.on('close', () => {
        resolve()
      })

      socket.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
          try {
            fs.unlinkSync(fullPath)
          } catch (e) {}

          resolve()
        } else {
          resolve()
        }
      })
    })
  }))

  return processes.filter(Boolean)
}

async function getSockets (sockPath) {
  let sockets = []

  sockets = fs.readdirSync(sockPath)

  return sockets
}
