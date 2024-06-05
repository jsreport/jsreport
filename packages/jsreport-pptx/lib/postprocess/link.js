const path = require('path')
const { nodeListToArray } = require('../utils')

module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    processHyperlinks(files, f)
  }
}

function processHyperlinks (files, currentFile) {
  const slideRels = files.find(f => f.path === `ppt/slides/_rels/${path.basename(currentFile.path)}.rels`)

  if (!slideRels) {
    return
  }

  const doc = currentFile.doc
  const hyperlinkClickElements = doc.getElementsByTagName('a:hlinkClick')

  for (let i = 0; i < hyperlinkClickElements.length; i++) {
    processHyperlinkClickElement(slideRels, hyperlinkClickElements[i])
  }
}

function processHyperlinkClickElement (slideRels, el) {
  const relationshipNode = el.firstChild

  const isRelationshipLinkNode = (
    relationshipNode.localName === 'Relationship' &&
    relationshipNode.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink'
  )

  if (!isRelationshipLinkNode) {
    // if first child is not relationship that points to link, then ignore
    return
  }

  const clonedRelationshipNode = relationshipNode.cloneNode()
  const relationshipsNode = slideRels.doc.getElementsByTagName('Relationships')[0]
  const relationsNodes = nodeListToArray(relationshipsNode.getElementsByTagName('Relationship'))

  let newId = relationsNodes.reduce((lastId, node) => {
    const nodeId = node.getAttribute('Id')
    const regExp = /^rId(\d+)$/
    const match = regExp.exec(nodeId)

    if (!match || !match[1]) {
      return lastId
    }

    const num = parseInt(match[1], 10)

    if (num > lastId) {
      return num
    }

    return lastId
  }, 0) + 1

  newId = `rId${newId}`

  clonedRelationshipNode.setAttribute('Id', newId)
  el.setAttribute('r:id', newId)

  relationshipsNode.appendChild(clonedRelationshipNode)
  el.removeChild(relationshipNode)
}
