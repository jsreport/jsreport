const omit = require('lodash.omit')

module.exports = function adminRequest (req, Request) {
  if (req == null) {
    return req
  }

  let targetReq = req

  if (Request != null) {
    targetReq = Request(targetReq)
  }

  targetReq.context = targetReq.context ? omit(targetReq.context, 'user') : targetReq.context

  return targetReq
}
