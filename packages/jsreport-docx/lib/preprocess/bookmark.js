const {
  nodeListToArray, getPictureElInfo, processOpeningTag, processClosingTag,
  decodeURIComponentRecursive
} = require('../utils')

module.exports = (files, headerFooterRefs) => {
  const documentDoc = files.find(f => f.path === 'word/document.xml').doc
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const contentTypesDoc = files.find(f => f.path === '[Content_Types].xml').doc
  const toProcess = [{ doc: documentDoc, relsDoc: documentRelsDoc }]
  const refs = { maxBookmarkId: null }

  for (const hfRef of headerFooterRefs) {
    toProcess.push({ doc: hfRef.doc, relsDoc: hfRef.relsDoc })
  }

  for (const { doc: targetDoc, relsDoc: targetRelsDoc } of toProcess) {
    processBookmarks(targetDoc, targetRelsDoc, refs)
  }

  if (refs.maxBookmarkId != null) {
    contentTypesDoc.documentElement.setAttribute('bookmarkMaxId', refs.maxBookmarkId)
  }
}

function processBookmarks (doc, relsDoc, refs) {
  const bookmarkDocxImagesMap = new Map()
  const bookmarksToCreate = []

  const bookmarkStartEls = nodeListToArray(doc.getElementsByTagName('w:bookmarkStart'))
  const bookmarkEndEls = nodeListToArray(doc.getElementsByTagName('w:bookmarkEnd'))

  const goBackBookmarkStartEl = bookmarkStartEls.find((el) => el.getAttribute('w:name') === '_GoBack')

  // if found, we start by removing the special "_GoBack" bookmark that Word creates, we don't need it
  // and it is better if the produced docx starts clean without it
  if (goBackBookmarkStartEl) {
    const goBackBookmarkId = goBackBookmarkStartEl.getAttribute('w:id')
    const goBackBookmarkEndEl = bookmarkEndEls.find((el) => el.getAttribute('w:id') === goBackBookmarkId)

    goBackBookmarkStartEl.parentNode.removeChild(goBackBookmarkStartEl)

    if (goBackBookmarkEndEl) {
      goBackBookmarkEndEl.parentNode.removeChild(goBackBookmarkEndEl)
    }
  }

  if (relsDoc) {
    // we search for drawing elements because we want to find the bookmarks that are associated
    // with images, these bookmarks are normalized to always be inside the same container paragraph
    // of the image, this is to ensure that loops correctly generates new correctly placed bookmarks
    // for the images
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))
    let docxImageCount = 0

    for (const drawingEl of drawingEls) {
      const pictureElInfo = getPictureElInfo(drawingEl)
      const pictureEl = pictureElInfo.picture

      if (!pictureEl) {
        continue
      }

      const linkClickEls = pictureElInfo.links
      const linkClickEl = linkClickEls[0]

      if (!linkClickEl) {
        continue
      }

      const tooltip = linkClickEl.getAttribute('tooltip')

      // we assume it is a docx image if the tooltip contains handlebars syntax
      // we can not test for {{docxImage because user may be using a custom helper
      // that internally calls docxImage, so we just test for handlebars syntax
      if (!tooltip || !tooltip.includes('{{')) {
        continue
      }

      const hyperlinkRelId = linkClickEl.getAttribute('r:id')

      const hyperlinkRelEl = nodeListToArray(relsDoc.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === hyperlinkRelId
      })

      if (!hyperlinkRelEl) {
        continue
      }

      docxImageCount++

      const decodedTarget = decodeURIComponentRecursive(hyperlinkRelEl.getAttribute('Target'))
      // we ensure to create a bookmark always:
      // - even if the image is not linked to a bookmark (linked to a url)
      // - in the weird case the image is linked to the special bookmark "_GoBack" which Word creates
      const targetIsBookmark = decodedTarget.startsWith('#') && decodedTarget !== '#_GoBack'
      const targetBookmarkName = targetIsBookmark ? decodedTarget.slice(1) : `docxImage${docxImageCount}`

      if (!targetIsBookmark) {
        bookmarksToCreate.push({ name: targetBookmarkName, drawingEl })
      }

      if (!bookmarkDocxImagesMap.has(targetBookmarkName)) {
        bookmarkDocxImagesMap.set(targetBookmarkName, [])
      }

      // we collect the images this way because multiples images can point to
      // single bookmark, which happens easily if you duplicate a bookmarked image
      // in the docx template, we want to normalize this and have one bookmark per image
      const drawingImageMeta = bookmarkDocxImagesMap.get(targetBookmarkName)
      drawingImageMeta.push({ drawingEl, linkClickEl })
    }
  }

  const bookmarkNameElMap = new Map()

  for (const bookmarkStartEl of bookmarkStartEls) {
    const bookmarkId = getBookmarkId(bookmarkStartEl)
    const bookmarkName = bookmarkStartEl.getAttribute('w:name')
    const bookmarkEndEl = bookmarkEndEls.find((el) => el.getAttribute('w:id') === bookmarkId.toString())

    if (bookmarkName && bookmarkEndEl) {
      bookmarkNameElMap.set(bookmarkName, {
        start: bookmarkStartEl,
        end: bookmarkEndEl
      })
    }

    if (
      bookmarkId != null &&
      (
        refs.maxBookmarkId == null ||
        (refs.maxBookmarkId != null && bookmarkId > refs.maxBookmarkId)
      )
    ) {
      refs.maxBookmarkId = bookmarkId
    }
  }

  // handles case in which document does not contain any previous bookmarks
  if (refs.maxBookmarkId == null) {
    refs.maxBookmarkId = 0
  }

  for (const { name: bookmarkName, drawingEl } of bookmarksToCreate) {
    const newBookmarkId = refs.maxBookmarkId + 1
    const newBookmarkStartEl = doc.createElement('w:bookmarkStart')
    const newBookmarkEndEl = doc.createElement('w:bookmarkEnd')

    newBookmarkStartEl.setAttribute('w:id', newBookmarkId)
    newBookmarkStartEl.setAttribute('w:name', bookmarkName)

    newBookmarkEndEl.setAttribute('w:id', newBookmarkId)

    refs.maxBookmarkId = newBookmarkId

    const parentEl = drawingEl.parentNode

    parentEl.parentNode.insertBefore(newBookmarkStartEl, parentEl)
    parentEl.parentNode.insertBefore(newBookmarkEndEl, parentEl.nextSibling)

    bookmarkNameElMap.set(bookmarkName, {
      start: newBookmarkStartEl,
      end: newBookmarkEndEl
    })
  }

  for (const [bookmarkName, bookmarkDrawingImages] of bookmarkDocxImagesMap) {
    const bookmarkParts = bookmarkNameElMap.get(bookmarkName)

    if (!bookmarkParts) {
      continue
    }

    const { start: bookmarkStartEl, end: bookmarkEndEl } = bookmarkParts
    const isRecentlyCreated = bookmarksToCreate.find((info) => info.name === bookmarkName) != null

    for (const drawingImageMeta of bookmarkDrawingImages) {
      const { drawingEl, linkClickEl } = drawingImageMeta
      const newBookmarkStartEl = isRecentlyCreated ? bookmarkStartEl : bookmarkStartEl.cloneNode(true)
      const newBookmarkEndEl = isRecentlyCreated ? bookmarkEndEl : bookmarkEndEl.cloneNode(true)

      let newBookmarkId
      let newBookmarkName

      if (isRecentlyCreated) {
        // since these are new bookmarks created in this logic
        // we can re-use the same id and name
        newBookmarkId = parseInt(newBookmarkStartEl.getAttribute('w:id'), 10)
        newBookmarkName = newBookmarkStartEl.getAttribute('w:name')
      } else {
        // we always assign a new bookmark id, name for the bookmarks related to images
        newBookmarkId = refs.maxBookmarkId + 1
        refs.maxBookmarkId = newBookmarkId
        newBookmarkName = `${bookmarkName}_r${newBookmarkId}`
      }

      newBookmarkStartEl.setAttribute('w:id', newBookmarkId)
      newBookmarkStartEl.setAttribute('w:name', newBookmarkName)

      newBookmarkEndEl.setAttribute('w:id', newBookmarkId)

      linkClickEl.setAttribute('defaultTargetBookmarkId', newBookmarkId)

      newBookmarkStartEl.setAttribute('customBookmarkName', '{{@imageBookmarkName}}')

      newBookmarkStartEl.setAttribute('image', 'true')
      newBookmarkEndEl.setAttribute('image', 'true')

      if (!isRecentlyCreated) {
        const parentEl = drawingEl.parentNode
        parentEl.parentNode.insertBefore(newBookmarkStartEl, parentEl)
        parentEl.parentNode.insertBefore(newBookmarkEndEl, parentEl.nextSibling)
      }
    }

    if (!isRecentlyCreated) {
      // we are only going to keep the first instance of these bookmarks
      // (the original bookmarks) linked to docxImages
      bookmarkStartEl.setAttribute('removeAfterFirstInstance', 'true')
      bookmarkEndEl.setAttribute('removeAfterFirstInstance', 'true')
    }
  }

  const latestBookmarkStartEls = nodeListToArray(doc.getElementsByTagName('w:bookmarkStart'))
  const latestBookmarkEndEls = nodeListToArray(doc.getElementsByTagName('w:bookmarkEnd'))

  const collections = [
    { type: 'start', els: latestBookmarkStartEls },
    { type: 'end', els: latestBookmarkEndEls }
  ]

  for (const col of collections) {
    for (const bookmarkEl of col.els) {
      const bookmarkForImage = bookmarkEl.hasAttribute('image')

      if (bookmarkForImage) {
        bookmarkEl.removeAttribute('image')
      }

      // we wrap the bookmarks with a special helper to be able to
      // detect invalid bookmarks and clean them from the document
      processOpeningTag(doc, bookmarkEl, `{{#docxSData type='bookmarkValidation' bookmarkType='${col.type}' bookmarkId='${bookmarkEl.getAttribute('w:id')}'${bookmarkForImage ? ' bookmarkForImage="true"' : ''}}}`)
      processClosingTag(doc, bookmarkEl, '{{/docxSData}}')
    }
  }
}

function getBookmarkId (bookmarkEl) {
  const id = parseInt(bookmarkEl.getAttribute('w:id'), 10)

  if (isNaN(id)) {
    return
  }

  return id
}
