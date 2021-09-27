/* eslint-disable no-unused-vars */
async function npmModule (moduleName) {
  const jsreport = require('jsreport-proxy')
  return jsreport.npm.module(moduleName)
}
