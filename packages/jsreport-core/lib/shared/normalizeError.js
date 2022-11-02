
module.exports = function normalizeError (errValue, normalizedErrorPrefix = 'User code threw with non-Error: ') {
  let newError

  const isErrorObj = (
    typeof errValue === 'object' &&
      typeof errValue.hasOwnProperty === 'function' &&
      Object.prototype.hasOwnProperty.call(errValue, 'message')
  )

  const isValidError = (
    isErrorObj ||
      typeof errValue === 'string'
  )

  if (!isValidError) {
    if (Object.prototype.toString.call(errValue) === '[object Object]') {
      newError = new Error(`${normalizedErrorPrefix}${JSON.stringify(errValue)}`)
    } else {
      newError = new Error(`${normalizedErrorPrefix}${errValue}`)
    }
  } else {
    if (typeof errValue === 'string') {
      newError = new Error(errValue)
    } else {
      newError = errValue
    }
  }

  return newError
}
