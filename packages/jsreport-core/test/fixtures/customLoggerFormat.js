const winston = require('winston')
const { MESSAGE } = require('triple-beam')

// test fixture: a custom logger format factory consumed by loggerFormats.loadCustomFormats
module.exports = (options = {}) => {
  const prefix = options.prefix || 'CUSTOM'
  return winston.format((info) => {
    info[MESSAGE] = `${prefix}: ${info.message}`
    return info
  })
}
