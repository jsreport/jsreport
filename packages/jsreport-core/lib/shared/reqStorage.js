module.exports = (reporter) => {
  const runningReqMap = new Map()

  return {
    set: (key, val, req) => {
      const keyValueMap = runningReqMap.get(req.context.rootId)
      keyValueMap.set(key, val)
    },
    get: (key, req) => {
      const keyValueMap = runningReqMap.get(req.context.rootId)
      return keyValueMap.get(key)
    },
    registerReq: (req) => {
      runningReqMap.set(req.context.rootId, new Map())
    },
    unregisterReq: (req) => {
      runningReqMap.delete(req.context.rootId)
    }
  }
}
