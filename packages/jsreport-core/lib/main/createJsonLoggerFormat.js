const { MESSAGE } = require('triple-beam')
const winston = require('winston')

module.exports = (options = {}) => {
  return winston.format((info) => {
    const { level, message, timestamp, ...meta } = info
    let logDate

    if (timestamp == null) {
      logDate = new Date()
      info.timestamp = logDate.getTime()
    } else {
      logDate = new Date(timestamp)
    }

    const payload = {
      timestamp: logDate.toISOString(),
      level,
      message
    }

    for (const k of Object.keys(meta)) {
      // userLevel is an internal colorization hint, not user-visible data
      if (k === 'userLevel') continue
      payload[k] = meta[k]
    }

    info[MESSAGE] = JSON.stringify(payload)

    return info
  })
}
