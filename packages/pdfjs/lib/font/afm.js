'use strict'

const PDFName = require('../object/name')
const PDFObject = require('../object/object')
const PDFString = require('../object/string')
const PDFArray = require('../object/array')
const Base = require('./base')
const StringWidth = Base.StringWidth

module.exports = class AFMFont extends Base {
  constructor(data) {
    super()

    this._data = data
    this.lineGap = (this._data.fontBBox[3] - this._data.fontBBox[1]) - (this._data.ascender - this._data.descender)
    this.parent = this
  }

  instance() {
    return this
  }

  encode(str) {
    let encoded = ''
    for (let i = 0, len = str.length; i < len; ++i) {
      switch (str[i]) {
      case '\\':
        encoded += '\\\\'
        break
      case '(':
        encoded += '\\('
        break
      case ')':
        encoded += '\\)'
        break
      default:
        encoded += String.fromCharCode(this._charCodeFor(str[i]))
      }
    }

    return '(' + encoded + ')'
  }

  _charCodeFor(c) {
    return c in UNICODE_TO_WIN1252
      ? UNICODE_TO_WIN1252[c]
      : c.charCodeAt(0)
  }

  stringWidth(str, size) {
    const scale = size / 1000
    let width = 0
    const kerning = []
    for (let i = 0, len = str.length; i < len; ++i) {
      const left = this._charCodeFor(str[i])

      const advanceWidth = this._data.widths[left]
      if (advanceWidth) {
        width += advanceWidth
      }

      if (str[i + 1] !== undefined && left in this._data.kerning) {
        const right = this._charCodeFor(str[i + 1])
        const offset = this._data.kerning[left][right]
        if (offset !== undefined) {
          width += offset
          kerning.push({ pos: i + 1, offset: -offset })
        }
      }
    }

    return new StringWidth(width * scale, kerning)
  }

  lineHeight(size, includeGap) {
    if (includeGap == null) {
      includeGap = false
    }

    const gap = includeGap ? (this.lineGap) : 0

    return (this._data.ascender - this._data.descender) * size / 1000
  }

  ascent(size) {
    return this._data.ascender * size / 1000
  }

  descent(size) {
    return this._data.descender * size / 1000
  }

  underlinePosition(size) {
    return this._data.underlinePosition * size / 1000
  }

  underlineThickness(size) {
    return this._data.underlineThickness * size / 1000
  }

  async write(doc, fontObj) {
    fontObj.prop('Subtype', 'Type1')
    fontObj.prop('BaseFont', this._data.fontName)
    fontObj.prop('Encoding', 'WinAnsiEncoding')

    await doc._writeObject(fontObj)
  }
}

// only the once different from ISO-8859-1 are relevant, see
// https://en.wikipedia.org/wiki/Windows-1252
const UNICODE_TO_WIN1252 = {
  '\u20ac': 128,
  '\u201a': 130,
  '\u0192': 131,
  '\u201e': 132,
  '\u2026': 133,
  '\u2020': 134,
  '\u2021': 135,
  '\u02c6': 136,
  '\u2030': 137,
  '\u0160': 138,
  '\u2039': 139,
  '\u0152': 140,
  '\u017d': 142,
  '\u2018': 145,
  '\u2019': 146,
  '\u201c': 147,
  '\u201d': 148,
  '\u2022': 149,
  '\u2013': 150,
  '\u2014': 151,
  '\u02dc': 152,
  '\u2122': 153,
  '\u0161': 154,
  '\u203a': 155,
  '\u0153': 156,
  '\u017e': 158,
  '\u0178': 159
}