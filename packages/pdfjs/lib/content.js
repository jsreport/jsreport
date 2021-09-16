'use strict'

const PDF = require('./object')

module.exports = class ContentChunk {
  constructor(doc, obj) {
    this._doc = doc
    this._fonts = {}
    this._xobjects = {}

    this._object = obj || new PDF.Object()
    this._length = new PDF.Object()

    doc._registerObject(this._object)
    doc._registerObject(this._length)

    this._object.prop('Length', this._length.toReference())
  }
}