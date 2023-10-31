const { resolveImageSrc, getImageSizeInEMU } = require('../imageUtils')
const { nodeListToArray, findOrCreateChildNode, getNewRelIdFromBaseId, getNewRelId, getDocPrEl, getPictureElInfo, getPictureCnvPrEl } = require('../utils')

module.exports = async function processImage (files, referenceDrawingEl, doc, relsDoc, newRelIdCounterMap, newBookmarksMap) {
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

  const pendingSources = []

  if (imageConfig.src != null) {
    pendingSources.push(imageConfig.src)
  }

  if (imageConfig.fallbackSrc != null) {
    pendingSources.push(imageConfig.fallbackSrc)
  }

  let resolveImageSrcError
  let imageBuffer
  let imageExtension

  while (pendingSources.length > 0) {
    const currentSource = pendingSources.shift()

    try {
      const resolved = await resolveImageSrc(currentSource)
      imageBuffer = resolved.imageBuffer
      imageExtension = resolved.imageExtension
    } catch (resolveError) {
      if (
        pendingSources.length === 0 ||
        resolveError.imageSource !== 'remote'
      ) {
        resolveImageSrcError = resolveError
      }
    }
  }

  if (resolveImageSrcError != null || imageBuffer == null) {
    if (resolveImageSrcError != null && imageConfig.failurePlaceholderAction == null) {
      throw resolveImageSrcError
    } else {
      if (imageConfig.failurePlaceholderAction === 'preserve') {
        return drawingEl
      }

      // remove case
      return ''
    }
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
    data: imageBuffer,
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
    const imageSizeEMU = getImageSizeInEMU(imageBuffer, {
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
