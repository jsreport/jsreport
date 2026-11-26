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

    // /Index is an array of pairs [first1 count1 first2 count2 ...], one pair per sub-section,
    // the object numbers between sub-sections may have gaps (ISO 32000-1 7.5.8.2)
    const ids = getXrefStreamIds(obj.properties.get('Index') || [0, obj.properties.get('Size')])
    // a zero in /W means the field is not present in the stream and its default value is used,
    // the type field defaults to 1 and the generation number of type 1 entries defaults to 0 (ISO 32000-1 7.5.8.2, Table 17 and 18)
    const w = obj.properties.get('W')
    const typeSize = w[0]
    const offsetSize = w[1]
    const genSize = w[2]
    const len = stream.length / (typeSize + offsetSize + genSize)
    let pos = 0
    for (let i = 0; i < len; ++i) {
      const type = typeSize > 0 ? readUint(stream, pos, typeSize) : 1
      pos += typeSize
      const offset = readUint(stream, pos, offsetSize)
      pos += offsetSize
      const field3 = readUint(stream, pos, genSize)
      pos += genSize
      switch (type) {
        case 1: // normal
          xref.add(getXrefStreamId(ids, i), {
            offset
          })
          break
        case 2: // compressed
          xref.add(getXrefStreamId(ids, i), {
            compressed: true,
            id: offset,
            ix: field3
          })
          break
        default:
          // type 0 entries are free objects, any other type shall be interpreted
          // as a reference to the null object (ISO 32000-1 7.5.8.3), so they are skipped
          continue
      }
    }

    return xref
  }
}

function getXrefStreamIds (ranges) {
  const ids = []

  for (let r = 0; r + 1 < ranges.length; r += 2) {
    for (let k = 0; k < ranges[r + 1]; ++k) {
      ids.push(ranges[r] + k)
    }
  }

  return ids
}

// a malformed stream can contain more entries than declared in /Index (or /Size),
// in that case we keep numbering the extra entries sequentially after the last declared object,
// which is the same as the previous behaviour for a single range
function getXrefStreamId (ids, i) {
  if (i < ids.length) {
    return ids[i]
  }

  return ids.length > 0 ? ids[ids.length - 1] + 1 + (i - ids.length) : i
}

function readUint (src, pos, size) {
  let val = 0
  for (let i = 0; i < size; ++i) {
  // for (let i = size - 1; i > 0; --i) {
    val += src[pos + size - i - 1] << (8 * i)
  }
  return val
}
