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

      const initialMsg = error.message == null || error.message === '' ? '' : error.message
      const [messages, stacks] = getErrorMessagesAndStacks(originalNormalized)

      if (initialMsg !== '') {
        messages.unshift(initialMsg)
      }

      error.message = messages.reduce((acu, msg) => {
        if (acu === '') {
          acu += msg
        } else {
          acu += `\n(because) ${lowerCaseFirstLetter(msg)}`
        }

        return acu
      }, '')

      // stack is printed in reverse order (from cause to more high level error)
      if (error.stack != null && originalNormalized.stack != null && stacks.length > 0) {
        stacks.unshift(error.stack)
        stacks.reverse()

        error.stack = stacks.reduce((acu, stack) => {
          if (acu === '') {
            acu += stack
          } else {
            acu += `\nwrapped by:\n${stack}`
          }

          return acu
        }, '')
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

function getErrorMessagesAndStacks (err) {
  let currentErr = err
  const messages = []
  const stacks = []

  while (currentErr != null) {
    if (currentErr.message) {
      messages.push(currentErr.message)
      stacks.push(currentErr.stack ?? '(no stack available)')
    }

    currentErr = currentErr.cause
  }

  return [messages, stacks]
}

function lowerCaseFirstLetter (str) {
  if (str === '' || typeof str !== 'string') {
    return str
  }

  return str.charAt(0).toLowerCase() + str.slice(1)
}
