const { loggerFormat } = require('../../')
const { MESSAGE } = require('../../lib/main/loggerConstants')

module.exports = loggerFormat((info, options) => {
  const prefix = options.prefix || 'CUSTOM'
  info[MESSAGE] = `${prefix}: ${info.message}`
  return info
})
