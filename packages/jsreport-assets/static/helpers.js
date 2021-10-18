/* eslint-disable no-unused-vars */
async function asset (path, encoding) {
  encoding = typeof encoding === 'string' ? encoding : 'utf8'

  const jsreport = require('jsreport-proxy')
  const assetVal = await jsreport.assets.read(path, encoding)
  return assetVal
}

await require('jsreport-proxy').assets.evaluateShared()
