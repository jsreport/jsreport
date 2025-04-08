const { DOMParser } = require('@xmldom/xmldom')
const Lock = require('semaphore-async-await').Lock
const recursiveStringReplaceAsync = require('../../recursiveStringReplaceAsync')
const { nodeListToArray, serializeXml, getClosestEl, clearEl } = require('../../utils')
const parseHtmlToDocxMeta = require('./parseHtmlToDocxMeta')
const convertDocxMetaToNodes = require('./convertDocxMetaToNodes')

module.exports = async (reporter, files, sections) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc

  const headerFooterRefs = sections.reduce((acu, section) => {
    if (section.headerFooterReferences) {
      acu.push(...section.headerFooterReferences.map((hfR) => ({
        ...hfR,
        sectionIdx: section.idx
      })))
    }

    return acu
  }, [])

  const numberingLock = new Lock()

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<w:p[^>]*__html_embed_container__="true"[^>]*>',
    '<!--__html_embed_container__--></w:p>',
    'g',
    async (val, content, hasNestedMatch) => {
      // we parse assuming it can be multiple paragraphs, this can happen
      // when some helper blocks get generated in a loop with conditional parts,
      // paragraphs with start attributes are there but with single end part
      const doc = new DOMParser().parseFromString(`<docxXml>${val}</docxXml>`)
      const paragraphEls = nodeListToArray(doc.getElementsByTagName('w:p'))

      const mainParagraphEl = paragraphEls.find((pEl) => {
        return pEl.hasAttribute('__sectionIdx__')
      }) ?? paragraphEls[0]

      let sectionIdx = parseInt(mainParagraphEl.getAttribute('__sectionIdx__'), 10)
      sectionIdx = isNaN(sectionIdx) ? 0 : sectionIdx

      const results = []

      for (const el of nodeListToArray(doc.documentElement.childNodes)) {
        let output = ''

        if (el.nodeName === 'w:p') {
          el.removeAttribute('__sectionIdx__')
          const xmlNodesGenerated = await processParagraphHtmlEmbedContainer(reporter, el, sections[sectionIdx], documentFile.path, doc, documentRelsDoc, numberingLock, files)
          output = xmlNodesGenerated.map((node) => serializeXml(node)).join('')
        } else {
          output = el.toString()
        }

        results.push(output)
      }

      return results.join('')
    }
  )

  // checking if we need to handle html in header/footer of the document
  for (const { path: headerFooterPath, doc: headerFooterDoc, relsDoc: headerFooterRelsDoc, sectionIdx } of headerFooterRefs) {
    const paragraphEls = nodeListToArray(headerFooterDoc.getElementsByTagName('w:p')).filter((el) => {
      return el.getAttribute('__html_embed_container__') === 'true'
    })

    for (const paragraphEl of paragraphEls) {
      const xmlNodesGenerated = await processParagraphHtmlEmbedContainer(reporter, paragraphEl, sections[sectionIdx], headerFooterPath, headerFooterDoc, headerFooterRelsDoc, numberingLock, files)

      for (const xmlNode of xmlNodesGenerated) {
        paragraphEl.parentNode.insertBefore(xmlNode, paragraphEl)
      }

      paragraphEl.parentNode.removeChild(paragraphEl)
    }
  }
}

async function processParagraphHtmlEmbedContainer (reporter, referenceParagraphEl, sectionDetail, docPath, doc, relsDoc, numberingLock, files) {
  const paragraphEl = referenceParagraphEl.cloneNode(true)

  paragraphEl.removeAttribute('__html_embed_container__')

  if (
    paragraphEl.lastChild != null &&
    paragraphEl.lastChild.nodeName === '#comment' &&
    paragraphEl.lastChild.nodeValue === '__html_embed_container__'
  ) {
    paragraphEl.removeChild(paragraphEl.lastChild)
  }

  const htmlEmbedElements = nodeListToArray(paragraphEl.getElementsByTagName('docxHtmlEmbed'))
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

    clearEl(paragraphEl, (c) => c.nodeName === 'w:pPr' || c === parentElBeforeParagraph)

    htmlEmbedDefs = [firstBlockEmbedDef]
  }

  const xmlNodesGenerated = []

  if (embedType === 'block') {
    const htmlEmbedDef = htmlEmbedDefs[0]
    const docxMeta = parseHtmlToDocxMeta(htmlEmbedDef.config.content, embedType, sectionDetail)

    const xmlNodes = await convertDocxMetaToNodes(reporter, docxMeta, htmlEmbedDef, embedType, {
      docPath,
      doc,
      relsDoc,
      files,
      paragraphNode: paragraphEl,
      numberingLock
    })
    xmlNodesGenerated.push(...xmlNodes)
  } else {
    for (const htmlEmbedDef of htmlEmbedDefs) {
      const docxMeta = parseHtmlToDocxMeta(htmlEmbedDef.config.content, embedType, sectionDetail)

      const xmlNodes = await convertDocxMetaToNodes(reporter, docxMeta, htmlEmbedDef, embedType, {
        docPath,
        doc,
        relsDoc,
        files,
        numberingLock
      })
      const rContainerNode = getClosestEl(htmlEmbedDef.tEl, 'w:r')

      for (const xmlNode of xmlNodes) {
        rContainerNode.parentNode.insertBefore(xmlNode, rContainerNode)
      }

      // remove the reference text node and container because we are not going to need it anymore
      rContainerNode.parentNode.removeChild(rContainerNode)
    }

    xmlNodesGenerated.push(paragraphEl)
  }

  return xmlNodesGenerated
}
