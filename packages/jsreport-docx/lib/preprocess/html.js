const {
  normalizeSingleTextElInRun, normalizeSingleContentInText, nodeListToArray,
  getClosestEl, getSectionEl
} = require('../utils')

module.exports = (files, headerFooterRefs) => {
  const documentDoc = files.find(f => f.path === 'word/document.xml').doc
  const toProcess = [documentDoc]

  for (const rResult of headerFooterRefs) {
    toProcess.push(rResult.doc)
  }

  for (const [targetIdx, targetDoc] of toProcess.entries()) {
    let containerCounter = 0
    let htmlCallCounter = 0

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

      let sectionId

      if (targetIdx === 0) {
        // only get section id for the document.xml file
        sectionId = getSectionEl(paragraphEl).getAttribute('__cId__')
      }

      const paragraphWasProcessed = paragraphEl.hasAttribute('__html_embed_container__')

      if (!paragraphWasProcessed) {
        containerCounter++
        // reset the counter when we change of container
        htmlCallCounter = 0
      }

      const containerId = `c${containerCounter}`

      for (const normalizedResult of normalizedResults) {
        const { tEl, match } = normalizedResult

        if (match == null) {
          continue
        }

        const htmlCall = { ...match }

        htmlCallCounter++

        htmlCall.id = htmlCallCounter.toString()

        tEl.textContent = ''
        tEl.setAttribute('__htmlEmbedRef__', htmlCall.id)

        const newHtmlEmbedElement = targetDoc.createElement('docxHtmlEmbed')

        newHtmlEmbedElement.setAttribute('htmlId', htmlCall.id)

        let replacementHtmlCall = `{{docxHtml cId='${containerId}'`

        if (sectionId) {
          replacementHtmlCall += ` sId='${sectionId}'`
        }

        newHtmlEmbedElement.textContent = htmlCall.content.replace('{{docxHtml', replacementHtmlCall)

        tEl.parentNode.insertBefore(newHtmlEmbedElement, tEl.nextSibling)
      }

      if (paragraphWasProcessed) {
        continue
      }

      // insert attribute and comment as last child for easy replacement on postprocess step
      paragraphEl.setAttribute('__html_embed_container__', true)

      let fakeElement = targetDoc.createElement('docxRemove')
      fakeElement.textContent = `{{docxSData type='htmlDelimiterStart' cId='${containerId}'}}`
      paragraphEl.insertBefore(fakeElement, paragraphEl.firstChild)

      fakeElement = targetDoc.createElement('docxRemove')
      fakeElement.textContent = `{{docxSData type='htmlDelimiterEnd' cId='${containerId}'}}`
      paragraphEl.appendChild(fakeElement)
    }
  }
}

function getDocxHtmlCallRegexp () {
  return /{{docxHtml [^{}]{0,500}}}/
}
