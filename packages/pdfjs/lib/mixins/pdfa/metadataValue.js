module.exports = (info, key) => {
  let value = info.properties.get(key)?.str || ''
  if (Buffer.isBuffer(value)) {
    value = value.toString('latin1')
  }
  if (value.startsWith('\xfe\xff')) {
    value = Buffer.from(value, 'latin1').subarray(2).swap16().toString('utf16le')
  } else if (value.startsWith('\xff\xfe')) {
    value = Buffer.from(value, 'latin1').subarray(2).toString('utf16le')
  }
  return value.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  })[c])
}
