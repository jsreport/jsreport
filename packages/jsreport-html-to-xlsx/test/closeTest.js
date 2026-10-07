const should = require('should')
const puppeteer = require('puppeteer')
const ChromeBrowsers = require('../lib/chromeBrowsers')
const EventEmitter = require('events')
const { killBrowser } = require('../lib/killBrowser')

describe('html-to-xlsx chrome close', () => {
  let browsers
  let manager

  beforeEach(() => {
    browsers = []
    manager = ChromeBrowsers({
      launch: async (options) => {
        const browser = await puppeteer.launch(options)
        browsers.push(browser)
        return browser
      }
    })
  })

  afterEach(async () => {
    await manager.kill()
    await Promise.all(browsers.map((browser) => browser.close()))
  })

  const launchOptions = { args: ['--no-sandbox'] }

  function assertExited (browser) {
    const proc = browser.process()
    should(proc.exitCode != null || proc.signalCode != null).be.true()
    browser.connected.should.be.false()
  }

  it('should close without starting a browser', async () => {
    await manager.kill()
    await manager.kill()
  })

  it('should kill all browsers while an evaluation is in flight', async () => {
    const launched = await Promise.all([manager.launch(launchOptions), manager.launch(launchOptions)])
    const page = await launched[0].newPage()
    const evaluation = page.evaluate(() => new Promise(() => {})).should.be.rejected()

    await manager.kill()

    launched.forEach(assertExited)
    await evaluation
  })

  it('should allow normal graceful cleanup', async () => {
    const browser = await manager.launch(launchOptions)
    await browser.close()
    await manager.kill()

    assertExited(browser)
    should(browser.process().signalCode).be.null()
  })

  it('should reject new launches once closing begins', async () => {
    await manager.kill()
    await manager.launch(launchOptions).should.be.rejectedWith('html-to-xlsx worker is closing')
    browsers.should.have.length(0)
  })

  it('should kill a browser whose launch completes during shutdown', async () => {
    let finishLaunch
    let startedLaunch
    const started = new Promise((resolve) => { startedLaunch = resolve })
    const ready = new Promise((resolve) => { finishLaunch = resolve })
    manager = ChromeBrowsers({
      launch: async () => {
        const browser = await puppeteer.launch(launchOptions)
        browsers.push(browser)
        startedLaunch()
        await ready
        return browser
      }
    })

    const launching = manager.launch(launchOptions).should.be.rejectedWith('html-to-xlsx worker is closing')
    await started
    const closing = manager.kill()
    finishLaunch()
    await Promise.all([launching, closing])

    assertExited(browsers[0])
  })

  it('should recover after a failed launch', async () => {
    let calls = 0
    manager = ChromeBrowsers({
      launch: async (options) => {
        if (calls++ === 0) throw new Error('launch failed')
        const browser = await puppeteer.launch(options)
        browsers.push(browser)
        return browser
      }
    })

    await manager.launch(launchOptions).should.be.rejectedWith('launch failed')
    const browser = await manager.launch(launchOptions)
    await manager.kill()
    assertExited(browser)
  })

  it('should finish shutdown with a pending launch and kill its late browser', async () => {
    let finishLaunch
    const ready = new Promise((resolve) => { finishLaunch = resolve })
    manager = ChromeBrowsers({ launch: () => ready }, { closeTimeout: 50 })
    const launching = manager.launch(launchOptions).should.be.rejectedWith('html-to-xlsx worker is closing')
    const closing = manager.kill()
    manager.kill().should.equal(closing)
    await closing
    await manager.launch(launchOptions).should.be.rejectedWith('html-to-xlsx worker is closing')

    const browser = await puppeteer.launch(launchOptions)
    browsers.push(browser)
    finishLaunch(browser)
    await launching
    assertExited(browser)
  })
})

describe('html-to-xlsx kill deadline', () => {
  it('should stop waiting when a signalled process never exits', async () => {
    const proc = new EventEmitter()
    proc.pid = 2147483647
    proc.exitCode = null
    proc.signalCode = null
    const signals = []
    proc.kill = (signal) => signals.push(signal)
    let disconnected = false

    await killBrowser({
      process: () => proc,
      disconnect: () => { disconnected = true }
    }, { exitMs: 50 })

    signals.should.eql(['SIGKILL'])
    disconnected.should.be.true()
  })
})
