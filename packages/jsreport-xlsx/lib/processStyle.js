const { DOMParser } = require('@xmldom/xmldom')
const { getStyleInfo } = require('./utils')

module.exports.parseStyle = function parseStyle (xmlStr) {
  return new DOMParser().parseFromString(xmlStr)
}

module.exports.getStyleInfo = getStyleInfo
