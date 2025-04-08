/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Orchestration of the rendering process
 */
const extend = require('node.extend.without.arrays')
const ExecuteEngine = require('./executeEngine')
const Request = require('../../shared/request')
const Response = require('../../shared/response')
const resolveReferences = require('./resolveReferences.js')
const moduleHelper = require('./moduleHelper')

module.exports = (reporter) => {
  moduleHelper(reporter)

  const executeEngine = ExecuteEngine(reporter)
  async function beforeRender (reporter, request, response) {
    if (!request.template) {
      throw reporter.createError('template property must be defined', {
        statusCode: 400
      })
    }

    await reporter.beforeRenderListeners.fire(request, response)
    await reporter.validateRenderListeners.fire(request, response)
  }

  async function invokeRender (reporter, request, response) {
    if (!request.template.engine) {
      throw reporter.createError('Engine must be specified', {
        statusCode: 400
      })
    }

    const engine = reporter.extensionsManager.engines.find((e) => e.name === request.template.engine)

    if (!engine) {
      throw reporter.createError(`Engine '${request.template.engine}' not found. If this is a custom engine make sure it's properly installed from npm`, {
        statusCode: 400
      })
    }

    if (
      request.data != null &&
      typeof request.data === 'object' &&
      Array.isArray(request.data)
    ) {
      throw reporter.createError('Request data can not be an array. you should pass an object in request.data input', {
        statusCode: 400
      })
    }

    const engineProfilerEvent = reporter.profiler.emit({
      type: 'operationStart',
      subtype: 'engine',
      name: request.template.engine
    }, request, response)

    reporter.logger.debug(`Rendering engine ${engine.name}`, request)

    const engineRes = await executeEngine(engine, request)
    await response.output.update(Buffer.from(engineRes.content != null ? engineRes.content : ''))

    reporter.profiler.emit({
      type: 'operationEnd',
      operationId: engineProfilerEvent.operationId
    }, request, response)

    await reporter.afterTemplatingEnginesExecutedListeners.fire(request, response)

    if (!request.template.recipe) {
      throw reporter.createError('Recipe must be specified', {
        statusCode: 400
      })
    }

    const recipe = reporter.extensionsManager.recipes.find((r) => r.name === request.template.recipe)

    if (!recipe) {
      throw reporter.createError(`Recipe '${request.template.recipe}' not found. If this is a custom recipe make sure it's properly installed from npm.`, {
        statusCode: 400
      })
    }

    const recipeProfilerEvent = reporter.profiler.emit({
      type: 'operationStart',
      subtype: 'recipe',
      name: request.template.recipe
    }, request, response)

    reporter.logger.debug('Executing recipe ' + request.template.recipe, request)

    await recipe.execute(request, response)

    reporter.profiler.emit({
      type: 'operationEnd',
      operationId: recipeProfilerEvent.operationId
    }, request, response)
  }

  async function afterRender (reporter, request, response) {
    await reporter.afterRenderListeners.fire(request, response)
    return response
  }

  return async (req, parentReq) => {
    const request = Request(req, parentReq)

    if (request.context.id == null) {
      request.context.id = reporter.generateRequestId()
    }
    if (parentReq == null) {
      reporter.runningRequests.register(request)
    }

    const response = Response(reporter, request.context.id)

    let renderStartProfilerEvent

    try {
      renderStartProfilerEvent = await reporter.profiler.renderStart(request, parentReq, response)
      request.data = resolveReferences(request.data) || {}

      if (request.options.reportName) {
        response.meta.reportName = String(request.options.reportName)
      } else {
        response.meta.reportName = 'report'
      }

      if (parentReq == null) {
        reporter.requestModulesCache.set(request.context.rootId, Object.create(null))
      }

      reporter.logger.info(`Starting rendering${childMsgDecorate(request)} request${counterMsgDecorate(request)}${userMsgDecorate(request)}`, request)

      // TODO
      /* if (reporter.entityTypeValidator.getSchema('TemplateType') != null) {
      const templateValidationResult = reporter.entityTypeValidator.validate('TemplateType', request.template, { rootPrefix: 'template' })

      if (!templateValidationResult.valid) {
        throw reporter.createError(`template input in request contain values that does not match the defined schema. ${templateValidationResult.fullErrorMessage}`, {
          statusCode: 400
        })
      }
    } */

      await beforeRender(reporter, request, response)
      await invokeRender(reporter, request, response)
      await afterRender(reporter, request, response)

      reporter.logger.info(`Rendering${childMsgDecorate(request)} request${counterMsgDecorate(request)} finished in ${(new Date().getTime() - request.context.startTimestamp)} ms`, request)

      response.meta.logs = request.context.logs

      if (parentReq) {
        parentReq.context.logs = parentReq.context.logs.concat(request.context.logs)
        parentReq.context.shared = extend(true, parentReq.context.shared, request.context.shared)
      }

      await reporter.profiler.renderEnd(renderStartProfilerEvent.operationId, request, response)

      return response
    } catch (e) {
      await reporter.renderErrorListeners.fire(request, response, e)

      const logFn = e.weak ? reporter.logger.warn : reporter.logger.error

      const errorMessage = reporter.createError(`Error when processing${childMsgDecorate(request)} render request${counterMsgDecorate(request)}`, { original: e }).message

      logFn(`${errorMessage}${e.stack != null ? '\n' + e.stack : ''}`, request)

      logFn(`Rendering${childMsgDecorate(request)} request${counterMsgDecorate(request)} finished with error in ${(new Date().getTime() - request.context.startTimestamp)} ms`, request)

      if (
        parentReq &&
        parentReq.context &&
        parentReq.context.logs &&
        request.context &&
        request.context.logs
      ) {
        parentReq.context.logs = parentReq.context.logs.concat(request.context.logs)
      }

      if (parentReq) {
        parentReq.context.shared = extend(true, parentReq.context.shared, request.context.shared)
      }

      e.logged = true

      if (renderStartProfilerEvent) {
        await reporter.profiler.renderEnd(renderStartProfilerEvent.operationId, request, response, e)
      }

      throw e
    } finally {
      if (parentReq == null) {
        reporter.requestModulesCache.delete(request.context.rootId)
        reporter.runningRequests.unregister(request)
      }
    }
  }
}

function childMsgDecorate (req) {
  if (!req.context.isChildRequest) {
    return ''
  }

  return ' (child)'
}

function counterMsgDecorate (req) {
  if (req.context.isChildRequest) {
    return ''
  }

  return ` ${req.context.reportCounter}`
}

function userMsgDecorate (req) {
  if (!req.context.user) {
    return ''
  }

  return ` (user: ${req.context.user.name})`
}
