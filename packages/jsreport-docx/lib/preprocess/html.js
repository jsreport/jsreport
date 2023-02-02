const { normalizeSingleTextElInRun, normalizeSingleContentInText, nodeListToArray, getClosestEl } = require('../utils')

module.exports = (files, headerFooterRefs) => {
  const documentDoc = files.find(f => f.path === 'word/document.xml').doc
  const toProcess = [documentDoc]

  for (const rResult of headerFooterRefs) {
    toProcess.push(rResult.doc)
  }

  for (const [targetIdx, targetDoc] of toProcess.entries()) {
    const docxHtmlTextElements = nodeListToArray(targetDoc.getElementsByTagName('w:t')).filter((tEl) => {
      return tEl.textContent.includes('{{docxHtml')
    })

    // first we normalize that w:r elements containing the docxHtml calls only contain one child w:t element
    // usually office does not generated documents like this but it is valid that
    // the w:r element can contain multiple w:t elements
    for (const textEl of docxHtmlTextElements) {
      normalizeSingleTextElInRun(textEl, targetDoc)
    }

    // now we normalize that docxHtml calls are in its own w:t element and other text
    // is split into new w:t element
    for (const textEl of docxHtmlTextElements) {
      const paragraphEl = getClosestEl(textEl, 'w:p')
      const normalizedResults = normalizeSingleContentInText(textEl, getDocxHtmlCallRegexp, targetDoc)

      if (normalizedResults == null) {
        continue
      }

      let counter = 0

      for (const normalizedResult of normalizedResults) {
        const { tEl, match } = normalizedResult

        if (match == null) {
          continue
        }

        const htmlCall = { ...match }

        counter++

        htmlCall.id = counter.toString()

        tEl.textContent = ''
        tEl.setAttribute('__htmlEmbedRef__', htmlCall.id)

        const newHtmlEmbedElement = targetDoc.createElement('docxHtmlEmbed')

        newHtmlEmbedElement.setAttribute('htmlId', htmlCall.id)
        newHtmlEmbedElement.textContent = htmlCall.content

        tEl.parentNode.insertBefore(newHtmlEmbedElement, tEl.nextSibling)
      }

      // insert attribute and comment as last child for easy replacement on postprocess step
      paragraphEl.setAttribute('__html_embed_container__', true)

      // only insert section idx for paragraphs in the main document
      if (targetIdx === 0) {
        paragraphEl.setAttribute('__sectionIdx__', '{{docxContext type="sectionIdx"}}')
      }

      const commentNode = targetDoc.createComment('__html_embed_container__')
      paragraphEl.appendChild(commentNode)
    }
  }
}

function getDocxHtmlCallRegexp () {
  return /{{docxHtml [^{}]{0,500}}}/
}
