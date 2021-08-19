const { DOMParser } = require('@xmldom/xmldom')
const stringReplaceAsync = require('../stringReplaceAsync')
const { serializeXml, getNewIdFromBaseId } = require('../utils')

module.exports = async (files, newBookmarksMap) => {
  const contentTypesFile = files.find(f => f.path === '[Content_Types].xml').doc
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const bookmarkIdCounterMap = new Map()
  const lastBookmarkIdMap = new Map()

  let maxBookmarkId

  if (contentTypesFile.documentElement.hasAttribute('bookmarkMaxId')) {
    maxBookmarkId = parseInt(contentTypesFile.documentElement.getAttribute('bookmarkMaxId'), 10)
    contentTypesFile.documentElement.removeAttribute('bookmarkMaxId')
  }

  documentFile.data = await stringReplaceAsync(
    documentFile.data.toString(),
    /<w:bookmark(Start|End)[^>]*\/>/g,
    async (val) => {
      let changedBookmarkId = false

      const bookmarkEl = new DOMParser().parseFromString(val).documentElement
      const bookmarkId = getBookmarkId(bookmarkEl)

      // fix id for elements that have been generated after loop
      if (bookmarkId != null) {
        if (bookmarkEl.nodeName === 'w:bookmarkStart') {
          const bookmarkName = bookmarkEl.getAttribute('w:name')
          const newBookmarkId = getNewIdFromBaseId(bookmarkIdCounterMap, bookmarkId, maxBookmarkId || 0)

          if (newBookmarkId !== bookmarkId) {
            const newBookmarkName = `${bookmarkName}_c${newBookmarkId}`
            changedBookmarkId = true
            maxBookmarkId = newBookmarkId
            lastBookmarkIdMap.set(bookmarkId, newBookmarkId)

            const existingInNewMap = newBookmarksMap.get(bookmarkName) || []

            existingInNewMap.push({
              newId: newBookmarkId,
              newName: newBookmarkName
            })

            newBookmarksMap.set(bookmarkName, existingInNewMap)

            bookmarkEl.setAttribute('w:id', newBookmarkId)
            bookmarkEl.setAttribute('w:name', newBookmarkName)
          }
        } else if (bookmarkEl.nodeName === 'w:bookmarkEnd' && lastBookmarkIdMap.has(bookmarkId)) {
          changedBookmarkId = true
          bookmarkEl.setAttribute('w:id', lastBookmarkIdMap.get(bookmarkId))
        }
      }

      return changedBookmarkId ? serializeXml(bookmarkEl) : val
    }
  )
}

function getBookmarkId (bookmarkEl) {
  const id = parseInt(bookmarkEl.getAttribute('w:id'), 10)

  if (isNaN(id)) {
    return
  }

  return id
}
