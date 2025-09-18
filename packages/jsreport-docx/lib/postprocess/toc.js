const { DOMParser } = require('@xmldom/xmldom')
const recursiveStringReplaceAsync = require('../recursiveStringReplaceAsync')
const { nodeListToArray, findDefaultStyleIdForName, serializeXml } = require('../utils')

module.exports = async (files) => {
  const stylesDoc = files.find(f => f.path === 'word/styles.xml').doc
  const settingsDoc = files.find(f => f.path === 'word/settings.xml').doc
  const contentTypesDoc = files.find(f => f.path === '[Content_Types].xml').doc
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const titles = []

  const levelIds = new Map()
  const listIds = new Map()
  const tocStyleIdRegExp = /^([^\d]+)(\d+)/
  const tocOptionalPrefixStyleId = /^([^\d]*)(\d+)$/

  const TOCExists = contentTypesDoc.documentElement.getAttribute('TOCExists') === '1'
  let updateFields = true

  if (TOCExists) {
    contentTypesDoc.documentElement.removeAttribute('TOCExists')
  }

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<TOCHeading>',
    '</TOCHeading>',
    'g',
    async (val, content, hasNestedMatch) => {
      if (hasNestedMatch) {
        return val
      }

      const docEl = new DOMParser().parseFromString(content).documentElement
      const tEls = nodeListToArray(docEl.getElementsByTagName('w:t'))

      for (const tEl of tEls) {
        const match = tEl.textContent.match(/\$docxTOCOptions([^$]*)\$/)

        if (match == null || match[1] == null || match[1] === '') {
          continue
        }

        // remove chart helper text
        tEl.textContent = tEl.textContent.replace(match[0], '')

        const tocOptions = JSON.parse(Buffer.from(match[1], 'base64').toString())

        if (tocOptions.updateFields == null || typeof tocOptions.updateFields !== 'boolean') {
          continue
        }

        updateFields = tocOptions.updateFields
        break
      }

      return serializeXml(docEl)
    }
  )

  if (TOCExists && updateFields) {
    // add here the setting of the document to automatically recalculate fields on open,
    // this allows the MS Word to prompt the user to update the page numbers or toc table
    // when opening the generated file
    const existingUpdateFieldsEl = settingsDoc.documentElement.getElementsByTagName('w:updateFields')[0]

    // if the setting is already on the document we don't generate it
    if (existingUpdateFieldsEl == null) {
      const doc = new DOMParser().parseFromString('<w:p></w:p>')
      const newUpdateFieldsEl = doc.createElement('w:updateFields')
      newUpdateFieldsEl.setAttribute('w:val', 'true')
      settingsDoc.documentElement.insertBefore(newUpdateFieldsEl, settingsDoc.documentElement.firstChild)
    }
  }

  let lastLevel

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<TOCTitle>',
    '</TOCTitle>',
    'g',
    async (val, content, hasNestedMatch) => {
      if (hasNestedMatch) {
        return val
      }

      let tocTitlePrefix = findDefaultStyleIdForName(stylesDoc, 'heading 1')
      const tocTitleMatch = tocOptionalPrefixStyleId.exec(tocTitlePrefix)

      if (tocTitleMatch != null && tocTitleMatch[1] != null) {
        // it is possible that the prefix is just "" because the identifier may be just a number
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
        // this regexp works also for the case in which the prefix is empty string
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

        let currentLevelItem = levelIds.get(title.level) || 0

        if (title.level > 1 && lastLevel != null && title.level > lastLevel) {
          currentLevelItem = 0
        }

        title.levelItemId = currentLevelItem + 1
        levelIds.set(title.level, title.levelItemId)

        lastLevel = title.level
      }

      const bookmarkStartEl = nodeListToArray(paragraphEl.childNodes).find((el) => el.nodeName === 'w:bookmarkStart')
      const textContainerEl = nodeListToArray(paragraphEl.childNodes).find((el) => el.nodeName === 'w:r')

      if (textContainerEl != null && bookmarkStartEl != null) {
        title.title = paragraphEl.textContent

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

      let tocAlternativeTitlePrefix = findDefaultStyleIdForName(stylesDoc, 'toc 1')
      const tocAlternativeTitleMatch = tocStyleIdRegExp.exec(tocAlternativeTitlePrefix)

      if (tocAlternativeTitleMatch != null && tocAlternativeTitleMatch[1] != null) {
        tocAlternativeTitlePrefix = tocAlternativeTitleMatch[1]
      }

      const sdtContentEl = new DOMParser().parseFromString(val).documentElement

      const paragraphWithHyperlinkEls = nodeListToArray(sdtContentEl.childNodes).filter(
        (el) => el.nodeName === 'w:p'
      ).filter(
        (pEl) => nodeListToArray(pEl.childNodes).find((cEl) => cEl.nodeName === 'w:hyperlink') != null
      )

      const paragraphRefEl = paragraphWithHyperlinkEls[0]
      let lastParagraphEl = paragraphRefEl

      if (paragraphWithHyperlinkEls.length > 0) {
        // delete all from second paragraph to the last paragraph with hyperlink
        for (let idx = 1; idx < paragraphWithHyperlinkEls.length; idx++) {
          const paragraphEl = paragraphWithHyperlinkEls[idx]
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
              const pStyleEl = nodeListToArray(childNode.childNodes).find((el) => el.nodeName === 'w:pStyle')

              if (pStyleEl != null) {
                if (tocAlternativeTitlePrefix == null) {
                  throw new Error('Could not find default style for toc heading')
                }

                pStyleEl.setAttribute('w:val', `${tocAlternativeTitlePrefix}${titleInfo.level}`)
              }

              const tabsEl = nodeListToArray(childNode.childNodes).filter((el) => el.nodeName === 'w:tabs')[0]

              if (tabsEl == null) {
                continue
              }

              const leftTabEl = nodeListToArray(tabsEl.childNodes).find((el) => el.nodeName === 'w:tab' && el.getAttribute('w:val') === 'left')

              if (leftTabEl == null) {
                continue
              }

              // if there are more than 9 items in the same level then we need to increase the position of the tab
              // as if there is one level more, this is because the number of characters in the toc increases
              const targetLevel = titleInfo.levelItemId >= 10 ? titleInfo.level + 1 : titleInfo.level
              const pos = 480 + ((480 / 2) * (targetLevel - 1))
              leftTabEl.setAttribute('w:pos', pos)
            } else if (childNode.nodeName === 'w:r') {
              // preserve the w:r with w:fldChar and w:instrText only for the first title element
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

              let elForTitle = rEls[0]

              if (
                (rEls.length > 1 && hasPointSuffix) ||
                (rEls.length > 2 && titleInfo.listItemId != null)
              ) {
                let level

                if (titleInfo.listItemId != null) {
                  level = titleInfo.listItemId
                } else {
                  level = titleInfo.levelItemId
                }

                updateTextInNode(rEls[0], `${level}${hasPointSuffix ? '.' : ''}`)
                elForTitle = rEls[1]
              }

              updateTextInNode(elForTitle, titleInfo.title)

              const instrTextEl = childNode.getElementsByTagName('w:instrText')[0]

              if (instrTextEl != null) {
                instrTextEl.textContent = instrTextEl.textContent.replace(titles[0].bookmark.name, titleInfo.bookmark.name)
              }
            }
          }

          if (newParagraphEl != null) {
            lastParagraphEl.parentNode.insertBefore(newParagraphEl, lastParagraphEl.nextSibling)
            lastParagraphEl = newParagraphEl
          }
        }
      }

      return serializeXml(sdtContentEl)
    }
  )
}
