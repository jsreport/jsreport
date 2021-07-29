
module.exports = function convertUint8ArrayToBuffer (obj) {
  const shouldContinue = isObject(obj) || Array.isArray(obj)

  if (!shouldContinue) {
    return
  }

  for (const [key, value] of Object.entries(obj)) {
    if (isStrictUint8Array(value)) {
      obj[key] = typeArrayToBuffer(value)
    } else if (isObject(value)) {
      convertUint8ArrayToBuffer(value)
    } else if (Array.isArray(value)) {
      convertUint8ArrayToBuffer(value)
    }
  }
}

function isStrictUint8Array (input) {
  return Object.prototype.toString.call(input) === '[object Uint8Array]' && input.constructor === Uint8Array
}

function isObject (input) {
  if (Object.prototype.toString.call(input) !== '[object Object]') {
    return false
  }

  const prototype = Object.getPrototypeOf(input)

  return prototype === null || prototype === Object.prototype
}

function typeArrayToBuffer (input) {
  let newBuf = Buffer.from(input.buffer)

  if (input.byteLength !== input.buffer.byteLength) {
    newBuf = newBuf.slice(input.byteOffset, input.byteOffset + input.byteLength)
  }

  return newBuf
}
