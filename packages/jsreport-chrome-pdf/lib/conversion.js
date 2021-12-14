const get = require('lodash.get')
const hasOwn = require('has-own-deep')

module.exports = async ({ reporter, getBrowser, htmlUrl, strategy, timeout, req, imageExecution, allowLocalFilesAccess, options }) => {
  const optionsToUse = Object.assign({}, options)
  optionsToUse.timeout = timeout

  if (optionsToUse.waitForNetworkIdle == null && optionsToUse.waitForNetworkIddle != null) {
    optionsToUse.waitForNetworkIdle = optionsToUse.waitForNetworkIddle
  }
  const browser = await getBrowser()

  function pageLog (level, message) {
    const maxLogEntrySize = 1000
    let newMsg = message

    if (newMsg.length > maxLogEntrySize) {
      newMsg = `${newMsg.substring(0, maxLogEntrySize)}...`
    }

    reporter.logger[level](newMsg, { timestamp: new Date().getTime(), ...req })
  }

  function trimUrl (url) {
    // this is special case, because phantom logs base64 images content completely into the output
    if (url.startsWith('data:image') && url.length > 100) {
      return `${url.substring(0, 100)}...`
    }

    return url
  }

  const conversionResult = await runWithTimeout(async (executionInfo, reject) => {
    const chromeVersion = await browser.version()

    if (executionInfo.error) {
      return
    }

    reporter.logger.debug(`Converting with chrome ${chromeVersion} using ${strategy} strategy`, req)

    const page = await browser.newPage()

    if (executionInfo.error) {
      return
    }

    await page.setRequestInterception(true)

    if (executionInfo.error) {
      return
    }

    page.on('pageerror', (err) => {
      pageLog('warn', `Page error: ${err.message}${err.stack ? ` , stack: ${err.stack}` : ''}`)
    })

    page.on('error', (err) => {
      err.workerCrashed = true

      if (!page.isClosed()) {
        page.close().catch(() => {})
      }

      reject(err)
    })

    page.on('console', (m) => {
      const text = m.text()

      if (text.includes('JSHandle@object')) {
        const args = m.args()

        const argPromises = args.map((argHandle) => {
          return argHandle.jsonValue()
        })

        Promise.all(argPromises).then((results) => {
          pageLog('debug', results.map((r) => {
            if (typeof r === 'object') {
              return JSON.stringify(r)
            }

            return r
          }).join(' '))
        }).catch(() => pageLog('debug', text))
      } else {
        pageLog('debug', text)
      }
    })

    page.on('request', (r) => {
      let detail = ''

      if (r.redirectChain().length > 0) {
        detail = ` (redirect from: ${trimUrl(r.redirectChain().slice(-1)[0].url())})`
      }

      pageLog('debug', `Page request: ${r.method()} (${r.resourceType()}) ${trimUrl(r.url())}${detail}`)

      const isRelativeToHtmlUrl = r.url().lastIndexOf(htmlUrl, 0) === 0

      if (
        !allowLocalFilesAccess &&
        !isRelativeToHtmlUrl &&
        // potentially dangerous request to local file
        r.url().lastIndexOf('file://', 0) === 0
      ) {
        r.abort('accessdenied')
        return
      }

      r.continue()
    })

    page.on('requestfinished', (r) => {
      let requestDesc = 'finished'
      let status = ''
      let detail = ''

      if (r.response() != null) {
        if (r.response().status() !== 0) {
          status = ` ${r.response().status()}`
        }

        if (!r.response().ok()) {
          requestDesc = 'failed'
        }
      }

      if (
        r.redirectChain().length > 0 &&
        r.redirectChain().slice(-1)[0].url() === r.url() &&
        r.response() &&
        r.response().headers() &&
        r.response().headers().location != null
      ) {
        detail = ` (redirect to: ${r.response().headers().location})`
      }

      const log = `Page request ${requestDesc}: ${r.method()} (${r.resourceType()})${status} ${trimUrl(r.url())}${detail}`

      if (requestDesc === 'failed') {
        pageLog('warn', log)
      } else {
        pageLog('debug', log)
      }
    })

    page.on('requestfailed', (r) => {
      pageLog('warn', `Page request failed: ${r.method()} (${r.resourceType()}) ${trimUrl(r.url())}, failure: ${r.failure().errorText}`)
    })

    if (optionsToUse.waitForNetworkIdle === true) {
      reporter.logger.debug('Chrome will wait for network iddle before printing', req)
    }

    // this is the same as sending timeout options to the page.goto
    // but additionally setting it more generally in the page
    page.setDefaultTimeout(timeout == null ? 0 : timeout)

    await page.exposeFunction('__getJsreportRequest__', (prop) => {
      const getRequestContextForBrowser = ({ id, rootId, currentFolderPath, http, originalInputDataIsEmpty, reportCounter, startTimestamp }) => ({
        id,
        rootId,
        currentFolderPath,
        http,
        originalInputDataIsEmpty,
        reportCounter,
        startTimestamp
      })

      const exposedReq = {
        context: getRequestContextForBrowser(req.context),
        template: req.template,
        data: req.data,
        options: req.options
      }

      if (prop == null) {
        return exposedReq
      }

      if (hasOwn(exposedReq, prop)) {
        return get(exposedReq, prop)
      }

      return null
    })

    // inject jsreport-proxy browser api
    await page.evaluateOnNewDocument(() => {
      window.jsreport = {
        getRequest: window.__getJsreportRequest__
      }
    })

    if (executionInfo.error) {
      return
    }

    await page.goto(
      htmlUrl,
      optionsToUse.waitForNetworkIdle === true
        ? { waitUntil: 'networkidle0' }
        : { }
    )

    if (executionInfo.error) {
      return
    }

    if (optionsToUse.waitForJS === true) {
      reporter.logger.debug('Chrome will wait for printing trigger', req)
      await page.waitForFunction('window.JSREPORT_READY_TO_START === true')
    }

    if (executionInfo.error) {
      return
    }

    let newChromeSettings

    if (imageExecution) {
      newChromeSettings = await page.evaluate(() => window.JSREPORT_CHROME_IMAGE_OPTIONS)
    } else {
      newChromeSettings = await page.evaluate(() => window.JSREPORT_CHROME_PDF_OPTIONS)
    }

    if (executionInfo.error) {
      return
    }

    if (newChromeSettings != null) {
      delete newChromeSettings.path
    }

    Object.assign(optionsToUse, newChromeSettings)

    if (
      optionsToUse.viewportWidth != null || optionsToUse.viewportHeight != null
    ) {
      const customViewport = {
        width: optionsToUse.viewportWidth != null ? optionsToUse.viewportWidth : 800,
        height: optionsToUse.viewportHeight != null ? optionsToUse.viewportHeight : 600
      }

      delete optionsToUse.viewportWidth
      delete optionsToUse.viewportHeight

      reporter.logger.debug(`Custom viewport for chrome page width=${customViewport.width}, height=${customViewport.height}`, req)
      await page.setViewport(customViewport)

      if (executionInfo.error) {
        return
      }
    }

    if (optionsToUse.mediaType) {
      if (optionsToUse.mediaType !== 'screen' && optionsToUse.mediaType !== 'print') {
        throw reporter.createError('chrome.mediaType must be equal to "screen" or "print"', { weak: true })
      }

      // emulateMedia has been renamed emulateMediaType in puppeteer 5.0.0 so we check existence of the method name accordingly
      if (page.emulateMedia != null) {
        await page.emulateMedia(optionsToUse.mediaType)
      } else {
        await page.emulateMediaType(optionsToUse.mediaType)
      }
    }

    if (executionInfo.error) {
      return
    }

    if (imageExecution) {
      if (optionsToUse.type == null) {
        optionsToUse.type = 'png'
      }

      if (optionsToUse.type !== 'png' && optionsToUse.type !== 'jpeg') {
        throw reporter.createError('chromeImage.type must be equal to "jpeg" or "png"', { weak: true })
      }

      if (optionsToUse.type === 'png') {
        delete optionsToUse.quality
      }

      if (optionsToUse.quality == null) {
        delete optionsToUse.quality
      }

      optionsToUse.clip = {}

      if (optionsToUse.clipX != null) {
        optionsToUse.clip.x = optionsToUse.clipX
      }

      if (optionsToUse.clipY != null) {
        optionsToUse.clip.y = optionsToUse.clipY
      }

      if (optionsToUse.clipWidth != null) {
        optionsToUse.clip.width = optionsToUse.clipWidth
      }

      if (optionsToUse.clipHeight != null) {
        optionsToUse.clip.height = optionsToUse.clipHeight
      }

      if (Object.keys(optionsToUse.clip).length === 0) {
        delete optionsToUse.clip
      } else if (
        optionsToUse.clip.x == null ||
        optionsToUse.clip.y == null ||
        optionsToUse.clip.width == null ||
        optionsToUse.clip.height == null
      ) {
        throw reporter.createError('All chromeImage clip properties needs to be specified when at least one of them is passed. Make sure to specify values for "chromeImage.clipX", "chromeImage.clipY", "chromeImage.clipWidth", "chromeImage.clipHeight"', { weak: true })
      }

      optionsToUse.encoding = 'binary'
    } else {
      optionsToUse.margin = {
        top: optionsToUse.marginTop,
        right: optionsToUse.marginRight,
        bottom: optionsToUse.marginBottom,
        left: optionsToUse.marginLeft
      }

      // if no specified then default to print the background
      if (optionsToUse.printBackground == null) {
        optionsToUse.printBackground = true
      }
    }

    // don't log header/footer template content
    reporter.logger.debug(`Running chrome with params ${
      JSON.stringify(Object.assign({}, optionsToUse, {
        headerTemplate: optionsToUse.headerTemplate ? '...' : undefined,
        footerTemplate: optionsToUse.footerTemplate ? '...' : undefined
      }))
    }`, req)

    if (optionsToUse.scale == null) {
      delete optionsToUse.scale
    }

    let result
    let resultType

    if (imageExecution) {
      resultType = optionsToUse.type
      result = await page.screenshot(optionsToUse)
    } else {
      resultType = 'pdf'
      result = await page.pdf(optionsToUse)
    }

    if (executionInfo.error) {
      return
    }

    return {
      page,
      type: resultType,
      content: result
    }
  }, timeout, `${imageExecution ? 'chrome image' : 'chrome pdf'} generation not completed after ${timeout}ms`)

  return conversionResult
}

function runWithTimeout (fn, ms, msg) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    let resolved = false

    const info = {
      // information to pass to fn to ensure it can cancel
      // things if it needs to
      error: null
    }

    let timer

    if (ms != null) {
      timer = setTimeout(() => {
        const err = new Error(`Timeout Error: ${msg}`)
        err.workerTimeout = true
        info.error = err
        resolved = true
        reject(err)
      }, ms)
    }

    try {
      const result = await fn(info, (err) => {
        if (resolved) {
          return
        }

        resolved = true
        clearTimeout(timer)
        info.error = err
        reject(err)
      })

      if (resolved) {
        return
      }

      resolve(result)
    } catch (e) {
      if (resolved) {
        return
      }

      reject(e)
    } finally {
      clearTimeout(timer)
    }
  })
}
