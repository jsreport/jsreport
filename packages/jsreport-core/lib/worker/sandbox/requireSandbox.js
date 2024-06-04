const Module = require('module')
const os = require('os')
const path = require('path')
const resolveFilename = require('./resolveFilename')
const isolatedRequire = require('./isolatedRequire')

const REQUIRE_RESOLVE_CACHE = new Map()

module.exports = function createSandboxRequire (safeExecution, isolateModules, modulesCache, {
  rootDirectory,
  requirePaths,
  requireMap,
  allowedModules,
  compileScript,
  formatError
}) {
  if (rootDirectory == null || !path.isAbsolute(rootDirectory)) {
    throw new Error(`rootDirectory must be an absolute path, path: ${rootDirectory}`)
  }

  const rootProxyPath = path.join(rootDirectory, '___sandbox___')

  let modulesMeta

  if (isolateModules) {
    const rootModule = new isolatedRequire.IsolatedModule(rootProxyPath, null)
    rootModule.filename = rootProxyPath
    rootModule.paths = Module._nodeModulePaths(rootProxyPath)
    rootModule.loaded = true

    modulesMeta = {
      rootModule,
      modulesCache
    }
  }

  const requireFromRootDirectory = Module.createRequire(rootProxyPath)

  if (isolateModules) {
    const requireExtensions = Object.create(null)
    isolatedRequire.setDefaultRequireExtensions(requireExtensions, requireFromRootDirectory, compileScript)
    modulesMeta.requireExtensions = requireExtensions
  }

  return function sandboxRequire (moduleId, { context, useMap = true, allowAllModules = false } = {}) {
    if (useMap && requireMap) {
      const mapResult = requireMap(moduleId, { context })

      if (mapResult != null) {
        return mapResult
      }
    }

    if (!safeExecution || allowAllModules || allowedModules === '*') {
      return doRequire(moduleId, requireFromRootDirectory, requirePaths, modulesMeta)
    }

    const m = allowedModules.find(mod => (mod.id || mod) === moduleId)

    if (m) {
      return doRequire(m.path || moduleId, requireFromRootDirectory, requirePaths, modulesMeta)
    }

    const error = new Error(
      `require of "${moduleId}" module has been blocked.`
    )

    if (formatError) {
      formatError(error, moduleId)
    }

    throw error
  }
}

function doRequire (moduleId, requireFromRootDirectory, _requirePaths, modulesMeta) {
  const isolateModules = modulesMeta != null
  const searchedPaths = []
  const requirePaths = _requirePaths || []
  const _require = isolateModules ? isolatedRequire : requireFromRootDirectory
  const extraRequireParams = []

  const resolveModule = (mId, ...args) => {
    let normalizedModuleId = mId

    if (normalizedModuleId === '..' || normalizedModuleId === '.') {
      // NOTE: we need to manually normalize because node has a bug
      // https://github.com/nodejs/node/issues/47000
      // when using require.resolve and using options.paths, it does not recognize for "..", "."
      // to be relative, just other cases work like "../", "..\\",
      // so when we detect this case we normalize it in order for node to resolve correctly
      normalizedModuleId = normalizedModuleId + path.sep
    }

    return requireFromRootDirectory.resolve(normalizedModuleId, ...args)
  }

  if (isolateModules) {
    extraRequireParams.push(modulesMeta, resolveModule)
  }

  let result = executeRequire(_require, resolveModule, moduleId, searchedPaths, ...extraRequireParams)

  if (!result) {
    let pathsSearched = 0

    while (!result && pathsSearched < requirePaths.length) {
      const newModuleId = path.join(requirePaths[pathsSearched], moduleId)
      result = executeRequire(_require, resolveModule, newModuleId, searchedPaths, ...extraRequireParams)
      pathsSearched++
    }
  }

  if (!result) {
    throw new Error(`Unable to find module ${moduleId}${os.EOL}The require calls:${os.EOL}${searchedPaths.map(p => `require('${p}')`).join(os.EOL)}${os.EOL}`)
  }

  return result
}

function executeRequire (_require, resolveModule, moduleId, searchedPaths, ...restOfParams) {
  const isolateModules = restOfParams.length > 0
  const shouldHandleModuleResolveFilenameOptimization = !isolateModules

  const originalModuleResolveFilename = Module._resolveFilename

  try {
    if (shouldHandleModuleResolveFilenameOptimization) {
      // when isolate modules is disabled we add an extra cache here to optimize require resolution,
      // basically we want to avoid the overhead that node require resolution
      // adds when trying to resolve the filename/path of a module, because even if the module
      // is cached in require.cache module filename/path resolution still happens and have a cost
      const customResolveFilename = (...args) => {
        const customResolveModule = (...resolveArgs) => {
          Module._resolveFilename = originalModuleResolveFilename
          try {
            return resolveModule(...resolveArgs)
          } finally {
            Module._resolveFilename = customResolveFilename
          }
        }

        return optimizedResolveFilename(customResolveModule, ...args)
      }

      Module._resolveFilename = customResolveFilename
    }

    const result = _require(moduleId, ...restOfParams)

    if (shouldHandleModuleResolveFilenameOptimization) {
      Module._resolveFilename = originalModuleResolveFilename
    }

    return result
  } catch (e) {
    if (shouldHandleModuleResolveFilenameOptimization) {
      Module._resolveFilename = originalModuleResolveFilename
    }

    if (e.code && e.code === 'MODULE_NOT_FOUND') {
      if (!searchedPaths.includes(moduleId)) {
        searchedPaths.push(moduleId)
      }

      return false
    } else {
      throw new Error(`Unable to require module ${moduleId}. ${e.message}${os.EOL}${e.stack}`)
    }
  }
}

function optimizedResolveFilename (resolveModule, request, parent, isMain, options) {
  return resolveFilename(REQUIRE_RESOLVE_CACHE, resolveModule, request, { parentModulePath: parent?.path, options })
}
