// holds running requests and provides additionally keyValueStore
module.exports = (reporter) => {
  const runningReqMap = new Map()

  return {
    keyValueStore: {
      get: (key, req) => {
        const keyValueMap = runningReqMap.get(req.context.rootId).keyValueMap
        return keyValueMap.get(key)
      },
      set: (key, val, req) => {
        const keyValueMap = runningReqMap.get(req.context.rootId).keyValueMap
        keyValueMap.set(key, val)
      }
    },

    map: runningReqMap,

    register: (req, options) => {
      runningReqMap.set(req.context.rootId, {
        keyValueMap: new Map(),
        req,
        options
      })
    },
    unregister: (req) => {
      runningReqMap.delete(req.context.rootId)
    }
  }
}
