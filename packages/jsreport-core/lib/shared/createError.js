
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

      if (original.statusCode != null) {
        error.statusCode = original.statusCode
      }

      if (original.weak != null) {
        error.weak = original.weak
      }

      if (error.message == null || error.message === '') {
        error.message = `${original.message}`
      } else {
        error.message += `\n(because) ${lowerCaseFirstLetter(original.message)}`
      }

      // stack is printed in reverse order (from cause to more high level error)
      if (error.stack != null && original.stack != null) {
        error.stack = `${original.stack}\nwrapped by:\n${error.stack}`
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
