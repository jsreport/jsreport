const { DOMParser } = require('@xmldom/xmldom')
const stringReplaceAsync = require('../stringReplaceAsync')
const { serializeXml, getNewIdFromBaseId, nodeListToArray } = require('../utils')

module.exports = async (files, headerFooterRefs, newBookmarksMap) => {
  const contentTypesFile = files.find(f => f.path === '[Content_Types].xml').doc
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const bookmarkIdCounterMap = new Map()
  const lastBookmarkIdMap = new Map()

  let maxBookmarkId

  if (contentTypesFile.documentElement.hasAttribute('bookmarkMaxId')) {
    maxBookmarkId = parseInt(contentTypesFile.documentElement.getAttribute('bookmarkMaxId'), 10)
    contentTypesFile.documentElement.removeAttribute('bookmarkMaxId')
  }

  const documentBookmarksMeta = {}

  documentFile.data = await stringReplaceAsync(
    documentFile.data.toString(),
    /<w:bookmark(Start|End)[^>]*\/>/g,
    async (val) => {
      const bookmarkEl = new DOMParser().parseFromString(val).documentElement
      const newBookmarkEl = processBookmarkEl(bookmarkEl, documentBookmarksMeta)

      if (newBookmarkEl === false) {
        return ''
      }

      if (newBookmarkEl != null) {
        return serializeXml(newBookmarkEl)
      }

      return val
    }
  )

  for (const { doc: headerFooterDoc } of headerFooterRefs) {
    const bookmarkStartEls = nodeListToArray(headerFooterDoc.getElementsByTagName('w:bookmarkStart'))
    const bookmarkEndEls = nodeListToArray(headerFooterDoc.getElementsByTagName('w:bookmarkEnd'))
    const bookmarkEls = [...bookmarkStartEls, ...bookmarkEndEls]
    const headerFooterBookmarksMeta = {}

    for (const bookmarkEl of bookmarkEls) {
      const newBookmarkEl = processBookmarkEl(bookmarkEl, headerFooterBookmarksMeta)

      if (newBookmarkEl === false) {
        bookmarkEl.parentNode.removeChild(bookmarkEl)
        continue
      }

      if (newBookmarkEl == null) {
        continue
      }

      bookmarkEl.parentNode.insertBefore(newBookmarkEl, bookmarkEl)
      bookmarkEl.parentNode.removeChild(bookmarkEl)
    }
  }

  function processBookmarkEl (referenceBookmarkEl, bookmarksMeta) {
    let changedBookmark = false
    const bookmarkEl = referenceBookmarkEl.cloneNode(true)
    const bookmarkId = getBookmarkId(bookmarkEl)
    const removeAfterFirstInstance = bookmarkEl.getAttribute('removeAfterFirstInstance') === 'true'

    if (removeAfterFirstInstance) {
      bookmarkEl.removeAttribute('removeAfterFirstInstance')
    }

    bookmarksMeta.start = bookmarksMeta.start || new Map()
    bookmarksMeta.end = bookmarksMeta.end || new Map()

    // fix id for elements that have been generated after loop
    if (bookmarkId != null) {
      if (bookmarkEl.nodeName === 'w:bookmarkStart') {
        const bookmarkName = bookmarkEl.getAttribute('w:name')

        if (!bookmarksMeta.start.has(bookmarkId)) {
          bookmarksMeta.start.set(bookmarkId, [])
        }

        const currentBookmarkStartMeta = bookmarksMeta.start.get(bookmarkId)

        if (removeAfterFirstInstance && currentBookmarkStartMeta.length > 0) {
          return false
        }

        const newBookmarkId = getNewIdFromBaseId(bookmarkIdCounterMap, bookmarkId, maxBookmarkId || 0)
        const hasNewId = bookmarkId !== newBookmarkId
        let newBookmarkName = hasNewId ? `${bookmarkName}_c${newBookmarkId}` : bookmarkName
        changedBookmark = hasNewId

        if (bookmarkEl.hasAttribute('customBookmarkName')) {
          changedBookmark = true
          const customBookmarkName = bookmarkEl.getAttribute('customBookmarkName')
          bookmarkEl.removeAttribute('customBookmarkName')

          if (customBookmarkName !== '') {
            newBookmarkName = customBookmarkName
          }
        }

        if (hasNewId) {
          maxBookmarkId = newBookmarkId
        }

        lastBookmarkIdMap.set(bookmarkId, newBookmarkId)

        const existingInNewMap = newBookmarksMap.get(bookmarkId) || []

        currentBookmarkStartMeta.push(newBookmarkId)

        existingInNewMap.push({
          newId: newBookmarkId,
          newName: newBookmarkName
        })

        newBookmarksMap.set(bookmarkId, existingInNewMap)

        bookmarkEl.setAttribute('w:id', newBookmarkId)
        bookmarkEl.setAttribute('w:name', newBookmarkName)
      } else if (bookmarkEl.nodeName === 'w:bookmarkEnd') {
        if (!bookmarksMeta.end.has(bookmarkId)) {
          bookmarksMeta.end.set(bookmarkId, [])
        }

        const currentBookmarkEndMeta = bookmarksMeta.end.get(bookmarkId)

        if (removeAfterFirstInstance && currentBookmarkEndMeta.length > 0) {
          return false
        }

        const newBookmarkId = lastBookmarkIdMap.get(bookmarkId)
        const hasNewId = newBookmarkId != null && bookmarkId !== newBookmarkId

        if (hasNewId) {
          changedBookmark = true
          bookmarkEl.setAttribute('w:id', newBookmarkId)
        }

        if (newBookmarkId != null) {
          currentBookmarkEndMeta.push(newBookmarkId)
        }
      }
    }

    if (removeAfterFirstInstance) {
      changedBookmark = true
    }

    return changedBookmark ? bookmarkEl : null
  }
}

function getBookmarkId (bookmarkEl) {
  const id = parseInt(bookmarkEl.getAttribute('w:id'), 10)

  if (isNaN(id)) {
    return
  }

  return id
}
