const {
  nodeListToArray, normalizeSingleTextElInRun, normalizeSingleContentInText,
  findCommonParent, processOpeningTag, processClosingTag
} = require('../utils')

// here we added w:tbl just because we want the max parent to be it,
// and want that if possible {{#docxSData type='styles'}} to be inserted as wrapper of table
const validParents = ['w:p', 'w:tr', 'w:tbl']

module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    const doc = f.doc

    const textElementsWithDocxRemove = nodeListToArray(doc.getElementsByTagName('w:t')).filter((tEl) => {
      return tEl.textContent.includes('{{docxRemove') || tEl.textContent.includes('{{{docxRemove')
    })

    if (textElementsWithDocxRemove.length === 0) {
      continue
    }

    // first we normalize that w:r elements containing the docxStyle calls only contain one child w:t element
    // usually office does not generate documents like this but it is valid that
    // the w:r element can contain multiple w:t elements
    for (const textEl of textElementsWithDocxRemove) {
      normalizeSingleTextElInRun(textEl, doc)
    }

    // now we normalize that docxStyle calls (even if nested on same node) are in its own w:t element and other text
    // is split into new w:t element
    for (const textEl of textElementsWithDocxRemove) {
      normalizeSingleContentInText(textEl, getDocxRemoveCallRegexp, doc)
    }

    // we query the text elements again after the normalization
    const textElements = nodeListToArray(doc.getElementsByTagName('w:t'))

    for (let i = 0; i < textElements.length; i++) {
      const tEl = textElements[i]

      const isDocxRemoveCall = (
        tEl.textContent.includes('{{docxRemove') ||
        tEl.textContent.includes('{{{docxRemove')
      )

      if (!isDocxRemoveCall) {
        continue
      }

      // we ensure that there is single docxRemove wrapper created
      // for all nested docxRemove calls in the element
      const commonParentEl = findCommonParent(tEl.parentNode, validParents)

      const stylesEl = commonParentEl.previousSibling
      const isDocxStylesTag = stylesEl?.tagName === 'docxRemove' && stylesEl?.textContent.startsWith("{{#docxSData type='remove'")

      if (!isDocxStylesTag) {
        processOpeningTag(doc, commonParentEl, "{{#docxSData type='remove'}}")
        processClosingTag(doc, commonParentEl, '{{/docxSData}}')
      }
    }
  }
}

function getDocxRemoveCallRegexp () {
  return /{{{?docxRemove [^{}]{0,500}}?}}/
}
