const Module = require('module')
const os = require('os')
const path = require('path')
const isolatedRequire = require('./isolatedRequire')

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

  // we pass directory with trailing slash to ensure node recognize the path as directory
  const requireFromRootDirectory = Module.createRequire(ensureTrailingSlash(rootDirectory))

  let isolatedModulesMeta

  if (isolateModules) {
    const requireExtensions = Object.create(null)

    isolatedRequire.setDefaultRequireExtensions(requireExtensions, modulesCache, compileScript)

    isolatedModulesMeta = {
      modulesCache: modulesCache,
      requireExtensions
    }
  }

  return function sandboxRequire (moduleId, { context, useMap = true, allowAllModules = false } = {}) {
    if (useMap && requireMap) {
      const mapResult = requireMap(moduleId, { context })

      if (mapResult != null) {
        return mapResult
      }
    }

    if (!safeExecution || allowAllModules || allowedModules === '*') {
      return doRequire(moduleId, requireFromRootDirectory, requirePaths, isolatedModulesMeta)
    }

    const m = allowedModules.find(mod => (mod.id || mod) === moduleId)

    if (m) {
      return doRequire(m.path || moduleId, requireFromRootDirectory, requirePaths, isolatedModulesMeta)
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

function doRequire (moduleId, requireFromRootDirectory, _requirePaths, isolatedModulesMeta) {
  const isolateModules = isolatedModulesMeta != null
  const searchedPaths = []
  const requirePaths = _requirePaths || []
  const _require = isolateModules ? isolatedRequire : requireFromRootDirectory
  const extraRequireParams = []

  if (isolateModules) {
    extraRequireParams.push(requireFromRootDirectory, isolatedModulesMeta)
  }

  let result = executeRequire(_require, moduleId, searchedPaths, ...extraRequireParams)

  if (!result) {
    let pathsSearched = 0

    while (!result && pathsSearched < requirePaths.length) {
      const newModuleId = path.join(requirePaths[pathsSearched], moduleId)
      result = executeRequire(_require, newModuleId, searchedPaths, ...extraRequireParams)
      pathsSearched++
    }
  }

  if (!result) {
    throw new Error(`Unable to find module ${moduleId}${os.EOL}The require calls:${os.EOL}${searchedPaths.map(p => `require('${p}')`).join(os.EOL)}${os.EOL}`)
  }

  return result
}

function executeRequire (_require, moduleId, searchedPaths, ...restOfParams) {
  try {
    return _require(moduleId, ...restOfParams)
  } catch (e) {
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

function ensureTrailingSlash (fullPath) {
  if (fullPath.endsWith(path.sep)) {
    return fullPath
  }

  return fullPath + path.sep
}
