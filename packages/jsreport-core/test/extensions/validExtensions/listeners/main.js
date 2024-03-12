
module.exports = (reporter, definition) => {
  reporter.tests = reporter.tests || {}
  reporter.tests.beforeRenderListeners = reporter.createListenerCollection()
  reporter.tests.afterRenderListeners = reporter.createListenerCollection()
  reporter.tests.validateRenderListeners = reporter.createListenerCollection()
  reporter.tests.afterTemplatingEnginesExecutedListeners = reporter.createListenerCollection()

  reporter.registerMainAction('test-beforeRender-listeners', async (data, req) => {
    data.req = reporter.Request(data.req)
    const localRes = reporter.Response(data.req.context.id)
    await localRes.parse(data.res)
    await reporter.tests.beforeRenderListeners.fire(data.req, localRes)
    return { req: data.req, res: localRes.serialize() }
  })
  reporter.registerMainAction('test-afterRender-listeners', async (data, req) => {
    data.req = reporter.Request(data.req)
    const localRes = reporter.Response(data.req.context.id)
    await localRes.parse(data.res)
    await reporter.tests.afterRenderListeners.fire(data.req, localRes)
    return { req: data.req, res: localRes.serialize() }
  })
  reporter.registerMainAction('test-validateRender-listeners', async (data, req) => {
    data.req = reporter.Request(data.req)
    const localRes = reporter.Response(data.req.context.id)
    await localRes.parse(data.res)
    await reporter.tests.validateRenderListeners.fire(data.req, localRes)
    return { req: data.req, res: localRes.serialize() }
  })
  reporter.registerMainAction('test-afterTemplatingEnginesExecuted-listeners', async (data, req) => {
    data.req = reporter.Request(data.req)
    const localRes = reporter.Response(data.req.context.id)
    await localRes.parse(data.res)
    await reporter.tests.afterTemplatingEnginesExecutedListeners.fire(data.req, localRes)
    return { req: data.req, res: localRes.serialize() }
  })

  let beforeRenderEval
  reporter.tests.beforeRenderEval = (fn) => {
    beforeRenderEval = fn
  }
  reporter.registerMainAction('test-beforeRenderEval', async (data, req) => {
    if (beforeRenderEval == null) {
      return
    }
    return beforeRenderEval.toString()
  })

  let afterRenderEval
  reporter.tests.afterRenderEval = (fn) => {
    afterRenderEval = fn
  }
  reporter.registerMainAction('test-afterRenderEval', async (data, req) => {
    if (afterRenderEval == null) {
      return
    }
    return afterRenderEval.toString()
  })

  let afterTemplatingEnginesExecutedEval
  reporter.tests.afterTemplatingEnginesExecutedEval = (fn) => {
    afterTemplatingEnginesExecutedEval = fn
  }
  reporter.registerMainAction('test-afterTemplatingEnginesExecutedEval', async (data, req) => {
    if (afterTemplatingEnginesExecutedEval == null) {
      return
    }
    return afterTemplatingEnginesExecutedEval.toString()
  })
}
