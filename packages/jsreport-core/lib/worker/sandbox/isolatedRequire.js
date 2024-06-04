const Module = require('module')
const path = require('path')
const fs = require('fs')
const resolveFilename = require('./resolveFilename')

const ISOLATED_REQUIRE_RESOLVE_CACHE = new Map()
const ISOLATED_REQUIRE_SCRIPT_CACHE = new Map()
const ISOLATED_PACKAGE_JSON_CACHE = new Map()

// The isolated require is a function that replicates the node.js require but that does not
// cache the modules with the standard node.js cache, instead its uses its own cache in order
// to bring isolated modules across renders and without memory leaks.
// most of the code is copied from node.js source code and adapted a bit
// (you will see in some parts specific links to node.js source code counterpart for reference)
function isolatedRequire (_moduleId, modulesMeta, resolveModule) {
  const parentModule = typeof _moduleId !== 'string' ? _moduleId.parent : null
  const moduleId = parentModule ? _moduleId.moduleId : _moduleId

  // https://github.com/nodejs/node/blob/v18.14.2/lib/internal/modules/cjs/loader.js#LL1134C3-L1134C27
  validateString(moduleId, 'id')

  if (moduleId === '') {
    throw createInvalidArgValueError('id', moduleId, 'must be a non-empty string')
  }

  if (Module.isBuiltin(moduleId)) {
    // built-in modules can not be require from other part than the node.js require
    // perhaps in the future it can be possible:
    // https://github.com/nodejs/node/issues/31852
    // https://github.com/nodejs/node/issues/28823
    return require(moduleId)
  }

  const { rootModule, modulesCache, requireExtensions } = modulesMeta
  const fullModulePath = resolveFilename(ISOLATED_REQUIRE_RESOLVE_CACHE, resolveModule, moduleId, { parentModulePath: parentModule?.path })

  if (modulesCache[fullModulePath]) {
    // if module was already tried to be loaded and ended with error we rethrow the error
    if (modulesCache[fullModulePath].loadingError != null) {
      throw modulesCache[fullModulePath].loadingError
    }

    return modulesCache[fullModulePath].exports
  }

  let targetParentModule = parentModule

  if (targetParentModule == null) {
    targetParentModule = rootModule
  }

  const mod = new IsolatedModule(fullModulePath, targetParentModule)

  // https://github.com/nodejs/node/blob/v18.14.2/lib/internal/modules/cjs/loader.js#L1133
  // we can not add this to the IsolatedModule.prototype because we need access to other variables
  mod.require = function (id) {
    return isolatedRequire({ parent: this, moduleId: id }, modulesMeta, resolveModule)
  }

  modulesCache[fullModulePath] = mod

  try {
    mod.filename = fullModulePath
    mod.paths = Module._nodeModulePaths(path.dirname(fullModulePath))

    const extension = findLongestRegisteredExtension(fullModulePath, requireExtensions)

    // https://github.com/nodejs/node/blob/v18.14.2/lib/internal/modules/cjs/loader.js#L1113
    // allow .mjs to be overridden
    if (fullModulePath.endsWith('.mjs') && !requireExtensions['.mjs']) {
      throw createRequireESMError(fullModulePath)
    }

    const moduleResolver = requireExtensions[extension]

    moduleResolver(mod, fullModulePath)

    mod.loaded = true
    return mod.exports
  } catch (error) {
    mod.loadingError = error
    throw error
  }
}

function setDefaultRequireExtensions (currentExtensions, requireFromRootDirectory, compileScript) {
  const extensions = Object.create(null)

  // https://github.com/nodejs/node/blob/v18.14.2/lib/internal/modules/cjs/loader.js#L1263
  extensions['.js'] = function (_module, filename) {
    const dirname = path.dirname(filename)

    // https://github.com/nodejs/node/blob/v18.14.2/lib/internal/modules/cjs/loader.js#L1273
    if (filename.endsWith('.js')) {
      const pkg = readPackageScope(filename)

      // Function require shouldn't be used in ES modules.
      if (pkg?.data?.type === 'module') {
        const parent = _module.parent
        const parentPath = parent?.filename
        throw createRequireESMError(filename, parentPath)
      }
    }

    let compiledScript

    if (ISOLATED_REQUIRE_SCRIPT_CACHE.has(filename)) {
      compiledScript = ISOLATED_REQUIRE_SCRIPT_CACHE.get(filename)
    } else {
      let moduleContent = fs.readFileSync(filename, 'utf8')

      moduleContent = removeShebangFromModuleContent(moduleContent)

      const moduleWrappedContent = Module.wrap(moduleContent)

      compiledScript = compileScript(moduleWrappedContent, filename, false)

      ISOLATED_REQUIRE_SCRIPT_CACHE.set(filename, compiledScript)
    }

    // we run module in same context than main context because we want to reproduce the same behavior
    // than older versions of jsreport, in which the module code is executed in the same context than main
    // (because older version was using normal require, and that is how the normal node.js
    // require works when evaluating modules code).
    // Choosing different context means things like constructors (Number, String) and instanceof
    // checks have different results and we wanted to keep the same behavior than older versions,
    // however one benefit of running the modules code in same context is that we don't have to care
    // about re-expose the node.js globals (like Buffer, process, etc) to the module code, because
    // the main context already have those
    const runScript = () => {
      return compiledScript.runInThisContext({
        displayErrors: true
      })
    }

    const moduleWrappedFn = runScript()

    const requireInModule = makeRequireFunction(_module, requireFromRootDirectory, currentExtensions)

    const args = [_module.exports, requireInModule, _module, filename, dirname]

    moduleWrappedFn.apply(_module.exports, args)
  }

  // https://github.com/nodejs/node/blob/v18.14.2/lib/internal/modules/cjs/loader.js#L1313
  extensions['.json'] = function (_module, filename) {
    const content = fs.readFileSync(filename, 'utf8')

    try {
      setOwnProperty(_module, 'exports', JSON.parse(stripBOM(content)))
    } catch (err) {
      err.message = filename + ': ' + err.message
      throw err
    }
  }

  // https://github.com/nodejs/node/blob/v16.11.0/lib/internal/modules/cjs/loader.js#L1176
  extensions['.node'] = function (_module, filename) {
    // Be aware this doesn't use `content`
    return process.dlopen(_module, path.toNamespacedPath(filename))
  }

  Object.assign(currentExtensions, extensions)
}

// https://github.com/nodejs/node/blob/v18.14.2/lib/internal/modules/cjs/loader.js#L225
function IsolatedModule (id = '', parent) {
  this.id = id
  this.path = path.dirname(id)
  setOwnProperty(this, 'exports', {})
  this.filename = null
  this.loaded = false
  // NOTE: since we don't set parent we don't keep track of children either
  // (because to correctly track it we would need to store the module instance
  // and not just the module.exports like we do now, if the need appears we can do it)
  this.children = []
  // NOTE: this property is already deprecated (according to node.js docs),
  // it seems it does not make sense to replicate
  // something here, however if the need appears we can check what we can do about it
  // we should be aware of the expected values it carries according to the node.js docs
  // https://nodejs.org/api/modules.html#moduleparent
  this.parent = parent

  // this is always false for our case, because our modules we never run during the
  // Node.js preload phase
  Object.defineProperty(this, 'isPreloading', {
    get () { return false }
  })
}

// https://github.com/nodejs/node/blob/v18.14.2/lib/internal/modules/cjs/helpers.js#L65
function makeRequireFunction (mod, requireFromRootDirectory, currentExtensions) {
  const requireFn = function require (path) {
    return mod.require(path)
  }

  function resolve (request, options) {
    const extra = {
      parentModulePath: mod.path,
      options
    }

    return resolveFilename(ISOLATED_REQUIRE_RESOLVE_CACHE, requireFromRootDirectory.resolve, request, extra)
  }

  requireFn.resolve = resolve

  function paths (request) {
    validateString(request, 'request')
    return Module._resolveLookupPaths(request, mod)
  }

  resolve.paths = paths

  setOwnProperty(requireFn, 'main', process.mainModule)

  // Enable support to add extra extension types
  requireFn.extensions = currentExtensions

  // NOTE: we pass just use empty object here, it is not going to be set/used by us anywhere
  // we just provide it for back-compatibility in case some module expect it to exists
  requireFn.cache = Object.create(null)

  return requireFn
}

// https://github.com/nodejs/node/blob/v18.14.2/lib/internal/modules/cjs/loader.js#L496
// Find the longest (possibly multi-dot) extension registered in extensions
function findLongestRegisteredExtension (fullPath, extensions) {
  const name = path.basename(fullPath)
  let currentExtension
  let index
  let startIndex = 0

  while ((index = name.indexOf('.', startIndex)) !== -1) {
    startIndex = index + 1

    if (index === 0) {
      // Skip dotfiles like .gitignore
      continue
    }

    currentExtension = name.slice(index)

    if (extensions[currentExtension]) {
      return currentExtension
    }
  }

  return '.js'
}

// https://github.com/nodejs/node/blob/v18.14.2/lib/internal/modules/cjs/loader.js#L404
function readPackageScope (checkPath) {
  const sep = path.sep
  const rootSeparatorIndex = checkPath.indexOf(sep)
  let separatorIndex

  do {
    separatorIndex = checkPath.lastIndexOf(sep)
    checkPath = checkPath.slice(0, separatorIndex)

    if (checkPath.endsWith(sep + 'node_modules')) {
      return false
    }

    const pjson = readPackage(checkPath + sep)

    if (pjson) {
      return {
        data: pjson,
        path: checkPath
      }
    }
  } while (separatorIndex > rootSeparatorIndex)

  return false
}

// https://github.com/nodejs/node/blob/v18.14.2/lib/internal/modules/cjs/loader.js#L362
function readPackage (requestPath) {
  const jsonPath = path.resolve(requestPath, 'package.json')

  const existing = ISOLATED_PACKAGE_JSON_CACHE.get(jsonPath)

  if (existing !== undefined) {
    return existing
  }

  let json

  try {
    json = fs.readFileSync(jsonPath, 'utf8')
  } catch (error) {}

  if (json === undefined) {
    ISOLATED_PACKAGE_JSON_CACHE.set(jsonPath, false)
    return false
  }

  try {
    const filtered = filterOwnProperties(JSON.parse(json), [
      'name',
      'main',
      'exports',
      'imports',
      'type'
    ])

    ISOLATED_PACKAGE_JSON_CACHE.set(jsonPath, filtered)
    return filtered
  } catch (e) {
    e.path = jsonPath
    e.message = 'Error parsing ' + jsonPath + ': ' + e.message
    throw e
  }
}

function removeShebangFromModuleContent (content) {
  let moduleContent = content
  // https://github.com/nodejs/node/blob/v7.5.0/lib/module.js#L511
  // remove shebang
  const contLen = moduleContent.length

  if (contLen >= 2) {
    if (
      /* # */
      moduleContent.charCodeAt(0) === 35 &&
      /* ! */
      moduleContent.charCodeAt(1) === 33
    ) {
      if (contLen === 2) {
        // Exact match
        moduleContent = ''
      } else {
        // Find end of shebang line and slice it off
        let i = 2

        for (; i < contLen; ++i) {
          const code = moduleContent.charCodeAt(i)
          /* \n || \r */
          if (code === 10 || code === 13) {
            break
          }
        }

        if (i === contLen) {
          moduleContent = ''
        } else {
          // Note that this actually includes the newline character(s) in the
          // new output. This duplicates the behavior of the regular
          // expression that was previously used to replace the shebang line
          moduleContent = moduleContent.slice(i)
        }
      }
    }
  }

  return moduleContent
}

// https://github.com/nodejs/node/blob/v18.14.2/lib/internal/modules/cjs/helpers.js#L143
function stripBOM (content) {
  if (content.charCodeAt() === 0xFEFF) {
    content = content.slice(1)
  }
  return content
}

// https://github.com/nodejs/node/blob/v18.14.2/lib/internal/util.js#L548
function setOwnProperty (obj, key, value) {
  return Object.defineProperty(obj, key, {
    __proto__: null,
    configurable: true,
    enumerable: true,
    value,
    writable: true
  })
}

// https://github.com/nodejs/node/blob/v18.14.2/lib/internal/util.js#L529
function filterOwnProperties (source, keys) {
  const filtered = Object.create(null)

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]

    if (Object.prototype.hasOwnProperty.call(source, key)) {
      filtered[key] = source[key]
    }
  }

  return filtered
}

// https://github.com/nodejs/node/blob/v18.14.2/lib/internal/errors.js#L1518
// simplified version of the require ESM error
function createRequireESMError (filename, parentPath) {
  const parentPathExtraMsg = parentPath ? ` from ${parentPath}` : ''
  const error = new Error(`require() of ES Module ${filename}${parentPathExtraMsg} not supported.`)

  error.name = 'Error [ERR_REQUIRE_ESM]'

  return error
}

// https://github.com/nodejs/node/blob/v18.14.2/lib/internal/errors.js#L1279
function createInvalidArgValueError (name, value, reason) {
  const error = new TypeError(`The argument '${name}' ${reason}. Received ${value}`)

  error.name = 'TypeError [ERR_INVALID_ARG_VALUE]'

  return error
}

// https://github.com/nodejs/node/blob/v18.14.2/lib/internal/validators.js#L161
function validateString (value, name) {
  if (typeof value !== 'string') {
    const error = new TypeError(`The "${name}" argument must be of type string. Received type ${typeof value} (${value})`)

    error.name = 'TypeError [ERR_INVALID_ARG_TYPE]'

    throw error
  }
}

module.exports = isolatedRequire
module.exports.IsolatedModule = IsolatedModule
module.exports.setDefaultRequireExtensions = setDefaultRequireExtensions
