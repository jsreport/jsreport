const { MESSAGE } = require('triple-beam')
const colors = require('@colors/colors/safe')
const winston = require('winston')

module.exports = (options = {}) => {
  return winston.format((info) => {
    const { level, message, ...meta } = info
    info[MESSAGE] = `${options.timestamp === true ? `${new Date().toISOString()} - ` : ''}${level}: ${info.userLevel === true ? colors.cyan(message) : message}`

    const metaKeys = Object.keys(meta)

    if (metaKeys.length > 0) {
      info[MESSAGE] += ` ${metaKeys.map((k) => `${k}=${meta[k]}`).join(', ')}`
    }

    if (info.userLevel === true) {
      info.level = colors.cyan(info.level)
    }

    return info
  })
}
