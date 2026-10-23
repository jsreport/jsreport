const { serialize: _serialize, parse: _parse } = require('@jsreport/serializator')

function deepGet (doc, path) {
  // deny getting properties if any of them are not owned directly on the object
  // (like properties coming from the prototype chain)
  if (!deepHasOwnProperty(doc, path)) {
    return
  }

  const paths = path.split('.')

  for (let i = 0; i < paths.length && doc; i++) {
    doc = doc[paths[i]]
  }

  return doc
}

function deepDelete (doc, path) {
  // deny deleting properties if any of them are not owned directly on the object
  // (like properties coming from the prototype chain)
  if (!deepHasOwnProperty(doc, path)) {
    return
  }

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

  // deny setting unsafe properties (prototype mutation keys)
  let containsPrototypeKeys = false
  const prototypeKeys = ['__proto__', 'constructor', 'prototype']
  let tmpDoc = doc

  for (let i = 0; i < paths.length && tmpDoc; i++) {
    if (prototypeKeys.includes(paths[i])) {
      containsPrototypeKeys = true
      break
    }

    tmpDoc = tmpDoc[paths[i]]
  }

  if (containsPrototypeKeys) {
    return
  }

  for (let i = 0; i < paths.length && doc; i++) {
    if (i === paths.length - 1) {
      doc[paths[i]] = val
    } else {
      doc[paths[i]] = doc[paths[i]] || {}
      doc = doc[paths[i]]
    }
  }
}

function deepHasOwnProperty (doc, path) {
  const paths = path.split('.')
  let has = false

  for (let i = 0; i < paths.length && doc; i++) {
    has = Object.hasOwn(doc, paths[i])

    if (!has) {
      break
    }

    doc = doc[paths[i]]
  }

  return has
}

function serialize (obj, prettify = true) {
  return _serialize(obj, {
    prettify,
    prettifySpace: 4,
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

  for (const p in x) {
    if (!Object.prototype.hasOwnProperty.call(x, p)) {
      continue
    }

    if (!Object.prototype.hasOwnProperty.call(y, p)) {
      return false
    }

    if (equalIgnoreNewLine(x[p], y[p])) {
      continue
    }

    if (typeof (x[p]) !== 'object') {
      return false
    }

    if (!deepEqual(x[p], y[p], false)) {
      return false
    }
  }

  for (const p in y) {
    if (Object.prototype.hasOwnProperty.call(y, p) && !Object.prototype.hasOwnProperty.call(x, p)) {
      return false
    }
  }
  return true
}

module.exports.deepGet = deepGet
module.exports.deepSet = deepSet
module.exports.deepHasOwnProperty = deepHasOwnProperty
module.exports.deepDelete = deepDelete
module.exports.serialize = serialize
module.exports.parse = parse
module.exports.deepEqual = deepEqual
