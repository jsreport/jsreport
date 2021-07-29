function deepGet (doc, path) {
  const paths = path.split('.')
  for (let i = 0; i < paths.length && doc; i++) {
    doc = doc[paths[i]]
  }

  return doc
}

function deepDelete (doc, path) {
  var paths = path.split('.')
  for (var i = 0; i < paths.length && doc; i++) {
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
      doc[paths[i]] = doc[paths[i]] || {}
      doc = doc[paths[i]]
    }
  }
}

function serialize (obj, prettify = true) {
  var res

  var originalDateToJSON = Date.prototype.toJSON
  // Keep track of the fact that this is a Date object
  Date.prototype.toJSON = function () { // eslint-disable-line
    return { $$date: this.getTime() }
  }

  var originalBufferToJSON = Buffer.prototype.toJSON
  Buffer.prototype.toJSON = function () {
    return { $$buffer: this.toString('base64') }
  }

  res = JSON.stringify(obj, function (k, v) {
    if (typeof v === 'undefined') {
      return null
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
      return v
    }

    return v
  }, prettify ? 4 : null)

  // Return Date to its original state
  Date.prototype.toJSON = originalDateToJSON // eslint-disable-line
  Buffer.prototype.toJSON = originalBufferToJSON
  return res
}

function parse (rawData) {
  return JSON.parse(rawData, function (k, v) {
    if (k === '$$date') {
      return new Date(v)
    }
    if (k === '$$buffer') {
      return Buffer.from(v, 'base64')
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
      return v
    }
    if (v && v.$$date) {
      return v.$$date
    }
    if (v && v.$$buffer) {
      return v.$$buffer
    }

    return v
  })
}

function equalIgnoreNewLine (x, y) {
  if (x === y) {
    return true
  }
  if (typeof x === 'string' && typeof y === 'string') {
    return (x + '\n' === y + '\n') || (x + '\n' === y) || (x === y + '\n')
  }

  return false
}

function deepEqual (x, y, isRootCall = true) {
  if (equalIgnoreNewLine(x, y)) {
    return true
  }

  if (x == null && y != null) {
    return false
  }

  if (x != null && y == null) {
    return false
  }

  if (isRootCall && x.modificationDate && y.modificationDate && x.modificationDate.getTime() === y.modificationDate.getTime()) {
    return true
  }

  if (Buffer.isBuffer(x) && Buffer.isBuffer(y)) {
    return x.equals(y)
  }

  for (var p in x) {
    if (!x.hasOwnProperty(p)) {
      continue
    }

    if (!y.hasOwnProperty(p)) {
      return false
    }

    if (equalIgnoreNewLine(x[p], y[p])) {
      continue
    }

    if (typeof (x[ p ]) !== 'object') {
      return false
    }

    if (!deepEqual(x[p], y[p], false)) {
      return false
    }
  }

  for (p in y) {
    if (y.hasOwnProperty(p) && !x.hasOwnProperty(p)) {
      return false
    }
  }
  return true
}

module.exports.deepGet = deepGet
module.exports.deepSet = deepSet
module.exports.deepDelete = deepDelete
module.exports.serialize = serialize
module.exports.parse = parse
module.exports.deepEqual = deepEqual
