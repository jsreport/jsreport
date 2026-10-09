const url = require('url')

module.exports = async function preparePageSource (reporter, imageExecution, allowLocalFilesAccess, conversionOptions, res, inline = false) {
  const pageSource = {}

  if (conversionOptions.url) {
    try {
      if (typeof conversionOptions.url !== 'string') {
        throw new Error('URL must be a string')
      }

      const targetUrl = new URL(conversionOptions.url)

      if (!allowLocalFilesAccess && targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
        throw new Error('Only HTTP and HTTPS URLs are allowed when trustUserCode is false')
      }
    } catch (e) {
      throw reporter.createError(`Invalid ${imageExecution ? 'chromeImage' : 'chrome'}.url: ${e.message}`, { weak: true, statusCode: 400 })
    }

    pageSource.type = 'external'
    pageSource.value = conversionOptions.url
  } else if (!inline) {
    const { pathToFile } = await res.output.writeToTempFile((uuid) => `${uuid}-${imageExecution ? 'chrome-image' : 'chrome-pdf'}.html`)
    pageSource.type = 'trustedFile'
    pageSource.value = url.pathToFileURL(pathToFile).href
  } else {
    pageSource.type = 'inline'
    pageSource.value = (await res.output.getBuffer()).toString()
  }

  return pageSource
}
