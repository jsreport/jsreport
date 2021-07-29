const _omit = require('lodash.omit')

module.exports = function (message, options = {}) {
  const { original } = options
  let error

  if (message == null && original != null) {
    error = original
  } else {
    error = new Error(message)

    if (original != null) {
      error.entity = original.entity
      error.lineNumber = original.lineNumber
      error.property = original.property

      if (error.message == null || error.message === '') {
        error.message = `${original.message}`
      } else {
        error.message += `. ${original.message}`
      }

      if (error.stack != null && original.stack != null) {
        error.stack += `\ncaused by: ${original.stack}`
      }
    }
  }

  Object.assign(error, _omit(options, 'original'))

  if ((error.statusCode === 400 || error.statusCode === 404) && error.weak == null) {
    error.weak = true
  }

  return error
}
