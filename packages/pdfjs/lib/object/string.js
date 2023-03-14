// pofider changes
// lot of code for serializing taken from here
// https://github.com/foliojs/pdfkit/blob/e641a785082b80c0f88e04ddcab04e3c726ea6b4/lib/object.js
// it solves the problems when there are national characters in the value
const escapableRe = /[\n\r\t\b\f()\\]/g
const escapable = {
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\b': '\\b',
  '\f': '\\f',
  '\\': '\\\\',
  '(': '\\(',
  ')': '\\)'
}

// Convert little endian UTF-16 to big endian
const swapBytes = function (buff) {
  const l = buff.length
  if (l & 0x01) {
    throw new Error('Buffer length must be even')
  } else {
    for (let i = 0, end = l - 1; i < end; i += 2) {
      const a = buff[i]
      buff[i] = buff[i + 1]
      buff[i + 1] = a
    }
  }

  return buff
}

const isUnicode = function (str) {
  for (let i = 0, end = str.length; i < end; i++) {
    if (str.charCodeAt(i) > 0x7f) {
      return true
    }
  }
}

class PDFString {
  constructor (str, isParsedWithUnocodes = false) {
    this.str = str
    // when user sets unicoded string to the value, lets say to the meta.title
    // we need to do some bytes swap operations
    // but in case we parse the value in existing pdf, the bytes are already swaped
    // and we should probably skip this - this flag is for this case
    // https://github.com/jsreport/jsreport-pdf-utils/issues/28
    this.isParsedWithUnocodes = isParsedWithUnocodes
  }

  toHexString () {
    // convert to hex string
    let hex = ''
    for (let i = 0, len = this.str.length; i < len; ++i) {
      let h = (this.str.charCodeAt(i) - 31).toString(16)
      // left pad zeroes
      h = ('0000' + h).slice(-4)
      hex += h
    }
    return '<' + hex + '>'
  }

  toString (encryptFn) {
    // pofider change, added because encryption
    if (Buffer.isBuffer(this.str)) {
      return `<${this.str.toString('hex')}>`
    }

    let string = this.str

    let stringBuffer
    if (!this.isParsedWithUnocodes && isUnicode(string)) {
      stringBuffer = swapBytes(Buffer.from(`\ufeff${string}`, 'utf16le'))
    } else {
      stringBuffer = Buffer.from(string.valueOf(), 'ascii')
    }

    if (encryptFn) {
      string = encryptFn(stringBuffer).toString('binary')
    } else {
      string = stringBuffer.toString('binary')
    }

    string = string.replace(escapableRe, c => escapable[c])

    return `(${string})`
  }

  static parse (xref, lexer, trial) {
    const literal = PDFString.parseLiteral(lexer, trial)
    const hex = literal === undefined && PDFString.parseHex(lexer, trial)

    if (!literal && !hex) {
      if (trial) {
        return undefined
      }

      throw new Error('Invalid string')
    }

    return literal || hex
  }

  static parseLiteral (lexer, trial) {
    if (lexer.getString(1) !== '(') {
      if (trial) {
        return undefined
      }

      throw new Error('Invalid literal string')
    }

    lexer.shift(1)

    let str = ''

    let done = false
    let open = 0
    let c
    while (!done && (c = lexer._nextCharCode()) >= 0) {
      switch (c) {
        case 0x28: // (
          open++
          str += String.fromCharCode('(')
          break
        case 0x29: // )
          if (open === 0) {
            done = true
          } else {
            open--
            str += String.fromCharCode(')')
          }
          break
        case 0x5c: // \
          c = lexer._nextCharCode()
          switch (c) {
            case 0x6e: // \n
              str += '\n'
              break
            case 0x72: // \r
              str += '\r'
              break
            case 0x74: // \t
              str += '\t'
              break
            case 0x62: // \b
              str += '\b'
              break
            case 0x66: // \f
              str += '\f'
              break
            case 0x28: // '('
            case 0x29: // ')'
            case 0x5c: // '\'
              str += String.fromCharCode(c)
              break
            case 0x30: // 0
            case 0x31: // 1
            case 0x32: // 2
            case 0x33: // 3
            case 0x34: // 4
            case 0x35: // 5
            case 0x36: // 6
            case 0x37: // 7
            case 0x38: // 8
            case 0x39: // 9
              str += String.fromCharCode(parseInt(String.fromCharCode(c) + lexer.readString(2), 8))
              break
            default:
              lexer.shift(-1)
              break
          }
          break
        case 0x0d: // CR
        case 0x0a: // LF
          lexer.skipEOL(1, true)
          break
        default:
          str += String.fromCharCode(c)
          break
      }
    }

    if (isUnicode(str)) {
      return new PDFString(str, true)
    }

    return new PDFString(str)
  }

  static parseHex (lexer, trial) {
    if (lexer.getString(1) !== '<') {
      if (trial) {
        return undefined
      }

      throw new Error('Invalid hex string')
    }

    lexer.shift(1)

    let str = ''

    let done = false
    const digits = []
    const addCharacter = function (force) {
      if (digits.length !== 2) {
        if (digits.length === 1 && force) {
          digits.push('0')
        } else {
          return
        }
      }

      str += String.fromCharCode(parseInt(digits.join(''), 16))
      digits.length = 0
    }

    let c
    while (!done && (c = lexer._nextCharCode()) >= 0) {
      switch (true) {
        case c === 0x3e: // >
          done = true
          break
        case c >= 0x30 && c <= 0x39: // 0 - 9
        case c >= 0x41 && c <= 0x5a: // A - B
        case c >= 0x61 && c <= 0x7a: // a - b
          digits.push(String.fromCharCode(c))
          addCharacter()
          break
        case lexer.isWhiteSpace(c):
          break
        default:
          lexer._warning('invalid character `' + String.fromCharCode(c) + '` in hex string')
          break
      }
    }

    addCharacter(true)

    return new PDFString(Buffer.from(str))
  }
}

module.exports = PDFString
