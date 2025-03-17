const {
  nodeListToArray, getPictureElInfo, decodeURIComponentRecursive,
  processOpeningTag, processClosingTag
} = require('../utils')

module.exports = function processImage (files, doc, drawingEl, relsDoc) {
  const pictureElInfo = getPictureElInfo(drawingEl)
  const pictureEl = pictureElInfo.picture

  if (!pictureEl) {
    return
  }

  const linkClickEls = pictureElInfo.links
  const linkClickEl = linkClickEls[0]

  if (!linkClickEl) {
    return
  }

  const tooltip = linkClickEl.getAttribute('tooltip')
  const isPossibleDocxImage = tooltip != null && tooltip.includes('{{')
  let bookmarksFound = false

  if (isPossibleDocxImage) {
    let bookmarkStartEl = drawingEl.parentNode.previousSibling
    let bookmarkEndEl = drawingEl.parentNode.nextSibling
    const collections = [{ type: 'start', el: bookmarkStartEl }, { type: 'end', el: bookmarkEndEl }]

    for (const { type, el } of collections) {
      let currentEl = el

      while (currentEl != null) {
        if (currentEl.tagName !== 'docxRemove') {
          break
        }

        currentEl = type === 'start' ? currentEl.previousSibling : currentEl.nextSibling
      }

      if (type === 'start') {
        bookmarkStartEl = currentEl
      } else {
        bookmarkEndEl = currentEl
      }
    }

    let openingImageTargetEl
    let closingImageTargetEl

    if (
      bookmarkStartEl?.tagName === 'w:bookmarkStart' &&
      bookmarkEndEl?.tagName === 'w:bookmarkEnd'
    ) {
      bookmarksFound = true
      // the .previousSibling, nextSibling targets the docxRemove tags
      openingImageTargetEl = bookmarkStartEl.previousSibling
      closingImageTargetEl = bookmarkEndEl.nextSibling
    } else {
      openingImageTargetEl = drawingEl.parentNode
      closingImageTargetEl = drawingEl.parentNode
    }

    const openEl = processOpeningTag(doc, openingImageTargetEl, "{{#docxSData type='image'}}")
    processClosingTag(doc, closingImageTargetEl, '{{/docxSData}}')

    linkClickEl.setAttribute('tooltip', '{{@imageTooltip}}')

    // somehow there are duplicated linkclick els produced by word, we need to clean them up
    // we just put there an empty sting, anyway this is going to be replicated on postprocess
    // with the real value
    for (let i = 1; i < linkClickEls.length; i++) {
      const elLinkClick = linkClickEls[i]
      elLinkClick.setAttribute('tooltip', '')
    }

    // the docxSData type='image' needs to have two blocks, one for for the 'imageTooltip'
    // which will contain the possible docxImage helper call, and the other block for the content
    // which contains the image definition. we need two blocks mostly because to be able to resolve async resolution
    // correctly, we ensure to run the async block of 'imageTooltip' first, to ensure it resolves its data,
    // we use this data to resolve the image definition block, the image definition block depends on this data
    // so the async block needs to run first
    const possibleDocxImageCallEl = createCallPlaceholderEl(doc, `{{#docxSData type='imageTooltip'}}${tooltip}{{/docxSData}}`)
    openEl.parentNode.insertBefore(possibleDocxImageCallEl, openEl.nextSibling)
    const possibleDocxImageCallInverseEl = createCallPlaceholderEl(doc, '{{else}}')
    openEl.parentNode.insertBefore(possibleDocxImageCallInverseEl, possibleDocxImageCallEl.nextSibling)
  }

  // to support hyperlink generation in a loop, we need to insert the hyperlink definition into
  // the document xml, so when template engine runs it evaluates with the correct data context
  const hyperlinkRelId = linkClickEl.getAttribute('r:id')

  const hyperlinkRelEl = nodeListToArray(relsDoc.getElementsByTagName('Relationship')).find((el) => {
    return el.getAttribute('Id') === hyperlinkRelId
  })

  const hyperlinkRelElClone = hyperlinkRelEl.cloneNode()

  const decodedTarget = decodeURIComponentRecursive(hyperlinkRelElClone.getAttribute('Target'))

  hyperlinkRelElClone.setAttribute('originalTarget', decodedTarget)

  // the logic is:
  // - if we find handlebars syntax in the target, we assume it is a dynamic link and let it continue its normal handlebars flow
  // - if the target starts with #, then it means the link targets a bookmark, in which case
  // our default is to change the target to the bookmark that we generate per image
  // - the last case should be when the link is to a static url, in this case we leave it as it is
  if (decodedTarget.includes('{{')) {
    hyperlinkRelElClone.setAttribute('Target', decodedTarget)
  } else if (isPossibleDocxImage && bookmarksFound && decodedTarget.startsWith('#')) {
    // removing the Target will make the postprocess assign the target to the bookmark of
    // generated image
    hyperlinkRelElClone.removeAttribute('Target')
  }

  pictureEl.insertBefore(hyperlinkRelElClone, pictureEl.firstChild)
}

function createCallPlaceholderEl (doc, callContent) {
  const fakeElement = doc.createElement('docxRemove')
  fakeElement.textContent = callContent
  return fakeElement
}
