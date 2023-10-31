const { decode } = require('html-entities')

module.exports = function decodeXML (str) {
  return decode(str, { level: 'xml' })
}
