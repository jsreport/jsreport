const should = require('should')
const EventEmitter = require('events')
const { killBrowser } = require('../lib/killBrowser')
const proxy = require('../lib/proxy')

const FAKE_PID = 2147483647

function fakeBrowser ({ closeHangs = false, exitsOnKill = true } = {}) {
  const proc = new EventEmitter()
  proc.pid = FAKE_PID
  proc.exitCode = null
  proc.signalCode = null
  proc.signals = []
  proc.kill = (signal) => {
    proc.signals.push(signal)

    if (exitsOnKill) {
      proc.signalCode = signal
      setImmediate(() => proc.emit('exit', null, signal))
    }

    return true
  }

  const exited = () => proc.exitCode != null || proc.signalCode != null

  const browser = {
    proc,
    closeCalls: 0,
    disconnected: false,
    process: () => proc,
    close: () => {
      browser.closeCalls++

      if (closeHangs && !exited()) {
        return new Promise(() => {})
      }

      if (!exited()) {
        proc.exitCode = 0
        setImmediate(() => proc.emit('exit', 0, null))
      }

      return Promise.resolve()
    },
    disconnect: () => {
      browser.disconnected = true
    },
    pages: async () => [],
    on: () => {}
  }

  return browser
}

const output = () => ({ type: 'pdf', content: Buffer.from('pdf'), page: { isClosed: () => true } })

describe('chrome close', () => {
  describe('killBrowser', () => {
    it('should kill the process at once by default', async () => {
      const browser = fakeBrowser({ closeHangs: true })

      await killBrowser(browser)

      browser.closeCalls.should.be.eql(0)
      browser.proc.signals.should.be.eql(['SIGKILL'])
      browser.disconnected.should.be.true()
    })

    it('should not signal a process that the graceful close ends', async () => {
      const browser = fakeBrowser()

      await killBrowser(browser, { gracefulMs: 1000 })

      browser.closeCalls.should.be.eql(1)
      browser.proc.signals.should.be.eql([])
      browser.disconnected.should.be.true()
    })

    it('should kill the process when the graceful close does not end it', async () => {
      const browser = fakeBrowser({ closeHangs: true })
      const start = Date.now()

      await killBrowser(browser, { gracefulMs: 50 })

      browser.proc.signals.should.be.eql(['SIGKILL'])
      browser.disconnected.should.be.true()
      should(Date.now() - start).be.below(1000)
    })

    it('should end in a bounded time when the process never exits', async () => {
      const browser = fakeBrowser({ closeHangs: true, exitsOnKill: false })
      const start = Date.now()

      await killBrowser(browser, { exitMs: 100 })

      browser.proc.signals.should.be.eql(['SIGKILL'])
      browser.disconnected.should.be.true()
      should(Date.now() - start).be.below(1000)
    })

    it('should work with a browser that has no process', async () => {
      const browser = fakeBrowser()
      browser.process = () => null

      await killBrowser(browser, { exitMs: 50 })

      browser.disconnected.should.be.true()
    })
  })

  describe('proxy', () => {
    it('should close when no server was started', async () => {
      await proxy.close()
      await proxy.close()
    })

    it('should close a started server and start again', async () => {
      await proxy.init()
      await proxy.close()
      await proxy.init()
      await proxy.close()
    })
  })

  describe('strategies', () => {
    const conversionPath = require.resolve('../lib/conversion')
    const poolPath = require.resolve('../lib/chromePoolStrategy')
    const dedicatedPath = require.resolve('../lib/dedicatedProcessStrategy')
    let chromePoolStrategy
    let dedicatedProcessStrategy
    let conversionImpl
    let browsers
    let launchImpl

    before(() => {
      delete require.cache[poolPath]
      delete require.cache[dedicatedPath]
      require.cache[conversionPath] = {
        id: conversionPath,
        filename: conversionPath,
        loaded: true,
        exports: (params) => conversionImpl(params)
      }
      chromePoolStrategy = require(poolPath)
      dedicatedProcessStrategy = require(dedicatedPath)
    })

    after(() => {
      delete require.cache[conversionPath]
      delete require.cache[poolPath]
      delete require.cache[dedicatedPath]
    })

    beforeEach(() => {
      browsers = []
      launchImpl = async () => {
        const browser = fakeBrowser({ closeHangs: true })
        browsers.push(browser)
        return browser
      }
      conversionImpl = async ({ getBrowser }) => {
        await getBrowser()
        return output()
      }
    })

    function createStrategy (strategy, options) {
      return strategy({
        reporter: { getReportTimeout: () => 1000 },
        puppeteer: { launch: (launchOptions) => launchImpl(launchOptions) },
        options: { killOnClose: true, ...options }
      })
    }

    function render (execute) {
      return execute({
        strategy: 'chrome-pool',
        launchOptions: {},
        conversionOptions: { url: 'http://localhost/report' },
        req: {},
        res: {}
      })
    }

    function renderInFlight (execute) {
      let end
      const inFlight = new Promise((resolve) => { end = resolve })

      conversionImpl = async ({ getBrowser }) => {
        await getBrowser()
        await inFlight
        return output()
      }

      const rendering = render(execute)

      return { rendering, end }
    }

    async function untilLaunched () {
      while (browsers.length === 0) {
        await new Promise((resolve) => setImmediate(resolve))
      }
    }

    function gracefulLaunch () {
      launchImpl = async () => {
        const browser = fakeBrowser()
        browsers.push(browser)
        return browser
      }
    }

    function timeoutOnFirstRender () {
      let calls = 0

      conversionImpl = async ({ getBrowser }) => {
        await getBrowser()

        if (calls++ === 0) {
          const err = new Error('chrome pdf generation timed out')
          err.workerTimeout = true
          throw err
        }

        return output()
      }
    }

    describe('chrome-pool', () => {
      it('should kill every pooled browser when the worker closes', async () => {
        const execute = createStrategy(chromePoolStrategy, { numberOfWorkers: 2 })

        await Promise.all([render(execute), render(execute)])
        browsers.should.have.length(2)

        const start = Date.now()

        await execute.kill()

        should(Date.now() - start).be.below(4000)

        for (const browser of browsers) {
          browser.closeCalls.should.be.eql(0)
          browser.proc.signals.should.be.eql(['SIGKILL'])
          browser.disconnected.should.be.true()
        }
      })

      it('should kill the browser of a render in flight when the worker closes', async () => {
        const execute = createStrategy(chromePoolStrategy, { numberOfWorkers: 1 })
        const { rendering, end } = renderInFlight(execute)

        await untilLaunched()
        await execute.kill()

        browsers[0].proc.signals.should.be.eql(['SIGKILL'])

        end()
        await rendering
      })

      it('should close pooled browsers gracefully without killOnClose', async () => {
        gracefulLaunch()

        const execute = createStrategy(chromePoolStrategy, { numberOfWorkers: 1, killOnClose: false })

        await render(execute)
        await execute.kill()

        browsers[0].closeCalls.should.be.eql(1)
        browsers[0].proc.signals.should.be.eql([])
      })

      it('should replace the browser of a timed out render and serve the next render', async () => {
        timeoutOnFirstRender()

        const execute = createStrategy(chromePoolStrategy, { numberOfWorkers: 1 })

        await render(execute).should.be.rejectedWith(/timed out/)

        const result = await render(execute)

        result.type.should.be.eql('pdf')
        browsers.should.have.length(2)
        browsers[0].proc.signals.should.be.eql(['SIGKILL'])
      })

      it('should not launch a browser while the worker closes', async () => {
        timeoutOnFirstRender()

        const execute = createStrategy(chromePoolStrategy, { numberOfWorkers: 1 })

        await render(execute).should.be.rejectedWith(/timed out/)

        await execute.kill()

        browsers.should.have.length(1)
        browsers[0].proc.signals.should.be.eql(['SIGKILL'])
      })

      it('should replace the browser of a timed out render without killOnClose', async () => {
        gracefulLaunch()
        timeoutOnFirstRender()

        const execute = createStrategy(chromePoolStrategy, { numberOfWorkers: 1, killOnClose: false })

        await render(execute).should.be.rejectedWith(/timed out/)

        const result = await render(execute)

        result.type.should.be.eql('pdf')
        browsers.should.have.length(2)
        browsers[0].closeCalls.should.be.eql(1)
        browsers[0].proc.signals.should.be.eql([])
      })

      it('should not keep a slot busy when the browser launch fails', async () => {
        let calls = 0
        const workingLaunch = launchImpl

        launchImpl = (launchOptions) => {
          if (calls++ === 0) {
            return Promise.reject(new Error('launch failed'))
          }

          return workingLaunch(launchOptions)
        }

        const execute = createStrategy(chromePoolStrategy, { numberOfWorkers: 1 })

        await render(execute).should.be.rejectedWith(/launch failed/)

        const result = await render(execute)

        result.type.should.be.eql('pdf')
      })
    })

    describe('dedicated-process', () => {
      it('should kill the browser of a render in flight when the worker closes', async () => {
        const execute = createStrategy(dedicatedProcessStrategy, {})
        const { rendering, end } = renderInFlight(execute)

        await untilLaunched()
        await execute.kill()

        browsers[0].proc.signals.should.be.eql(['SIGKILL'])

        end()
        await rendering
      })

      it('should close the browser of a render in flight gracefully without killOnClose', async () => {
        gracefulLaunch()

        const execute = createStrategy(dedicatedProcessStrategy, { killOnClose: false })
        const { rendering, end } = renderInFlight(execute)

        await untilLaunched()
        await execute.kill()

        browsers[0].closeCalls.should.be.eql(1)
        browsers[0].proc.signals.should.be.eql([])

        end()
        await rendering
      })
    })
  })
})
