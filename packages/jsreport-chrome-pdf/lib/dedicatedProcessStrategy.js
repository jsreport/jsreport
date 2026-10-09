const conversion = require('./conversion')
const preparePageSource = require('./preparePageSource')
const { killBrowser } = require('./killBrowser')

module.exports = ({ reporter, puppeteer }) => {
  let openedBrowsers = []
  const execute = async ({ strategy, launchOptions, conversionOptions, req, imageExecution, allowLocalFilesAccess, onOutput, res }) => {
    let browser

    const pageSource = await preparePageSource(reporter, imageExecution, allowLocalFilesAccess, conversionOptions, res)

    try {
      const result = await conversion({
        reporter,
        getBrowser: async () => {
          browser = await puppeteer.launch(launchOptions)
          openedBrowsers.push(browser)
          return browser
        },
        pageSource,
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
          await killBrowser(browser, { gracefulMs: 5000 })
        } finally {
          openedBrowsers = openedBrowsers.filter(b => b !== browser)
        }
      }
    }
  }

  execute.kill = async () => {
    await Promise.all(openedBrowsers.map((browser) => killBrowser(browser).catch(() => {})))
  }

  return execute
}
