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
  let parent = err
  const errors = []

  while (parent != null) {
    let customProps = Object.assign({}, parent)
    let currentStack = parent.stack || ''
    let cleanState = false

    if (parent.cleanState === true) {
      cleanState = true
    }

    // making sure custom props like "originalError", "cleanState" are not part of meta
    delete customProps.originalError
    delete customProps.disableExit
    delete customProps.cleanState

    const fakeE = { message: parent.message, stack: '' }

    addStack(fakeE, parent.stack || '', {
      stripMessage: true
    })

    currentStack = fakeE.stack

    errors.push({
      message: parent.message,
      stack: currentStack || '',
      meta: Object.keys(customProps).length > 0 ? customProps : undefined,
      cleanState
    })

    parent = parent.originalError
  }

  return errors
}

function getErrorMessages (err) {
  const errors = getErrors(err)
  let count = errors.length
  let cleanState = false
  const messages = []
  const stacks = []

  errors.forEach((error) => {
    let customProps = error.meta || {}
    let currentStack = error.stack

    if (!cleanState && error.cleanState === true) {
      cleanState = true
    }

    customProps = JSON.stringify(customProps)

    if (cleanState) {
      messages.push(`${formatError(error)}`)
    } else {
      messages.push(`${formatError(error)} (${count})`)
    }

    if (customProps === '{}') {
      customProps = ''
    }

    if (currentStack !== '') {
      let causedBy = `caused by error (${count}):`

      if (customProps !== '') {
        stacks.push(`${causedBy}\n-> meta = ${customProps}\n-> stack\n${currentStack}`)
      } else {
        stacks.push(`${causedBy}\n-> stack\n${currentStack}`)
      }
    }

    count--
  })

  if (!cleanState && stacks.length > 0) {
    messages.push(`\n${stacks.join('\n')}`)
  }

  return messages
}

function printError (err, logger) {
  const messages = getErrorMessages(err)

  logger.error(messages.join('. '))
}

module.exports.printError = printError
module.exports.getErrors = getErrors
module.exports.getErrorMessages = getErrorMessages
module.exports.addStack = addStack
