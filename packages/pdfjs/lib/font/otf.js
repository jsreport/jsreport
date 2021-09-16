'use strict'

const opentype = require('opentype.js')
const FontSubset = require('./subset')
const PDFName = require('../object/name')
const PDFObject = require('../object/object')
const PDFDictionary = require('../object/dictionary')
const PDFString = require('../object/string')
const PDFArray = require('../object/array')
const PDFStream = require('../object/stream')
const Base = require('./base')
const StringWidth = Base.StringWidth
const util = require('../util')

module.exports = class OTFFontFactory extends Base {
  constructor(b) {
    super()

    // convert to array buffer
    const ab = util.toArrayBuffer(b)
    this.font = opentype.parse(ab)
  }

  instance() {
    return new OTFFont(this.font, this)
  }
}

class OTFFont {
  constructor(font, parent) {
    this.font = font
    this.parent = parent

    this.subset = new FontSubset(this.font)
    this.subset.use(' ')
  }

  encode(str) {
    this.subset.use(str)
    return (new PDFString(this.subset.encode(str))).toHexString()
  }

  stringWidth(str, size) {
    const scale  = size / this.font.unitsPerEm
    const glyphs = this.font.stringToGlyphs(str)
    const kerning = []

    let width = 0
    for (let i = 0, len = glyphs.length; i < len; ++i) {
      const left  = glyphs[i]
      const right = glyphs[i + 1]

      width += left.advanceWidth
      if (right) {
        const offset = -this.font.getKerningValue(left, right);

        if (offset !== 0) {
          width += offset
          kerning.push({ pos: i + 1, offset: offset })
        }
      }
    }

    return new StringWidth(width * scale, kerning)
  }

  lineHeight(size, includeGap) {
    if (includeGap == null) {
      includeGap = false
    }

    const gap = includeGap ? this.font.tables.os2.sTypoLineGap : 0
    const ascent = this.font.tables.os2.sTypoAscender
    const descent = this.font.tables.os2.sTypoDescender

    return (ascent + gap - descent) * size / this.font.unitsPerEm
  }

  ascent(size) {
    return this.font.tables.os2.sTypoAscender * size / this.font.unitsPerEm
  }

  descent(size) {
    return this.font.tables.os2.sTypoDescender * size / this.font.unitsPerEm
  }

  underlinePosition(size) {
    return this.font.tables.post.underlinePosition * size / this.font.unitsPerEm
  }

  underlineThickness(size) {
    return this.font.tables.post.underlineThickness * size / this.font.unitsPerEm
  }

  async write(doc, fontObj) {
    const head = this.font.tables.head

    const scaleFactor = 1000.0 / this.font.unitsPerEm

    let flags = 0
    const familyClass = (this.font.tables.os2.sFamilyClass || 0) >> 8
    const isSerif = !!~[1, 2, 3, 4, 5, 6, 7].indexOf(familyClass)
    const isFixedPitch = this.font.tables.post.isFixedPitch
    const italicAngle = this.font.tables.post.italicAngle

    if (isFixedPitch)                  flags |= 1 << 0
    if (isSerif)                       flags |= 1 << 1
    if (familyClass === 10)            flags |= 1 << 3
    if (italicAngle !== 0)             flags |= 1 << 6
    /* assume not being symbolic */    flags |= 1 << 5

    // font descriptor
    const descriptor = new PDFObject('FontDescriptor')
    descriptor.prop('FontName', this.subset.name)
    descriptor.prop('Flags', flags)
    descriptor.prop('FontBBox', new PDFArray([
      head.xMin * scaleFactor, head.yMin * scaleFactor,
      head.xMax * scaleFactor, head.yMax * scaleFactor
    ]))
    descriptor.prop('ItalicAngle', italicAngle)
    descriptor.prop('Ascent', this.font.tables.os2.sTypoAscender * scaleFactor)
    descriptor.prop('Descent', this.font.tables.os2.sTypoDescender * scaleFactor)
    descriptor.prop('CapHeight', this.font.tables.os2.sCapHeight * scaleFactor)
    descriptor.prop('XHeight', this.font.tables.os2.sxHeight * scaleFactor)
    descriptor.prop('StemV', 0)

    const descendant = new PDFObject('Font')
    descendant.prop('Subtype', 'CIDFontType0')
    descendant.prop('BaseFont', this.font.names.postScriptName.en)
    descendant.prop('DW', 1000)
    descendant.prop('CIDToGIDMap', 'Identity')
    descendant.prop('CIDSystemInfo', new PDFDictionary({
      'Ordering':   new PDFString('Identity'),
      'Registry':   new PDFString('Adobe'),
      'Supplement': 0
    }))
    descendant.prop('FontDescriptor', descriptor.toReference())

    fontObj.prop('Subtype', 'Type0')
    fontObj.prop('BaseFont', this.font.names.postScriptName.en)
    fontObj.prop('Encoding', 'Identity-H')
    fontObj.prop('DescendantFonts', new PDFArray([descendant.toReference()]))

    // widths array
    const metrics = [], codeMap = this.subset.cmap()
    for (const code in codeMap) {
      if (code < 32) {
        continue
      }

      const width = Math.round(this.subset.glyphs[code].advanceWidth * scaleFactor)
      metrics.push(code - 31)
      metrics.push(new PDFArray([width]))
    }

    descendant.prop('W', new PDFArray(metrics))

    // unicode map
    const cmap = new PDFStream()
    cmap.writeLine('/CIDInit /ProcSet findresource begin')
    cmap.writeLine('12 dict begin')
    cmap.writeLine('begincmap')
    cmap.writeLine('/CIDSystemInfo <<')
    cmap.writeLine('  /Registry (Adobe)')
    cmap.writeLine('  /Ordering (Identity)')
    cmap.writeLine('  /Supplement 0')
    cmap.writeLine('>> def')
    cmap.writeLine('/CMapName /Identity-H')
    cmap.writeLine('/CMapType 2 def')
    cmap.writeLine('1 begincodespacerange')
    cmap.writeLine('<0000><ffff>')
    cmap.writeLine('endcodespacerange')

    const mapping = this.subset.subset, lines = []
    for (const code in mapping) {
      if (code < 32) {
        continue
      }

      if (lines.length >= 100) {
        cmap.writeLine(lines.length + ' beginbfchar')
        for (let i = 0; i < lines.length; ++i) {
          cmap.writeLine(lines[i])
        }
        cmap.writeLine('endbfchar')
        lines.length = 0
      }

      lines.push(
        '<' + ('0000' + (+code - 31).toString(16)).slice(-4) + '>' + // cid
        '<' + ('0000' + mapping[code].toString(16)).slice(-4) + '>'  // gid
      )
    }

    if (lines.length) {
      cmap.writeLine(lines.length + ' beginbfchar')
      lines.forEach(function(line) {
        cmap.writeLine(line)
      })
      cmap.writeLine('endbfchar')
    }

    cmap.writeLine('endcmap')
    cmap.writeLine('CMapName currentdict /CMap defineresource pop')
    cmap.writeLine('end')
    cmap.writeLine('end')

    fontObj.prop('ToUnicode', cmap.toReference())

    // font file
    const data = this.subset.save()
    const hex = ab2hex(data)

    const file = new PDFStream()
    file.object.prop('Subtype', 'OpenType')
    file.object.prop('Length', hex.length + 1)
    file.object.prop('Length1', data.byteLength)
    file.object.prop('Filter', 'ASCIIHexDecode')
    file.content = hex + '>\n'

    descriptor.prop('FontFile3', file.toReference())

    await doc._writeObject(file)
    await doc._writeObject(descriptor)
    await doc._writeObject(descendant)
    await doc._writeObject(cmap)
    await doc._writeObject(fontObj)
  }
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function ab2hex(ab) {
  const view = new Uint8Array(ab)
  let hex = ''
  for (let i = 0, len = ab.byteLength; i < len; ++i) {
    hex += toHex(view[i])
  }
  return hex
}
