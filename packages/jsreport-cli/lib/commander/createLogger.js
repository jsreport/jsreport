
module.exports = function createLogger (verboseMode) {
  const logs = []

  const logger = {
    debug: (...messages) => {
      const msg = messages.join(' ')

      if (verboseMode) {
        logs.push({
          type: 'debug',
          message: msg
        })

        console.log(...messages)
      }
    },
    info: (...messages) => {
      const msg = messages.join(' ')

      logs.push({
        type: 'info',
        message: msg
      })

      console.log(...messages)
    },
    warn: (...messages) => {
      const msg = messages.join(' ')

      logs.push({
        type: 'warn',
        message: msg
      })

      console.error(...messages)
    },
    error: (...messages) => {
      const msg = messages.join(' ')

      logs.push({
        type: 'error',
        message: msg
      })

      console.error(...messages)
    }
  }

  return { logger, getLogs: () => logs }
}
