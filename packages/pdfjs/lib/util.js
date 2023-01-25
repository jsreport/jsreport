const zlib = require('zlib')

exports.inflate = function (obj) {
  let filters = obj.properties.get('Filter')
  let filter
  if (filters && Array.isArray(filters)) {
    filter = filters.shift()
  } else {
    filter = filters
    filters = []
  }

  if (!filter || filter.name !== 'FlateDecode' || filters.length > 0) {
    throw new Error('Only FlateDecode filter are supported')
  }

  let columns = 1
  let predictor = 1
  const params = obj.properties.get('DecodeParms')
  if (params) {
    columns = params.get('Columns')
    predictor = params.get('Predictor')
  }

  let res = zlib.unzipSync(obj.content.content)

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

function pngFilter (src, columns) {
  const columnCount = columns + 1
  const rowCount = src.length / columnCount

  const res = new Uint8Array(columns * rowCount)
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

exports.toArrayBuffer = function (b) {
  if (b instanceof ArrayBuffer) {
    return b
  } else {
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
  }
}

module.exports.formatDate = (date) => {
  let str = 'D:' +
    date.getFullYear() +
    ('00' + (date.getMonth() + 1)).slice(-2) +
    ('00' + date.getDate()).slice(-2) +
    ('00' + date.getHours()).slice(-2) +
    ('00' + date.getMinutes()).slice(-2) +
    ('00' + date.getSeconds()).slice(-2)

  let offset = date.getTimezoneOffset()
  const rel = offset === 0 ? 'Z' : (offset > 0 ? '-' : '+')
  offset = Math.abs(offset)
  const hoursOffset = Math.floor(offset / 60)
  const minutesOffset = offset - hoursOffset * 60

  str += rel +
    ('00' + hoursOffset).slice(-2) + '\'' +
    ('00' + minutesOffset).slice(-2) + '\''

  return str
}
