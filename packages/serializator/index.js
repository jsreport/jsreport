'use strict'

const typeKeys = {
  date: '$$$date$$$',
  buffer: '$$$buffer$$$'
}

module.exports.serialize = (obj, { prettify = false, prettifySpace = 2 } = {}) => {
  let res

  const originalDateToJSON = Date.prototype.toJSON
  const originalBufferToJSON = Buffer.prototype.toJSON

  // Keep track of the fact that this is a Date object
  Date.prototype.toJSON = function () { // eslint-disable-line
    return { [typeKeys.date]: this.getTime() }
  }

  Buffer.prototype.toJSON = function (...args) { // eslint-disable-line
    return { [typeKeys.buffer]: this.toString('base64') }
  }

  res = JSON.stringify(obj, (key, value) => {
    if (typeof value === 'undefined') {
      return null
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      return value
    }

    return value
  }, prettify ? prettifySpace : null)

  // Return Date to its original state
  Date.prototype.toJSON = originalDateToJSON // eslint-disable-line
  // Return Buffer to its original state
  Buffer.prototype.toJSON = originalBufferToJSON // eslint-disable-line

  return res
}

module.exports.parse = (json) => {
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
