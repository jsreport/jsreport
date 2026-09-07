module.exports = {
  extendSchema: (...args) => require('./lib/extendSchema')(...args),
  response: (...args) => require('./lib/response')(...args),
  decompress: (...args) => require('./lib/decompress')(...args),
  saveXmlsToOfficeFile: (...args) => require('./lib/saveXmlsToOfficeFile')(...args),
  serializeOfficeXmls: (...args) => require('./lib/serializeOfficeXmls')(...args),
  createContentCollectionManager: (...args) => require('./lib/contentManager').createContentCollectionManager(...args),
  createElementsReplacer: (...args) => require('./lib/elementsReplacer')(...args)
}
