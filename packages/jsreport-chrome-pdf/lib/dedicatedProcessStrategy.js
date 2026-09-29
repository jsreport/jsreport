const conversion = require('./conversion')
const url = require('url')
const { killBrowser } = require('./killBrowser')

module.exports = ({ reporter, puppeteer, options }) => {
  const { killOnClose } = options
  let openedBrowsers = []
  const execute = async ({ strategy, launchOptions, conversionOptions, req, imageExecution, allowLocalFilesAccess, onOutput, res }) => {
    let browser

    let htmlUrl

    if (conversionOptions.url) {
      htmlUrl = conversionOptions.url
    } else {
      const { pathToFile } = await res.output.writeToTempFile((uuid) => `${uuid}-${imageExecution ? 'chrome-image' : 'chrome-pdf'}.html`)
      htmlUrl = url.pathToFileURL(pathToFile)
    }

    try {
      const result = await conversion({
        reporter,
        getBrowser: async () => {
          browser = await puppeteer.launch(launchOptions)
          openedBrowsers.push(browser)
          return browser
        },
        htmlUrl,
        strategy,
        req,
        timeout: reporter.getReportTimeout(req),
        allowLocalFilesAccess,
        imageExecution,
        options: conversionOptions
      })

      const output = {
        type: result.type,
        content: result.content
      }

      if (onOutput) {
        await onOutput(output)
        delete output.content
      }

      return output
    } finally {
      if (browser) {
        try {
          if (killOnClose) {
            await killBrowser(browser, { gracefulMs: 5000 })
          } else {
            const pages = await browser.pages()
            await Promise.all(pages.map(page => page.close()))
            await browser.close()
          }
        } finally {
          openedBrowsers = openedBrowsers.filter(b => b !== browser)
        }
      }
    }
  }

  execute.kill = async () => {
    if (killOnClose) {
      await Promise.all(openedBrowsers.map((browser) => killBrowser(browser).catch(() => {})))
      return
    }

    for (const browser of openedBrowsers) {
      try {
        const pages = await browser.pages()
        await Promise.all(pages.map(page => page.close()))
        await browser.close()
      } catch (e) {

      }
    }
  }

  return execute
}
