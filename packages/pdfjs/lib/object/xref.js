const PDFObject = require('./object')
const util = require('../util')

module.exports = class PDFXref {
  constructor () {
    this.objects = []
    this.trailer = null
  }

  add (id, data) {
    this.objects[id] = data
  }

  get (id) {
    return this.objects[id] && this.objects[id].obj
  }

  getOffset (id) {
    return (this.objects[id] && this.objects[id].offset) || null
  }

  toString () {
    let xref = 'xref\n'

    let range = { from: 0, refs: [0] }
    const ranges = [range]

    for (let i = 1; i < this.objects.length; ++i) {
      const obj = this.objects[i]
      if (!obj) {
        if (range) {
          range = null
        }
        continue
      }

      if (!range) {
        range = { from: i, refs: [] }
        ranges.push(range)
      }

      range.refs.push(obj.offset)
    }

    ranges.forEach(function (range) {
      xref += range.from + ' ' + range.refs.length + '\n'

      range.refs.forEach(function (ref, i) {
        if (range.from === 0 && i === 0) {
          xref += '0000000000 65535 f \n'
        } else {
          xref += '0000000000'.substr(ref.toString().length) + ref + ' 00000 n \n'
        }
      })
    })

    return xref
  }

  static parse (_, lexer, trial) {
    const xref = new PDFXref()

    if (lexer.getString(4) !== 'xref') {
      return this.parseXrefObject(_, lexer, trial)
    }

    lexer.readString(4) // skip xref
    lexer.skipEOL(1)

    let start
    while ((start = lexer.readNumber(true)) !== undefined) {
      lexer.skipSpace(1)
      const count = lexer.readNumber()
      lexer.skipSpace(null, true)
      lexer.skipEOL(1)

      for (let i = 0, len = 0 + count; i < len; ++i) {
        const offset = lexer.readNumber()
        lexer.skipSpace(1)
        lexer.readNumber() // generation
        lexer.skipSpace(1)
        const key = lexer.readString(1)
        lexer.skipSpace(null, true)
        lexer.skipEOL(1)

        const id = start + i
        if (id > 0 && key === 'n') {
          xref.add(id, {
            offset: offset
          })
        }
      }
    }

    return xref
  }

  // TODO: this implementation needs to be improved
  static parseXrefObject (_, lexer, trial) {
    const xref = new PDFXref()

    let obj

    try {
      obj = PDFObject.parse(xref, lexer, trial)
    } catch (_) {
      throw new Error('Invalid xref: xref expected but not found')
    }

    const kind = obj.properties.get('Type')
    if (!kind || kind.name !== 'XRef') {
      throw new Error('Invalid xref object at ' + lexer.pos)
    }

    const stream = util.inflate(obj)

    xref.trailer = obj.properties

    const index = obj.properties.get('Index')
    const start = index ? index[0] : 0
    const w = obj.properties.get('W')
    const typeSize = w[0] || 1
    const offsetSize = w[1] || 2
    const genSize = w[2] || 1
    const len = stream.length / (typeSize + offsetSize + genSize)
    let pos = 0
    for (let i = 0; i < len; ++i) {
      const type = readUint(stream, pos, typeSize)
      pos += typeSize
      const offset = readUint(stream, pos, offsetSize)
      pos += offsetSize
      switch (type) {
        case 0: // free
          pos += genSize
          continue // skip type 0 entries (free entries)
        case 1: // normal
          xref.add(start + i, {
            offset
          })
          pos += genSize
          break
        case 2: // compressed
          xref.add(start + i, {
            compressed: true,
            id: offset,
            ix: readUint(stream, pos, genSize)
          })
          pos += genSize
          break
        default:
          continue
      }
    }

    return xref
  }
}

function readUint (src, pos, size) {
  let val = 0
  for (let i = 0; i < size; ++i) {
  // for (let i = size - 1; i > 0; --i) {
    val += src[pos + size - i - 1] << (8 * i)
  }
  return val
}
