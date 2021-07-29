/* eslint-disable no-unused-vars */
function asset (path, encoding) {
  encoding = typeof encoding === 'string' ? encoding : 'utf8'

  const jsreport = require('jsreport-proxy')
  return jsreport.assets.read(path, encoding)
}

await require('jsreport-proxy').assets.evaluateShared()
