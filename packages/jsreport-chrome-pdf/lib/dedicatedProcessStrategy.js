const conversion = require('./conversion')

module.exports = ({ reporter, puppeteer, options }) => {
  let openedBrowsers = []
  const execute = async ({ htmlUrl, strategy, launchOptions, conversionOptions, req, imageExecution, allowLocalFilesAccess, onOutput }) => {
    let browser

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
          const pages = await browser.pages()
          await Promise.all(pages.map(page => page.close()))
          await browser.close()
        } finally {
          openedBrowsers = openedBrowsers.filter(b => b !== browser)
        }
      }
    }
  }

  execute.kill = async () => {
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
