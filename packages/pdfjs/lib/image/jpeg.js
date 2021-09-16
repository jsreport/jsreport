'use strict'

const PDF = require('../object')

module.exports = class JPEGImage {
  constructor(src) {
    this.src = src
    this.xobjCount = 1

    const view = new DataView(src)
    if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) {
      throw new Error('Invalid JPEG image.')
    }

    let blockLength = view.getUint8(4) * 256 + view.getUint8(5)
    const len = view.byteLength
    let i = 4

    while ( i < len ) {
      i += blockLength

      if (view.getUint8(i) !== 0xff) {
        throw new Error('Could not read JPEG the image size')
      }

      if (
        view.getUint8(i + 1) === 0xc0 || //(SOF) Huffman  - Baseline DCT
        view.getUint8(i + 1) === 0xc1 || //(SOF) Huffman  - Extended sequential DCT
        view.getUint8(i + 1) === 0xc2 || // Progressive DCT (SOF2)
        view.getUint8(i + 1) === 0xc3 || // Spatial (sequential) lossless (SOF3)
        view.getUint8(i + 1) === 0xc4 || // Differential sequential DCT (SOF5)
        view.getUint8(i + 1) === 0xc5 || // Differential progressive DCT (SOF6)
        view.getUint8(i + 1) === 0xc6 || // Differential spatial (SOF7)
        view.getUint8(i + 1) === 0xc7
      ) {
        this.height = view.getUint8(i + 5) * 256 + view.getUint8(i + 6)
        this.width = view.getUint8(i + 7) * 256 + view.getUint8(i + 8)

        const colorSpace = view.getUint8(i + 9)
        switch (colorSpace) {
        case 3:
          this.colorSpace = 'DeviceRGB'
          break
        case 1:
          this.colorSpace = 'DeviceGRAY'
          break
        }

        break
      } else {
        i += 2
        blockLength = view.getUint8(i) * 256 + view.getUint8(i + 1)
      }
    }
  }

  async write(doc, xobjs) {
    const xobj = xobjs[0]

    xobj.prop('Subtype', 'Image')
    xobj.prop('Width',  this.width)
    xobj.prop('Height', this.height)
    xobj.prop('ColorSpace', this.colorSpace)
    xobj.prop('BitsPerComponent', 8)

    const hex = asHex(this.src)
    xobj.prop('Filter', new PDF.Array(['/ASCIIHexDecode', '/DCTDecode']))
    xobj.prop('Length', hex.length + 1)
    xobj.prop('Length1', this.src.byteLength)

    const content = new PDF.Stream(xobj)
    content.content = hex + '>\n'

    await doc._writeObject(xobj)
  }
}

function asHex(ab) {
  const view = new Uint8Array(ab)
  let hex = ''
  for (let i = 0, len = ab.byteLength; i < len; ++i) {
    hex += toHex(view[i])
  }
  return hex
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}