const extend = require('node.extend.without.arrays')
const vm = require('vm')
const path = require('path')
const process = require('process')

module.exports = (reporter, definition) => {
  reporter.initializeListeners.add('test-listeners', () => {
    reporter.beforeRenderListeners.add('listeners', async (req, res) => {
      const result = await reporter.executeMainAction('test-beforeRender-listeners', { req, res }, req)
      extend(true, req, result.req)
      extend(true, res, result.res)
    })

    reporter.afterRenderListeners.add('listeners', async (req, res) => {
      const result = await reporter.executeMainAction('test-afterRender-listeners', { req, res }, req)
      extend(true, req, result.req)
      extend(true, res, result.res)
    })

    reporter.validateRenderListeners.add('listeners', async (req, res) => {
      const result = await reporter.executeMainAction('test-validateRender-listeners', { req, res }, req)
      extend(true, req, result.req)
      extend(true, res, result.res)
    })

    reporter.afterTemplatingEnginesExecutedListeners.add('listeners', async (req, res) => {
      const result = await reporter.executeMainAction('test-afterTemplatingEnginesExecuted-listeners', { req, res }, req)
      extend(true, req, result.req)
      extend(true, res, result.res)
    })

    const evalInWorker = (code, req, res) => {
      const script = new vm.Script(`
          ;(function () {
            return ${code}
          })()
      `)

      return script.runInThisContext({
        displayErrors: true
      })(req, res, {
        require: (m) => {
          try {
            return require(path.join(process.cwd(), 'node_modules', m))
          } catch (e) {
            // hack, make it working in monorepo as well as normal extension
            return require(path.join(process.cwd(), '../../node_modules', m))
          }
        },
        reporter
      })
    }

    reporter.afterRenderListeners.add('eval-listeners', async (req, res) => {
      const code = await reporter.executeMainAction('test-afterRenderEval', {}, req)
      if (code) {
        return evalInWorker(code, req, res)
      }
    })

    reporter.beforeRenderListeners.insert(0, 'eval-listeners', async (req, res) => {
      const code = await reporter.executeMainAction('test-beforeRenderEval', {}, req)
      if (code) {
        return evalInWorker(code, req, res)
      }
    })
  })
}
