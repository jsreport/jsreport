const { resolveImageSrc, getImageSizeInEMU } = require('../imageUtils')
const { nodeListToArray, getNewRelIdFromBaseId, getNewRelId, getDocPrEl, getPictureElInfo, getPictureCnvPrEl } = require('../utils')

module.exports = async function processImage (files, referenceDrawingEl, relsDoc, newRelIdCounterMap, newBookmarksMap) {
  const drawingEl = referenceDrawingEl.cloneNode(true)
  const contentTypesFile = files.find(f => f.path === '[Content_Types].xml')
  const types = contentTypesFile.doc.getElementsByTagName('Types')[0]

  const pngDefault = nodeListToArray(types.getElementsByTagName('Default')).find(
    d => d.getAttribute('Extension') === 'png'
  )

  const relsEl = relsDoc.getElementsByTagName('Relationships')[0]
  const pictureElInfo = getPictureElInfo(drawingEl)
  const pictureEl = pictureElInfo.picture

  if (!pictureEl) {
    return
  }

  const docPrEl = getDocPrEl(drawingEl)
  const cnvPrEl = getPictureCnvPrEl(pictureEl)

  // replicate picture cnvPr properties the same as docPr
  if (docPrEl != null && cnvPrEl != null) {
    cnvPrEl.setAttribute('id', docPrEl.getAttribute('id'))
    cnvPrEl.setAttribute('name', docPrEl.getAttribute('name'))
  }

  const linkClickEls = pictureElInfo.links
  const linkClickEl = linkClickEls[0]

  if (!linkClickEl) {
    return drawingEl
  }

  if (pictureEl.firstChild.nodeName === 'Relationship') {
    const hyperlinkRelEl = pictureEl.firstChild
    const newHyperlinkRelId = getNewRelIdFromBaseId(relsDoc, newRelIdCounterMap, hyperlinkRelEl.getAttribute('Id'))
    let isFirstMatch = false

    const hyperlinkRelId = hyperlinkRelEl.getAttribute('Id')
    const hyperlinkRelTarget = hyperlinkRelEl.getAttribute('Target')
    const isRefToBookmark = hyperlinkRelTarget.startsWith('#')

    if (hyperlinkRelId === newHyperlinkRelId) {
      isFirstMatch = true

      // if we get the same id it means that we should replace old rel node
      const oldRelEl = nodeListToArray(relsEl.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === newHyperlinkRelId
      })

      oldRelEl.parentNode.removeChild(oldRelEl)
    }

    hyperlinkRelEl.setAttribute('Id', newHyperlinkRelId)

    if (isRefToBookmark && !isFirstMatch && newBookmarksMap.has(hyperlinkRelTarget.slice(1))) {
      const items = newBookmarksMap.get(hyperlinkRelTarget.slice(1))

      if (items.length > 0) {
        const newBookmark = items.shift()
        hyperlinkRelEl.setAttribute('Target', `#${newBookmark.newName}`)
      }
    }

    hyperlinkRelEl.parentNode.removeChild(hyperlinkRelEl)

    relsEl.appendChild(hyperlinkRelEl)

    linkClickEl.setAttribute('r:id', newHyperlinkRelId)

    for (let i = 1; i < linkClickEls.length; i++) {
      linkClickEls[i].setAttribute('r:id', newHyperlinkRelId)
    }
  }

  const tooltip = linkClickEl.getAttribute('tooltip')

  if (tooltip == null || !tooltip.includes('$docxImage')) {
    return drawingEl
  }

  if (!pngDefault) {
    const defaultPng = contentTypesFile.doc.createElement('Default')
    defaultPng.setAttribute('Extension', 'png')
    defaultPng.setAttribute('ContentType', 'image/png')
    types.appendChild(defaultPng)
  }

  const match = tooltip.match(/\$docxImage([^$]*)\$/)

  linkClickEl.setAttribute('tooltip', tooltip.replace(match[0], ''))

  const imageConfig = JSON.parse(Buffer.from(match[1], 'base64').toString())

  // somehow there are duplicated linkclick els produced by word, we need to clean them up
  for (let i = 1; i < linkClickEls.length; i++) {
    const elLinkClick = linkClickEls[i]
    const match = tooltip.match(/\$docxImage([^$]*)\$/)
    elLinkClick.setAttribute('tooltip', tooltip.replace(match[0], ''))
  }

  const { imageBuffer, imageExtension } = await resolveImageSrc(imageConfig.src)

  const newImageRelId = getNewRelId(relsDoc)

  const relEl = relsDoc.createElement('Relationship')

  relEl.setAttribute('Id', newImageRelId)

  relEl.setAttribute(
    'Type',
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'
  )

  relEl.setAttribute('Target', `media/imageDocx${newImageRelId}.${imageExtension}`)

  files.push({
    path: `word/media/imageDocx${newImageRelId}.${imageExtension}`,
    data: imageBuffer
  })

  const existsTypeForImageExtension = nodeListToArray(types.getElementsByTagName('Default')).find(
    d => d.getAttribute('Extension') === imageExtension
  ) != null

  if (!existsTypeForImageExtension) {
    const newDefault = contentTypesFile.doc.createElement('Default')
    newDefault.setAttribute('Extension', imageExtension)
    newDefault.setAttribute('ContentType', `image/${imageExtension}`)
    types.appendChild(newDefault)
  }

  relsEl.appendChild(relEl)

  const relPlaceholder = pictureEl.getElementsByTagName('a:blip')[0]
  const aExtEl = pictureEl.getElementsByTagName('a:xfrm')[0].getElementsByTagName('a:ext')[0]
  const wpExtentEl = pictureElInfo.wpExtent

  let imageWidthEMU
  let imageHeightEMU

  if (imageConfig.usePlaceholderSize) {
    // taking existing size defined in word
    imageWidthEMU = parseFloat(aExtEl.getAttribute('cx'))
    imageHeightEMU = parseFloat(aExtEl.getAttribute('cy'))
  } else {
    const imageSizeEMU = getImageSizeInEMU(imageBuffer, {
      width: imageConfig.width,
      height: imageConfig.height
    })

    imageWidthEMU = imageSizeEMU.width
    imageHeightEMU = imageSizeEMU.height
  }

  relPlaceholder.setAttribute('r:embed', newImageRelId)

  if (wpExtentEl) {
    wpExtentEl.setAttribute('cx', imageWidthEMU)
    wpExtentEl.setAttribute('cy', imageHeightEMU)
  }

  aExtEl.setAttribute('cx', imageWidthEMU)
  aExtEl.setAttribute('cy', imageHeightEMU)

  return drawingEl
}
