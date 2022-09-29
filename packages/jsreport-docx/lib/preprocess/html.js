const { nodeListToArray, findChildNode, getHeaderFooterDocs, getClosestEl, clearEl } = require('../utils')

module.exports = (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentFilePath = documentFile.path
  const documentDoc = documentFile.doc
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const toProcess = [documentDoc]

  const headerReferences = nodeListToArray(documentDoc.getElementsByTagName('w:headerReference')).map((el) => ({
    type: 'header',
    referenceEl: el
  }))

  const footerReferences = nodeListToArray(documentDoc.getElementsByTagName('w:footerReference')).map((el) => ({
    type: 'footer',
    referenceEl: el
  }))

  if (headerReferences.length > 0 || footerReferences.length > 0) {
    const bodyEl = findChildNode('w:body', documentDoc.documentElement)
    const sectPrEl = findChildNode('w:sectPr', bodyEl)

    const wrapperEl = documentDoc.createElement('docxHtmlSectPr')
    const clonedSectPrEl = sectPrEl.cloneNode(true)
    wrapperEl.appendChild(clonedSectPrEl)
    sectPrEl.parentNode.replaceChild(wrapperEl, sectPrEl)
  }

  const referenceResults = getHeaderFooterDocs([...headerReferences, ...footerReferences], documentFilePath, documentRelsDoc, files)

  for (const rResult of referenceResults) {
    toProcess.push(rResult.doc)
  }

  for (const targetDoc of toProcess) {
    const docxHtmlTextElements = nodeListToArray(targetDoc.getElementsByTagName('w:t')).filter((tEl) => {
      return tEl.textContent.includes('{{docxHtml')
    })

    // first we normalize that w:r elements containing the docxHtml calls only contain one child w:t element
    // usually office does not generated documents like this but it is valid that
    // the w:r element can contain multiple w:t elements
    for (const textEl of docxHtmlTextElements) {
      const rEl = getClosestEl(textEl, 'w:r')

      if (rEl == null) {
        continue
      }

      const textElements = nodeListToArray(rEl.childNodes).filter((n) => n.nodeName === 'w:t')
      const leftTextNodes = []
      const rightTextNodes = []

      let found = false

      for (const tEl of textElements) {
        if (tEl === textEl) {
          found = true
        } else if (found) {
          rightTextNodes.push(tEl)
        } else {
          leftTextNodes.push(tEl)
        }
      }

      const templateRNode = rEl.cloneNode(true)

      // remove text elements and inherit the rest
      clearEl(templateRNode, (c) => c.nodeName !== 'w:t')

      for (const tNode of leftTextNodes) {
        const [newRNode] = createNewRAndTextNode(tNode.textContent, templateRNode, targetDoc)
        rEl.removeChild(tNode)
        rEl.parentNode.insertBefore(newRNode, rEl)
      }

      for (const tNode of [...rightTextNodes].reverse()) {
        const [newRNode] = createNewRAndTextNode(tNode.textContent, templateRNode, targetDoc)
        rEl.removeChild(tNode)
        rEl.parentNode.insertBefore(newRNode, rEl.nextSibling)
      }
    }

    // now we normalize that docxHtml calls are in its own w:t element and other text
    // is split into new w:t element
    for (const textEl of docxHtmlTextElements) {
      const rEl = getClosestEl(textEl, 'w:r')
      const paragraphEl = getClosestEl(textEl, 'w:p')

      if (rEl == null || paragraphEl == null) {
        continue
      }

      let newContent = textEl.textContent
      let counter = 0
      const textParts = []
      const htmlCalls = []
      let match

      do {
        match = newContent.match(getDocxHtmlCallRegexp())

        if (match != null) {
          counter++

          const leftContent = newContent.slice(0, match.index)

          if (leftContent !== '') {
            textParts.push(leftContent)
          }

          const htmlCall = {
            id: counter.toString(),
            content: match[0]
          }

          textParts.push(htmlCall)
          htmlCalls.push(htmlCall)

          newContent = newContent.slice(match.index + match[0].length)
        }
      } while (match != null)

      if (newContent !== '') {
        textParts.push(newContent)
      }

      const templateRNode = rEl.cloneNode(true)

      // remove text elements and inherit the rest
      clearEl(templateRNode, (c) => c.nodeName !== 'w:t')

      const normalizedDocxHtmlTextElements = []

      for (const item of textParts) {
        const isDocxHtmlCall = typeof item !== 'string'

        const options = {
          text: isDocxHtmlCall ? '' : item
        }

        if (isDocxHtmlCall) {
          options.attributes = { __htmlEmbedRef__: item.id }
        }

        const [newRNode, newTextNode] = createNewRAndTextNode(options, templateRNode, targetDoc)
        rEl.parentNode.insertBefore(newRNode, rEl)

        if (isDocxHtmlCall) {
          normalizedDocxHtmlTextElements.push(newTextNode)
        }
      }

      rEl.parentNode.removeChild(rEl)

      for (const textEl of normalizedDocxHtmlTextElements) {
        const htmlCall = htmlCalls.find((htmlCall) => htmlCall.id === textEl.getAttribute('__htmlEmbedRef__'))

        if (htmlCall == null) {
          continue
        }

        const newHtmlEmbedElement = targetDoc.createElement('docxHtmlEmbed')

        newHtmlEmbedElement.setAttribute('htmlId', htmlCall.id)
        newHtmlEmbedElement.textContent = htmlCall.content

        textEl.parentNode.insertBefore(newHtmlEmbedElement, textEl.nextSibling)
      }

      // insert attribute and comment as last child for easy replacement on postprocess step
      paragraphEl.setAttribute('__html_embed_container__', true)

      const commentNode = targetDoc.createComment('__html_embed_container__')
      paragraphEl.appendChild(commentNode)
    }
  }
}

function createNewRAndTextNode (textOrOptions, templateRNode, doc) {
  const text = typeof textOrOptions === 'string' ? textOrOptions : textOrOptions.text
  const attributes = typeof textOrOptions === 'string' ? {} : (textOrOptions.attributes || {})
  const newRNode = templateRNode.cloneNode(true)
  const textEl = doc.createElement('w:t')

  textEl.setAttribute('xml:space', 'preserve')

  for (const [attrName, attrValue] of Object.entries(attributes)) {
    textEl.setAttribute(attrName, attrValue)
  }

  textEl.textContent = text
  newRNode.appendChild(textEl)
  return [newRNode, textEl]
}

function getDocxHtmlCallRegexp () {
  return /{{docxHtml [^{}]{0,500}}}/
}
