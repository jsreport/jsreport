const extend = require('node.extend.without.arrays')
const _omit = require('lodash.omit')
const promisify = require('util').promisify

module.exports = async function executeScript (reporter, { script, method, onBeforeExecute }, req, res) {
  let entityPath

  if (script._id) {
    entityPath = await reporter.folders.resolveEntityPath(script, 'scripts', req)
  }

  const requestContextMetaConfig = reporter.getRequestContextMetaConfig() || {}
  const originalData = req.data
  const originalSharedContext = req.context.shared
  const reqCloneWithNoData = extend(true, {}, _omit(req, 'data'))
  const scriptResponse = await reporter.Response(req.context.id, res)
  await scriptResponse.parse(await res.serialize())

  const serializeResponse = scriptResponse.serialize

  // we don't expose the serialize to scripts, because it exposes file path of response
  //  when the output is stream
  delete scriptResponse.serialize

  const initialContext = {
    __request: {
      ...reqCloneWithNoData,
      data: {
        ...originalData
      }
    },
    __response: scriptResponse
  }

  // keep the reference to the shared context so it is always update to date
  // between script executions
  initialContext.__request.context.shared = originalSharedContext

  initialContext.__request.cancel = (messageOrOptions = {}) => {
    const data = {}

    if (typeof messageOrOptions === 'string') {
      data.additionalInfo = messageOrOptions
    } else if (messageOrOptions != null) {
      const { message, statusCode } = messageOrOptions
      data.additionalInfo = message
      data.statusCode = statusCode
    }

    data.requestCancel = true

    const cancellationError = new Error('Cancel scripts')
    cancellationError.isRequestCancel = true
    cancellationError.data = data
    throw cancellationError
  }

  initialContext.__request.__onBeforeExecute = (topLevelFunctionsNames) => {
    onBeforeExecute(script, topLevelFunctionsNames)
  }

  const sandboxManager = {}

  const executionFn = async ({ topLevelFunctions, context }) => {
    const onBeforeExecute = context.__request.__onBeforeExecute
    delete context.__request.__onBeforeExecute

    onBeforeExecute(Object.keys(topLevelFunctions))

    try {
      if (method === 'beforeRender' && topLevelFunctions.beforeRender) {
        if (topLevelFunctions.beforeRender.length === 3) {
          await promisify(topLevelFunctions.beforeRender)(context.__request, context.__response)
        } else {
          await topLevelFunctions.beforeRender(context.__request, context.__response)
        }
      }

      if (method === 'afterRender' && topLevelFunctions.afterRender) {
        if (topLevelFunctions.afterRender.length === 3) {
          await promisify(topLevelFunctions.afterRender)(context.__request, context.__response)
        } else {
          await topLevelFunctions.afterRender(context.__request, context.__response)
        }
      }
    } catch (e) {
      if (e.isRequestCancel) {
        return e.data
      }
      throw e
    }

    let err = null
    // this will only restore original values of properties of __request.context
    // and unwrap proxies and descriptors into new sandbox object
    const restoredSandbox = sandboxManager.restore()

    if (
      err == null &&
      !isObject(restoredSandbox.__request.data)
    ) {
      err = new Error('Script invalid assignment: req.data must be an object, make sure you are not changing its value in the script to a non object value')
    }

    return {
      shouldRunAfterRender: topLevelFunctions.afterRender != null,
      // we only propagate well known properties from the req executed in scripts
      // we also create new object that avoids passing a proxy object to rest of the
      // execution flow when script is running in in-process strategy
      req: {
        template: { ...restoredSandbox.__request.template },
        data: err == null ? { ...restoredSandbox.__request.data } : undefined,
        options: { ...restoredSandbox.__request.options },
        context: {
          ...restoredSandbox.__request.context
        }
      },
      res: serializeResponse.call(restoredSandbox.__response),
      error: err
        ? {
            message: err.message,
            stack: err.stack
          }
        : undefined
    }
  }

  try {
    return await reporter.runInSandbox({
      manager: sandboxManager,
      context: initialContext,
      userCode: script.content,
      executionFn,
      currentPath: entityPath,
      propertiesConfig: Object.keys(requestContextMetaConfig).reduce((acu, prop) => {
        // configure properties inside the context of sandbox
        acu[`__request.context.${prop}`] = requestContextMetaConfig[prop]
        return acu
      }, { '__request.context': { sandboxReadOnly: true } })
    }, req)
  } catch (e) {
    const nestedErrorWithEntity = e.entity != null

    const scriptPath = script._id ? await reporter.folders.resolveEntityPath(script, 'scripts', req) : 'anonymous'

    e.message = `Error when evaluating custom script ${scriptPath}\n` + e.message

    if (!nestedErrorWithEntity) {
      if (script.shortid) {
        e.entity = {
          shortid: script.shortid,
          name: script.name,
          content: script.content
        }
        e.property = 'content'
      }
    }

    throw e
  }
}

function isObject (input) {
  return Object.prototype.toString.call(input) === '[object Object]'
}
