const conversion = require('./conversion')

module.exports = ({ reporter, puppeteer, options }) => {
  let openedBrowsers = []
  let openedPages = []

  const execute = async ({ strategy, connectOptions, conversionOptions, req, imageExecution, allowLocalFilesAccess, onOutput, res }) => {
    let browser
    let page

    let htmlUrl
    let content
    if (conversionOptions.url) {
      htmlUrl = conversionOptions.url
    } else {
      content = (await res.output.getBuffer()).toString()
    }

    try {
      const result = await conversion({
        reporter,
        getBrowser: async () => {
          try {
            browser = await puppeteer.connect(connectOptions)
            openedBrowsers.push(browser)
            return browser
          } catch (e) {
            throw reporter.createError('Unable to connect to the browser ' + e.message, {
              statusCode: 500,
              originalError: e
            })
          }
        },
        htmlUrl,
        content,
        strategy,
        req,
        timeout: reporter.getReportTimeout(req),
        allowLocalFilesAccess,
        imageExecution,
        options: conversionOptions,
        useEvaluateInsteadOfEvaluateOnNewDocument: true
      })

      page = result.page
      openedPages.push(page)

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
          if (page && !page.isClosed()) {
            await page.close()
          }
          await browser.disconnect()
        } finally {
          openedPages = openedPages.filter(p => p !== page)
          openedBrowsers = openedBrowsers.filter(b => b !== browser)
        }
      }
    }
  }

  execute.kill = async () => {
    for (const page of openedPages) {
      try {
        await page.close()
      } catch (e) {
        // ignore error
      }
    }
    for (const browser of openedBrowsers) {
      try {
        await browser.disconnect()
      } catch (e) {
        // ignore error
      }
    }
  }

  return execute
}
