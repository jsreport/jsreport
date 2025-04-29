const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray } = require('./utils')

module.exports = function processDocumentRels (data, xmlStr) {
  const { idManagers, newDocumentRels } = data

  if (newDocumentRels.size === 0) {
    return xmlStr
  }

  const doc = new DOMParser().parseFromString(`<docxXml>${xmlStr}</docxXml>`)

  for (const { id, type, target } of newDocumentRels) {
    const relationshipEl = doc.createElement('Relationship')
    // if id was generated previously take it, if not generate it
    const newRelId = id ?? idManagers.get('documentRels').generate().id
    relationshipEl.setAttribute('Id', newRelId)
    relationshipEl.setAttribute('Type', type)
    relationshipEl.setAttribute('Target', target)
    doc.documentElement.appendChild(relationshipEl)
  }

  const items = nodeListToArray(doc.documentElement.childNodes)
  const result = items.map((el) => el.toString()).join('')
  return result
}
