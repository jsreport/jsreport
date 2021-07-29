/* eslint-disable no-unused-vars */
async function localize (key, folder) {
  const jsreport = require('jsreport-proxy')

  if (typeof folder === 'object') {
    // handlebars passes object as last param
    folder = null
  }
  return jsreport.localization.localize(key, folder)
}
