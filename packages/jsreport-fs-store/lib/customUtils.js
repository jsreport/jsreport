const crypto = require('crypto')
const extend = require('node.extend.without.arrays')
const { serialize: _serialize, parse: _parse } = require('@jsreport/serializator')

/**
* Return a random alphanumerical string of length len
* There is a very small probability (less than 1/1,000,000) for the length to be less than len
* (il the base64 conversion yields too many pluses and slashes) but
* that's not an issue here
* The probability of a collision is extremely small (need 3*10^12 documents to have one chance in a million of a collision)
* See http://en.wikipedia.org/wiki/Birthday_problem
*/
function uid (len) {
  return crypto.randomBytes(Math.ceil(Math.max(8, len * 2)))
    .toString('base64')
    .replace(/[+/]/g, '')
    .slice(0, len)
}

function deepGet (doc, path) {
  const paths = path.split('.')
  for (let i = 0; i < paths.length && doc; i++) {
    doc = doc[paths[i]]
  }

  return doc
}

function deepDelete (doc, path) {
  const paths = path.split('.')
  for (let i = 0; i < paths.length && doc; i++) {
    if (i === paths.length - 1) {
      delete doc[paths[i]]
    } else {
      doc = doc[paths[i]]
    }
  }
}

function deepSet (doc, path, val) {
  const paths = path.split('.')
  for (let i = 0; i < paths.length && doc; i++) {
    if (i === paths.length - 1) {
      doc[paths[i]] = val
    } else {
      doc = doc[paths[i]]
    }
  }
}

function serialize (obj, prettify = true) {
  return _serialize(obj, {
    prettify,
    prettifySpace: prettify ? 4 : null,
    typeKeys: {
      date: '$$date',
      buffer: '$$buffer'
    }
  })
}

function parse (rawData) {
  return _parse(rawData, {
    typeKeys: {
      date: '$$date',
      buffer: '$$buffer'
    }
  })
}

async function retry (fn, maxCount = 10) {
  let error
  for (let i = 0; i < maxCount; i++) {
    try {
      const res = await fn()
      return res
    } catch (e) {
      error = e
      await new Promise((resolve) => setTimeout(resolve, i * 10))
    }
  }

  throw error
}

async function * getEntriesInPath (fs, dir, target, ignore) {
  async function * _getEntriesInPath (fs, dir) {
    let dirEntries = await fs.readdir(dir)

    if (dir === '' || target === '') {
      dirEntries = dirEntries.filter(e => !ignore.includes(e))
    }

    const stats = await Promise.all(dirEntries.map(async f => {
      const s = await fs.stat(fs.path.join(dir, f))
      return {
        path: fs.path.join(dir, f),
        stat: s
      }
    }))

    yield {
      path: dir,
      entries: stats
    }

    const dirs = stats.filter(({ path, stat }) => stat.isDirectory() && (dir !== '' || path !== target))

    for (const { path } of dirs) {
      for await (const r of _getEntriesInPath(fs, path)) {
        yield r
      }
    }
  }

  for await (const p of _getEntriesInPath(fs, dir)) {
    yield p
  }
}

async function copy (fs, psource, ptarget, ignore = [], replace = false) {
  // these are the files that we want to ignore always during copy and replace,
  // it is a bit different than the ignore option so that is why it is just a hard-coded list
  const filesIgnore = ['fs.lock', 'fs.journal', 'fs.version', '.tran'].concat(ignore)

  for await (const dir of getEntriesInPath(fs, psource, ptarget, filesIgnore)) {
    const targetPath = fs.path.join(ptarget, dir.path.replace(psource, ''))

    if (replace && (await fs.exists(targetPath))) {
      let targetDirEntries = await fs.readdir(targetPath)
      targetDirEntries = targetDirEntries.filter(f => !filesIgnore.includes(f))

      // eslint-disable-next-line no-unused-vars
      for (const f of targetDirEntries) {
        await fs.remove(fs.path.join(targetPath, f))
      }
    }

    await fs.mkdir(targetPath)

    const files = dir.entries.filter(f => !f.stat.isDirectory())

    await Promise.all(files.map(async (f) => {
      const targetPath = fs.path.join(ptarget, f.path.replace(psource, ''))
      await fs.copyFile(f.path, targetPath)
    }))
  }
}

async function lock (fs, op) {
  const l = await fs.lock()
  try {
    return await op()
  } finally {
    await fs.releaseLock(l)
  }
}

function cloneDocuments (obj) {
  return Object.keys(obj).reduce((acu, setName) => {
    acu[setName] = obj[setName].map((doc) => extend(true, {}, doc))
    return acu
  }, {})
}

async function infiniteRetry (fn, log) {
  let success = false
  let delay = 100
  while (!success) {
    try {
      await fn()
      success = true
    } catch (e) {
      delay = Math.min(20000, delay * 2)
      log(e, delay)
      await await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

module.exports.cloneDocuments = cloneDocuments
module.exports.lock = lock
module.exports.uid = uid
module.exports.deepGet = deepGet
module.exports.deepSet = deepSet
module.exports.deepDelete = deepDelete
module.exports.serialize = serialize
module.exports.parse = parse
module.exports.retry = retry
module.exports.copy = copy
module.exports.infiniteRetry = infiniteRetry
