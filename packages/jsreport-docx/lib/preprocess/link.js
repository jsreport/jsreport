const path = require('path')
const { nodeListToArray, decodeURIComponentRecursive } = require('../utils')

// the endnotes/footnotes/hyperlinks are defined at two places, in the endnotes|footnotes.xml
// where is the definition and in document where is just the reference.
// we in the preprocess move the definition inside the reference element.
// This makes handlebars loops properly cloning multiple notes.
// in the postprocess we put the definition back to the endnotes.xml to make it valid docx again
// The same applies to the footnotes and hyperlinks, just with different files.
module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    processEndnotes(files, f)
    processHyperlinks(files, f)
    processFootnotes(files, f)
  }
}

function processEndnotes (files, currentFile) {
  const doc = currentFile.doc
  const endnoteReferenceElements = doc.getElementsByTagName('w:endnoteReference')
  let docEndnotes = files.find(f => f.path === 'word/endnotes.xml')

  if (!docEndnotes) {
    return
  }

  docEndnotes = docEndnotes.doc

  for (let i = 0; i < endnoteReferenceElements.length; i++) {
    const el = endnoteReferenceElements[i]
    const refId = el.getAttribute('w:id')
    const endnotes = nodeListToArray(docEndnotes.getElementsByTagName('w:endnote'))
    const endnoteEl = endnotes.filter(e => e.getAttribute('w:id') === refId)[0]

    el.removeAttribute('w:id')

    const clonedEndnoteEl = endnoteEl.cloneNode(true)

    clonedEndnoteEl.removeAttribute('w:id')

    const fakeElement = doc.createElement('docxRemove')
    fakeElement.appendChild(clonedEndnoteEl)

    el.insertBefore(fakeElement, el.firstChild)

    endnoteEl.parentNode.removeChild(endnoteEl)
  }
}

function processHyperlinks (files, currentFile) {
  const doc = currentFile.doc
  const hyperlinkElements = doc.getElementsByTagName('w:hyperlink')
  let docRels = files.find(f => f.path === `word/_rels/${path.basename(currentFile.path)}.rels`)

  if (!docRels) {
    return
  }

  docRels = docRels.doc

  for (let i = 0; i < hyperlinkElements.length; i++) {
    const el = hyperlinkElements[i]
    const relationshipId = el.getAttribute('r:id')

    if (!relationshipId) {
      // the hyperlink does not reference an url
      continue
    }

    const rels = nodeListToArray(docRels.getElementsByTagName('Relationships')[0].getElementsByTagName('Relationship'))
    const relationshipEl = rels.filter(r => r.getAttribute('Id') === relationshipId && r.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink')[0]

    el.removeAttribute('r:id')

    const clonedRelationshipEl = relationshipEl.cloneNode()

    // word stores link's value encoded
    const decodedTarget = decodeURIComponentRecursive(clonedRelationshipEl.getAttribute('Target'))

    if (decodedTarget.includes('{{')) {
      clonedRelationshipEl.setAttribute('Target', decodedTarget)
    }

    clonedRelationshipEl.removeAttribute('Id')

    const fakeElement = doc.createElement('docxRemove')
    fakeElement.appendChild(clonedRelationshipEl)

    el.insertBefore(fakeElement, el.firstChild)

    relationshipEl.parentNode.removeChild(relationshipEl)
  }
}

function processFootnotes (files, currentFile) {
  const doc = currentFile.doc
  const footnoteReferenceElements = doc.getElementsByTagName('w:footnoteReference')
  let docFootnotes = files.find(f => f.path === 'word/footnotes.xml')

  if (!docFootnotes) {
    return
  }

  docFootnotes = docFootnotes.doc

  for (let i = 0; i < footnoteReferenceElements.length; i++) {
    const el = footnoteReferenceElements[i]
    const refId = el.getAttribute('w:id')
    const footnotes = nodeListToArray(docFootnotes.getElementsByTagName('w:footnote'))
    const footnoteEl = footnotes.filter(e => e.getAttribute('w:id') === refId)[0]

    if (!footnoteEl) {
      continue
    }

    el.removeAttribute('w:id')

    const clonedFootnoteEl = footnoteEl.cloneNode(true)
    clonedFootnoteEl.removeAttribute('w:id')

    const fakeElement = doc.createElement('docxRemove')
    fakeElement.appendChild(clonedFootnoteEl)

    el.insertBefore(fakeElement, el.firstChild)

    footnoteEl.parentNode.removeChild(footnoteEl)
  }
}
