
module.exports = function resolveFilename (cache, resolveModulePath, moduleId, extra) {
  const { parentModulePath, options } = extra
  const useCache = options == null
  const resolveCacheKey = parentModulePath ? `${parentModulePath}::${moduleId}` : moduleId
  let fullModulePath

  if (useCache && cache.has(resolveCacheKey)) {
    fullModulePath = cache.get(resolveCacheKey)
  } else {
    if (parentModulePath) {
      const optionsToUse = { ...options }

      // search from the parent module path by default if not explicit .paths has been passed
      if (optionsToUse.paths == null) {
        optionsToUse.paths = [parentModulePath]
      }

      fullModulePath = resolveModulePath(moduleId, optionsToUse)
    } else {
      fullModulePath = resolveModulePath(moduleId)
    }

    if (useCache) {
      cache.set(resolveCacheKey, fullModulePath)
    }
  }

  return fullModulePath
}
