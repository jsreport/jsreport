const { DOMParser } = require('@xmldom/xmldom')
const { decompress } = require('@jsreport/office')
const { getExtractMetadata } = require('./supportedElements')
const { nodeListToArray, contentIsXML } = require('../utils')
const concatTags = require('../preprocess/concatTags')

module.exports = async function extractNodesFromDocx (targetDocxBuffer) {
  const nodes = []
  let files

  try {
    files = await decompress()(targetDocxBuffer)
  } catch (parseTemplateError) {
    throw new Error('Failed to parse docx input, unable to extract elements for child embed')
  }

  for (const f of files) {
    if (f.path === 'word/document.xml' && contentIsXML(f.data)) {
      f.doc = new DOMParser().parseFromString(f.data.toString())
      f.data = f.data.toString()
    }
  }

  const documentFile = files.find(f => f.path === 'word/document.xml')

  if (documentFile == null) {
    return nodes
  }

  const targetFiles = [documentFile]

  // concat tags of document.xml because the child docx may have the handlebars tags spread in multiple nodes
  concatTags(targetFiles)

  const documentDoc = documentFile.doc
  const bodyEl = nodeListToArray(documentDoc.documentElement.childNodes).find((el) => el.nodeName === 'w:body')

  if (bodyEl == null) {
    return nodes
  }

  const paragraphEls = nodeListToArray(bodyEl.childNodes).filter((el) => el.nodeName === 'w:p')

  for (const paragraphEl of paragraphEls) {
    const newParagraphEl = extractParagraph(paragraphEl)

    if (newParagraphEl == null) {
      continue
    }

    nodes.push(newParagraphEl)
  }

  return nodes
}

function extractParagraph (referenceParagraphEl) {
  const newParagraphEl = referenceParagraphEl.cloneNode(true)

  const toProcess = [{ el: newParagraphEl }]

  do {
    const current = toProcess.shift()

    const meta = getExtractMetadata(current.el.nodeName)

    // if there is no metadata leave the node as it is
    if (meta == null) {
      continue
    }

    let isValid = true

    if (meta.validate != null) {
      isValid = meta.validate(current.el)
    }

    if (!isValid) {
      current.el.parentNode.removeChild(current.el)
      continue
    }

    if (meta.allowedAttributes != null) {
      keepAttributes(current.el, meta.allowedAttributes)
    }

    const restOfChildren = keepChildren(current.el, meta.allowedChildren)

    if (restOfChildren.length > 0) {
      const newItems = restOfChildren.map((el) => ({ el }))
      toProcess.push(...newItems)
    }
  } while (toProcess.length > 0)

  return newParagraphEl
}

function keepChildren (el, allowedChildren) {
  const childEls = nodeListToArray(el.childNodes)
  const restChildren = []

  for (const childEl of childEls) {
    // if there is no explicit allowed children passed then all children are allowed
    const isAllowed = !Array.isArray(allowedChildren) ? true : allowedChildren.includes(childEl.nodeName)

    if (!isAllowed) {
      childEl.parentNode.removeChild(childEl)
    } else {
      restChildren.push(childEl)
    }
  }

  return restChildren
}

function keepAttributes (el, allowedAttrs) {
  const attrs = nodeListToArray(el.attributes)

  for (const attr of attrs) {
    // if there is no explicit allowed attrs passed then all children are allowed
    const isAllowed = !Array.isArray(allowedAttrs) ? true : allowedAttrs.includes(attr.nodeName)

    if (!isAllowed) {
      el.removeAttribute(attr.nodeName)
    }
  }
}
