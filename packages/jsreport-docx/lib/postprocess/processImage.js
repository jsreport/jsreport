const fs = require('fs')
const { getImageSizeInEMU } = require('../imageUtils')
const { nodeListToArray, findOrCreateChildNode, getNewRelIdFromBaseId, getNewRelId, getDocPrEl, getPictureElInfo, getPictureCnvPrEl } = require('../utils')

module.exports = function processImage (files, referenceDrawingEl, doc, relsDoc, newRelIdCounterMap, newBookmarksMap) {
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

  const tooltip = linkClickEl.getAttribute('tooltip')
  let newTooltip = tooltip
  const hasDocxImageCall = tooltip != null && tooltip.includes('$docxImage')
  let docxImageMeta

  if (hasDocxImageCall) {
    const match = tooltip.match(/\$docxImage([^$]*)\$/)

    docxImageMeta = {
      config: JSON.parse(Buffer.from(match[1], 'base64').toString()),
      tooltip: tooltip.replace(match[0], '')
    }

    newTooltip = docxImageMeta.tooltip
  }

  if (pictureEl.firstChild.nodeName === 'Relationship') {
    const hyperlinkRelEl = pictureEl.firstChild
    const newHyperlinkRelId = getNewRelIdFromBaseId(relsDoc, newRelIdCounterMap, hyperlinkRelEl.getAttribute('Id'))

    const hyperlinkRelId = hyperlinkRelEl.getAttribute('Id')
    let defaultTargetBookmarkId = linkClickEl.getAttribute('defaultTargetBookmarkId')

    linkClickEl.removeAttribute('defaultTargetBookmarkId')

    if (defaultTargetBookmarkId != null && defaultTargetBookmarkId !== '' && !isNaN(defaultTargetBookmarkId)) {
      defaultTargetBookmarkId = parseInt(defaultTargetBookmarkId, 10)
    }

    if (hyperlinkRelId === newHyperlinkRelId) {
      // if we get the same id it means that we should replace old rel node
      const oldRelEl = nodeListToArray(relsEl.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === newHyperlinkRelId
      })

      oldRelEl.parentNode.removeChild(oldRelEl)
    }

    hyperlinkRelEl.setAttribute('Id', newHyperlinkRelId)

    const originalTarget = hyperlinkRelEl.getAttribute('originalTarget')
    hyperlinkRelEl.removeAttribute('originalTarget')

    if (defaultTargetBookmarkId != null && newBookmarksMap.has(defaultTargetBookmarkId)) {
      const items = newBookmarksMap.get(defaultTargetBookmarkId)

      if (items.length > 0) {
        const newBookmark = items.shift()

        // when hyperlink has no target then it means it should default to link to
        // bookmark of image
        if (!hyperlinkRelEl.hasAttribute('Target')) {
          hyperlinkRelEl.setAttribute('Target', `#${newBookmark.newName}`)
        }
      }
    }

    // if no target still fallback to its original target
    // this likely happens when image is detected to contain handlebars syntax
    // in tooltip but it ended not calling docxImage helper, so we need to fallback to the
    // original target in this case
    if (!hyperlinkRelEl.hasAttribute('Target')) {
      hyperlinkRelEl.setAttribute('Target', originalTarget)
    }

    hyperlinkRelEl.parentNode.removeChild(hyperlinkRelEl)

    relsEl.appendChild(hyperlinkRelEl)

    linkClickEl.setAttribute('r:id', newHyperlinkRelId)
    linkClickEl.setAttribute('tooltip', newTooltip)

    // somehow there are duplicated linkclick els produced by word, we need to clean them up
    for (let i = 1; i < linkClickEls.length; i++) {
      linkClickEls[i].setAttribute('r:id', newHyperlinkRelId)
      linkClickEls[i].setAttribute('tooltip', newTooltip)
    }
  }

  if (!docxImageMeta) {
    return drawingEl
  }

  if (!pngDefault) {
    const defaultPng = contentTypesFile.doc.createElement('Default')
    defaultPng.setAttribute('Extension', 'png')
    defaultPng.setAttribute('ContentType', 'image/png')
    types.appendChild(defaultPng)
  }

  const imageConfig = docxImageMeta.config

  if (imageConfig.image == null) {
    if (imageConfig.failurePlaceholderAction === 'preserve') {
      return drawingEl
    }

    // remove case
    return ''
  }

  const imageSize = imageConfig.image.size
  const imageExtension = imageConfig.image.extension
  const imageContent = imageConfig.image.content

  if (imageContent.type === 'base64') {
    imageContent.type = 'buffer'
    imageContent.data = Buffer.from(imageContent.data, 'base64')
  }

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
    data: imageContent.type === 'path' ? fs.createReadStream(imageContent.data) : imageContent.data,
    // this will make it store the svg file to be stored correctly
    serializeFromDoc: false
  })

  const existsTypeForImageExtension = nodeListToArray(types.getElementsByTagName('Default')).find(
    d => d.getAttribute('Extension') === imageExtension
  ) != null

  if (!existsTypeForImageExtension) {
    const newDefault = contentTypesFile.doc.createElement('Default')
    newDefault.setAttribute('Extension', imageExtension)
    newDefault.setAttribute('ContentType', `image/${imageExtension}${imageExtension === 'svg' ? '+xml' : ''}`)
    types.appendChild(newDefault)
  }

  relsEl.appendChild(relEl)

  const blipEl = pictureEl.getElementsByTagName('a:blip')[0]
  const aExtEl = pictureEl.getElementsByTagName('a:xfrm')[0].getElementsByTagName('a:ext')[0]
  const wpExtentEl = pictureElInfo.wpExtent

  let imageWidthEMU
  let imageHeightEMU

  if (imageConfig.usePlaceholderSize) {
    // taking existing size defined in word
    imageWidthEMU = parseFloat(aExtEl.getAttribute('cx'))
    imageHeightEMU = parseFloat(aExtEl.getAttribute('cy'))
  } else {
    const imageSizeEMU = getImageSizeInEMU(imageSize, {
      width: imageConfig.width,
      height: imageConfig.height
    })

    imageWidthEMU = imageSizeEMU.width
    imageHeightEMU = imageSizeEMU.height
  }

  // when the image is SVG, docx allows that we set here a reference to a fallback png image,
  // the fallback is used in office versions that don't support SVG (< office 2016).
  // however since we only have access to the svg file, we don't set any fallback and just
  // set the reference to the same svg file.
  // NOTE: office seems to also use the fallback image for the preview (when the office file is shown in the OS file explorer)
  // so in our implementation (which does not use fallback image) we just see an empty frame in the preview but
  // the svg image works as expected inside the office
  blipEl.setAttribute('r:embed', newImageRelId)

  const extLstEl = findOrCreateChildNode(doc, 'a:extLst', blipEl)
  const existingSVGBlipExt = nodeListToArray(extLstEl.childNodes).find((el) => el.getAttribute('uri') === '{96DAC541-7B7A-43D3-8B79-37D633B846F1}')

  if (imageExtension === 'svg') {
    blipEl.removeAttribute('cstate')

    if (!existingSVGBlipExt) {
      const svgBlipExtEl = doc.createElement('a:ext')
      svgBlipExtEl.setAttribute('uri', '{96DAC541-7B7A-43D3-8B79-37D633B846F1}')

      const asvgBlipEl = doc.createElement('asvg:svgBlip')
      asvgBlipEl.setAttribute('xmlns:asvg', 'http://schemas.microsoft.com/office/drawing/2016/SVG/main')
      asvgBlipEl.setAttribute('r:embed', newImageRelId)

      svgBlipExtEl.appendChild(asvgBlipEl)
      extLstEl.appendChild(svgBlipExtEl)
    } else {
      const asvgBlipEl = findOrCreateChildNode(doc, 'asvg:svgBlip', existingSVGBlipExt)
      asvgBlipEl.setAttribute('xmlns:asvg', 'http://schemas.microsoft.com/office/drawing/2016/SVG/main')
      asvgBlipEl.setAttribute('r:embed', newImageRelId)
    }
  } else {
    if (existingSVGBlipExt) {
      // if the placeholder image is svg and the new image is not svg then we remove the svg blip ext
      existingSVGBlipExt.parentNode.removeChild(existingSVGBlipExt)
    }
  }

  if (wpExtentEl) {
    wpExtentEl.setAttribute('cx', imageWidthEMU)
    wpExtentEl.setAttribute('cy', imageHeightEMU)
  }

  aExtEl.setAttribute('cx', imageWidthEMU)
  aExtEl.setAttribute('cy', imageHeightEMU)

  return drawingEl
}
