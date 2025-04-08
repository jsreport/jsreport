const {
  normalizeSingleTextElInRun, normalizeSingleContentInText, nodeListToArray,
  processOpeningTag, processClosingTag, getClosestEl, clearEl
} = require('../utils')

module.exports = (files, headerFooterRefs) => {
  const documentDoc = files.find(f => f.path === 'word/document.xml').doc
  const toProcess = [documentDoc]

  for (const rResult of headerFooterRefs) {
    toProcess.push(rResult.doc)
  }

  for (const targetDoc of toProcess) {
    const docxChildTextElements = nodeListToArray(targetDoc.getElementsByTagName('w:t')).filter((tEl) => {
      return tEl.textContent.includes('{{docxChild')
    })

    // first we normalize that w:r elements containing the docxChild calls only contain one child w:t element
    // usually office does not generated documents like this but it is valid that
    // the w:r element can contain multiple w:t elements
    for (const textEl of docxChildTextElements) {
      normalizeSingleTextElInRun(textEl, targetDoc)
    }

    // now we normalize that docxHtml calls are in its own w:t element and other text
    // is split into new w:t element
    for (const textEl of docxChildTextElements) {
      const normalizedResults = normalizeSingleContentInText(textEl, getDocxChildCallRegexp, targetDoc)

      if (normalizedResults == null) {
        continue
      }

      const firstDocxChildCall = normalizedResults.find((r) => r.match != null)

      if (firstDocxChildCall == null) {
        continue
      }

      const paragraphEl = getClosestEl(firstDocxChildCall.tEl, 'w:p')

      if (paragraphEl == null) {
        throw new Error('Unable to find paragraph container element for docxChild call')
      }

      let currentEl = firstDocxChildCall.tEl
      let parentElBeforeParagraph

      do {
        currentEl = currentEl.parentNode

        if (currentEl != null && currentEl.parentNode != null && currentEl.parentNode.nodeName === 'w:p') {
          parentElBeforeParagraph = currentEl
        }
      } while (currentEl != null && currentEl.parentNode != null && parentElBeforeParagraph == null)

      if (parentElBeforeParagraph == null) {
        throw new Error('Unable to find parent element for docxChild call')
      }

      // we only preserve the first docxChild call in the paragraph and remove the rest
      clearEl(paragraphEl, (c) => c === parentElBeforeParagraph)

      firstDocxChildCall.tEl.textContent = ''

      // wrap the paragraph into the main wrapper so we can store data during helper calls
      processOpeningTag(targetDoc, paragraphEl, `{{#docxSData ${firstDocxChildCall.match.rest[0]} type='child' }}`)
      processClosingTag(targetDoc, paragraphEl, '{{/docxSData}}')

      const newChildEmbedElement = targetDoc.createElement('docxRemove')
      newChildEmbedElement.textContent = '{{> (docxContext type="childContentPartial") }}'
      paragraphEl.parentNode.insertBefore(newChildEmbedElement, paragraphEl.nextSibling)

      // wrap the paragraph into a wrapper so we can know the content of paragraph at runtime
      processOpeningTag(targetDoc, paragraphEl, "{{#docxSData type='childCaller' }}")
      processClosingTag(targetDoc, paragraphEl, '{{/docxSData}}')
    }
  }
}

function getDocxChildCallRegexp () {
  return /{{docxChild ([^{}]{0,500})}}/
}
