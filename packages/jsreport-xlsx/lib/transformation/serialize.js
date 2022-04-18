const util = require('util')
const { decompress } = require('@jsreport/office')
const xml2js = require('xml2js-preserve-spaces')

const parseString = util.promisify(xml2js.parseString)

async function parseXlsx (base64contentOrBuffer) {
  const buf = Buffer.isBuffer(base64contentOrBuffer) ? base64contentOrBuffer : Buffer.from(base64contentOrBuffer, 'base64')
  const result = {}
  const files = await decompress()(buf)

  await Promise.all(files.map((f) => {
    if (f.path.includes('.xml')) {
      return parseString(f.data.toString()).then((r) => (result[f.path] = r))
    }

    if (f.path.includes('xl/media/') || f.path.includes('.bin')) {
      result[f.path] = f.data.toString('base64')
    }

    if (!result[f.path]) {
      result[f.path] = f.data.toString('utf8')
    }

    return result
  }))

  return result
}

module.exports = async (base64contentOrBuffer) => {
  const result = await parseXlsx(base64contentOrBuffer)
  return JSON.stringify(result)
}

module.exports.parse = parseXlsx
