const PDFName = require('./name')
const PDFValue = require('./value')
const PDFString = require('./string')

class PDFDictionary {
  constructor (dictionary) {
    this.dictionary = {}
    if (dictionary) {
      for (const key in dictionary) {
        this.add(key, dictionary[key])
      }
    }
  }

  add (key, val) {
    if (typeof val === 'string') {
      val = new PDFName(val)
    }
    this.dictionary[new PDFName(key)] = val
  }

  set (key, val) {
    this.add(key, val)
  }

  has (key) {
    return String(new PDFName(key)) in this.dictionary
  }

  get (key) {
    return this.dictionary[new PDFName(key)]
  }

  del (key) {
    delete this.dictionary[new PDFName(key)]
  }

  get length () {
    return Object.keys(this.dictionary).length
  }

  toString (encryptionFn) {
    let str = ''
    for (const key in this.dictionary) {
      // pofider change
      // the toString call with encryptionFn fails on Numbers so we just do it for PDFStrings
      let val = this.dictionary[key]
      if (val instanceof PDFString || val instanceof PDFDictionary) {
        val = val.toString(encryptionFn)
      }
      str += `${key} ${val === null ? 'null' : val}`.replace(/^/gm, '\t') + '\n'
    }
    return `<<\n${str}>>`
  }

  static parse (xref, lexer, trial) {
    // treat empty object as an empty dictionary
    if (lexer.getString(6) === 'endobj') {
      return new PDFDictionary()
    }

    if (lexer.getString(2) !== '<<') {
      if (trial) {
        return undefined
      }

      throw new Error('Invalid dictionary')
    }

    lexer.shift(2)
    lexer.skipWhitespace(null, true)

    const dictionary = new PDFDictionary()

    while (lexer.getString(2) !== '>>') {
      const key = PDFName.parse(xref, lexer)
      lexer.skipWhitespace(null, true)

      const value = PDFValue.parse(xref, lexer)
      dictionary.set(key, value)

      lexer.skipWhitespace(null, true)
    }

    lexer.shift(2)

    return dictionary
  }
}

module.exports = PDFDictionary
