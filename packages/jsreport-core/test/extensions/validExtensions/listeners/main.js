
module.exports = (reporter, definition) => {
  reporter.tests = reporter.tests || {}
  reporter.tests.beforeRenderListeners = reporter.createListenerCollection()
  reporter.tests.afterRenderListeners = reporter.createListenerCollection()
  reporter.tests.validateRenderListeners = reporter.createListenerCollection()
  reporter.tests.afterTemplatingEnginesExecutedListeners = reporter.createListenerCollection()

  reporter.registerMainAction('test-beforeRender-listeners', async (data, req) => {
    data.req = reporter.Request(data.req)
    await reporter.tests.beforeRenderListeners.fire(data.req, data.res)
    return { req: data.req, res: data.res }
  })
  reporter.registerMainAction('test-afterRender-listeners', async (data, req) => {
    data.req = reporter.Request(data.req)
    await reporter.tests.afterRenderListeners.fire(data.req, data.res)
    return { req: data.req, res: data.res }
  })
  reporter.registerMainAction('test-validateRender-listeners', async (data, req) => {
    data.req = reporter.Request(data.req)
    await reporter.tests.validateRenderListeners.fire(data.req, data.res)
    return { req: data.req, res: data.res }
  })
  reporter.registerMainAction('test-afterTemplatingEnginesExecuted-listeners', async (data, req) => {
    data.req = reporter.Request(data.req)
    await reporter.tests.afterTemplatingEnginesExecutedListeners.fire(data.req, data.res)
    return { req: data.req, res: data.res }
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
}
