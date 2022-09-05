const util = require('../util')

class PDFReference {
  constructor (obj) {
    Object.defineProperty(this, 'object', {
      enumerable: true,
      get: () => {
        if (!obj) {
          return undefined
        }

        if (typeof obj === 'function') {
          obj = obj()
        }

        return obj
      }
    })
  }

  toString () {
    return this.object.id + ' ' + this.object.rev + ' R'
  }

  static parse (xref, lexer, trial) {
    const before = lexer.pos

    const id = lexer.readNumber(trial)
    if (id === undefined && !trial) {
      throw new Error('Invalid indirect')
    }

    lexer.skipSpace(1, trial)
    const generation = lexer.readNumber(trial)
    if (generation === undefined && !trial) {
      throw new Error('Invalid indirect')
    }

    lexer.skipSpace(1, trial)
    if (lexer.getString(1) !== 'R') {
      if (trial) {
        lexer.pos = before
        return undefined
      }

      throw new Error('Invalid indirect')
    }

    lexer.shift(1)

    if (!lexer.state.references) {
      lexer.state.references = new Map()
    }
    const key = `${id} ${generation}`
    if (lexer.state.references.has(key)) {
      return lexer.state.references.get(key)
    }

    const ref = new PDFReference(parseObject.bind(null, xref, lexer.outer, id))
    lexer.state.references.set(key, ref)
    return ref
  }
}

module.exports = PDFReference

function parseObject (xref, lexer, id) {
  const PDFObject = require('./object')
  const Lexer = require('../parser/lexer')

  const obj = xref.get(id)
  if (obj) {
    return obj
  }

  const offset = xref.getOffset(id)
  if (offset === null) {
    const entry = xref.objects[id]
    if (entry.compressed) {
      if (!entry.obj) {
        lexer.pos = xref.getOffset(entry.id)
        const obj = PDFObject.parse(xref, lexer)

        const type = obj.properties.get('Type')
        if (type && type.name !== 'ObjStm') {
          throw new Error('Expected compressed object stream')
        }

        const src = util.inflate(obj)
        // console.log("STRING: ", String.fromCharCode.apply(null, src))
        const innerLexer = new Lexer(src, lexer)

        obj.lexer = innerLexer
        obj.innerObjects = []
        const n = obj.properties.get('N')
        for (let i = 0; i < n; ++i) {
          const id = innerLexer.readNumber(false)
          innerLexer.skipSpace(1, false)
          const offset = innerLexer.readNumber(false)
          innerLexer.skipWhitespace(1, true)

          obj.innerObjects.push({
            id: id,
            offset: offset,
            obj: null
          })
        }

        entry.obj = obj
      }

      const inner = entry.obj.innerObjects[entry.ix]
      if (!inner.obj) {
        const innerLexer = entry.obj.lexer
        innerLexer.pos = entry.obj.properties.get('First') + inner.offset

        inner.obj = PDFObject.parseInner(xref, innerLexer)
      }

      return inner.obj
    } else {
      throw new Error('Expected compressed object stream')
    }
  } else {
    lexer.pos = offset
    return PDFObject.parse(xref, lexer)
  }
}
