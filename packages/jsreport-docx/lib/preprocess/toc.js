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

  paragraphEls.forEach((paragraphEl, paragraphIdx) => {
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

          for (const nptNode of nextParagraphTextNodes) {
            const childIfOpeningBlockHelperMatches = [...nptNode.textContent.matchAll(getIfOpeningBlockRegExp())]
            const childIfClosingBlockHelperMatches = [...nptNode.textContent.matchAll(getIfClosingBlockRegExp())]

            openedIfTags += childIfOpeningBlockHelperMatches.length
            openedIfTags -= childIfClosingBlockHelperMatches.length

            if (openedIfTags === 0) {
              closeIfTextMatchInfo = {
                paragraphNode: nextParagraphEl,
                node: nptNode,
                // this only works fine when the close if node does not contain another close if node in there,
                // there can be other text there, but not other close if node
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

        const fakeOpenIfElement = documentFile.createElement('docxRemove')
        fakeOpenIfElement.textContent = ifOpeningBlockHelperMatches[0]

        paragraphEl.parentNode.insertBefore(fakeOpenIfElement, paragraphEl)

        // remove `{{/if}}` from next paragraph and insert it as tmp block before
        // the paragraph that contains the close if
        const fakeCloseIfElement = documentFile.createElement('docxRemove')

        closeIfTextMatchInfo.node.textContent = `${
          closeIfTextMatchInfo.node.textContent.slice(0, closeIfTextMatchInfo.match.index)
        }${
          closeIfTextMatchInfo.node.textContent.slice(closeIfTextMatchInfo.match.index + closeIfTextMatchInfo.match[0].length)
        }`

        fakeCloseIfElement.textContent = '{{/if}}'

        closeIfTextMatchInfo.paragraphNode.parentNode.insertBefore(fakeCloseIfElement, closeIfTextMatchInfo.paragraphNode)

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
