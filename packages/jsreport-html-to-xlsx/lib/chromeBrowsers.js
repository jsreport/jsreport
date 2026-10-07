const { killBrowser } = require('./killBrowser')

module.exports = (puppeteer, { closeTimeout = 4000 } = {}) => {
  const browsers = new Set()
  const launches = new Set()
  let closing = false
  let closingPromise

  return {
    async launch (options) {
      if (closing) {
        throw new Error('html-to-xlsx worker is closing')
      }

      const launching = (async () => {
        const browser = await puppeteer.launch(options)
        browsers.add(browser)
        browser.process().once('exit', () => browsers.delete(browser))

        if (closing) {
          await killBrowser(browser)
          throw new Error('html-to-xlsx worker is closing')
        }

        return browser
      })()

      launches.add(launching)
      try {
        return await launching
      } finally {
        launches.delete(launching)
      }
    },

    kill () {
      if (!closingPromise) {
        closing = true
        closingPromise = Promise.race([
          Promise.allSettled([
            ...Array.from(browsers, (browser) => killBrowser(browser)),
            ...launches
          ]),
          new Promise((resolve) => setTimeout(resolve, closeTimeout).unref())
        ])
      }

      return closingPromise
    }
  }
}
