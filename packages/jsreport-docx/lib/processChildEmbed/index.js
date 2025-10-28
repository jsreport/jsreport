const { serializeXml } = require('../utils')
const extractNodesFromDocx = require('./extractNodesFromDocx')

module.exports = async function processChildEmbed (childDocxBuf, data) {
  const xmlNodesGenerated = await extractNodesFromDocx(childDocxBuf, data)
  return xmlNodesGenerated.map((node) => serializeXml(node)).join('')
}
