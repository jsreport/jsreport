const path = require('path')
const fs = require('fs')

module.exports = function normalizePathOption (cwd, optionOrArgName, value, options = {}) {
  const type = options.type ? options.type : 'option'

  if (typeof value === 'string') {
    const pathVal = path.resolve(cwd, value)

    if (options.strict) {
      if (!path.isAbsolute(pathVal)) {
        throw new Error(`${optionOrArgName} ${type} must be a valid file path`)
      }
    }

    const read = options.read != null ? options.read : true
    if (!read) {
      return pathVal
    }

    try {
      if (options.json) {
        return JSON.parse(fs.readFileSync(pathVal).toString())
      } else {
        return fs.readFileSync(pathVal).toString()
      }
    } catch (e) {
      if (e.code !== 'ENOENT' && options.json) {
        throw new Error(`${optionOrArgName} ${type} error: file in ${pathVal} doesn't have a valid JSON content`)
      }

      throw new Error(`${optionOrArgName} ${type} error: can't read file in ${pathVal}`)
    }
  }

  if (options.strict) {
    throw new Error(`${optionOrArgName} ${type} must be a file path`)
  }

  return value
}
