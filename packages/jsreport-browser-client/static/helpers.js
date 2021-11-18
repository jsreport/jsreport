/* eslint-disable */
function browserClientLink() {
  const jsreport = require('jsreport-proxy')
  if (!jsreport.req.context.http || !jsreport.req.context.http.baseUrl) {
    throw new Error('browserClientLink requires context.http.baseUrl to be set')
  }
  return jsreport.req.context.http.baseUrl + '/extension/browser-client/public/js/jsreport.umd.js'
}
