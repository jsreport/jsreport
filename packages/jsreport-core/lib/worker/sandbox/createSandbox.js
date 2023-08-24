const util = require('util')
const vm = require('vm')
const stackTrace = require('stack-trace')
const { codeFrameColumns } = require('@babel/code-frame')
const createPropertiesManager = require('./propertiesSandbox')
const createSandboxRequire = require('./requireSandbox')

module.exports = async function createSandbox (_sandbox, options = {}) {
  const {
    rootDirectory,
    onLog,
    formatError,
    propertiesConfig = {},
    globalModules = [],
    allowedModules = [],
    safeExecution,
    isolateModules,
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

  addConsoleMethod(_console, 'log', 'debug', onLog)
  addConsoleMethod(_console, 'warn', 'warn', onLog)
  addConsoleMethod(_console, 'error', 'error', onLog)

  const propsManager = createPropertiesManager(propertiesConfig)

  // we copy the object based on config to avoid sharing same context
  // (with getters/setters) in the rest of request pipeline
  const sandbox = propsManager.copyPropertyValuesFrom(_sandbox)

  propsManager.applyPropertiesConfigTo(sandbox)

  const sourceFilesInfo = new Map()
  // eslint-disable-next-line
  let compartment

  if (safeExecution) {
    // eslint-disable-next-line
    compartment = new Compartment()
  }

  let vmSandbox

  if (safeExecution) {
    vmSandbox = compartment.globalThis

    vmSandbox = Object.assign(vmSandbox, {
      // SES does not expose the Buffer, Intl by default, we expose it because it is handy for users,
      // it is exposed as it is, because we already harden() it on reporter init
      Buffer,
      Intl,
      // we need to expose Date, and Math to allow Date.now(), Math.random()
      // these objects are already hardened by lockdown()
      Date,
      Math
    })
  } else {
    vmSandbox = vm.createContext(undefined)
    vmSandbox.Buffer = Buffer
  }

  const doSandboxRequire = createSandboxRequire(safeExecution, isolateModules, modulesCache, {
    rootDirectory,
    requirePaths,
    requireMap,
    allowedModules,
    compileScript: doCompileScript,
    formatError
  })

  Object.assign(sandbox, {
    console: _console,
    require: (m) => { return doSandboxRequire(m, { context: vmSandbox }) },
    setTimeout: (...args) => {
      return setTimeout(...args)
    },
    clearTimeout: (...args) => {
      return clearTimeout(...args)
    }
  })

  for (const name in sandbox) {
    vmSandbox[name] = sandbox[name]
  }

  // processing top level props here because getter/setter descriptors
  // for top level properties will only work after VM instantiation
  propsManager.applyRootPropertiesConfigTo(vmSandbox)

  for (const info of globalModules) {
    // it is important to use _sandboxRequire function with allowAllModules: true here to avoid
    // getting hit by the allowed modules restriction
    vmSandbox[info.globalVariableName] = doSandboxRequire(info.module, { context: vmSandbox, useMap: false, allowAllModules: true })
  }

  return {
    sandbox: vmSandbox,
    console: _console,
    sourceFilesInfo,
    compileScript (code, filename) {
      return doCompileScript(code, filename, safeExecution)
    },
    restore () {
      return propsManager.restorePropertiesFrom(vmSandbox)
    },
    sandboxRequire (modulePath) {
      return doSandboxRequire(modulePath, { context: vmSandbox, allowAllModules: true })
    },
    async run (codeOrScript, { filename, errorLineNumberOffset = 0, source, entity, entitySet } = {}) {
      if (filename != null && source != null) {
        sourceFilesInfo.set(filename, { filename, source, entity, entitySet, errorLineNumberOffset })
      }

      try {
        if (safeExecution) {
          return await compartment.evaluate(codeOrScript + `\n//# sourceURL=${filename}`)
        }

        const script = typeof codeOrScript !== 'string' ? codeOrScript : doCompileScript(codeOrScript, filename, safeExecution)

        return await script.runInContext(vmSandbox, {
          displayErrors: true
        })
      } catch (e) {
        decorateErrorMessage(e, sourceFilesInfo)

        throw e
      }
    }
  }
}

function doCompileScript (code, filename, safeExecution) {
  if (safeExecution) {
    return code
  }

  return new vm.Script(code, {
    filename,
    displayErrors: true,
    importModuleDynamically: () => {
      // We can't throw an error object here because since vm.Script doesn't store a context, we can't properly contextify that error object.
      // eslint-disable-next-line no-throw-literal
      throw 'Dynamic imports are not allowed.'
    }
  })
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

function addConsoleMethod (target, consoleMethod, level, onLog) {
  target[consoleMethod] = function () {
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

/**
 * NOTE: In the past (<= 3.11.3) the code sandbox in jsreport have worked like this:
 * User code (helpers, scripts, etc) are evaluated in a context we create dedicated to it
 * (`vmSandbox` variable in this file), Modules (code you import using `require`) are evaluated
 * with normal node.js require mechanism, which means such code is evaluated in the main context.
 * One of our requirements is to have isolated modules in the sandbox, this means that
 * imported modules in a render are not re-used in other completely different renders.
 * This requirement differs in the way the node.js require works because it caches the modules,
 * so if you require the same module in different places you get the same module instance,
 * we don't want that, we want to have isolated modules in each render.
 *
 * To fullfil this requirement the approach we took was to make all the require calls inside the sandbox
 * to not cache its resolved modules, to achieve that after a require call is done
 * we proceed to restore the require.cache to its original state, the state that was there before
 * a require call happens, which means we would have to save the current require.cache (before a require) then
 * delete all entries in that object (using delete require.cache[entry]),
 * so the require can re-evaluate the module code and give a fresh module instance.
 * The problem we discovered later was that this approach leads to memory leaks,
 * using the normal require and deleting something from require.cache is not a good idea,
 * it makes memory leaks happen, we didn't dig deeper but it seems node.js internals rely
 * on the presence of the entries to be there in the require.cache in order to execute
 * cleanup during the require execution, handling this improperly make the memory leaks happens,
 * unfortunately doing this properly seems to require access to node.js internals,
 * so nothing else we can do here.
 *
 * NOTE: Currently (>= 3.12.0) the code sandbox works like this:
 * User code (helpers, scripts, etc) are evaluated just like before, in a context we create dedicated to it,
 * however Modules (code you import using `require`) are evaluated with a custom version of require (requireSandbox) we've created.
 * This version of require does not cache resolved modules into the require.cache, so it does not suffer
 * from the memory leaks described above in the past version.
 * The required modules are still cached but in our own managed cache, which only lives per render,
 * so different requires to same modules in same render will return the same module instance (as expected)
 *
 * The main problem we found initially with the custom require was that creating a new
 * instance of vm.Script per module to be evaluated allocated a lot of memory when doing a test case with lot of renders,
 * no matter how many times the same module is required across renders, it was going to be compiled again.
 * the problem was that GC (Garbage Collector) becomes really lazy to claim back the memory used
 * for these scripts, in the end after some idle time the GC claims back the memory but it takes time,
 * this is problem when you do a test case like doing 200 to 1000 renders to a template,
 * it makes memory to be allocated a lot and not released just after some time of being idle, if you don't
 * give it idle time it will eventually just choke and break with heap of out memory errors
 * https://github.com/nodejs/node/issues/40014, https://github.com/nodejs/node/issues/3113,
 * https://github.com/jestjs/jest/issues/11956
 * A workaround to alleviate the issue was to cache scripts, so module is evaluated only once
 * across renders, this is not a problem because we are not caching the module itself, only the compile part
 * which makes sense. with this workaround the test case of 200 - 1000 renders allocates less memory
 * but still the GC continue to be lazy, just that it will hold longer until it breaks
 * with the heap out of memory error.
 * A possible fix to this problem of the lazy GC we found was to use manually call the GC
 * (when running node with --expose-gc), using something like this after render `setTimeout(() => { gc() }, 500)`,
 * this makes the case to release memory better and more faster, however we did not added this because
 * we don't want to deal with running node with exposed gc
 *
 * Another problem we found during the custom require implementation was that all render requests was
 * just going to one worker (the rest were not used and idle), we fixed this and rotated the requests
 * across the workers and the memory release was better (it seems it gives the GC of each worker a bit more of idle time)
 *
 * Last problem we found, was to decide in which context the Modules are going to be run,
 * this affects the results of the user code will get when running constructor comparison,
 * instanceof checks, or when errors originate from modules and are catch in the user code.
 * There were alternatives to run in it in main context (just like the the normal node.js require does it),
 * run it in the same context than sandbox (the context in which the user code is evaluated),
 * or run it in a new context (managed by us).
 * Something that affected our decision was to check how the constructors and instanceof checks
 * were already working in past versions, how it behaves when using trustUserCode: true or not,
 * the results were that when trustUserCode: true is used it produces different results
 * to the results of trustUserCode: false, there was already some inconsistency,
 * so we decided to keep the same behavior and not introduce more inconsistencies,
 * which means we evaluate Modules with main context, one benefit or using the main context
 * was that we did not have to care about re-exposing node.js globals (like Buffer, etc)
 */
