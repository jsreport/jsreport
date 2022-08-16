const { parseBuffer } = require('../lib/parser/parser')

module.exports = class ExternalDocument {
  constructor (src) {
    this.catalog = parseBuffer(src)
  }
}
