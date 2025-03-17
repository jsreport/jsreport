'use strict'

const defaultTypeKeys = {
  date: '$$$date$$$',
  buffer: '$$$buffer$$$'
}

let serializing = false
let serializingTypeKeys = defaultTypeKeys

const originalDateToJSON = Date.prototype.toJSON
const originalBufferToJSON = Buffer.prototype.toJSON

// Keep track of the fact that "this" is a Date object
Date.prototype.toJSON = function () { // eslint-disable-line
  if (serializing) {
    return { [serializingTypeKeys.date]: this.getTime() }
  } else {
    return originalDateToJSON.call(this)
  }
}

Buffer.prototype.toJSON = function (...args) { // eslint-disable-line
  if (serializing) {
    return { [serializingTypeKeys.buffer]: this.toString('base64') }
  } else {
    return originalBufferToJSON.call(this)
  }
}

module.exports.serialize = (obj, { prettify = false, prettifySpace = 2, typeKeys = defaultTypeKeys } = {}) => {
  serializing = true
  serializingTypeKeys = typeKeys

  try {
    const res = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'undefined') {
        return null
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
        return value
      }

      return value
    }, prettify ? prettifySpace : null)

    return res
  } finally {
    serializing = false
    serializingTypeKeys = defaultTypeKeys
  }
}

module.exports.parse = (json, { typeKeys = defaultTypeKeys } = {}) => {
  return JSON.parse(json, (key, value) => {
    if (key === typeKeys.date) {
      return new Date(value)
    }

    if (key === typeKeys.buffer && value != null && typeof value === 'string') {
      return Buffer.from(value, 'base64')
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      return value
    }

    if (value && value[typeKeys.date]) {
      return value[typeKeys.date]
    }

    if (value && value[typeKeys.buffer]) {
      return value[typeKeys.buffer]
    }

    return value
  })
}
