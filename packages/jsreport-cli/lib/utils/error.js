'use strict'

function formatError (err) {
  return err.message || ''
}

function addStack (err, stack, { stackPrefix = '', stripMessage = false } = {}) {
  if (stack != null && stack !== '') {
    let newStack = stack
    let originalStack = ''

    if (err.stack != null && err.stack !== '') {
      originalStack = `${err.stack}\n`
    }

    if (stripMessage) {
      // to avoid duplicating message we strip the message
      // from the stack if it is equals to the message of error
      newStack = newStack.replace(/(\S+:) (.+)(\r?\n)/, (match, gLabel, gMessage, gRest) => {
        if (err.message === gMessage) {
          return `${gLabel}${gRest}`
        }

        return match
      })
    }

    err.stack = `${originalStack}${stackPrefix}${newStack}`
  }
}

function getErrors (err) {
  let currentErr = err
  const errors = []

  while (currentErr != null) {
    const customProps = Object.assign({}, currentErr)
    let currentStack = currentErr.stack || ''
    let cleanState = false

    if (currentErr.cleanState === true) {
      cleanState = true
    }

    // making sure custom props like "originalError", "cleanState" are not part of meta
    delete customProps.originalError
    delete customProps.disableExit
    delete customProps.cleanState

    const fakeE = { message: currentErr.message, stack: '' }

    addStack(fakeE, currentErr.stack || '', {
      stripMessage: true
    })

    currentStack = fakeE.stack

    errors.push({
      message: currentErr.message,
      stack: currentStack || '',
      meta: Object.keys(customProps).length > 0 ? getSimpleProperties(customProps) : undefined,
      cleanState
    })

    currentErr = currentErr.originalError ?? currentErr.cause
  }

  return errors
}

function getErrorMessagesAndStacks (err) {
  const errors = getErrors(err)
  let cleanState = false
  const messages = []
  const stacks = []

  for (const error of errors) {
    let customProps = error.meta || {}
    const currentStack = error.stack

    if (!cleanState && error.cleanState === true) {
      cleanState = true
    }

    customProps = JSON.stringify(customProps)

    messages.push(`${formatError(error)}`)

    if (customProps === '{}') {
      customProps = ''
    }

    if (currentStack !== '') {
      if (customProps !== '') {
        stacks.push(`-> meta = ${customProps}\n-> stack\n${currentStack}`)
      } else {
        stacks.push(`-> stack\n${currentStack}`)
      }
    }
  }

  if (!cleanState && stacks.length > 0) {
    return [messages, stacks]
  }

  return [messages, []]
}

function getSimpleProperties (obj) {
  const newObj = {}

  for (const [key, value] of Object.entries(obj)) {
    if (
      value == null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      newObj[key] = value
    }
  }

  if (Object.keys(newObj).length === 0) {
    return undefined
  }

  return newObj
}

function printError (err, logger) {
  const [messages, stacks] = getErrorMessagesAndStacks(err)

  for (let idx = 0; idx < messages.length; idx++) {
    messages[idx] += ` (${messages.length - idx})`

    if (idx > 0) {
      messages[idx] = lowerCaseFirstLetter(messages[idx])
    }
  }

  let errorLog = messages.join('\n(because) ')

  if (stacks.length > 0) {
    const reversedStacks = [...stacks].reverse()

    for (let idx = 0; idx < reversedStacks.length; idx++) {
      reversedStacks[idx] = `-- error (${idx + 1}) --\n${reversedStacks[idx]}`
    }

    errorLog += `\n\n${reversedStacks.join('\nwrapped by:\n')}`
  }

  logger.error(errorLog)
}

function lowerCaseFirstLetter (str) {
  if (str === '' || typeof str !== 'string') {
    return str
  }

  return str.charAt(0).toLowerCase() + str.slice(1)
}

module.exports.printError = printError
module.exports.getErrors = getErrors
module.exports.getErrorMessages = getErrorMessagesAndStacks
module.exports.addStack = addStack
