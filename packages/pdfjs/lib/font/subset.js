'use strict'

const opentype = require('opentype.js')

module.exports = class FontSubset {
  constructor(font) {
    this.font = font
    this.name = 'PDFJS+' + this.font.names.fontFamily.en

    this.glyphs = {
      '0':  this.font.charToGlyph(String.fromCharCode(0)), // notDef glyph
      '32': this.font.charToGlyph(String.fromCharCode(32)), // space
    }
    this.subset  = { '0': 0, '32': 32 }
    this.mapping = { '0': 0, '32': 32 }
    this.pos     = 33
  }

  use(chars) {
    for (let i = 0, len = chars.length; i < len; ++i) {
      const code = chars.charCodeAt(i)
      if (code in this.mapping || code < 33) {
        continue
      }

      const glyph = this.font.charToGlyph(chars[i])

      this.subset[this.pos] = code
      this.mapping[code]    = this.pos
      this.glyphs[this.pos] = glyph

      this.pos++
    }
  }

  encode(str) {
    const codes = []
    for (let i = 0, len = str.length; i < len; ++i) {
      codes.push(this.mapping[str.charCodeAt(i)])
    }
    return String.fromCharCode.apply(String, codes)
  }

  cmap() {
    return this.subset
  }

  save() {
    const glyphs = []
    for (const pos in this.glyphs) {
      glyphs.push(this.glyphs[pos])
    }
    const font = new opentype.Font({
      familyName: this.name,
      styleName:  this.font.names.fontSubfamily.en,
      unitsPerEm: this.font.unitsPerEm,
      ascender:   this.font.ascender,
      descender:  this.font.descender,
      glyphs:     glyphs
    })
    return font.toArrayBuffer()
  }
}
