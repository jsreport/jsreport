const LazyRecipe = require('./lazyRecipe')
const proxy = require('./proxy')

module.exports = function (reporter, definition) {
  // warm up of deps to make it work in trustUserCode: false (SES),
  // this also allows to not require early when it is not needed. (trustUserCode: true)
  // usage of try catch was done to prevent the app to fail here, instead it will fail
  // at the same later time in which the dep is used
  if (reporter.options.trustUserCode === false) {
    try {
      require('puppeteer')
    } catch {}
  }

  const lazyRecipe = LazyRecipe(reporter, definition)

  reporter.extensionsManager.recipes.push({
    name: 'chrome-pdf',
    execute: (req, res) => lazyRecipe.executePdf(req, res)
  })

  reporter.extensionsManager.recipes.push({
    name: 'chrome-image',
    execute: (req, res) => lazyRecipe.executeImage(req, res)
  })

  reporter.chrome = { proxy }

  reporter.registerHelpersListeners.add(`${definition.name}-helpers`, () => {
    return `
    function chromeResourceWithTimeout (url, timeout) {
      return 'jsreport://chromeResourceWithTimeout?url=' + encodeURIComponent(url) + '&timeout=' + timeout
    }
    `
  })

  reporter.closeListeners.add('chrome', () => Promise.allSettled([lazyRecipe.kill(), proxy.close()]))
}
