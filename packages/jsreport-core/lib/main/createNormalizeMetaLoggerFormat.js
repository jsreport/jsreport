const omit = require('lodash.omit')
const winston = require('winston')
const { LEVEL, MESSAGE, SPLAT } = require('triple-beam')
const normalizeMetaFromLogs = require('../shared/normalizeMetaFromLogs')

module.exports = () => {
  return winston.format((info) => {
    const { level, message, timestamp: _timestamp, ...meta } = info

    const symbolProps = [LEVEL, MESSAGE, SPLAT]
    const originalSymbolProps = {}

    for (const symbolProp of symbolProps) {
      if (info[symbolProp] != null) {
        originalSymbolProps[symbolProp] = info[symbolProp]
      }
    }

    const timestamp = _timestamp ?? new Date().getTime()

    const targetMeta = omit(meta, symbolProps)
    const newMeta = normalizeMetaFromLogs(level, message, timestamp, targetMeta)

    return {
      level,
      message,
      timestamp,
      ...originalSymbolProps,
      ...newMeta
    }
  })
}
