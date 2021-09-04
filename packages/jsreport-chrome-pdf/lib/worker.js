const LazyRecipe = require('./lazyRecipe')
module.exports = function (reporter, definition) {
  const lazyRecipe = LazyRecipe(reporter, definition)

  reporter.extensionsManager.recipes.push({
    name: 'chrome-pdf',
    execute: (req, res) => lazyRecipe.executePdf(req, res)
  })

  reporter.extensionsManager.recipes.push({
    name: 'chrome-image',
    execute: (req, res) => lazyRecipe.executeImage(req, res)
  })

  reporter.closeListeners.add('chrome', () => lazyRecipe.kill())
}
