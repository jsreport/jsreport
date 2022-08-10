const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')
const { compress, decompress } = require('./utils')

module.exports = async function (reporter, definition) {
  if (reporter.compilation) {
    const chromePath = path.dirname(puppeteer.executablePath())
    const localesPath = path.join(chromePath, 'locales')

    if (fs.existsSync(localesPath)) {
      fs.readdirSync(localesPath).forEach((f) => {
        fs.unlinkSync(path.join(localesPath, f))
      })
    }

    if (fs.existsSync(path.join(chromePath, 'interactive_ui_tests.exe'))) {
      fs.unlinkSync(path.join(chromePath, 'interactive_ui_tests.exe'))
    }

    const pathToChromeZip = path.join(reporter.options.tempDirectory, 'chrome.zip')

    let chromeDirectory

    if (process.platform === 'darwin') {
      chromeDirectory = path.join(path.dirname(puppeteer.executablePath()), '../../../')
    } else {
      chromeDirectory = path.dirname(puppeteer.executablePath())
    }

    await compress(chromeDirectory, pathToChromeZip)

    reporter.compilation.resourceInTemp('chrome.zip', pathToChromeZip)
  }

  if (reporter.execution) {
    const zipPath = reporter.execution.resourceTempPath('chrome.zip')

    reporter.options.chrome = reporter.options.chrome || {}
    reporter.options.chrome.launchOptions = reporter.options.chrome.launchOptions || {}

    const chromeExeName = process.platform === 'darwin'
      ? 'Chromium.app/Contents/MacOS/Chromium'
      : (process.platform === 'win32' ? 'chrome.exe' : 'chrome')

    reporter.options.chrome.launchOptions.executablePath = path.join(
      path.dirname(zipPath),
      'chrome',
      chromeExeName
    )

    if (fs.existsSync(reporter.options.chrome.launchOptions.executablePath)) {
      reporter.logger.debug('skip decompressing chrome in temp because it already exists')
      return
    }

    reporter.initializeListeners.add('chrome exe', async () => {
      reporter.logger.debug('chrome decompress started')
      await decompress(zipPath, reporter.options.chrome.launchOptions.executablePath)
      reporter.logger.debug('chrome decompress finished')
    })
  }
}
