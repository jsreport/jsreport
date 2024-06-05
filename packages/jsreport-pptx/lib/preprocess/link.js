const path = require('path')
const { nodeListToArray, decodeURIComponentRecursive } = require('../utils')

// the hyperlinks are defined at two places, in the slide xml xml
// where is the definition and in slide xml where is just the reference (hlinkClick).
// we in the preprocess move the definition inside the reference element.
// This makes handlebars loops properly cloning multiple notes.
// in the postprocess we put the definition back to the source xml to make it valid pptx again.
// There is no support for endnotes/footnotes here because pptx does not support them natively,
// it seems they are a feature of a plugin, so we don't need to add special support for it.
module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    processHyperlinks(files, f)
  }
}

function processHyperlinks (files, currentFile) {
  const doc = currentFile.doc
  const hyperlinkClickElements = doc.getElementsByTagName('a:hlinkClick')

  let slideRels = files.find(f => f.path === `ppt/slides/_rels/${path.basename(currentFile.path)}.rels`)

  if (!slideRels) {
    return
  }

  slideRels = slideRels.doc

  for (let i = 0; i < hyperlinkClickElements.length; i++) {
    const el = hyperlinkClickElements[i]
    const relationshipId = el.getAttribute('r:id')

    if (!relationshipId) {
      // the hyperlink does not reference an url
      continue
    }

    const rels = nodeListToArray(slideRels.getElementsByTagName('Relationships')[0].getElementsByTagName('Relationship'))
    const relationshipEl = rels.filter(r => r.getAttribute('Id') === relationshipId && r.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink')[0]

    el.removeAttribute('r:id')

    const clonedRelationshipEl = relationshipEl.cloneNode()

    // pptx stores link's value encoded
    const decodedTarget = decodeURIComponentRecursive(clonedRelationshipEl.getAttribute('Target'))

    if (decodedTarget.includes('{{')) {
      clonedRelationshipEl.setAttribute('Target', decodedTarget)
    }

    clonedRelationshipEl.removeAttribute('Id')

    const fakeElement = doc.createElement('pptxRemove')
    fakeElement.appendChild(clonedRelationshipEl)

    el.insertBefore(fakeElement, el.firstChild)

    relationshipEl.parentNode.removeChild(relationshipEl)
  }
}
