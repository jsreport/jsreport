const sizeOf = require('image-size')
const axios = require('axios')
const { nodeListToArray, serializeXml, pxToEMU, cmToEMU, getNewRelIdFromBaseId, getNewRelId } = require('../utils')

module.exports = async function processImage (files, drawingEl, newRelIdCounterMap, newBookmarksMap) {
  const contentTypesFile = files.find(f => f.path === '[Content_Types].xml')
  const types = contentTypesFile.doc.getElementsByTagName('Types')[0]

  const pngDefault = nodeListToArray(types.getElementsByTagName('Default')).find(
    d => d.getAttribute('Extension') === 'png'
  )

  const relsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const relsEl = relsDoc.getElementsByTagName('Relationships')[0]
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
    return
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

  // somehow there are duplicated hlinkclick els produced by word, we need to clean them up
  for (let i = 1; i < linkClickEls.length; i++) {
    const elLinkClick = linkClickEls[i]
    const match = tooltip.match(/\$docxImage([^$]*)\$/)
    elLinkClick.setAttribute('tooltip', tooltip.replace(match[0], ''))
  }

  let imageBuffer
  let imageExtension

  if (imageConfig.src && imageConfig.src.startsWith('data:')) {
    const imageSrc = imageConfig.src

    imageExtension = imageSrc.split(';')[0].split('/')[1]

    imageBuffer = Buffer.from(
      imageSrc.split(';')[1].substring('base64,'.length),
      'base64'
    )
  } else {
    const response = await axios({
      url: imageConfig.src,
      responseType: 'arraybuffer',
      method: 'GET'
    })

    const contentType = response.headers['content-type'] || response.headers['Content-Type']

    if (!contentType) {
      throw new Error(`Empty content-type for remote image at "${imageConfig.src}"`)
    }

    const extensionsParts = contentType.split(';')[0].split('/').filter((p) => p)

    if (extensionsParts.length === 0 || extensionsParts.length > 2) {
      throw new Error(`Invalid content-type "${contentType}" for remote image at "${imageConfig.src}"`)
    }

    // some servers returns the image content type withoyt the "image/" prefix
    imageExtension = extensionsParts.length === 1 ? extensionsParts[0] : extensionsParts[1]
    imageBuffer = Buffer.from(response.data)
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
  const wpExtendEl = pictureElInfo.wpExtend

  let imageWidthEMU
  let imageHeightEMU

  if (imageConfig.width != null || imageConfig.height != null) {
    const imageDimension = sizeOf(imageBuffer)
    const targetWidth = getDimension(imageConfig.width)
    const targetHeight = getDimension(imageConfig.height)

    if (targetWidth) {
      imageWidthEMU =
        targetWidth.unit === 'cm'
          ? cmToEMU(targetWidth.value)
          : pxToEMU(targetWidth.value)
    }

    if (targetHeight) {
      imageHeightEMU =
        targetHeight.unit === 'cm'
          ? cmToEMU(targetHeight.value)
          : pxToEMU(targetHeight.value)
    }

    if (imageWidthEMU != null && imageHeightEMU == null) {
      // adjust height based on aspect ratio of image
      imageHeightEMU = Math.round(
        imageWidthEMU *
          (pxToEMU(imageDimension.height) / pxToEMU(imageDimension.width))
      )
    } else if (imageHeightEMU != null && imageWidthEMU == null) {
      // adjust width based on aspect ratio of image
      imageWidthEMU = Math.round(
        imageHeightEMU *
          (pxToEMU(imageDimension.width) / pxToEMU(imageDimension.height))
      )
    }
  } else if (imageConfig.usePlaceholderSize) {
    // taking existing size defined in word
    imageWidthEMU = parseFloat(aExtEl.getAttribute('cx'))
    imageHeightEMU = parseFloat(aExtEl.getAttribute('cy'))
  } else {
    const imageDimension = sizeOf(imageBuffer)
    imageWidthEMU = pxToEMU(imageDimension.width)
    imageHeightEMU = pxToEMU(imageDimension.height)
  }

  relPlaceholder.setAttribute('r:embed', newImageRelId)

  if (wpExtendEl) {
    wpExtendEl.setAttribute('cx', imageWidthEMU)
    wpExtendEl.setAttribute('cy', imageHeightEMU)
  }

  aExtEl.setAttribute('cx', imageWidthEMU)
  aExtEl.setAttribute('cy', imageHeightEMU)

  return serializeXml(drawingEl)
}

function getDimension (value) {
  const regexp = /^(\d+(.\d+)?)(cm|px)$/
  const match = regexp.exec(value)

  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: match[3]
    }
  }

  return null
}

function getPictureElInfo (drawingEl) {
  const els = []
  let wpExtendEl

  if (isDrawingPicture(drawingEl)) {
    const wpDocPrEl = nodeListToArray(drawingEl.firstChild.childNodes).find((el) => el.nodeName === 'wp:docPr')
    let linkInDrawing

    wpExtendEl = nodeListToArray(drawingEl.firstChild.childNodes).find((el) => el.nodeName === 'wp:extent')

    if (wpDocPrEl) {
      linkInDrawing = nodeListToArray(wpDocPrEl.childNodes).find((el) => el.nodeName === 'a:hlinkClick')
    }

    if (linkInDrawing) {
      els.push(linkInDrawing)
    }
  }

  const pictureEl = findDirectPictureChild(drawingEl)

  if (!pictureEl) {
    return {
      picture: undefined,
      wpExtend: undefined,
      links: els
    }
  }

  const linkInPicture = pictureEl.getElementsByTagName('a:hlinkClick')[0]

  if (linkInPicture) {
    els.push(linkInPicture)
  }

  return {
    picture: pictureEl,
    wpExtend: wpExtendEl,
    links: els
  }
}

function isDrawingPicture (drawingEl) {
  const graphicEl = nodeListToArray(drawingEl.firstChild.childNodes).find((el) => el.nodeName === 'a:graphic')

  if (!graphicEl) {
    return false
  }

  const graphicDataEl = nodeListToArray(graphicEl.childNodes).find((el) => el.nodeName === 'a:graphicData' && el.getAttribute('uri') === 'http://schemas.openxmlformats.org/drawingml/2006/picture')

  if (!graphicDataEl) {
    return false
  }

  const pictureEl = nodeListToArray(graphicDataEl.childNodes).find((el) => el.nodeName === 'pic:pic')

  if (!pictureEl) {
    return false
  }

  return true
}

function findDirectPictureChild (parentNode) {
  const childNodes = parentNode.childNodes || []
  let pictureEl

  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i]

    if (child.nodeName === 'w:drawing') {
      break
    }

    if (child.nodeName === 'pic:pic') {
      pictureEl = child
      break
    }

    const foundInChild = findDirectPictureChild(child)

    if (foundInChild) {
      pictureEl = foundInChild
      break
    }
  }

  return pictureEl
}
