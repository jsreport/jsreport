const {
  nodeListToArray, normalizeSingleTextElInRun, normalizeSingleContentInText,
  findCommonParent, processOpeningTag, processClosingTag
} = require('../utils')

// the specification of {{pptxStyle}} is very rich
// it should add color to all text between the pptxStyle tag
// the problematic part is pptxStyle crossing multiple paragraphs and ending in the middle
// and also the performance

// the solution is that we mark the paragraphs which contains styles, such paragraphs will mark loaded in dom during postprocessing
// the mark is represented by <pptxStyles> element before paragraph starts and <pptxStyleEnd> after paragraph ends
// at the place of the {{#pptxStyle}} call we just add mark $pptxStyleStart[id] so we can find exact position of the start during post-process
// the <pptxStyle> node will then include the handlebars generated values for color

const pptxStyleCallRegExp = /{{#pptxStyle [^{}]{0,500}}}/
// here we added a:tbl just because we want the max parent to be it,
// and want that if possible {{#pptxSData type='styles'}} to be inserted as wrapper of table
const validParents = ['a:p', 'p:sp', 'a:tc', 'a:tr', 'a:tbl']

const startStyleCall = '{{#pptxStyle'
const endStyleCall = '{{/pptxStyle}}'

module.exports = (files) => {
  let styleIdCounter = 1

  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    const doc = f.doc

    const textElementsWithPptxStyle = nodeListToArray(doc.getElementsByTagName('a:t')).filter((tEl) => {
      return tEl.textContent.includes(startStyleCall) || tEl.textContent.includes(endStyleCall)
    })

    if (textElementsWithPptxStyle.length === 0) {
      continue
    }

    // first we normalize that a:r elements containing the pptxStyle calls only contain one child a:t element
    // usually office does not generate documents like this but it is valid that
    // the a:r element can contain multiple a:t elements
    for (const textEl of textElementsWithPptxStyle) {
      normalizeSingleTextElInRun(textEl, doc)
    }

    // now we normalize that pptxStyle calls (even if nested on same node) are in its own a:t element and other text
    // is split into new a:t element
    for (const textEl of textElementsWithPptxStyle) {
      normalizeSingleContentInText(textEl, getPptxStyleCallRegexp, doc)
    }

    // we query the text elements again after the normalization
    const textElements = nodeListToArray(doc.getElementsByTagName('a:t'))

    const opened = []
    let pptxStylesEl = null
    const pptxStylesStartMap = new WeakMap()

    for (let i = 0; i < textElements.length; i++) {
      const el = textElements[i]

      let remainingText = el.textContent

      do {
        const foundEndIdx = remainingText.indexOf(endStyleCall)

        if (foundEndIdx !== -1 && opened.length > 0) {
          remainingText = remainingText.slice(foundEndIdx + endStyleCall.length)
          const opening = opened.pop()
          const ending = { el, start: foundEndIdx }
          // we ensure that there is single pptxStyles close element created
          // for all nested pptxStyle calls
          const createStyleEnd = opened.length === 0
          processStyleClosingTag(doc, opening, ending, pptxStylesEl, pptxStylesStartMap, createStyleEnd)
        }

        const foundStartIdx = remainingText.indexOf(startStyleCall)

        if (foundStartIdx !== -1) {
          remainingText = remainingText.slice(foundStartIdx + startStyleCall.length)

          // we ensure that there is single pptxStyles element created
          // for all nested pptxStyle calls
          if (opened.length === 0) {
            pptxStylesEl = processStyleOpeningTag(doc, el)
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

function processStyleOpeningTag (doc, el) {
  const commonParentEl = findCommonParent(el.parentNode, validParents)

  let stylesEl = commonParentEl.previousSibling
  const isPptxStylesTag = stylesEl?.tagName === 'pptxRemove' && stylesEl?.textContent.startsWith("{{#pptxSData type='styles'")

  if (!isPptxStylesTag) {
    stylesEl = processOpeningTag(doc, commonParentEl, "{{#pptxSData type='styles'}}")
  }

  return stylesEl
}

function processStyleClosingTag (doc, opening, ending, pptxStyleStartEl, pptxStylesStartMap, createStyleEnd) {
  const startIdx = opening.start
  const styleId = opening.id
  const openingEl = opening.el
  const endIdx = ending.start
  const endingEl = ending.el

  const leftStartText = openingEl.textContent.slice(0, startIdx)
  const targetStartText = openingEl.textContent.slice(startIdx)
  const helperCall = targetStartText.match(pptxStyleCallRegExp)[0]
  const leftEndText = endingEl.textContent.slice(0, endIdx)
  const targetEndText = endingEl.textContent.slice(endIdx)

  openingEl.textContent = leftStartText + targetStartText.replace(pptxStyleCallRegExp, helperCall.replace(startStyleCall, `{{pptxStyle id="${styleId}"`))
  endingEl.textContent = leftEndText + targetEndText.replace(endStyleCall, '$pptxStyleEnd')

  if (!createStyleEnd) {
    return
  }

  const hasEndStyles = pptxStylesStartMap.get(pptxStyleStartEl) != null

  if (hasEndStyles) {
    return
  }

  const commonParentEl = findCommonParent(endingEl.parentNode, validParents)
  const pptxStylesEndEl = processClosingTag(doc, commonParentEl, '{{/pptxSData}}')
  pptxStylesStartMap.set(pptxStyleStartEl, pptxStylesEndEl)
}

function getPptxStyleCallRegexp () {
  return /{{[#/]pptxStyle ?[^{}]{0,500}}}/
}
