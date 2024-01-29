const cacheMap = new Map()

module.exports = (reporter) => {
  reporter.beforeRenderListeners.add('assets cache', this, async (req, res) => {
    cacheMap.set(req.context.id, new Map())
  })

  reporter.afterRenderListeners.add('assets cache', this, async (req, res) => {
    cacheMap.delete(req.context.id)
  })

  reporter.renderErrorListeners.add('assets cache', this, async (req, res) => {
    cacheMap.delete(req.context.id)
  })

  return ({
    getAndSet (cacheId, key, fn) {
      const reqCache = cacheMap.get(cacheId)
      if (!reqCache) {
        return fn()
      }

      if (!reqCache.has(key)) {
        reqCache.set(key, fn())
      }

      return reqCache.get(key)
    }
  })
}
