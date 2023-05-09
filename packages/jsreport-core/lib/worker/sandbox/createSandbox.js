const Module = require('module')
const os = require('os')
const util = require('util')
const path = require('path')
const fs = require('fs')
const extend = require('node.extend.without.arrays')
const get = require('lodash.get')
const set = require('lodash.set')
const hasOwn = require('has-own-deep')
const unsetValue = require('unset-value')
const groupBy = require('lodash.groupby')
const { VM, VMScript } = require('vm2')
const originalVM = require('vm')
const stackTrace = require('stack-trace')
const { codeFrameColumns } = require('@babel/code-frame')

let CONTEXT

const RESOLVE_CACHE = Object.create(null)
const SCRIPT_CACHE = Object.create(null)

module.exports = (_sandbox, options = {}) => {
  // console.log('REQUIRE CACHE INITIAL LENGTH:', Object.keys(require.cache).length)

  const {
    onLog,
    formatError,
    propertiesConfig = {},
    globalModules = [],
    allowedModules = [],
    safeExecution,
    requireMap
  } = options

  const modulesCache = options.modulesCache != null ? options.modulesCache : Object.create(null)
  const _console = {}

  let requirePaths = options.requirePaths || []

  requirePaths = requirePaths.filter((p) => p != null).map((p) => {
    if (p.endsWith('/') || p.endsWith('\\')) {
      return p.slice(0, -1)
    }

    return p
  })

  // remove duplicates in paths
  requirePaths = requirePaths.filter((v, i) => requirePaths.indexOf(v) === i)

  function addConsoleMethod (consoleMethod, level) {
    _console[consoleMethod] = function () {
      if (onLog == null) {
        return
      }

      onLog({
        timestamp: new Date().getTime(),
        level: level,
        message: util.format.apply(util, arguments)
      })
    }
  }

  addConsoleMethod('log', 'debug')
  addConsoleMethod('warn', 'warn')
  addConsoleMethod('error', 'error')

  const propsConfig = normalizePropertiesConfigInHierarchy(propertiesConfig)
  const originalValues = {}
  const proxiesInVM = new WeakMap()
  const customProxies = new WeakMap()

  // we copy the object based on config to avoid sharing same context
  // (with getters/setters) in the rest of request pipeline
  const sandbox = copyBasedOnPropertiesConfig(_sandbox, propertiesConfig)

  applyPropertiesConfig(sandbox, propsConfig, {
    original: originalValues,
    customProxies
  })

  let safeVM
  let vmSandbox

  const _require = function (moduleName, { context, useMap = true, allowAllModules = false } = {}) {
    if (useMap && requireMap) {
      const mapResult = requireMap(moduleName, { context })

      if (mapResult != null) {
        return mapResult
      }
    }

    if (!safeExecution || allowAllModules || allowedModules === '*') {
      // return require.main.require(moduleName)
      return doRequire(safeExecution, safeVM, moduleName, requirePaths, modulesCache, context)
    }

    const m = allowedModules.find(mod => (mod.id || mod) === moduleName)

    if (m) {
      return doRequire(safeExecution, safeVM, m.path || moduleName, requirePaths, modulesCache, context)
    }

    const error = new Error(
      `require of "${moduleName}" module has been blocked.`
    )

    if (formatError) {
      formatError(error, moduleName)
    }

    throw error
  }

  Object.assign(sandbox, {
    console: _console,
    require: (m) => _require(m, { context: vmSandbox })
  })

  if (safeExecution) {
    safeVM = new VM()

    // delete the vm.sandbox.global because it introduces json stringify issues
    // and we don't need such global in context
    delete safeVM.sandbox.global

    for (const name in sandbox) {
      safeVM.setGlobal(name, sandbox[name])
    }

    vmSandbox = safeVM.sandbox
  } else {
    // if (CONTEXT) {
    //   vmSandbox = CONTEXT
    // } else {
    vmSandbox = originalVM.createContext(undefined)
    vmSandbox.Buffer = Buffer
    //   CONTEXT = vmSandbox
    // }

    for (const name in sandbox) {
      vmSandbox[name] = sandbox[name]
    }
  }

  // processing top level props because getter/setter descriptors
  // for top level properties will only work after VM instantiation
  Object.keys(propsConfig).forEach((key) => {
    const currentConfig = propsConfig[key]

    if (currentConfig.root && currentConfig.root.sandboxReadOnly) {
      readOnlyProp(vmSandbox, key, [], customProxies, { onlyTopLevel: true })
    }
  })

  for (const info of globalModules) {
    // it is important to use "doRequire" function here to avoid
    // getting hit by the allowed modules restriction
    vmSandbox[info.globalVariableName] = _require(info.module, { context: vmSandbox, useMap: false, allowAllModules: true }) // doRequire(info.module, requirePaths, modulesCache)
  }

  const sourceFilesInfo = new Map()

  return {
    sandbox: vmSandbox,
    console: _console,
    sourceFilesInfo,
    compileScript: (code, filename) => {
      return doCompileScript(code, filename, safeExecution)
    },
    restore: () => {
      return restoreProperties(vmSandbox, originalValues, proxiesInVM, customProxies)
    },
    sandboxRequire: (modulePath) => _require(modulePath, { context: vmSandbox, allowAllModules: true }),
    run: async (codeOrScript, { filename, errorLineNumberOffset = 0, source, entity, entitySet } = {}) => {
      let run

      if (filename != null && source != null) {
        sourceFilesInfo.set(filename, { filename, source, entity, entitySet, errorLineNumberOffset })
      }

      const script = typeof codeOrScript !== 'string' ? codeOrScript : doCompileScript(codeOrScript, filename, safeExecution)

      if (safeExecution) {
        run = async () => {
          return safeVM.run(script)
        }
      } else {
        run = async () => {
          return script.runInContext(vmSandbox, {
            displayErrors: true
          })
        }
      }

      try {
        const result = await run()
        return result
      } catch (e) {
        decorateErrorMessage(e, sourceFilesInfo)

        throw e
      }
    }
  }
}

function doCompileScript (code, filename, safeExecution) {
  let script

  if (safeExecution) {
    script = new VMScript(code, filename)

    // NOTE: if we need to upgrade vm2 we will need to check the source of this function
    // in vm2 repo and see if we need to change this,
    // we needed to override this method because we want "displayErrors" to be true in order
    // to show nice error when the compile of a script fails
    script._compile = function (prefix, suffix) {
      return new originalVM.Script(prefix + this.getCompiledCode() + suffix, {
        __proto__: null,
        filename: this.filename,
        displayErrors: true,
        lineOffset: this.lineOffset,
        columnOffset: this.columnOffset,
        // THIS FN WAS TAKEN FROM vm2 source, nothing special here
        importModuleDynamically: () => {
          // We can't throw an error object here because since vm.Script doesn't store a context, we can't properly contextify that error object.
          // eslint-disable-next-line no-throw-literal
          throw 'Dynamic imports are not allowed.'
        }
      })
    }

    // do the compilation
    script._compileVM()
  } else {
    script = new originalVM.Script(code, {
      filename,
      displayErrors: true,
      importModuleDynamically: () => {
        // We can't throw an error object here because since vm.Script doesn't store a context, we can't properly contextify that error object.
        // eslint-disable-next-line no-throw-literal
        throw 'Dynamic imports are not allowed.'
      }
    })
  }

  return script
}

function doRequire (safeExecution, safeVM, moduleName, _requirePaths, modulesCache, context) {
  // console.log('REQUIRE CACHE CURRENT LENGTH BEFORE require():', Object.keys(require.cache).length)
  const searchedPaths = []
  const requirePaths = _requirePaths || []

  let result = customRequire(safeExecution, safeVM, moduleName, modulesCache, searchedPaths, context)
  // let result = optimizedRequire(require, moduleName, modulesCache, searchedPaths)

  if (!result) {
    let pathsSearched = 0

    while (!result && pathsSearched < requirePaths.length) {
      result = customRequire(safeExecution, safeVM, path.join(requirePaths[pathsSearched], moduleName), modulesCache, searchedPaths, context)
      // result = optimizedRequire(require, path.join(requirePaths[pathsSearched], moduleName), modulesCache, searchedPaths)
      pathsSearched++
    }
  }

  if (!result) {
    throw new Error(`Unable to find module ${moduleName}${os.EOL}The require calls:${os.EOL}${searchedPaths.map(p => `require('${p}')`).join(os.EOL)}${os.EOL}`)
  }

  return result
}

function optimizedRequire (_require, modulePath, modulesCache, searchedPaths) {
  // save the current module cache, we will use this to restore the cache to the
  // original values after the require finish
  const originalModuleCache = Object.assign(Object.create(null), _require.cache)

  // clean/empty the current module cache
  for (const cacheKey of Object.keys(_require.cache)) {
    delete _require.cache[cacheKey]
  }

  // restore any previous cache generated in the sandbox
  for (const cacheKey of Object.keys(modulesCache)) {
    _require.cache[cacheKey] = modulesCache[cacheKey]
  }

  try {
    const moduleExport = _require.main ? _require.main.require(modulePath) : _require(modulePath)

    // console.log('REQUIRE CACHE CURRENT LENGTH AFTER require():', Object.keys(require.cache).length)

    _require.main.children.splice(_require.main.children.indexOf(m => m.id === _require.resolve(modulePath)), 1)

    // save the current module cache generated after the require into the internal cache,
    // and clean the current module cache again
    for (const cacheKey of Object.keys(_require.cache)) {
      modulesCache[cacheKey] = _require.cache[cacheKey]
      delete _require.cache[cacheKey]
    }

    // restore the current module cache to the original cache values
    for (const [oldCacheKey, value] of Object.entries(originalModuleCache)) {
      _require.cache[oldCacheKey] = value
    }

    return moduleExport
  } catch (e) {
    // clean the current module cache again
    for (const cacheKey of Object.keys(_require.cache)) {
      delete _require.cache[cacheKey]
    }

    // restore the current module cache to the original cache values
    for (const [oldCacheKey, value] of Object.entries(originalModuleCache)) {
      _require.cache[oldCacheKey] = value
    }

    if (e.code && e.code === 'MODULE_NOT_FOUND') {
      if (!searchedPaths.includes(modulePath)) {
        searchedPaths.push(modulePath)
      }

      return false
    } else {
      throw new Error(`Unable to require module ${moduleName}. ${e.message}${os.EOL}${e.stack}`)
    }
  }
}

function customRequire (safeExecution, safeVM, _modulePath, modulesCache, searchedPaths, context) {
  const parentModulePath = typeof _modulePath !== 'string' ? _modulePath.parent : null
  const modulePath = parentModulePath ? _modulePath.module : _modulePath

  try {
    if (Module.isBuiltin(modulePath)) {
      return require(modulePath)
    }

    const resolveCacheKey = parentModulePath ? `${parentModulePath}::${modulePath}` : modulePath
    let fullModulePath

    if (RESOLVE_CACHE[resolveCacheKey]) {
      console.log('REUSING FROM RESOLVE CACHE')
      fullModulePath = RESOLVE_CACHE[resolveCacheKey]
    } else {
      fullModulePath = parentModulePath ? require.resolve(modulePath, { paths: [parentModulePath] }) : require.resolve(modulePath)
      RESOLVE_CACHE[resolveCacheKey] = fullModulePath
    }

    console.log('RESOLVE CACHE:', Object.keys(RESOLVE_CACHE).join(' '))

    if (modulesCache[fullModulePath]) {
      return modulesCache[fullModulePath]
    }

    const dirname = path.dirname(fullModulePath)

    let script

    if (SCRIPT_CACHE[fullModulePath]) {
      console.log('REUSING FROM SCRIPT CACHE')
      script = SCRIPT_CACHE[fullModulePath]
    } else {
      let content = fs.readFileSync(fullModulePath, 'utf-8')
      const contLen = content.length

      if (contLen >= 2) {
        if (
          content.charCodeAt(0) === 35/*#*/ &&
          content.charCodeAt(1) === 33/*!*/
        ) {
          if (contLen === 2) {
            // Exact match
            content = ''
          } else {
            // Find end of shebang line and slice it off
            let i = 2

            for (; i < contLen; ++i) {
              const code = content.charCodeAt(i)

              if (code === 10/*\n*/ || code === 13/*\r*/) {
                break
              }
            }

            if (i === contLen) {
              content = ''
            } else {
              // Note that this actually includes the newline character(s) in the
              // new output. This duplicates the behavior of the regular
              // expression that was previously used to replace the shebang line
              content = content.slice(i)
            }
          }
        }
      }

      const wrapper = Module.wrap(content)

      // script = new originalVM.Script(wrapper, {
      //   filename: fullModulePath,
      //   lineOffset: 0,
      //   displayErrors: true
      // })

      script = doCompileScript(wrapper, fullModulePath, safeExecution)

      SCRIPT_CACHE[fullModulePath] = script
    }

    // console.log('SCRIPT CACHE:', Object.keys(SCRIPT_CACHE).join(' '))

    let run

    if (safeExecution) {
      run = () => {
        return safeVM.run(script)
      }
    } else {
      run = () => {
        return script.runInContext(context, {
          displayErrors: true
        })
      }
    }

    const compiledWrapper = run()

    // const compiledWrapper = script.runInContext(context, {
    //   filename: fullModulePath,
    //   lineOffset: 0,
    //   columnOffset: 0,
    //   displayErrors: true
    // })

    // const compiledWrapper = originalVM.compileFunction(content, ['exports', 'require', 'module', '__filename', '__dirname'], {
    //   filename: fullModulePath,
    //   lineOffset: 0,
    //   columnOffset: 0,
    //   parsingContext: context
    // })

    function _require (id) {
      return customRequire(safeExecution, safeVM, { parent: dirname, module: id }, modulesCache, null, context)
    }

    const mod = {
      exports: {}
    }

    const args = [mod.exports, _require, mod, fullModulePath, dirname]

    compiledWrapper.apply(mod.exports, args)

    // console.log('REQUIRE CACHE CURRENT LENGTH AFTER require():', Object.keys(require.cache).length)

    modulesCache[fullModulePath] = mod.exports

    return mod.exports
  } catch (e) {
    if (e.code && e.code === 'MODULE_NOT_FOUND' && searchedPaths) {
      if (!searchedPaths.includes(modulePath)) {
        searchedPaths.push(modulePath)
      }

      return false
    } else {
      if (searchedPaths) {
        throw new Error(`Unable to require module ${modulePath}. ${e.message}${os.EOL}${e.stack}`)
      }

      throw e
    }
  }
}

function decorateErrorMessage (e, sourceFilesInfo) {
  const filesCount = sourceFilesInfo.size

  if (filesCount > 0) {
    const trace = stackTrace.parse(e)
    let suffix = ''

    for (let i = 0; i < trace.length; i++) {
      const current = trace[i]

      if (
        current.getLineNumber() == null &&
        current.getColumnNumber() == null
      ) {
        continue
      }

      if (
        sourceFilesInfo.has(current.getFileName()) &&
        current.getLineNumber() != null
      ) {
        const { entity: entityAtFile, errorLineNumberOffset: errorLineNumberOffsetForFile } = sourceFilesInfo.get(current.getFileName())
        const ln = current.getLineNumber() - errorLineNumberOffsetForFile
        if (i === 0) {
          if (entityAtFile != null) {
            e.entity = {
              shortid: entityAtFile.shortid,
              name: entityAtFile.name,
              content: entityAtFile.content
            }

            e.property = 'content'
          }

          e.lineNumber = ln < 0 ? null : ln
        }
        if (ln < 0) {
          suffix += `(${current.getFileName()})`
        } else {
          suffix += `(${current.getFileName()} line ${ln}:${current.getColumnNumber()})`
        }
      }

      if (
        sourceFilesInfo.has(current.getFileName()) &&
        current.getLineNumber() != null
      ) {
        const source = sourceFilesInfo.get(current.getFileName()).source
        const codeFrame = codeFrameColumns(source, {
          // we don't check if there is column because if it returns empty value then
          // the code frame is still generated normally, just without column mark
          start: { line: current.getLineNumber(), column: current.getColumnNumber() }
        })

        if (codeFrame !== '') {
          suffix += `\n\n${codeFrame}\n\n`
        }
      }
    }

    if (suffix !== '') {
      suffix = `\n\n${suffix}`
      e.message = `${e.message}${suffix}`
      // we store the suffix we added to the message so we can use it later
      // to detect if we need to strip this from the stack or not
      e.decoratedSuffix = suffix
    }
  }

  e.message = `${e.message}`
}

function getOriginalFromProxy (proxiesInVM, customProxies, value) {
  let newValue

  if (customProxies.has(value)) {
    newValue = getOriginalFromProxy(proxiesInVM, customProxies, customProxies.get(value))
  } else if (proxiesInVM.has(value)) {
    newValue = getOriginalFromProxy(proxiesInVM, customProxies, proxiesInVM.get(value))
  } else {
    newValue = value
  }

  return newValue
}

function copyBasedOnPropertiesConfig (context, propertiesMap) {
  const copied = []
  const newContext = Object.assign({}, context)

  Object.keys(propertiesMap).sort(sortPropertiesByLevel).forEach((prop) => {
    const parts = prop.split('.')
    const lastPartsIndex = parts.length - 1

    for (let i = 0; i <= lastPartsIndex; i++) {
      let currentContext = newContext
      const propName = parts[i]
      const parentPath = parts.slice(0, i).join('.')
      const fullPropName = parts.slice(0, i + 1).join('.')
      let value

      if (copied.indexOf(fullPropName) !== -1) {
        continue
      }

      if (parentPath !== '') {
        currentContext = get(newContext, parentPath)
      }

      if (currentContext) {
        value = currentContext[propName]

        if (typeof value === 'object') {
          if (value === null) {
            value = null
          } else if (Array.isArray(value)) {
            value = Object.assign([], value)
          } else {
            value = Object.assign({}, value)
          }

          currentContext[propName] = value
          copied.push(fullPropName)
        }
      }
    }
  })

  return newContext
}

function applyPropertiesConfig (context, config, {
  original,
  customProxies,
  isRoot = true,
  isGrouped = true,
  onlyReadOnlyTopLevel = false,
  parentOpts,
  prop
} = {}, readOnlyConfigured = []) {
  let isHidden
  let isReadOnly
  let standalonePropertiesHandled = false
  let innerPropertiesHandled = false

  if (isRoot) {
    return Object.keys(config).forEach((key) => {
      applyPropertiesConfig(context, config[key], {
        original,
        customProxies,
        prop: key,
        isRoot: false,
        isGrouped: true,
        onlyReadOnlyTopLevel,
        parentOpts
      }, readOnlyConfigured)
    })
  }

  if (parentOpts && parentOpts.sandboxHidden === true) {
    return
  }

  if (isGrouped) {
    isHidden = config.root ? config.root.sandboxHidden === true : false
    isReadOnly = config.root ? config.root.sandboxReadOnly === true : false
  } else {
    isHidden = config ? config.sandboxHidden === true : false
    isReadOnly = config ? config.sandboxReadOnly === true : false
  }

  let shouldStoreOriginal = isHidden || isReadOnly

  // prevent storing original value if there is config some child prop
  if (
    shouldStoreOriginal &&
    isGrouped &&
    (config.inner != null || config.standalone != null)
  ) {
    shouldStoreOriginal = false
  }

  // saving original value
  if (shouldStoreOriginal) {
    let exists = true
    let newValue

    if (hasOwn(context, prop)) {
      const originalPropValue = get(context, prop)

      if (typeof originalPropValue === 'object' && originalPropValue != null) {
        if (Array.isArray(originalPropValue)) {
          newValue = extend(true, [], originalPropValue)
        } else {
          newValue = extend(true, {}, originalPropValue)
        }
      } else {
        newValue = originalPropValue
      }
    } else {
      exists = false
    }

    original[prop] = {
      exists,
      value: newValue
    }
  }

  const processStandAloneProperties = (c) => {
    Object.keys(c.standalone).forEach((skey) => {
      const sconfig = c.standalone[skey]

      applyPropertiesConfig(context, sconfig, {
        original,
        customProxies,
        prop: skey,
        isRoot: false,
        isGrouped: false,
        onlyReadOnlyTopLevel,
        parentOpts: { sandboxHidden: isHidden, sandboxReadOnly: isReadOnly }
      }, readOnlyConfigured)
    })
  }

  const processInnerProperties = (c) => {
    Object.keys(c.inner).forEach((ikey) => {
      const iconfig = c.inner[ikey]

      applyPropertiesConfig(context, iconfig, {
        original,
        customProxies,
        prop: ikey,
        isRoot: false,
        isGrouped: true,
        parentOpts: { sandboxHidden: isHidden, sandboxReadOnly: isReadOnly }
      }, readOnlyConfigured)
    })
  }

  if (isHidden) {
    omitProp(context, prop)
  } else if (isReadOnly) {
    readOnlyProp(context, prop, readOnlyConfigured, customProxies, {
      onlyTopLevel: false,
      onBeforeProxy: () => {
        if (isGrouped && config.standalone != null) {
          processStandAloneProperties(config)
          standalonePropertiesHandled = true
        }

        if (isGrouped && config.inner != null) {
          processInnerProperties(config)
          innerPropertiesHandled = true
        }
      }
    })
  }

  if (!isGrouped) {
    return
  }

  // don't process inner config when the value in context is empty
  if (get(context, prop) == null) {
    return
  }

  if (!standalonePropertiesHandled && config.standalone != null) {
    processStandAloneProperties(config)
  }

  if (!innerPropertiesHandled && config.inner != null) {
    processInnerProperties(config)
  }
}

function restoreProperties (context, originalValues, proxiesInVM, customProxies) {
  const restored = []
  const newContext = Object.assign({}, context)

  Object.keys(originalValues).sort(sortPropertiesByLevel).forEach((prop) => {
    const confValue = originalValues[prop]
    const parts = prop.split('.')
    const lastPartsIndex = parts.length - 1

    for (let i = 0; i <= lastPartsIndex; i++) {
      let currentContext = newContext
      const propName = parts[i]
      const parentPath = parts.slice(0, i).join('.')
      const fullPropName = parts.slice(0, i + 1).join('.')
      let value

      if (restored.indexOf(fullPropName) !== -1) {
        continue
      }

      if (parentPath !== '') {
        currentContext = get(newContext, parentPath)
      }

      if (currentContext) {
        value = currentContext[propName]

        // unwrapping proxies
        value = getOriginalFromProxy(proxiesInVM, customProxies, value)

        if (typeof value === 'object') {
          // we call object assign to be able to get rid of
          // previous properties descriptors (hide/readOnly) configured
          if (value === null) {
            value = null
          } else if (Array.isArray(value)) {
            value = Object.assign([], value)
          } else {
            value = Object.assign({}, value)
          }

          currentContext[propName] = value
          restored.push(fullPropName)
        }

        if (i === lastPartsIndex) {
          if (confValue.exists) {
            currentContext[propName] = confValue.value
          } else {
            delete currentContext[propName]
          }
        }
      }
    }
  })

  // unwrapping proxies for top level properties
  Object.keys(newContext).forEach((prop) => {
    newContext[prop] = getOriginalFromProxy(proxiesInVM, customProxies, newContext[prop])
  })

  return newContext
}

function omitProp (context, prop) {
  // if property has value, then set it to undefined first,
  // unsetValue expects that property has some non empty value to remove the property
  // so we set to "true" to ensure it works for all cases,
  // we use unsetValue instead of lodash.omit because
  // it supports object paths x.y.z and does not copy the object for each call
  if (hasOwn(context, prop)) {
    set(context, prop, true)
    unsetValue(context, prop)
  }
}

function readOnlyProp (context, prop, configured, customProxies, { onlyTopLevel = false, onBeforeProxy } = {}) {
  const parts = prop.split('.')
  const lastPartsIndex = parts.length - 1

  const throwError = (fullPropName) => {
    throw new Error(`Can't modify read only property "${fullPropName}" inside sandbox`)
  }

  for (let i = 0; i <= lastPartsIndex; i++) {
    let currentContext = context
    const isTopLevelProp = i === 0
    const propName = parts[i]
    const parentPath = parts.slice(0, i).join('.')
    const fullPropName = parts.slice(0, i + 1).join('.')
    let value

    if (configured.indexOf(fullPropName) !== -1) {
      continue
    }

    if (parentPath !== '') {
      currentContext = get(context, parentPath)
    }

    if (currentContext) {
      value = currentContext[propName]

      if (
        i === lastPartsIndex &&
        typeof value === 'object' &&
        value != null
      ) {
        const valueType = Array.isArray(value) ? 'array' : 'object'
        const rawValue = value

        if (onBeforeProxy) {
          onBeforeProxy()
        }

        value = new Proxy(rawValue, {
          set: (target, prop) => {
            throw new Error(`Can't add or modify property "${prop}" to read only ${valueType} "${fullPropName}" inside sandbox`)
          },
          deleteProperty: (target, prop) => {
            throw new Error(`Can't delete property "${prop}" in read only ${valueType} "${fullPropName}" inside sandbox`)
          }
        })

        customProxies.set(value, rawValue)
      }

      // only create the getter/setter wrapper if the property is defined,
      // this prevents getting errors about proxy traps and descriptors differences
      // when calling `JSON.stringify(req.context)` from a script
      if (Object.prototype.hasOwnProperty.call(currentContext, propName)) {
        if (!configured.includes(fullPropName)) {
          configured.push(fullPropName)
        }

        Object.defineProperty(currentContext, propName, {
          get: () => value,
          set: () => { throwError(fullPropName) },
          enumerable: true
        })
      }

      if (isTopLevelProp && onlyTopLevel) {
        break
      }
    }
  }
}

function sortPropertiesByLevel (a, b) {
  const parts = a.split('.')
  const parts2 = b.split('.')

  return parts.length - parts2.length
}

function normalizePropertiesConfigInHierarchy (configMap) {
  const configMapKeys = Object.keys(configMap)

  const groupedKeys = groupBy(configMapKeys, (key) => {
    const parts = key.split('.')

    if (parts.length === 1) {
      return ''
    }

    return parts.slice(0, -1).join('.')
  })

  const hierarchy = []
  const hierarchyLevels = {}

  // we sort to ensure that top level properties names are processed first
  Object.keys(groupedKeys).sort(sortPropertiesByLevel).forEach((key) => {
    if (key === '') {
      hierarchy.push('')
      return
    }

    const parts = key.split('.')
    const lastIndexParts = parts.length - 1

    if (parts.length === 1) {
      hierarchy.push(parts[0])
      hierarchyLevels[key] = {}
      return
    }

    for (let i = 0; i < parts.length; i++) {
      const currentKey = parts.slice(0, i + 1).join('.')
      const indexInHierarchy = hierarchy.indexOf(currentKey)
      let parentHierarchy = hierarchyLevels

      if (indexInHierarchy === -1 && i === lastIndexParts) {
        let parentExistsInTopLevel = false

        for (let j = 0; j < i; j++) {
          const segmentedKey = parts.slice(0, j + 1).join('.')

          if (parentExistsInTopLevel !== true) {
            parentExistsInTopLevel = hierarchy.indexOf(segmentedKey) !== -1
          }

          if (parentHierarchy[segmentedKey] != null) {
            parentHierarchy = parentHierarchy[segmentedKey]
          }
        }

        if (!parentExistsInTopLevel) {
          hierarchy.push(key)
        }

        parentHierarchy[key] = {}
      }
    }
  })

  const toHierarchyConfigMap = (parentLevels) => {
    return (acu, key) => {
      if (key === '') {
        groupedKeys[key].forEach((g) => {
          acu[g] = {}

          if (configMap[g] != null) {
            acu[g].root = configMap[g]
          }
        })

        return acu
      }

      const currentLevel = parentLevels[key]

      if (acu[key] == null) {
        acu[key] = {}

        if (configMap[key] != null) {
          // root is config that was defined in the same property
          // that it is grouped
          acu[key].root = configMap[key]
        }
      }

      // standalone are properties that are direct, no groups
      acu[key].standalone = groupedKeys[key].reduce((obj, stdProp) => {
        // only add the property is not already grouped
        if (groupedKeys[stdProp] == null) {
          obj[stdProp] = configMap[stdProp]
        }

        return obj
      }, {})

      if (Object.keys(acu[key].standalone).length === 0) {
        delete acu[key].standalone
      }

      const levelKeys = Object.keys(currentLevel)

      if (levelKeys.length === 0) {
        return acu
      }

      // inner are properties which contains other properties, groups
      acu[key].inner = levelKeys.reduce(toHierarchyConfigMap(currentLevel), {})

      if (Object.keys(acu[key].inner).length === 0) {
        delete acu[key].inner
      }

      return acu
    }
  }

  return hierarchy.reduce(toHierarchyConfigMap(hierarchyLevels), {})
}
