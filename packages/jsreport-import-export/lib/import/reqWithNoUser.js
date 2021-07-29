const omit = require('lodash.omit')

module.exports = (reporter, req) => {
  const localReq = reporter.Request(req)
  localReq.context = localReq.context ? omit(localReq.context, 'user') : localReq.context
  return localReq
}
