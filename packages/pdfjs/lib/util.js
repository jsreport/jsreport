'use strict'

// Converts a hex color expr. like #123456 into an array [r, g, b],
// where r, g, b are in the range of 0 and 1
exports.colorToRgb = function(hex) {
  if (hex === undefined || hex === null) {
    return
  }

  if (typeof hex === 'string') {
    hex = parseInt(hex.replace('#', ''), 16)
  }

  const r = (hex >> 16) / 255
  const g = ((hex >> 8) & 255) / 255
  const b = (hex & 255) / 255

  return [r, g, b]
}

exports.rgbEqual = function(lhs, rhs) {
  return lhs && rhs && lhs[0] === rhs[0] && lhs[1] === rhs[1] && lhs[2] === rhs[2]
}

exports.toArrayBuffer = function(b) {
  if (b instanceof ArrayBuffer) {
    return b
  } else {
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
  }
}

exports.defaults = function(val, def) {
  return val !== undefined ? val : def
}


exports.inflate = function(obj) {
  let filter = obj.properties.get("Filter")
  if (!filter || filter.name !== "FlateDecode") {
    throw new Error("Only FlateDecode filter are supported")
  }

  let columns = 1
  let predictor = 1
  const params = obj.properties.get("DecodeParms")
  if (params) {
    columns = params.get("Columns")
    predictor = params.get("Predictor")
  }

  const inflate = require('pako/lib/inflate').inflate
  let res = inflate(obj.content.content)

  if (predictor === 1) {
    return res
  }

  if (predictor >= 10 && predictor <= 15) {
    // PNG filter
    res = pngFilter(res, columns)
  } else {
    throw new Error('Unsupported predictor ' + predictor)
  }

  return res
}

function pngFilter(src, columns) {
  const columnCount = columns + 1;
  const rowCount = src.length / columnCount

  const res = new Uint8Array(columns * rowCount);
  for (let y = 0; y < rowCount; ++y) {
    const filter = src[y * columnCount]
    if (filter === 0) {
      for (let x = 0; x < columns; ++x) {
        res[y * columns + x] = src[y * columnCount + 1 + x]
      }
    } else if (filter === 2) {
      for (let x = 0; x < columns; x++) {
        const prev = (y === 0) ? 0 : res[(y - 1) * columns + x]
        res[y * columns + x] = (prev + src[y * columnCount + 1 + x]) & 0xff
      }
    } else {
      throw new Error('Unsupported PNG filter ' + filter)
    }
  }
  return res
}

