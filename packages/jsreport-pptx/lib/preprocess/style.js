const { nodeListToArray, normalizeSingleTextElInRun, normalizeSingleContentInText } = require('../utils')

// the specification of {{pptxStyle}} is very rich
// it should add color to all text between the pptxStyle tag
// the problematic part is pptxStyle crossing multiple paragraphs and ending in the middle
// and also the performance

// the solution is that we mark the paragraphs which contains styles, such paragraphs will ma loaded in dom during postprocessing
// the mark is represented by <pptxStyles> element before paragraph starts and <pptxStyleEnd> after paragraph ends
// at the place of the {{#pptxStyle}} call we just add mark $pptxStyleStart[id] so we can find exact position of the start during post-process
// the <pptxStyle> node will then include the handlebars generated values for color

const regexp = /{{#pptxStyle [^{}]{0,500}}}/

let styleIdCounter = 1

module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    const doc = f.doc

    const textElementsWithPptxStyle = nodeListToArray(doc.getElementsByTagName('a:t')).filter((tEl) => {
      return tEl.textContent.includes('{{#pptxStyle') || tEl.textContent.includes('{{/pptxStyle}}')
    })

    // first we normalize that a:r elements containing the pptxStyle calls only contain one child a:t element
    // usually office does not generated documents like this but it is valid that
    // the a:r element can contain multiple a:t elements
    for (const textEl of textElementsWithPptxStyle) {
      normalizeSingleTextElInRun(textEl, doc)
    }

    // now we normalize that pptxStyle calls are in its own a:t element and other text
    // is split into new a:t element

    for (const textEl of textElementsWithPptxStyle) {
      normalizeSingleContentInText(textEl, getPptxStyleCallRegexp, doc)
    }

    // we query the text elements again after the normalization
    const textElements = nodeListToArray(doc.getElementsByTagName('a:t'))

    let openingEl = null
    let pptxStylesEl = null

    for (let i = 0; i < textElements.length; i++) {
      const el = textElements[i]

      if (el.textContent.includes('{{/pptxStyle}}') && openingEl) {
        processClosingTag(doc, openingEl, el, pptxStylesEl)
        openingEl = null
      }

      if (el.textContent.includes('{{#pptxStyle')) {
        openingEl = el

        const wpElement = el.parentNode.parentNode
        pptxStylesEl = wpElement.previousSibling

        if (!pptxStylesEl || pptxStylesEl.tagName !== 'pptxStyles') {
          pptxStylesEl = doc.createElement('pptxStyles')
          wpElement.parentNode.insertBefore(pptxStylesEl, wpElement)
        }
      }
    }
  }
}

function processClosingTag (doc, openingEl, el, stylesEl) {
  const styleId = styleIdCounter++
  const helperCall = openingEl.textContent.match(regexp)[0]

  const fakeElement = doc.createElement('pptxRemove')
  fakeElement.textContent = helperCall.replace('{{#pptxStyle', `{{pptxStyle id=${styleId}`)
  stylesEl.appendChild(fakeElement)

  openingEl.textContent = openingEl.textContent.replace(regexp, `$pptxStyleStart${styleId}$`)
  el.textContent = el.textContent.replace('{{/pptxStyle}}', '$pptxStyleEnd')

  const apElement = el.parentNode.parentNode

  if (!apElement.nextSibling || apElement.nextSibling.tagName !== 'pptxStyleEnd') {
    const pptxStyleEnd = doc.createElement('pptxStyleEnd')
    apElement.parentNode.insertBefore(pptxStyleEnd, apElement.nextSibling)
  }
}

function getPptxStyleCallRegexp () {
  return /{{[#/]pptxStyle ?[^{}]{0,500}}}/
}
