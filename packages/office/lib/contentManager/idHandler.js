const assert = require('node:assert')

module.exports = function createIdHandler (idAttrsArr, ATTRIBUTE_SEPARATOR) {
  const idAttrsLength = idAttrsArr.length
  const isSingleAttribute = idAttrsLength === 1

  const normalizeValue = (_val) => {
    let value

    if (typeof _val === 'string') {
      value = _val.split(ATTRIBUTE_SEPARATOR)
    } else if (Array.isArray(_val)) {
      value = _val
    } else {
      throw new Error('key expected to be a string or an array')
    }

    if (isSingleAttribute) {
      assert.ok(value.length === 1, 'key expected to be a string or single item array for single attribute part')
    } else {
      assert.ok(value.length === idAttrsLength, `key expected to be an array of ${idAttrsLength} values for multiple attribute part`)
    }

    return value.join(ATTRIBUTE_SEPARATOR)
  }

  return {
    [Symbol.iterator] () {
      return idAttrsArr.values()
    },
    getValue (idValues) {
      return normalizeValue(idValues)
    },
    parseValue (idValue) {
      assert.ok(typeof idValue === 'string', 'value expected to be a string')
      const idValues = idValue.split(ATTRIBUTE_SEPARATOR)
      assert.ok(idValues.length === idAttrsLength, `parsed value expected to be an array of ${idAttrsLength} values for multiple attribute part`)
      return idValues
    }
  }
}
