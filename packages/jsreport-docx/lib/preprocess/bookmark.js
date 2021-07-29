const { nodeListToArray } = require('../utils')

module.exports = (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml').doc
  const contentTypesFile = files.find(f => f.path === '[Content_Types].xml').doc
  const bookmarkEls = nodeListToArray(documentFile.getElementsByTagName('w:bookmarkStart'))
  let maxBookmarkId

  bookmarkEls.forEach((bookmarkEl) => {
    const bookmarkId = getBookmarkId(bookmarkEl)

    if (
      bookmarkId != null &&
      (
        maxBookmarkId == null ||
        (maxBookmarkId != null && bookmarkId > maxBookmarkId)
      )
    ) {
      maxBookmarkId = bookmarkId
    }
  })

  if (maxBookmarkId != null) {
    contentTypesFile.documentElement.setAttribute('bookmarkMaxId', maxBookmarkId)
  }
}

function getBookmarkId (bookmarkEl) {
  const id = parseInt(bookmarkEl.getAttribute('w:id'), 10)

  if (isNaN(id)) {
    return
  }

  return id
}
