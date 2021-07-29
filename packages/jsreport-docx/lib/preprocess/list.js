const regexp = /{{#docxList [^{}]{0,500}}}/

// the problem is that we want to run #docxList helper as #each, but we want to iterave over whole list item
// this means we need to put the #docxList up the tree so it encapsulates whole list item

// we find {{docxList}} literal in the w:t element and move it up the tree so it is before the first w:p
// to keep xml valid we put the helper call inside <docxRemove> node, so in the end it looks something like
// <docxRemove>{{#docxList aaa}}</docxRemove>
// <w:p><w:r><w:t>{{some binding}}</w:t></w:r></w:p>
// <docxRemove<{{/docxList}}</docxRemove>

function processClosingTag (doc, el) {
  el.textContent = el.textContent.replace('{{/docxList}}', '')

  const wpElement = el.parentNode.parentNode
  const fakeElement = doc.createElement('docxRemove')
  fakeElement.textContent = '{{/docxList}}'

  wpElement.parentNode.insertBefore(fakeElement, wpElement.nextSibling)
}

module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    const doc = f.doc
    const elements = doc.getElementsByTagName('w:t')
    let openTags = 0

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]

      if (el.textContent.includes('{{/docxList}}') && openTags > 0) {
        openTags--
        processClosingTag(doc, el)
      }

      if (el.textContent.includes('{{#docxList')) {
        openTags++
        const helperCall = el.textContent.match(regexp)[0]
        const wpElement = el.parentNode.parentNode
        const fakeElement = doc.createElement('docxRemove')
        fakeElement.textContent = helperCall

        wpElement.parentNode.insertBefore(fakeElement, wpElement)
        el.textContent = el.textContent.replace(regexp, '')

        if (el.textContent.includes('{{/docxList')) {
          openTags--
          processClosingTag(doc, el)
        }
      }
    }
  }
}
