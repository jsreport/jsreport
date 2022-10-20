function intToHex (i) {
  let hexString = i.toString(16)
  if (hexString.length % 2) {
    hexString = '0' + hexString
  }
  return hexString
}

class PDFName {
  constructor (name) {
    /* if (!name) {
      throw new Error('A Name cannot be undefined')
    } */
    // chrome produces empty names for some fonts on linux
    name = name || ''

    if (name instanceof PDFName) {
      return name
    }

    if (name[0] === '/') {
      name = name.substr(1)
    }

    // delimiter characters are not allowed
    if (name.match(/[()<>[\]{}/%]/)) {
      throw new Error('A Name mustn\'t contain delimiter characters:' + name)
    }

    name = name.toString()

    // Beginning with PDF 1.2, any character except null (character code 0)
    // may be included in a name by writing its 2-digit hexadecimal code,
    // preceded by the number sign character (#)
    // ... it is recommended but not required for characters whose codes
    // are outside the range 33 (!) to 126 (~)
    name = name.replace(/[^\x21-\x7e]/g, function (c) {
      let code = c.charCodeAt(0)
      // replace unicode characters with `_`
      if (code > 0xff) {
        code = 0x5f
      }

      return '#' + intToHex(code)
    })

    this.name = name
  }

  toString () {
    return '/' + this.name
  }

  static parse (xref, lexer, trial) {
    if (lexer.getString(1) !== '/') {
      if (trial) {
        return undefined
      }

      throw new Error('Invalid name: ' + lexer.getString(10))
    }

    lexer.shift(1)

    let name = ''

    let done = false
    let c
    while (!done && (c = lexer._nextCharCode()) >= 0) {
      switch (true) {
        case c === 0x28: // (
        case c === 0x29: // )
        case c === 0x3c: // <
        case c === 0x3e: // >
        case c === 0x5b: // [
        case c === 0x5d: // ]
        case c === 0x7b: // {
        case c === 0x7d: // }
        case c === 0x2f: // /
        case c === 0x25: // %
          done = true
          break
        case c === 0x23: // #
          name += String.fromCharCode(parseInt(lexer.readString(2), 16))
          break
        case c >= 0x22 && c <= 0x7e: // inside range of 33 (!) to 126 (~)
          name += String.fromCharCode(c)
          break
        case c < 0x22:
          done = true
          break
        // pdf spec says name should be in range ! ~
        // however phantomjs produces pdf with something like /FontName /TimesNewRomanoby?ejné
        // the software parsing tool rups takes chars out range like é and converts them to hex
        // we do the same here
        default:
          name += '#' + intToHex(c)
          break
      }
    }

    lexer.shift(-1)

    return new PDFName(name)
  }
}

module.exports = PDFName
