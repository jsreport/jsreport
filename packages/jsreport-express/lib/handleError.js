
function handleError (reporter) {
  return function handleErrorMiddleware (req, res, err) {
    res.status(500)

    if (typeof err === 'string') {
      err = {
        message: err
      }
    }

    err = err || {}
    err.message = err.message || 'Unrecognized error'

    let statusCode

    if (
      err.statusCode != null &&
      err.statusCode >= 100 &&
      err.statusCode < 600
    ) {
      statusCode = err.statusCode
    }

    if (statusCode != null) {
      res.status(statusCode)
    }

    if (err.code === 'UNAUTHORIZED') {
      if (req.get('X-WWW-Authenticate') !== 'none') {
        res.setHeader('WWW-Authenticate', (req.authSchema || 'Basic') + ' realm=\'realm\'')
      }

      res.status(statusCode != null ? statusCode : 401).end(err.authorizationMessage)
      return
    }

    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
    const logFn = err.weak ? reporter.logger.warn : reporter.logger.error
    let msg
    let isJSON = false

    if (err.weak) {
      res.status(statusCode != null ? statusCode : 400)
    }

    if (
      (req.get('Content-Type') &&
      (req.get('Content-Type').indexOf('application/json') !== -1)) ||
      (req.get('Accept') && (req.get('Accept').indexOf('application/json') !== -1))
    ) {
      isJSON = true
      msg = err.message
    } else {
      // err.stack itself normally includes the message
      // we try to not duplicate it in the output
      if (err.stack && err.stack.includes(err.message)) {
        msg = err.stack
      } else {
        msg = `${err.message}\n${err.stack}`
      }
    }

    if (isRequestTooLarge(err)) {
      msg = `Input request reached limit of ${err.limit} byte(s), current size: ${err.length} byte(s). The limit can be increased using config extensions.express.inputRequestLimit=50mb. ${msg}`
    }

    if (err.logged === true) {
      // when error was already logged then we just print that the error happened at a url
      let details = ''

      // but if the error is because request limit then we include the message too
      if (isRequestTooLarge(err)) {
        details += ` , details: ${msg}`
      }

      logFn(`Error during processing request at ${fullUrl}${details}`)
    } else {
      logFn(`Error during processing request at ${fullUrl}, details: ${msg}${isJSON ? `, stack: ${err.stack}` : ''}`)
    }

    if (isJSON) {
      res.send({ message: msg, stack: err.stack })
    } else {
      res.write(msg)
      res.end()
    }
  }
}

function isRequestTooLarge (err) {
  // add more clear message when error comes from express
  // (.status and .type are set by express body-parser automatically
  // when request payload is too large)
  if (err && err.status === 413 && err.type === 'entity.too.large') {
    return true
  }

  return false
}

module.exports = handleError
