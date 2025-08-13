// page 60
// Filters: page 65

const PDF = require('./')
const zlib = require('zlib')

module.exports = class PDFStream {
  constructor (object) {
    if (!object) {
      object = new PDF.Object()
    }

    object.content = this
    this.object = object
    this.content = ''
  }

  // slice(begin, end) {
  //   this.content = this.content.slice(begin, end)
  //   this.object.prop('Length', this.content.length - 1)
  // }

  writeLine (str) {
    this.content += str + '\n'
    this.object.prop('Length', this.content.length - 1)
  }

  toReference () {
    return this.object.toReference()
  }

  toString (encryptionFn) {
    let content = this.content

    if (encryptionFn) {
      content = encryptionFn(content)
    }

    if (content instanceof Uint8Array) {
      content = uint8ToString(content) + '\n'
    }

    return 'stream\n' + content + 'endstream'
  }

  setAndCompress (buf) {
    this.object.properties.set('Filter', 'FlateDecode')
    this.content = zlib.deflateSync(buf)
    this.object.properties.set('Length', this.content.length)
  }

  getDecompressed () {
    if (this.object.properties.get('Filter')?.toString() === '/FlateDecode') {
      return zlib.unzipSync(this.content)
    }
    return this.content
  }

  getDecompressedString () {
    if (this.object.properties.get('Filter')?.toString() === '/FlateDecode') {
      return zlib.unzipSync(this.content).toString('latin1')
    }
    return uint8ToString(this.content)
  }
}

// source: http://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string/12713326#12713326
function uint8ToString (u8a) {
  const CHUNK_SZ = 0x8000
  const c = []
  for (let i = 0; i < u8a.length; i += CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.subarray(i, i + CHUNK_SZ)))
  }
  return c.join('')
}
