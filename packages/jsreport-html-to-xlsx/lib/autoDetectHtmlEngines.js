
// there is some code duplication, but that is intentional
// the duplication is required because the bundling which runs during jsreport.exe compilation
// doesn't like dynamic requires
module.exports = () => {
  const htmlEngines = {
  }
  const notFoundModules = []

  try {
    htmlEngines.chrome = require('puppeteer')
  } catch (e) {
    // don't use code MODULE_NOT_FOUND because compiled exe throws different
    notFoundModules.push('puppeteer')
  }

  try {
    htmlEngines.cheerio = require('cheerio-page-eval')
  } catch (e) {
    notFoundModules.push('cheerio-page-eval')
  }

  try {
    htmlEngines.phantom = require('phantomjs-prebuilt')
  } catch (e) {
    notFoundModules.push('phantomjs-prebuilt')
  }

  if (htmlEngines.phantom) {
    return {
      htmlEngines,
      notFoundModules
    }
  }

  try {
    htmlEngines.phantom = require('phantomjs')
  } catch (e) {
    notFoundModules.push('phantomjs')
  }

  return {
    htmlEngines,
    notFoundModules
  }
}
