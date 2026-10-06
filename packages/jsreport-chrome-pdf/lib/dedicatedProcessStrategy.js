const conversion = require('./conversion')
const url = require('url')
const { killBrowser } = require('./killBrowser')

module.exports = ({ reporter, puppeteer }) => {
  let openedBrowsers = []
  const execute = async ({ strategy, launchOptions, conversionOptions, req, imageExecution, allowLocalFilesAccess, onOutput, res }) => {
    let browser

    let htmlUrl
    let trustedHtmlFileUrl

    if (conversionOptions.url) {
      htmlUrl = conversionOptions.url
    } else {
      const { pathToFile } = await res.output.writeToTempFile((uuid) => `${uuid}-${imageExecution ? 'chrome-image' : 'chrome-pdf'}.html`)
      htmlUrl = url.pathToFileURL(pathToFile)
      trustedHtmlFileUrl = htmlUrl.href
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
        trustedHtmlFileUrl,
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
