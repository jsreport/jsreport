const { DOMParser } = require('@xmldom/xmldom')
const recursiveStringReplaceAsync = require('../../recursiveStringReplaceAsync')
const { nodeListToArray, serializeXml } = require('../../utils')
const extractNodesFromDocx = require('./extractNodesFromDocx')

module.exports = async (files, headerFooterRefs) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<w:p[^>]*__child_embed_container__="true"[^>]*>',
    '<!--__child_embed_container__--></w:p>',
    'g',
    async (val, content, hasNestedMatch) => {
      const doc = new DOMParser().parseFromString(val)
      const paragraphNode = doc.documentElement

      const xmlNodesGenerated = await processParagraphChildEmbedContainer(paragraphNode, doc, files)

      return xmlNodesGenerated.map((node) => serializeXml(node)).join('')
    }
  )

  // checking if we need to handle child in header/footer of the document
  for (const { doc: headerFooterDoc } of headerFooterRefs) {
    const paragraphEls = nodeListToArray(headerFooterDoc.getElementsByTagName('w:p')).filter((el) => {
      return el.getAttribute('__child_embed_container__') === 'true'
    })

    for (const paragraphEl of paragraphEls) {
      const xmlNodesGenerated = await processParagraphChildEmbedContainer(paragraphEl, headerFooterDoc, files)

      for (const xmlNode of xmlNodesGenerated) {
        paragraphEl.parentNode.insertBefore(xmlNode, paragraphEl)
      }

      paragraphEl.parentNode.removeChild(paragraphEl)
    }
  }
}

async function processParagraphChildEmbedContainer (referenceParagraphEl, doc, files) {
  const paragraphEl = referenceParagraphEl.cloneNode(true)

  paragraphEl.removeAttribute('__child_embed_container__')

  if (
    paragraphEl.lastChild != null &&
    paragraphEl.lastChild.nodeName === '#comment' &&
    paragraphEl.lastChild.nodeValue === '__child_embed_container__'
  ) {
    paragraphEl.removeChild(paragraphEl.lastChild)
  }

  const childEmbedElements = nodeListToArray(paragraphEl.getElementsByTagName('docxChildEmbed'))
  const childEmbedEl = childEmbedElements[0]

  if (childEmbedEl == null) {
    throw new Error('Unable to find docxChildEmbed element, inconsistency in the document')
  }

  const match = childEmbedEl.textContent.match(/\$docxChild([^$]*)\$/)
  const childEmbedConfig = JSON.parse(Buffer.from(match[1], 'base64').toString())

  childEmbedEl.parentNode.removeChild(childEmbedEl)

  const childDocxBuf = Buffer.from(childEmbedConfig.content, childEmbedConfig.encoding)

  const xmlNodesGenerated = await extractNodesFromDocx(childDocxBuf, { doc, paragraphNode: paragraphEl })

  return xmlNodesGenerated
}
