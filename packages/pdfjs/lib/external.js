const { parseBuffer } = require('../lib/parser/parser')
const DocumentBase = require('./documentBase')
const processText = require('./mixins/processText').external

module.exports = class ExternalDocument extends DocumentBase {
  constructor (src) {
    super()
    this.catalog = parseBuffer(src).catalog
    processText(this)
  }
}
