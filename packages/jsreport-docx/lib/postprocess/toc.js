const { DOMParser } = require('@xmldom/xmldom')
const recursiveStringReplaceAsync = require('../recursiveStringReplaceAsync')
const { nodeListToArray, findDefaultStyleIdForName, serializeXml } = require('../utils')

module.exports = async (files) => {
  const stylesFile = files.find(f => f.path === 'word/styles.xml').doc
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const titles = []

  const listIds = new Map()

  const tocStyleIdRegExp = /^([^\d]+)(\d+)/

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<TOCTitle>',
    '</TOCTitle>',
    'g',
    async (val, content, hasNestedMatch) => {
      if (hasNestedMatch) {
        return val
      }

      let tocTitlePrefix = findDefaultStyleIdForName(stylesFile, 'heading 1')
      const tocTitleMatch = tocStyleIdRegExp.exec(tocTitlePrefix)

      if (tocTitleMatch != null && tocTitleMatch[1] != null) {
        tocTitlePrefix = tocTitleMatch[1]
      } else {
        throw new Error('Could not find default style for heading')
      }

      const paragraphEl = new DOMParser().parseFromString(val).documentElement.firstChild
      const title = { level: 1 }

      const pPrEl = nodeListToArray(paragraphEl.childNodes).find((el) => el.nodeName === 'w:pPr')

      if (pPrEl != null) {
        const pStyleEl = nodeListToArray(pPrEl.childNodes).find((el) => el.nodeName === 'w:pStyle')
        const numPrEl = nodeListToArray(pPrEl.childNodes).find((el) => el.nodeName === 'w:numPr')
        const titleRegexp = new RegExp(`^${tocTitlePrefix}(\\d+)$`)

        if (pStyleEl != null) {
          const result = titleRegexp.exec(pStyleEl.getAttribute('w:val'))

          if (result != null && !isNaN(parseInt(result[1], 10))) {
            const titleType = parseInt(result[1], 10)
            // level means if title is 1, 2, 3, usually title2, title3, etc are nested titles
            title.level = titleType
          }
        }

        if (numPrEl != null) {
          const numIdEl = nodeListToArray(numPrEl.childNodes).find((el) => el.nodeName === 'w:numId')
          const ilvlEl = nodeListToArray(numPrEl.childNodes).find((el) => el.nodeName === 'w:ilvl')

          if (numIdEl != null && ilvlEl != null) {
            const id = parseInt(numIdEl.getAttribute('w:val'), 10)
            const lvl = parseInt(ilvlEl.getAttribute('w:val'), 10)
            const currentListItem = listIds.get(id) || new Map()
            const currentIndex = currentListItem.get(lvl) || 0
            const listNumber = currentIndex + 1

            currentListItem.set(lvl, listNumber)
            listIds.set(id, currentListItem)

            const items = []

            for (let idx = lvl; idx >= 0; idx--) {
              const current = currentListItem.get(idx)

              if (current != null) {
                items.unshift(current)
              }
            }

            title.listItemId = items.join('.')
          }
        }
      }

      const bookmarkStartEl = nodeListToArray(paragraphEl.childNodes).find((el) => el.nodeName === 'w:bookmarkStart')
      const textContainerEl = nodeListToArray(paragraphEl.childNodes).find((el) => el.nodeName === 'w:r')

      if (textContainerEl != null && bookmarkStartEl != null) {
        title.title = textContainerEl.textContent

        title.bookmark = {
          id: bookmarkStartEl.getAttribute('w:id'),
          name: bookmarkStartEl.getAttribute('w:name')
        }

        titles.push(title)
      }

      return serializeXml(paragraphEl)
    }
  )

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<w:sdtContent>',
    '</w:sdtContent>',
    'g',
    async (val, content, hasNestedMatch) => {
      if (hasNestedMatch) {
        return val
      }

      let tocAlternativeTitlePrefix = findDefaultStyleIdForName(stylesFile, 'toc 1')
      const tocAlternativeTitleMatch = tocStyleIdRegExp.exec(tocAlternativeTitlePrefix)

      if (tocAlternativeTitleMatch != null && tocAlternativeTitleMatch[1] != null) {
        tocAlternativeTitlePrefix = tocAlternativeTitleMatch[1]
      }

      const sdtContentEl = new DOMParser().parseFromString(val).documentElement
      const paragraphEls = nodeListToArray(sdtContentEl.childNodes).filter((el) => el.nodeName === 'w:p')
      const paragraphRefEl = paragraphEls.find((pEl) => nodeListToArray(pEl.childNodes).find((cEl) => cEl.nodeName === 'w:hyperlink') != null)
      const paragraphRefIndex = paragraphEls.findIndex((pEl) => nodeListToArray(pEl.childNodes).find((cEl) => cEl.nodeName === 'w:hyperlink') != null)
      const lastParagraphEl = paragraphEls[paragraphEls.length - 1]

      if (paragraphEls.length > (paragraphRefIndex + 2)) {
        // delete all from second paragraph to the penultimate paragraph
        for (let idx = paragraphRefIndex + 1; idx < paragraphEls.length - 1; idx++) {
          const paragraphEl = paragraphEls[idx]
          paragraphEl.parentNode.removeChild(paragraphEl)
        }
      }

      if (paragraphRefEl != null) {
        let hasPointSuffix = false

        for (let idx = 0; idx < titles.length; idx++) {
          const titleInfo = titles[idx]
          const newParagraphEl = idx === 0 ? null : paragraphRefEl.cloneNode(true)
          const childNodes = nodeListToArray(idx === 0 ? paragraphRefEl.childNodes : newParagraphEl.childNodes)

          for (const childNode of childNodes) {
            if (childNode.nodeName === 'w:pPr') {
              const itemNumber = idx + 1
              const pStyleEl = nodeListToArray(childNode.childNodes).find((el) => el.nodeName === 'w:pStyle')

              if (pStyleEl != null) {
                if (tocAlternativeTitlePrefix == null) {
                  throw new Error('Could not find default style for toc heading')
                }

                pStyleEl.setAttribute('w:val', `${tocAlternativeTitlePrefix}${titleInfo.level}`)
              }

              if (itemNumber >= 10) {
                const tabsEl = nodeListToArray(childNode.childNodes).filter((el) => el.nodeName === 'w:tabs')[0]

                if (tabsEl == null) {
                  continue
                }

                const leftTabEl = nodeListToArray(tabsEl.childNodes).find((el) => el.nodeName === 'w:tab' && el.getAttribute('w:val') === 'left')

                if (leftTabEl == null) {
                  continue
                }

                leftTabEl.setAttribute('w:pos', 720)
              }
            } else if (childNode.nodeName === 'w:r') {
              if (idx !== 0) {
                childNode.parentNode.removeChild(childNode)
              }
            } else if (childNode.nodeName === 'w:hyperlink') {
              childNode.setAttribute('w:anchor', titleInfo.bookmark.name)

              const rEls = nodeListToArray(childNode.childNodes).filter((el) => {
                return el.nodeName === 'w:r' && nodeListToArray(el.childNodes).find((cEl) => cEl.nodeName === 'w:t') != null
              })

              if (idx === 0) {
                const rRefEl = rEls[0]

                if (rRefEl != null) {
                  const tRefEl = nodeListToArray(rRefEl.childNodes).find((el) => el.nodeName === 'w:t')

                  if (tRefEl != null) {
                    hasPointSuffix = tRefEl.textContent.endsWith('.')
                  }
                }
              }

              const updateTextInNode = (nodeEl, text) => {
                const tEl = nodeListToArray(nodeEl.childNodes).find((el) => el.nodeName === 'w:t')

                if (tEl != null) {
                  tEl.textContent = text
                }
              }

              if (rEls.length > 2 && titleInfo.listItemId != null) {
                updateTextInNode(rEls[0], `${titleInfo.listItemId}${hasPointSuffix ? '.' : ''}`)
              }

              updateTextInNode(rEls.length > 2 ? rEls[1] : rEls[0], titleInfo.title)

              const instrTextEl = childNode.getElementsByTagName('w:instrText')[0]

              if (instrTextEl != null) {
                instrTextEl.textContent = instrTextEl.textContent.replace(titles[0].bookmark.name, titleInfo.bookmark.name)
              }
            }
          }

          if (newParagraphEl != null) {
            lastParagraphEl.parentNode.insertBefore(newParagraphEl, lastParagraphEl)
          }
        }
      }

      return serializeXml(sdtContentEl)
    }
  )
}
