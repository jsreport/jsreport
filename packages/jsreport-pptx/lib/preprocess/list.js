const regexp = /{{#pptxList [^{}]{0,500}}}/

// this looks so far identical to the docxList, except the xml namespace w:p -> a:p

// the problem is that we want to run #pptxList helper as #each, but we want to iterave over whole list item
// this means we need to put the #pptxList up the tree so it encapsulates whole list item

// we find {{pptxList}} literal in the a:t element and move it up the tree so it is before the first w:p
// to keep xml valid we put the helper call inside <pptxRemove> node, so in the end it looks something like
// <pptxRemove>{{#pptxList aaa}}</pptxRemove>
// <a:p><a:r><a:t>{{some binding}}</a:t></a:r></a:p>
// <pptxRemove<{{/pptxList}}</pptxRemove>

function processClosingTag (doc, el) {
  el.textContent = el.textContent.replace('{{/pptxList}}', '')

  const wpElement = el.parentNode.parentNode
  const fakeElement = doc.createElement('pptxRemove')
  fakeElement.textContent = '{{/pptxList}}'

  wpElement.parentNode.insertBefore(fakeElement, wpElement.nextSibling)
}

module.exports = (files) => {
  for (const file of files.filter(f => f.path.includes('ppt/slides/slide'))) {
    const doc = file.doc
    const elements = doc.getElementsByTagName('a:t')

    let openedPptx = false

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]

      if (el.textContent.includes('{{/pptxList}}') && openedPptx) {
        openedPptx = false
        processClosingTag(doc, el)
      }

      if (el.textContent.includes('{{#pptxList')) {
        const helperCall = el.textContent.match(regexp)[0]
        const wpElement = el.parentNode.parentNode
        const fakeElement = doc.createElement('pptxRemove')
        fakeElement.textContent = helperCall

        wpElement.parentNode.insertBefore(fakeElement, wpElement)
        el.textContent = el.textContent.replace(regexp, '')
        if (el.textContent.includes('{{/pptxList')) {
          processClosingTag(doc, el)
        } else {
          openedPptx = true
        }
      }
    }
  }
}
