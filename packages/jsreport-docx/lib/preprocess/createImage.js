const {
  normalizeSingleTextElInRun, normalizeSingleContentInText, nodeListToArray,
  getClosestEl, processOpeningTag, processClosingTag
} = require('../utils')

module.exports = function createImage (files, headerFooterRefs) {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentDoc = documentFile.doc
  const toProcess = [{ doc: documentDoc }]

  for (const rResult of headerFooterRefs) {
    if (rResult.relsDoc == null) {
      continue
    }

    toProcess.push({ doc: rResult.doc })
  }

  for (const { doc: targetDoc } of toProcess) {
    const docxImageTextElements = nodeListToArray(targetDoc.getElementsByTagName('w:t')).filter((tEl) => {
      return tEl.textContent.includes('{{docxImage')
    })

    if (docxImageTextElements.length === 0) {
      continue
    }

    // first we normalize that w:r elements containing the docxImage calls only contain one child w:t element
    // usually office does not generated documents like this but it is valid that
    // the w:r element can contain multiple w:t elements
    for (const textEl of docxImageTextElements) {
      normalizeSingleTextElInRun(textEl, targetDoc)
    }

    for (const textEl of docxImageTextElements) {
      const normalizedResults = normalizeSingleContentInText(textEl, getDocxImageCallRegexp, targetDoc)

      if (normalizedResults == null) {
        continue
      }

      for (const normalizedResult of normalizedResults) {
        const { tEl, match } = normalizedResult

        if (match == null) {
          continue
        }

        const rEl = getClosestEl(tEl, 'w:r')

        processOpeningTag(targetDoc, rEl, "{{#docxSData type='image' target='createImage'}}")
        processClosingTag(targetDoc, rEl, '{{/docxSData}}')
      }
    }
  }
}

function getDocxImageCallRegexp () {
  return /{{docxImage [^{}]{0,500}}}/
}
