// the specification of {{docxStyle}} is very rich
// it should add color to all text between the docxStyle tag
// the problematic part is docxStyle crossing multiple paragraphs and ending in the middle
// and also the performance

// the solution is that we mark the paragraphs which contains styles, such paragraphs will ma loaded in dom during postprocessing
// the mark is represented by <docxStyles> element before paragraph starts and <docxStyleEnd> after paragraph ends
// at the place of the {{#docxStyle}} call we just add mark $docxStyleStart[id] so we can find exact position of the start during post-process
// the <docxStyle> node will then include the handlebars generated values for color

const regexp = /{{#docxStyle [^{}]{0,500}}}/

let styleIdCounter = 1

function processClosingTag (doc, openingEl, el, stylesEl) {
  const styleId = styleIdCounter++
  const helperCall = openingEl.textContent.match(regexp)[0]

  const fakeElement = doc.createElement('docxRemove')
  fakeElement.textContent = helperCall.replace('{{#docxStyle', `{{docxStyle id=${styleId}`)
  stylesEl.appendChild(fakeElement)

  openingEl.textContent = openingEl.textContent.replace(regexp, `$docxStyleStart${styleId}$`)
  el.textContent = el.textContent.replace('{{/docxStyle}}', '$docxStyleEnd')

  const wpElement = el.parentNode.parentNode
  if (!wpElement.nextSibling || wpElement.nextSibling.tagName !== 'docxStyleEnd') {
    const docxStyleEnd = doc.createElement('docxStyleEnd')
    wpElement.parentNode.insertBefore(docxStyleEnd, wpElement.nextSibling)
  }
}

module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    const doc = f.doc
    const elements = doc.getElementsByTagName('w:t')

    let openingEl = null
    let docxStylesEl = null

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]

      if (el.textContent.includes('{{/docxStyle}}') && openingEl) {
        processClosingTag(doc, openingEl, el, docxStylesEl)
        openingEl = null
      }

      if (el.textContent.includes('{{#docxStyle')) {
        openingEl = el

        const wpElement = el.parentNode.parentNode
        docxStylesEl = wpElement.previousSibling

        if (!docxStylesEl || docxStylesEl.tagName !== 'docxStyles') {
          docxStylesEl = doc.createElement('docxStyles')
          wpElement.parentNode.insertBefore(docxStylesEl, wpElement)
        }

        if (el.textContent.includes('{{/docxStyle')) {
          processClosingTag(doc, openingEl, el, docxStylesEl)
          openingEl = null
        }
      }
    }
  }
}
