const winston = require('winston')
const normalizeMetaFromLogs = require('../shared/normalizeMetaFromLogs')

module.exports = () => {
  return winston.format((info) => {
    const { level, message, ...meta } = info
    const newMeta = normalizeMetaFromLogs(level, message, meta)

    if (newMeta != null) {
      return {
        level,
        message,
        ...newMeta
      }
    }

    return info
  })
}
