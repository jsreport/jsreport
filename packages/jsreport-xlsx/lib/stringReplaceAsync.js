const replaceAsync = require('string-replace-async')

module.exports = async function stringReplaceAsync (str, searchValue, replacer) {
  const result = await replaceAsync(str, searchValue, replacer)
  return result
}
