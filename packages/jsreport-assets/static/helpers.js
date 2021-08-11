/* eslint-disable no-unused-vars */
async function asset (path, encoding) {
  encoding = typeof encoding === 'string' ? encoding : 'utf8'

  const jsreport = require('jsreport-proxy')  
  const assetVal = await jsreport.assets.read(path, encoding)

  try {
    return jsreport.templatingEngines.evaluate(assetVal, this)  
  } catch (e) {
    e.message = `Error when evaluating templating engine for asset ${path}\n${e.message}`
    const assetSearchResult = await jsreport.folders.resolveEntityFromPath(path, 'assets')
    if (assetSearchResult && assetSearchResult.entity) {
      e.entity = {
        shortid: assetSearchResult.entity.shortid,
        name: assetSearchResult.entity.name,
        content: assetVal        
      }
      e.property = 'content'
    }  
    throw e  
  }
}

await require('jsreport-proxy').assets.evaluateShared()
