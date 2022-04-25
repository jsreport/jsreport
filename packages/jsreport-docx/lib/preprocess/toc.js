const { nodeListToArray, findDefaultStyleIdForName } = require('../utils')

module.exports = (files) => {
  const stylesFile = files.find(f => f.path === 'word/styles.xml').doc
  const documentFile = files.find(f => f.path === 'word/document.xml').doc
  const contentTypesFile = files.find(f => f.path === '[Content_Types].xml').doc
  const paragraphEls = nodeListToArray(documentFile.getElementsByTagName('w:p'))

  // we depend on the preprocess - bookmark to execute first, to get the max bookmark currently
  let maxBookmarkId = contentTypesFile.documentElement.getAttribute('bookmarkMaxId')

  if (maxBookmarkId != null && maxBookmarkId !== '') {
    maxBookmarkId = parseInt(maxBookmarkId, 10)
  } else {
    maxBookmarkId = null
  }

  const tocStyleIdRegExp = /^([^\d]+)(\d+)/

  let tocTitlePrefix = findDefaultStyleIdForName(stylesFile, 'heading 1')

  if (tocTitlePrefix == null) {
    return
  }

  const tocTitleMatch = tocStyleIdRegExp.exec(tocTitlePrefix)

  if (tocTitleMatch != null && tocTitleMatch[1] != null) {
    tocTitlePrefix = tocTitleMatch[1]
  } else {
    throw new Error('Could not find default style for heading')
  }

  paragraphEls.forEach((paragraphEl) => {
    const pPrEl = nodeListToArray(paragraphEl.childNodes).find((el) => el.nodeName === 'w:pPr')
    let hasTOCTitle = false

    if (pPrEl == null) {
      return
    }

    const pStyleEl = nodeListToArray(pPrEl.childNodes).find((el) => el.nodeName === 'w:pStyle')
    const titleRegexp = new RegExp(`^${tocTitlePrefix}(\\d+)$`)

    if (pStyleEl != null) {
      const result = titleRegexp.exec(pStyleEl.getAttribute('w:val'))

      if (result != null) {
        const titleType = parseInt(result[1], 10)
        hasTOCTitle = !isNaN(titleType) && titleType <= 3
      }
    }

    if (hasTOCTitle) {
      const clonedParagraphEl = paragraphEl.cloneNode(true)
      const textNode = clonedParagraphEl.getElementsByTagName('w:t')[0]

      // we verify that bookmark exists on title elements, if not there it means that we have to create it
      if (textNode != null && textNode.parentNode.previousSibling?.nodeName !== 'w:bookmarkStart') {
        const rNode = textNode.parentNode
        const bookmarkStartEl = documentFile.createElement('w:bookmarkStart')
        const bookmarkEndEl = documentFile.createElement('w:bookmarkEnd')

        maxBookmarkId++
        bookmarkStartEl.setAttribute('w:id', maxBookmarkId)
        bookmarkStartEl.setAttribute('w:name', `_Toc${randomInteger(30000000, 90000000)}_r'`)
        bookmarkEndEl.setAttribute('w:id', maxBookmarkId)

        rNode.parentNode.insertBefore(bookmarkStartEl, rNode)
        rNode.parentNode.insertBefore(bookmarkEndEl, rNode.nextSibling)
      }

      const wrapperEl = documentFile.createElement('TOCTitle')
      wrapperEl.appendChild(clonedParagraphEl)
      paragraphEl.parentNode.replaceChild(wrapperEl, paragraphEl)
    }
  })

  if (maxBookmarkId != null) {
    contentTypesFile.documentElement.setAttribute('bookmarkMaxId', maxBookmarkId)
  }
}

function randomInteger (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
