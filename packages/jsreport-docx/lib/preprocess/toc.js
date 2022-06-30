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

  const ifOpeningBlockRegExp = /^({{#if\s[^}]+}})/
  const ifClosingBlockRegExp = /({{\/if}})/

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
      const originalTextNodes = paragraphEl.getElementsByTagName('w:t')
      if (originalTextNodes) {
        for (var i = 0; i < originalTextNodes.length; i++) {
          const originalTextNode = originalTextNodes[i]
          // pre-process headings to move `{{#if cond}}` opening block helpers to new paragraphs right before if they are at the very begining of the heading and matching `{{/if}}` closing block helpers are not in the same paragraph
          while (originalTextNode != null && originalTextNode.textContent != null && originalTextNode.textContent.startsWith("{{#if ")) {
            const ifOpeningBlockHelper = originalTextNode.textContent.match(ifOpeningBlockRegExp)
            const ifClosingBlockHelper = originalTextNode.textContent.match(ifClosingBlockRegExp)
            if (ifOpeningBlockHelper == null || (ifClosingBlockHelper != null && (ifOpeningBlockHelper.length == ifClosingBlockHelper.length))) {
              // leave heading untouched as the number of opening and closing block helpers are matching
              break
            }

            // remove `{{#if cond}}` from heading to new paragraph right before
            originalTextNode.textContent = originalTextNode.textContent.substring(ifOpeningBlockHelper[0].length)
            const ifBlockPEl = documentFile.createElement('w:p')
            const ifBlockREl = documentFile.createElement('w:r')
            const ifBlockTEl = documentFile.createElement('w:t')
            ifBlockTEl.textContent = ifOpeningBlockHelper[0]
            ifBlockREl.appendChild(ifBlockTEl)
            ifBlockPEl.appendChild(ifBlockREl)
            paragraphEl.parentNode.insertBefore(ifBlockPEl, paragraphEl)
          }
        }
      }

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

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
