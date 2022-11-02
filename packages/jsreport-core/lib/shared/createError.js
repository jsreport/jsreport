const normalizeError = require('./normalizeError')

module.exports = function (message, options = {}) {
  const { original } = options
  let error

  if (message == null && original != null) {
    error = original
  } else {
    error = new Error(message)

    if (original != null) {
      // because in js you can throw <anything>, not specifically Error
      const originalNormalized = normalizeError(original)

      error.entity = originalNormalized.entity
      error.lineNumber = originalNormalized.lineNumber
      error.property = originalNormalized.property

      if (originalNormalized.statusCode != null) {
        error.statusCode = originalNormalized.statusCode
      }

      if (originalNormalized.weak != null) {
        error.weak = originalNormalized.weak
      }

      if (error.message == null || error.message === '') {
        error.message = `${originalNormalized.message}`
      } else {
        error.message += `\n(because) ${lowerCaseFirstLetter(originalNormalized.message)}`
      }

      // stack is printed in reverse order (from cause to more high level error)
      if (error.stack != null && originalNormalized.stack != null) {
        error.stack = `${originalNormalized.stack}\nwrapped by:\n${error.stack}`
      }
    }
  }

  const { original: originalInOptions, ...restOfOptions } = options

  Object.assign(error, restOfOptions)

  if ((error.statusCode === 400 || error.statusCode === 404) && error.weak == null) {
    error.weak = true
  }

  return error
}

function lowerCaseFirstLetter (str) {
  if (str === '' || typeof str !== 'string') {
    return str
  }

  return str.charAt(0).toLowerCase() + str.slice(1)
}
