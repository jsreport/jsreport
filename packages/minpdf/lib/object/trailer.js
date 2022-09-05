const PDFDictionary = require('./dictionary')

class PDFTrailer extends PDFDictionary {
  constructor (size, root, infoObject) {
    super()

    this.set('Size', size)
    this.set('Root', root && root.toReference())
    if (infoObject) {
      this.set('Info', infoObject.toReference())
    }
  }

  toString () {
    return 'trailer\n' + PDFDictionary.prototype.toString.call(this)
  }

  static parse (xref, lexer) {
    lexer.skipWhitespace(null, true)

    if (lexer.readString(7) !== 'trailer') {
      throw new Error('Invalid trailer: trailer expected but not found')
    }

    lexer.skipWhitespace(null, true)

    const dict = PDFDictionary.parse(xref, lexer)
    return dict
  }
}

module.exports = PDFTrailer
