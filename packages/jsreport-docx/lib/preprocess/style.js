const { nodeListToArray, normalizeSingleTextElInRun, normalizeSingleContentInText } = require('../utils')
const { findCommonParent } = require('../styleUtils')

// the specification of {{docxStyle}} is very rich
// it should add color to all text between the docxStyle tag
// the problematic part is docxStyle crossing multiple paragraphs and ending in the middle
// and also the performance

// the solution is that we mark the paragraphs which contains styles, such paragraphs will mark loaded in dom during postprocessing
// the mark is represented by <docxStyles> element before paragraph starts and <docxStyleEnd> after paragraph ends
// at the place of the {{#docxStyle}} call we just add mark $docxStyleStart[id] so we can find exact position of the start during post-process
// the <docxStyle> node will then include the handlebars generated values for color

const docxStyleCallRegExp = /{{#docxStyle [^{}]{0,500}}}/
const validParents = ['w:p', 'w:tc', 'w:tr']

let styleIdCounter = 1

module.exports = (files) => {
  const startStyleCall = '{{#docxStyle'
  const endStyleCall = '{{/docxStyle}}'

  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    const doc = f.doc

    const textElementsWithDocxStyle = nodeListToArray(doc.getElementsByTagName('w:t')).filter((tEl) => {
      return tEl.textContent.includes('{{#docxStyle') || tEl.textContent.includes('{{/docxStyle}}')
    })

    if (textElementsWithDocxStyle.length === 0) {
      continue
    }

    // first we normalize that w:r elements containing the docxStyle calls only contain one child w:t element
    // usually office does not generated documents like this but it is valid that
    // the w:r element can contain multiple w:t elements
    for (const textEl of textElementsWithDocxStyle) {
      normalizeSingleTextElInRun(textEl, doc)
    }

    // now we normalize that docxStyle calls (even if nested on same node) are in its own w:t element and other text
    // is split into new w:t element
    for (const textEl of textElementsWithDocxStyle) {
      normalizeSingleContentInText(textEl, getDocxStyleCallRegexp, doc)
    }

    // we query the text elements again after the normalization
    const textElements = nodeListToArray(doc.getElementsByTagName('w:t'))

    const opened = []
    let docxStylesEl = null

    for (let i = 0; i < textElements.length; i++) {
      const el = textElements[i]

      let remainingText = el.textContent

      do {
        const foundEndIdx = remainingText.indexOf(endStyleCall)

        if (foundEndIdx !== -1 && opened.length > 0) {
          remainingText = remainingText.slice(foundEndIdx + endStyleCall.length)
          const opening = opened.pop()
          const ending = { el, start: foundEndIdx }
          // we ensure that there is single docxStyleEnd element created
          // for all nested docxStyle calls
          const createStyleEnd = opened.length === 0
          processClosingTag(doc, opening, ending, docxStylesEl, createStyleEnd)
        }

        const foundStartIdx = remainingText.indexOf(startStyleCall)

        if (foundStartIdx !== -1) {
          remainingText = remainingText.slice(foundStartIdx + startStyleCall.length)

          // we ensure that there is single docxStyles element created
          // for all nested docxStyle calls
          if (opened.length === 0) {
            docxStylesEl = processOpeningTag(doc, el)
          }

          opened.push({ el, start: foundStartIdx, id: styleIdCounter })
          styleIdCounter++
        }

        if (foundStartIdx === -1 && foundEndIdx === -1) {
          break
        }
      } while (remainingText !== '')
    }
  }
}

function processOpeningTag (doc, el) {
  const commonParentEl = findCommonParent(el.parentNode, validParents)

  let docxStylesEl = commonParentEl.previousSibling

  if (!docxStylesEl || docxStylesEl.tagName !== 'docxStyles') {
    docxStylesEl = doc.createElement('docxStyles')
    commonParentEl.parentNode.insertBefore(docxStylesEl, commonParentEl)
  }

  return docxStylesEl
}

function processClosingTag (doc, opening, ending, stylesEl, createStyleEnd) {
  const startIdx = opening.start
  const styleId = opening.id
  const openingEl = opening.el
  const endIdx = ending.start
  const endingEl = ending.el

  const leftStartText = openingEl.textContent.slice(0, startIdx)
  const targetStartText = openingEl.textContent.slice(startIdx)
  const helperCall = targetStartText.match(docxStyleCallRegExp)[0]
  const leftEndText = endingEl.textContent.slice(0, endIdx)
  const targetEndText = endingEl.textContent.slice(endIdx)

  const fakeElement = doc.createElement('docxRemove')
  fakeElement.textContent = helperCall.replace('{{#docxStyle', `{{docxStyle id="${styleId}"`)
  stylesEl.appendChild(fakeElement)

  openingEl.textContent = leftStartText + targetStartText.replace(docxStyleCallRegExp, `$docxStyleStart${styleId}$`)
  endingEl.textContent = leftEndText + targetEndText.replace('{{/docxStyle}}', '$docxStyleEnd')

  if (!createStyleEnd) {
    return
  }

  const commonParentEl = findCommonParent(endingEl.parentNode, validParents)

  if (!commonParentEl.nextSibling || commonParentEl.nextSibling.tagName !== 'docxStyleEnd') {
    const docxStyleEnd = doc.createElement('docxStyleEnd')
    commonParentEl.parentNode.insertBefore(docxStyleEnd, commonParentEl.nextSibling)
  }
}

function getDocxStyleCallRegexp () {
  return /{{[#/]docxStyle ?[^{}]{0,500}}}/
}
