const path = require('path')
const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray, serializeXml } = require('../utils')

module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    processEndnotes(files, f)
    processHyperlinks(files, f)
    processFootnotes(files, f)
  }
}

function processEndnotes (files, currentFile) {
  let docEndnotes = files.find(f => f.path === 'word/endnotes.xml')

  if (!docEndnotes) {
    return
  }

  docEndnotes = docEndnotes.doc

  function processElement (el) {
    const endnoteNode = el.firstChild
    const clonedEndnoteNode = endnoteNode.cloneNode(true)
    const endnotesNode = docEndnotes.getElementsByTagName('w:endnotes')[0]
    const endnotesNodes = nodeListToArray(endnotesNode.getElementsByTagName('w:endnote'))

    const newId = `${Math.max(...endnotesNodes.map((n) => parseInt(n.getAttribute('w:id'), 10))) + 1}`

    clonedEndnoteNode.setAttribute('w:id', newId)
    el.setAttribute('w:id', newId)

    endnotesNode.appendChild(clonedEndnoteNode)
    el.removeChild(endnoteNode)
  }

  if (currentFile.path === 'word/document.xml') {
    currentFile.data = currentFile.data.toString().replace(/<w:endnoteReference[^>]*>.*?(?=<\/w:endnoteReference>)<\/w:endnoteReference>/g, (val) => {
      // need to pass a map of existing xml namespaces because we are going to insert the parsed nodes somewhere else
      // and we need to ensure that the nodes are parsed without loosing the namespace to ensure the proper insertion
      const el = new DOMParser({ xmlns: docEndnotes.documentElement._nsMap }).parseFromString(val).firstChild
      processElement(el)
      return serializeXml(el)
    })
  } else {
    const endnoteReferenceElements = currentFile.doc.getElementsByTagName('w:endnoteReference')

    for (let i = 0; i < endnoteReferenceElements.length; i++) {
      processElement(endnoteReferenceElements[i])
    }
  }
}

function processHyperlinks (files, currentFile) {
  const docRels = files.find(f => f.path === `word/_rels/${path.basename(currentFile.path)}.rels`)

  if (!docRels) {
    return
  }

  function processElement (el) {
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
    const relationshipsNode = docRels.doc.getElementsByTagName('Relationships')[0]
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

  if (currentFile.path === 'word/document.xml') {
    currentFile.data = currentFile.data.toString().replace(/<w:hyperlink[^>]*>.*?(?=<\/w:hyperlink>)<\/w:hyperlink>/g, (val) => {
      // need to pass a map of existing xml namespaces because we are going to insert the parsed nodes somewhere else
      // and we need to ensure that the nodes are parsed without loosing the namespace to ensure the proper insertion
      const el = new DOMParser({ xmlns: docRels.doc.documentElement._nsMap }).parseFromString(val).firstChild
      processElement(el)
      return serializeXml(el)
    })
  } else {
    const doc = currentFile.doc
    const hyperlinkElements = doc.getElementsByTagName('w:hyperlink')
    for (let i = 0; i < hyperlinkElements.length; i++) {
      processElement(hyperlinkElements[i])
    }
  }
}

function processFootnotes (files, currentFile) {
  let docFootnotes = files.find(f => f.path === 'word/footnotes.xml')

  if (!docFootnotes) {
    return
  }

  docFootnotes = docFootnotes.doc

  function processElement (el) {
    const footnoteNode = el.firstChild

    if (footnoteNode == null || footnoteNode.tagName !== 'w:footnote') {
      return
    }

    const clonedFootnoteNode = footnoteNode.cloneNode(true)
    const footnotesNode = docFootnotes.getElementsByTagName('w:footnotes')[0]

    if (!footnotesNode) {
      return
    }

    const footnotesNodes = nodeListToArray(footnotesNode.getElementsByTagName('w:footnote'))

    let newId = footnotesNodes.reduce((lastId, node) => {
      const nodeId = node.getAttribute('w:id')
      const regExp = /^(-?\d+)$/
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

    newId = `${newId}`

    clonedFootnoteNode.setAttribute('w:id', newId)
    el.setAttribute('w:id', newId)

    footnotesNode.appendChild(clonedFootnoteNode)
    el.removeChild(footnoteNode)
  }

  if (currentFile.path === 'word/document.xml') {
    currentFile.data = currentFile.data.toString().replace(/<w:footnoteReference[^>]*>.*?(?=<\/w:footnoteReference>)<\/w:footnoteReference>/g, (val) => {
      // need to pass a map of existing xml namespaces because we are going to insert the parsed nodes somewhere else
      // and we need to ensure that the nodes are parsed without loosing the namespace to ensure the proper insertion
      const el = new DOMParser({ xmlns: docFootnotes.documentElement._nsMap }).parseFromString(val).firstChild
      processElement(el)
      return serializeXml(el)
    })
  } else {
    const footnoteReferenceElements = currentFile.doc.getElementsByTagName('w:footnoteReference')

    for (let i = 0; i < footnoteReferenceElements.length; i++) {
      processElement(footnoteReferenceElements[i])
    }
  }
}
