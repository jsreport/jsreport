const omit = require('lodash.omit')

module.exports = (level, msg, meta) => {
  // detecting if meta is jsreport request object
  if (meta != null && meta.context) {
    meta.context.logs = meta.context.logs || []

    meta.context.logs.push({
      level: level,
      message: msg,
      timestamp: meta.timestamp || new Date().getTime()
    })

    // TODO adding cancel looks bad, its before script is adding req.cancel()
    // excluding non relevant properties for the log
    const newMeta = Object.assign({}, omit(meta, ['logged', 'rawContent', 'template', 'options', 'data', 'context', 'timestamp', 'cancel']))

    if (newMeta.rootId == null && meta.context.rootId != null) {
      newMeta.rootId = meta.context.rootId
    }

    if (newMeta.id == null && meta.context.id != null) {
      newMeta.id = meta.context.id
    }

    return newMeta
  }

  return meta
}
