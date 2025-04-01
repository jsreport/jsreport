const { DOMParser } = require('@xmldom/xmldom')
const recursiveStringReplaceAsync = require('../recursiveStringReplaceAsync')
const { nodeListToArray, serializeXml } = require('../utils')

module.exports = async (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<w:p[^>]*__block_helper_container__="true"[^>]*>',
    '<!--__block_helper_container__--></w:p>',
    'g',
    async (val, content, hasNestedMatch) => {
      // we parse assuming it can be multiple paragraphs, this can happen
      // when some helper blocks get generated in a loop with conditional parts,
      // paragraphs with start attributes are there but with single end part
      const doc = new DOMParser().parseFromString(`<docxXml>${val}</docxXml>`)

      const results = []

      for (const el of nodeListToArray(doc.documentElement.childNodes)) {
        let output = ''

        if (el.nodeName === 'w:p') {
          output = processParagraphBlockHelperContainer(el)
        } else {
          output = el.toString()
        }

        results.push(output)
      }

      return results.join('')
    }
  )
}

function processParagraphBlockHelperContainer (paragraphEl) {
  paragraphEl.removeAttribute('__block_helper_container__')

  const blockTextNodes = nodeListToArray(paragraphEl.getElementsByTagName('w:t')).filter((node) => {
    return node.getAttribute('__block_helper__') === 'true'
  })

  for (const textNode of blockTextNodes) {
    const rNode = textNode.parentNode
    let nextNode = rNode.nextSibling
    let nextRNode

    while (nextNode != null) {
      if (nextNode.nodeName === 'w:r') {
        nextRNode = nextNode
        break
      }

      nextNode = nextNode.nextSibling
    }

    if (nextRNode) {
      for (let idx = 0; idx < nextRNode.childNodes.length; idx++) {
        const childNode = nextRNode.childNodes[idx]

        // remove new line after the removed helper node
        if (childNode.nodeName === 'w:br' && childNode.getAttribute('w:type') === '') {
          nextRNode.removeChild(childNode)
        }
      }

      const childContentNodesLeft = nodeListToArray(nextRNode.childNodes).filter((node) => {
        if (node.nodeName === 'w:br') {
          const wType = node.getAttribute('w:type')

          return wType !== '' && ['column', 'textWrapping'].includes(wType) === false
        }

        return ['w:rPr', 'w:cr'].includes(node.nodeName) === false
      })

      if (childContentNodesLeft.length === 0) {
        // if there are no more content nodes in the w:r then remove it
        nextRNode.parentNode.removeChild(nextRNode)
      }
    }

    for (const node of nodeListToArray(rNode.childNodes)) {
      const valid = ['w:bookmarkStart', 'w:bookmarkEnd']

      if (!valid.includes(node.nodeName)) {
        continue
      }

      // move bookmark outside the w:r so it can be preserved
      rNode.parentNode.insertBefore(node, rNode)
    }

    rNode.parentNode.removeChild(rNode)
  }

  const childContentNodesLeft = nodeListToArray(paragraphEl.childNodes).filter((node) => {
    return ['w:r', 'w:fldSimple', 'w:hyperlink', 'w:bookmarkStart', 'w:bookmarkEnd'].includes(node.nodeName)
  })

  if (
    paragraphEl.lastChild != null &&
    paragraphEl.lastChild.nodeName === '#comment' &&
    paragraphEl.lastChild.nodeValue === '__block_helper_container__'
  ) {
    paragraphEl.removeChild(paragraphEl.lastChild)
  }

  if (childContentNodesLeft.length === 0) {
    // if there are no more content nodes in the paragraph then remove it
    return ''
  }

  return serializeXml(paragraphEl)
}
