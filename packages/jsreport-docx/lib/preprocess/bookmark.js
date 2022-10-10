const { nodeListToArray } = require('../utils')

module.exports = (files, headerFooterRefs) => {
  const documentDoc = files.find(f => f.path === 'word/document.xml').doc
  const contentTypesDoc = files.find(f => f.path === '[Content_Types].xml').doc
  const toProcess = [documentDoc]
  const refs = { maxBookmarkId: null }

  for (const hfRef of headerFooterRefs) {
    toProcess.push(hfRef.doc)
  }

  for (const targetDoc of toProcess) {
    processBookmark(targetDoc, refs)
  }

  if (refs.maxBookmarkId != null) {
    contentTypesDoc.documentElement.setAttribute('bookmarkMaxId', refs.maxBookmarkId)
  }
}

function processBookmark (doc, refs) {
  const bookmarkEls = nodeListToArray(doc.getElementsByTagName('w:bookmarkStart'))

  bookmarkEls.forEach((bookmarkEl) => {
    const bookmarkId = getBookmarkId(bookmarkEl)

    if (
      bookmarkId != null &&
      (
        refs.maxBookmarkId == null ||
        (refs.maxBookmarkId != null && bookmarkId > refs.maxBookmarkId)
      )
    ) {
      refs.maxBookmarkId = bookmarkId
    }
  })
}

function getBookmarkId (bookmarkEl) {
  const id = parseInt(bookmarkEl.getAttribute('w:id'), 10)

  if (isNaN(id)) {
    return
  }

  return id
}
