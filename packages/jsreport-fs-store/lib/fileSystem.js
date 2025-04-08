const util = require('util')
const path = require('path')
const fs = require('fs/promises')
const mkdirp = require('mkdirp')
const { rimraf } = require('rimraf')
const lockFile = require('lockfile')
const callLock = util.promisify(lockFile.lock)
const callUnlock = util.promisify(lockFile.unlock)

module.exports = ({ dataDirectory, lock, externalModificationsSync }) => ({
  memoryState: {},
  lockOptions: lock,
  init: () => {
    if (!lock.stale > 0) {
      throw new Error('extensions.fs-store.persistence.lock.stale needs to be > 0')
    }
    if (!lock.wait > 0) {
      throw new Error('extensions.fs-store.persistence.lock.wait needs to be > 0')
    }

    return mkdirp(dataDirectory)
  },
  readdir: async (p) => {
    const dirs = await fs.readdir(path.join(dataDirectory, p))
    return dirs
  },
  async readFile (p) {
    const res = await fs.readFile(path.join(dataDirectory, p))
    if (externalModificationsSync) {
      this.memoryState[path.join(dataDirectory, p)] = { content: res, isDirectory: false }
    }
    return res
  },
  writeFile (p, c) {
    if (externalModificationsSync) {
      this.memoryState[path.join(dataDirectory, p)] = { content: Buffer.from(c), isDirectory: false }
    }

    return fs.writeFile(path.join(dataDirectory, p), c)
  },
  appendFile (p, c) {
    const fpath = path.join(dataDirectory, p)

    if (externalModificationsSync) {
      this.memoryState[fpath] = this.memoryState[fpath] || { content: Buffer.from(''), isDirectory: false }
      this.memoryState[fpath].content = Buffer.concat([this.memoryState[fpath].content, Buffer.from(c)])
    }

    return fs.appendFile(fpath, c)
  },
  async rename (p, pp) {
    if (externalModificationsSync) {
      const readDirMemoryState = async (sp, dp) => {
        this.memoryState[dp] = { isDirectory: true }
        const contents = await fs.readdir(sp)
        // eslint-disable-next-line no-unused-vars
        for (const c of contents) {
          const stat = await fs.stat(path.join(sp, c))
          if (stat.isDirectory()) {
            await readDirMemoryState(path.join(sp, c), path.join(dp, c))
          } else {
            const fcontent = await fs.readFile(path.join(sp, c))
            this.memoryState[path.join(dp, c)] = { content: fcontent, isDirectory: false }
          }
        }
      }
      const rstat = await fs.stat(path.join(dataDirectory, p))
      if (rstat.isDirectory()) {
        await readDirMemoryState(path.join(dataDirectory, p), path.join(dataDirectory, pp))
      } else {
        const fcontent = await fs.readFile(path.join(dataDirectory, p))
        this.memoryState[path.join(dataDirectory, pp)] = { content: fcontent, isDirectory: false }
      }
    }

    return fs.rename(path.join(dataDirectory, p), path.join(dataDirectory, pp))
  },
  exists: async p => {
    try {
      await fs.stat(path.join(dataDirectory, p))
      return true
    } catch (e) {
      return false
    }
  },
  async stat (p) {
    const stat = await fs.stat(path.join(dataDirectory, p))
    if (externalModificationsSync && stat.isDirectory()) {
      this.memoryState[path.join(dataDirectory, p)] = { isDirectory: true }
    }
    return stat
  },
  async mkdir (p) {
    if (externalModificationsSync) {
      this.memoryState[path.join(dataDirectory, p)] = { isDirectory: true }
    }

    await mkdirp(path.join(dataDirectory, p))
  },
  async remove (p) {
    if (externalModificationsSync) {
    // eslint-disable-next-line no-unused-vars
      for (const c in this.memoryState) {
        if (c.startsWith(path.join(dataDirectory, p, '/')) || c === path.join(dataDirectory, p)) {
          delete this.memoryState[c]
        }
      }
    }

    await rimraf(path.join(dataDirectory, p))
  },
  async copyFile (p, pp) {
    const content = await this.readFile(p)
    return this.writeFile(pp, content)
  },
  path: {
    join: path.join,
    sep: path.sep,
    basename: path.basename
  },
  async lock () {
    await mkdirp(dataDirectory)
    try {
      await callLock(path.join(dataDirectory, 'fs.lock'), Object.assign({}, this.lockOptions))
    } catch (e) {
      throw new Error('Failed to acquire fs store file system lock.', { cause: e })
    }

    // refreshing the lock so we can have a long running transaction
    const refreshInterval = setInterval(() => touch(path.join(dataDirectory, 'fs.lock')), this.lockOptions.stale / 2)
    refreshInterval.unref()
    const undelegateWait = this.lockOptions.wait * (this.lockOptions.retries || 1) + ((this.lockOptions.retries || 1) * (this.lockOptions.retryWait || 0))

    const clearRefreshIntervalTimeout = setTimeout(() => clearInterval(refreshInterval), undelegateWait)
    clearRefreshIntervalTimeout.unref()

    return { refreshInterval, clearRefreshIntervalTimeout }
  },
  async releaseLock (l) {
    clearInterval(l.refreshInterval)
    clearTimeout(l.clearRefreshIntervalTimeout)
    await callUnlock(path.join(dataDirectory, 'fs.lock'))
  }
})

let touchRunning = false
async function touch (filename) {
  if (touchRunning) {
    return
  }

  const time = new Date()

  try {
    touchRunning = true
    await fs.utimes(filename, time, time)
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.warn('Failed to refresh the file system lock', e)
    }
  } finally {
    touchRunning = false
  }
}
