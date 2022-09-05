const { parseBuffer } = require('../lib/parser/parser')
const DocumentBase = require('./documentBase')

module.exports = class ExternalDocument extends DocumentBase {
  constructor (src) {
    super()
    this.catalog = parseBuffer(src).catalog
  }
}
