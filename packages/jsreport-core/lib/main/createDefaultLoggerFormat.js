const { MESSAGE } = require('triple-beam')
const winston = require('winston')

module.exports = (options = {}) => {
  return winston.format((info) => {
    const { level, message, ...meta } = info
    info[MESSAGE] = `${options.timestamp === true ? `${new Date().toISOString()} - ` : ''}${level}: ${message}`

    const metaKeys = Object.keys(meta)

    if (metaKeys.length > 0) {
      info[MESSAGE] += ` ${metaKeys.map((k) => `${k}=${meta[k]}`).join(', ')}`
    }

    return info
  })
}
