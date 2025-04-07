const conversion = require('./conversion')
const url = require('url')

module.exports = ({ reporter, puppeteer, options }) => {
  const pool = []
  const tasksQueue = []
  const { numberOfWorkers } = options

  if (numberOfWorkers < 1) {
    throw new Error('"numberOfWorkers" must be a number greater or equal than 1')
  }

  const execute = async ({ strategy, launchOptions, conversionOptions, req, imageExecution, allowLocalFilesAccess, onOutput, res }) => {
    let browserInfo
    let page
    let releaseBrowser
    let crashError = false
    let timeoutError = false

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
          const allocation = await allocateBrowser(
            puppeteer,
            pool,
            tasksQueue,
            {
              numberOfWorkers,
              launchOptions
            }
          )

          browserInfo = allocation.browserInfo
          releaseBrowser = allocation.releaseBrowser

          return browserInfo.instance
        },
        htmlUrl,
        strategy,
        req,
        timeout: reporter.getReportTimeout(req),
        allowLocalFilesAccess,
        imageExecution,
        options: conversionOptions
      })

      page = result.page

      const output = {
        type: result.type,
        content: result.content
      }

      if (onOutput) {
        await onOutput(output)
        delete output.content
      }

      return output
    } catch (err) {
      if (err.workerCrashed) {
        crashError = true
      } else if (err.workerTimeout) {
        timeoutError = true
      }

      throw err
    } finally {
      if (releaseBrowser) {
        releaseBrowser()
      }

      if ((crashError || timeoutError) && browserInfo) {
        recycleBrowser(puppeteer, browserInfo, launchOptions).catch(() => {})
      } else if (page && !page.isClosed()) {
        await page.close()
      }

      tryFlushTasksQueue(puppeteer, pool, tasksQueue)
    }
  }

  execute.kill = async () => {
    const op = []

    pool.forEach(async (browserInfo) => {
      if (browserInfo.recycling) {
        op.push(browserInfo.recycling.then(async () => {
          if (browserInfo.instance) {
            return browserInfo.instance.pages().then(pages => Promise.all(pages.map(page => page.close()))).then(() => browserInfo.instance.close())
          }
        }))
      } else if (browserInfo.instance) {
        op.push(browserInfo.instance.pages().then(pages => Promise.all(pages.map(page => page.close()))).then(() => browserInfo.instance.close()))
      }
    })

    return Promise.all(op)
  }

  return execute
}

async function createBrowser (puppeteer, browserInfo, launchOptions) {
  browserInfo.instance = await puppeteer.launch(launchOptions)

  browserInfo.instance.on('disconnected', () => {
    // clean references when the browser is no longer active (it has crashed or closed)
    browserInfo.instance = null
  })
}

async function allocateBrowser (puppeteer, pool, tasksQueue, options) {
  const { numberOfWorkers, launchOptions } = options
  let browserInfo

  if (pool.length < numberOfWorkers) {
    browserInfo = { instance: undefined, isBusy: true }
    pool.push(browserInfo)
    await createBrowser(puppeteer, browserInfo, launchOptions)
  } else {
    // simple round robin balancer across browsers,
    // get the first available browser from the list
    const availableBrowserIndex = pool.findIndex((b) => b.isBusy === false)

    if (availableBrowserIndex !== -1) {
      browserInfo = pool.splice(availableBrowserIndex, 1)[0]
      browserInfo.isBusy = true
      // ..and then if browser found then make it the last item in the list
      // to continue the rotation
      pool.push(browserInfo)

      // we check that instance exists, in theory there will be always an instance,
      // however there is small chance that an error while recycling a chrome instance happens
      // and we end with .instance being null, in which case we need to create it here
      if (browserInfo.instance == null) {
        await createBrowser(puppeteer, browserInfo, launchOptions)
      }
    } else {
      return new Promise((resolve, reject) => {
        tasksQueue.push({ resolve, reject, options })
      })
    }
  }

  return {
    browserInfo,
    releaseBrowser: () => {
      browserInfo.isBusy = false
    }
  }
}

async function recycleBrowser (puppeteer, browserInfo, launchOptions) {
  browserInfo.isBusy = true

  let resolveRecycling

  browserInfo.recycling = new Promise((resolve) => {
    resolveRecycling = resolve
  })

  if (browserInfo.instance) {
    try {
      const pages = await browserInfo.instance.pages()
      await Promise.all(pages.map(page => page.close()))
    } finally {
      await browserInfo.instance.close()
    }
  }

  // clean the property before trying to get new instance, this let us
  // create the instance later if for some reason the instance can not be
  // created during recycling
  browserInfo.instance = null

  try {
    await createBrowser(puppeteer, browserInfo, launchOptions)
  } finally {
    if (resolveRecycling) {
      resolveRecycling()
    }

    browserInfo.isBusy = false
  }
}

function tryFlushTasksQueue (puppeteer, pool, tasksQueue) {
  if (tasksQueue.length === 0) {
    return
  }

  const task = tasksQueue.shift()

  allocateBrowser(puppeteer, pool, tasksQueue, task.options).then(task.resolve).catch(task.reject)
}
