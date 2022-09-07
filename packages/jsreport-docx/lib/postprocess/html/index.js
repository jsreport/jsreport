const { DOMParser } = require('@xmldom/xmldom')
const recursiveStringReplaceAsync = require('../../recursiveStringReplaceAsync')
const { nodeListToArray, serializeXml, getClosestEl, clearEl } = require('../../utils')
const parseHtmlToDocxMeta = require('./parseHtmlToDocxMeta')
const convertDocxMetaToNodes = require('./convertDocxMetaToNodes')

module.exports = async (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<w:p[^>]*__html_embed_container__="true"[^>]*>',
    '<!--__html_embed_container__--></w:p>',
    'g',
    async (val, content, hasNestedMatch) => {
      const doc = new DOMParser().parseFromString(val)
      const paragraphNode = doc.documentElement

      paragraphNode.removeAttribute('__html_embed_container__')

      if (
        paragraphNode.lastChild != null &&
        paragraphNode.lastChild.nodeName === '#comment' &&
        paragraphNode.lastChild.nodeValue === '__html_embed_container__'
      ) {
        paragraphNode.removeChild(paragraphNode.lastChild)
      }

      const htmlEmbedElements = nodeListToArray(paragraphNode.getElementsByTagName('docxHtmlEmbed'))
      let htmlEmbedDefs = []

      for (const htmlEmbedEl of htmlEmbedElements) {
        const match = htmlEmbedEl.textContent.match(/\$docxHtml([^$]*)\$/)
        const htmlEmbedConfig = JSON.parse(Buffer.from(match[1], 'base64').toString())

        const tEl = getClosestEl(htmlEmbedEl, (n) => (
          n.nodeName === 'w:t' &&
          n.getAttribute('__htmlEmbedRef__') != null &&
          n.getAttribute('__htmlEmbedRef__') === htmlEmbedEl.getAttribute('htmlId')
        ), 'previous')

        if (tEl == null) {
          throw new Error('Unable to find w:t reference element for docxHtmlEmbed')
        }

        htmlEmbedDefs.push({
          tEl,
          id: htmlEmbedEl.getAttribute('htmlId'),
          config: htmlEmbedConfig
        })

        htmlEmbedEl.parentNode.removeChild(htmlEmbedEl)
      }

      const embedType = htmlEmbedDefs.every((d) => d.config.inline === true) ? 'inline' : 'block'

      if (embedType === 'block') {
        // if the embed is block type we should clear the paragraph and only let the paragraph properties
        // and the node containing the html embed call
        const firstBlockEmbedDef = htmlEmbedDefs.find((d) => d.config.inline == null || d.config.inline !== true)

        let currentEl = firstBlockEmbedDef.tEl
        let parentElBeforeParagraph

        do {
          currentEl = currentEl.parentNode

          if (currentEl != null && currentEl.parentNode != null && currentEl.parentNode.nodeName === 'w:p') {
            parentElBeforeParagraph = currentEl
          }
        } while (currentEl != null && currentEl.parentNode != null && parentElBeforeParagraph == null)

        if (parentElBeforeParagraph == null) {
          throw new Error('Unable to find parent element for docxHtmlEmbed')
        }

        clearEl(paragraphNode, (c) => c.nodeName === 'w:pPr' || c === parentElBeforeParagraph)

        htmlEmbedDefs = [firstBlockEmbedDef]
      }

      const xmlNodesGenerated = []

      if (embedType === 'block') {
        const htmlEmbedDef = htmlEmbedDefs[0]
        const docxMeta = parseHtmlToDocxMeta(htmlEmbedDef.config.content, embedType)
        const xmlNodes = await convertDocxMetaToNodes(docxMeta, htmlEmbedDef, embedType, { doc, files, paragraphNode })
        xmlNodesGenerated.push(...xmlNodes)
      } else {
        for (const htmlEmbedDef of htmlEmbedDefs) {
          const docxMeta = parseHtmlToDocxMeta(htmlEmbedDef.config.content, embedType)
          const xmlNodes = await convertDocxMetaToNodes(docxMeta, htmlEmbedDef, embedType, { doc, files })
          const rContainerNode = getClosestEl(htmlEmbedDef.tEl, 'w:r')

          for (const xmlNode of xmlNodes) {
            rContainerNode.parentNode.insertBefore(xmlNode, rContainerNode)
          }

          // remove the reference text node and container because we are not going to need it anymore
          rContainerNode.parentNode.removeChild(rContainerNode)
        }

        xmlNodesGenerated.push(paragraphNode)
      }

      return xmlNodesGenerated.map((node) => serializeXml(node)).join('')
    }
  )
}
