
const regexp = /{{#pptxTable [^{}]{0,500}}}/

function processClosingTag (doc, el) {
  el.textContent = el.textContent.replace('{{/pptxTable}}', '')

  const wpElement = el.parentNode.parentNode.parentNode.parentNode
  const fakeElement = doc.createElement('docxRemove')
  fakeElement.textContent = '{{/pptxTable}}'

  wpElement.parentNode.insertBefore(fakeElement, wpElement.nextSibling)
}

// the same idea as list, check the docs there
module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    const doc = f.doc
    const elements = doc.getElementsByTagName('w:t')

    let openedDocx = false

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]

      if (el.textContent.includes('{{/pptxTable}}') && openedDocx) {
        openedDocx = false
        processClosingTag(doc, el)
      }

      if (el.textContent.includes('{{#pptxTable')) {
        const helperCall = el.textContent.match(regexp)[0]
        const wpElement = el.parentNode.parentNode.parentNode.parentNode
        const fakeElement = doc.createElement('docxRemove')
        fakeElement.textContent = helperCall

        wpElement.parentNode.insertBefore(fakeElement, wpElement)
        el.textContent = el.textContent.replace(regexp, '')
        if (el.textContent.includes('{{/pptxTable')) {
          processClosingTag(doc, el)
        } else {
          openedDocx = true
        }
      }
    }
  }
}
