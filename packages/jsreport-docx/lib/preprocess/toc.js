const { nodeListToArray, findDefaultStyleIdForName } = require('../utils')

module.exports = (files) => {
  const stylesDoc = files.find(f => f.path === 'word/styles.xml').doc
  const documentDoc = files.find(f => f.path === 'word/document.xml').doc
  const contentTypesDoc = files.find(f => f.path === '[Content_Types].xml').doc

  // we depend on the preprocess - bookmark to execute first, to get the max bookmark currently
  let maxBookmarkId = contentTypesDoc.documentElement.getAttribute('bookmarkMaxId')

  if (maxBookmarkId != null && maxBookmarkId !== '') {
    maxBookmarkId = parseInt(maxBookmarkId, 10)
  } else {
    maxBookmarkId = null
  }

  const tocStyleIdRegExp = /^([^\d]+)(\d+)$/
  const tocOptionalPrefixStyleId = /^([^\d]*)(\d+)$/
  const tocHeadingStyleId = findDefaultStyleIdForName(stylesDoc, 'TOC Heading')
  let tocAlternativeTitlePrefix = findDefaultStyleIdForName(stylesDoc, 'toc 1')

  const tocAlternativeTitleMatch = tocStyleIdRegExp.exec(tocAlternativeTitlePrefix)

  if (tocAlternativeTitleMatch != null && tocAlternativeTitleMatch[1] != null) {
    tocAlternativeTitlePrefix = tocAlternativeTitleMatch[1]
  } else {
    tocAlternativeTitlePrefix = ''
  }

  let hasTOC = false

  let paragraphTOCHeadingEl
  const sdtContentEls = nodeListToArray(documentDoc.getElementsByTagName('w:sdtContent'))

  for (const sdtContentEl of sdtContentEls) {
    const paragraphEls = nodeListToArray(sdtContentEl.getElementsByTagName('w:p'))

    const paragraphAlternativeTOCTitleEl = paragraphEls.find((pEl) => {
      const styleId = getParagraphStyleId(pEl)

      if (styleId == null || tocAlternativeTitlePrefix === '') {
        return false
      }

      return styleId.startsWith(tocAlternativeTitlePrefix) && tocStyleIdRegExp.test(styleId)
    })

    paragraphTOCHeadingEl = paragraphEls.find((pEl) => getParagraphStyleId(pEl) === tocHeadingStyleId)

    hasTOC = paragraphAlternativeTOCTitleEl != null || paragraphTOCHeadingEl != null

    if (hasTOC) {
      break
    }
  }

  if (!hasTOC) {
    return
  }

  contentTypesDoc.documentElement.setAttribute('TOCExists', '1')

  if (paragraphTOCHeadingEl != null) {
    const wrapperEl = documentDoc.createElement('TOCHeading')
    const clonedParagraphEl = paragraphTOCHeadingEl.cloneNode(true)
    wrapperEl.appendChild(clonedParagraphEl)
    paragraphTOCHeadingEl.parentNode.replaceChild(wrapperEl, paragraphTOCHeadingEl)
  }

  let tocTitlePrefix = findDefaultStyleIdForName(stylesDoc, 'heading 1')

  if (tocTitlePrefix == null) {
    return
  }

  const tocTitleMatch = tocOptionalPrefixStyleId.exec(tocTitlePrefix)

  if (tocTitleMatch != null && tocTitleMatch[1] != null) {
    // it is possible that the prefix is just "" because the identifier may be just a number
    tocTitlePrefix = tocTitleMatch[1]
  } else {
    throw new Error('Could not find default style for heading')
  }

  const paragraphEls = nodeListToArray(documentDoc.getElementsByTagName('w:p'))

  paragraphEls.forEach((paragraphEl, paragraphIdx) => {
    let hasTOCTitle = false

    const paragraphStyleId = getParagraphStyleId(paragraphEl)

    if (paragraphStyleId != null) {
      // this regexp works also for the case in which the prefix is empty string
      const titleRegexp = new RegExp(`^${tocTitlePrefix}(\\d+)$`)
      const result = titleRegexp.exec(paragraphStyleId)

      if (result != null) {
        const titleType = parseInt(result[1], 10)
        hasTOCTitle = !isNaN(titleType) && titleType <= 3
      }
    }

    if (!hasTOCTitle) {
      return
    }

    let evaluated = false
    let startIfNode

    const getIfOpeningBlockRegExp = () => /{{#if\s[^}]+}}/g
    const getIfClosingBlockRegExp = () => /{{\/if}}/g

    do {
      evaluated = true

      const originalMeaningfulTextNodes = nodeListToArray(paragraphEl.getElementsByTagName('w:t')).filter((t) => {
        return t.textContent != null && t.textContent.trim() !== ''
      })

      if (originalMeaningfulTextNodes.length === 0) {
        break
      }

      startIfNode = originalMeaningfulTextNodes[0].textContent.startsWith('{{#if ') ? originalMeaningfulTextNodes[0] : undefined

      if (startIfNode == null) {
        break
      }

      // pre-process headings to move `{{#if cond}}` opening block helpers to new level right before
      // the current paragraph if they are at the very beginning of the heading and
      // matching `{{/if}}` closing block helpers it is on the next paragraph
      const ifOpeningBlockHelperMatches = paragraphEl.textContent.match(getIfOpeningBlockRegExp()) || []
      const ifClosingBlockHelperMatches = paragraphEl.textContent.match(getIfClosingBlockRegExp()) || []

      // leave heading untouched as the number of opening and closing block helpers are matching
      if (ifOpeningBlockHelperMatches.length === ifClosingBlockHelperMatches.length) {
        break
      }

      // inspect next paragraphs and search for the exact close if for this node
      const nextParagraphEls = paragraphEls.slice(paragraphIdx + 1)

      if (nextParagraphEls.length === 0) {
        break
      }

      let closeIfTextMatchInfo
      let openedIfTags = ifOpeningBlockHelperMatches.length - ifClosingBlockHelperMatches.length

      for (const nextParagraphEl of nextParagraphEls) {
        const nextParagraphTextNodes = nodeListToArray(nextParagraphEl.getElementsByTagName('w:t'))

        for (const [nptIndex, nptNode] of nextParagraphTextNodes.entries()) {
          const childIfOpeningBlockHelperMatches = [...nptNode.textContent.matchAll(getIfOpeningBlockRegExp())]
          const childIfClosingBlockHelperMatches = [...nptNode.textContent.matchAll(getIfClosingBlockRegExp())]

          openedIfTags += childIfOpeningBlockHelperMatches.length
          openedIfTags -= childIfClosingBlockHelperMatches.length

          const remainingTextNodesInParagraph = nextParagraphTextNodes.slice(nptIndex + 1)

          // we match only when found the close if and also there is no more text nodes in the paragraph
          // that contain the close if
          if (openedIfTags === 0 && remainingTextNodesInParagraph.length === 0) {
            closeIfTextMatchInfo = {
              paragraphNode: nextParagraphEl,
              node: nptNode,
              // this only works fine when the close if node does not contain another close if (like "{{/if}}{{/if}}") node in there,
              // and also there is no more text on the same text node after the close if (like "{{/if}}something"), that won't work
              match: childIfClosingBlockHelperMatches[0]
            }

            break
          }
        }

        if (closeIfTextMatchInfo != null) {
          break
        }
      }

      if (closeIfTextMatchInfo == null) {
        break
      }

      // start the normalization

      // remove `{{#if cond}}` from heading and insert it as tmp block before the current paragraph
      startIfNode.textContent = startIfNode.textContent.slice(ifOpeningBlockHelperMatches[0].length)

      const fakeOpenIfElement = documentDoc.createElement('docxRemove')
      fakeOpenIfElement.textContent = ifOpeningBlockHelperMatches[0]

      paragraphEl.parentNode.insertBefore(fakeOpenIfElement, paragraphEl)

      // remove `{{/if}}` from next paragraph and insert it as tmp block before
      // the paragraph that contains the close if
      const fakeCloseIfElement = documentDoc.createElement('docxRemove')

      closeIfTextMatchInfo.node.textContent = `${
        closeIfTextMatchInfo.node.textContent.slice(0, closeIfTextMatchInfo.match.index)
      }${
        closeIfTextMatchInfo.node.textContent.slice(closeIfTextMatchInfo.match.index + closeIfTextMatchInfo.match[0].length)
      }`

      fakeCloseIfElement.textContent = '{{/if}}'

      closeIfTextMatchInfo.paragraphNode.parentNode.insertBefore(fakeCloseIfElement, closeIfTextMatchInfo.paragraphNode.nextSibling)

      const newMeaningfulTextNodes = nodeListToArray(paragraphEl.getElementsByTagName('w:t')).filter((t) => {
        return t.textContent != null && t.textContent.trim() !== ''
      })

      // if the new text content in paragraph start with if the do again the same normalization
      if (newMeaningfulTextNodes.length > 0 && newMeaningfulTextNodes[0].textContent.startsWith('{{#if ')) {
        evaluated = false
      }
    } while (!evaluated)

    const clonedParagraphEl = paragraphEl.cloneNode(true)
    const textNode = clonedParagraphEl.getElementsByTagName('w:t')[0]

    // we verify that bookmark exists on title elements, if not there it means that we have to create it
    if (textNode != null && textNode.parentNode.previousSibling?.nodeName !== 'w:bookmarkStart') {
      const rNode = textNode.parentNode
      const bookmarkStartEl = documentDoc.createElement('w:bookmarkStart')
      const bookmarkEndEl = documentDoc.createElement('w:bookmarkEnd')

      maxBookmarkId++
      bookmarkStartEl.setAttribute('w:id', maxBookmarkId)
      bookmarkStartEl.setAttribute('w:name', `_Toc${randomInteger(30000000, 90000000)}_r'`)
      bookmarkEndEl.setAttribute('w:id', maxBookmarkId)

      rNode.parentNode.insertBefore(bookmarkStartEl, rNode)
      rNode.parentNode.insertBefore(bookmarkEndEl, rNode.nextSibling)
    }

    const wrapperEl = documentDoc.createElement('TOCTitle')
    wrapperEl.appendChild(clonedParagraphEl)
    paragraphEl.parentNode.replaceChild(wrapperEl, paragraphEl)
  })

  if (maxBookmarkId != null) {
    contentTypesDoc.documentElement.setAttribute('bookmarkMaxId', maxBookmarkId)
  }
}

function getParagraphStyleId (pEl) {
  const pPrEl = nodeListToArray(pEl.childNodes).find((el) => el.nodeName === 'w:pPr')

  if (pPrEl == null) {
    return
  }

  const pStyleEl = nodeListToArray(pPrEl.childNodes).find((el) => el.nodeName === 'w:pStyle')

  if (pStyleEl == null) {
    return
  }

  const styleId = pStyleEl.getAttribute('w:val')

  if (styleId == null || styleId === '') {
    return
  }

  return styleId
}

function randomInteger (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
