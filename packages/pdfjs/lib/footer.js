'use strict'

const PDF = require('./object')
const Header = require('./header')

module.exports = class Footer extends Header {
  constructor(doc, parent) {
    super(doc, parent)
  }

  /// private API

  _createObject() {
    const xobj = Header.prototype._createObject.call(this)
    // since the footer has to be moved to the bottom of the page a Matrix property is added here
    xobj.prop('Matrix', this._matrix.toReference())
    return xobj
  }

  async _pageBreak(level) {
    throw new Error('Footer is to long (tried to execute a page break inside the footer)')
  }

  async _start() {
    this._matrix = new PDF.Object()
    this._doc._registerObject(this._matrix)

    await Header.prototype._start.call(this)
  }

  async _end() {
    // keep track of the innerHeight to calculate the offset (to move the footer to the bottom
    // of the page) below
    const innerHeight = this._doc._cursor.startY - this._doc._cursor.bottom

    await Header.prototype._end.call(this)

    // calculate the offset and set the Matrix accordingly
    const offset = innerHeight - this.height
    this._matrix.content = new PDF.Array([1, 0, 0, 1, 0, -offset])
    await this._doc._writeObject(this._matrix)

    // also move the page numbers by the offset (otherwise they would be rendered on top of the
    // page)
    for (const instance of this._pageNumbers) {
      instance.y -= offset
    }
  }
}
