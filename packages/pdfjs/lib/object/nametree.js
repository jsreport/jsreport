'use strict'

const PDFName = require('./name')
const PDFString = require('./string')
const PDFDictionary = require('./dictionary')
const PDFArray = require('./array')

class PDFNameTree extends PDFDictionary {
  constructor(dictionary) {
    super(dictionary)
  }

  add(key, val) {
    if (typeof val === 'string') {
      val = new PDFName(val)
    }
    this.dictionary[key] = val
  }

  has(key) {
    return String(key) in this.dictionary
  }

  get(key) {
    return this.dictionary[key]
  }

  del(key) {
    delete this.dictionary[key]
  }

  toString() {
    const sortedKeys = Object.keys(this.dictionary)
    sortedKeys.sort((lhs, rhs) => lhs.localeCompare(rhs))

    const names = []
    for (const key of sortedKeys) {
      names.push(new PDFString(key), this.dictionary[key])
    }

    const dict = new PDFDictionary()
    dict.set("Names", new PDFArray(names))
    dict.set("Limits", new PDFArray([
      new PDFString(sortedKeys[0]),
      new PDFString(sortedKeys[sortedKeys.length - 1]),
    ]))
    return dict.toString()
  }
}

module.exports = PDFNameTree
