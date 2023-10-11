const { serializeXml } = require('../utils')
const extractNodesFromDocx = require('./extractNodesFromDocx')

module.exports = async function processChildEmbed (childDocxBuf) {
  const xmlNodesGenerated = await extractNodesFromDocx(childDocxBuf)
  return xmlNodesGenerated.map((node) => serializeXml(node)).join('')
}
