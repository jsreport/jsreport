const zlib = require('zlib')

module.exports.inflate = (obj) => {
  return zlib.unzipSync(obj.content.content).toString('latin1')
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
