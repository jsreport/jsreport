'use strict'

// page 60
// Filters: page 65

const PDFObject = require('./object')

module.exports = class PDFStream {
  constructor(object) {
    if (!object) {
      object = new PDFObject()
    }

    object.content = this
    this.object  = object
    this.content = ''
  }

  // slice(begin, end) {
  //   this.content = this.content.slice(begin, end)
  //   this.object.prop('Length', this.content.length - 1)
  // }

  writeLine(str) {
    this.content += str + '\n'
    this.object.prop('Length', this.content.length - 1)
  }

  toReference() {
    return this.object.toReference()
  }

  toString(encryptionFn) {
    let content = this.content       
    
    if (encryptionFn) {
      content = encryptionFn(content)
    }

    if (content instanceof Uint8Array) {
      content = uint8ToString(content) + '\n'
    }        

    return 'stream\n' + content + 'endstream'
  }
}

// source: http://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string/12713326#12713326
function uint8ToString(u8a) {
  const CHUNK_SZ = 0x8000
  const c = []
  for (let i = 0; i < u8a.length; i += CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.subarray(i, i + CHUNK_SZ)))
  }
  return c.join('')
}
