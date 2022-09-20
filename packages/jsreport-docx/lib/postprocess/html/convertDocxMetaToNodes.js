const { clearEl } = require('../../utils')

module.exports = function convertDocxMetaToNodes (docxMeta, htmlEmbedDef, mode, { doc, paragraphNode } = {}) {
  if (mode !== 'block' && mode !== 'inline') {
    throw new Error(`Invalid conversion mode "${mode}"`)
  }

  const pending = docxMeta.map((meta) => ({ item: meta }))
  const result = []
  let templateParagraphNode

  if (mode === 'block') {
    templateParagraphNode = paragraphNode.cloneNode(true)
    // inherit only the paragraph properties of the html embed call
    clearEl(templateParagraphNode, (c) => c.nodeName === 'w:pPr')
  }

  while (pending.length > 0) {
    const { parent, item: currentDocxMeta } = pending.shift()

    if (mode === 'block' && parent == null && currentDocxMeta.type !== 'paragraph') {
      throw new Error(`Top level elements in docx meta for "${mode}" mode must be paragraphs`)
    } else if (mode === 'inline' && parent == null && currentDocxMeta.type !== 'text') {
      throw new Error(`Top level elements in docx meta for "${mode}" mode must be text`)
    }

    if (currentDocxMeta.type === 'paragraph') {
      if (mode === 'inline') {
        throw new Error(`docx meta paragraph element can not be applied for "${mode}" mode`)
      }

      const containerEl = templateParagraphNode.cloneNode(true)

      const invalidChildMeta = currentDocxMeta.children.find((childMeta) => (
        childMeta.type !== 'text'
      ))

      if (invalidChildMeta != null) {
        throw new Error(`Invalid docx meta child "${invalidChildMeta.type}" found in paragraph`)
      }

      result.push(containerEl)

      const pendingItemsInCurrent = currentDocxMeta.children.map((meta) => ({
        parent: containerEl,
        item: meta
      }))

      if (pendingItemsInCurrent.length > 0) {
        pending.unshift(...pendingItemsInCurrent)
      }
    } else if (currentDocxMeta.type === 'text') {
      const runEl = htmlEmbedDef.tEl.parentNode.cloneNode(true)

      // inherit only the run properties of the html embed call
      clearEl(runEl, (c) => c === 'w:rPr')

      const textEl = doc.createElement('w:t')

      textEl.setAttribute('xml:space', 'preserve')
      textEl.textContent = currentDocxMeta.value

      runEl.appendChild(textEl)

      if (mode === 'block') {
        if (parent == null) {
          throw new Error(`docx meta text element can not exists without parent for "${mode}" mode`)
        }

        parent.appendChild(runEl)
      } else if (mode === 'inline') {
        result.push(runEl)
      }
    } else {
      throw new Error(`Unsupported docx node "${currentDocxMeta.type}"`)
    }
  }

  return result
}
