'use strict'

const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const tmpDir = require('os').tmpdir()
const stylesMap = require('./stylesMap')
const tableToXlsx = require('./tableToXlsx')

const extractTableScriptFn = fs.readFileSync(
  path.join(__dirname, './scripts/conversionScript.js')
).toString()

module.exports = (opt = {}) => {
  const options = { ...opt }

  options.timeout = options.timeout || 10000
  options.tmpDir = options.tmpDir || tmpDir

  if (typeof options.extract !== 'function') {
    throw new Error('`extract` option must be a function')
  }

  if (typeof options.timeout !== 'number') {
    throw new Error('`timeout` option must be a number')
  }

  const timeout = options.timeout
  const currentExtractFn = options.extract

  async function convert (html, extractOptions = {}, xlsxTemplateBuf) {
    const id = uuidv4()

    if (html == null) {
      throw new Error('required `html` option not specified')
    }

    let tables = await currentExtractFn({
      ...extractOptions,
      uuid: id,
      html,
      timeout
    })

    if (tables != null && !Array.isArray(tables)) {
      tables = [tables]
    }

    if (!tables || tables.length === 0) {
      throw new Error('No table element(s) found in html')
    }

    const stream = await tableToXlsx(options, tables, xlsxTemplateBuf, id)

    return stream
  }

  return convert
}

module.exports.getScriptFn = () => extractTableScriptFn

module.exports.getXlsxStyleNames = () => {
  return Object.keys(stylesMap)
}
