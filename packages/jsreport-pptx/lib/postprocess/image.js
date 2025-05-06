
const { imageSize } = require('image-size')
const axios = require('axios')
const { nodeListToArray, getDimension, pxToEMU, cmToEMU } = require('../utils')

module.exports = async (files) => {
  const contentTypesFile = files.find(f => f.path === '[Content_Types].xml')
  const types = contentTypesFile.doc.getElementsByTagName('Types')[0]

  const pngDefault = nodeListToArray(types.getElementsByTagName('Default')).find(d => d.getAttribute('Extension') === 'png')

  if (!pngDefault) {
    const defaultPng = contentTypesFile.doc.createElement('Default')
    defaultPng.setAttribute('Extension', 'png')
    defaultPng.setAttribute('ContentType', 'image/png')
    types.appendChild(defaultPng)
  }

  let imagesStartId = 50000

  for (const file of files.filter(f => f.path.includes('ppt/slides/slide'))) {
    const doc = file.doc
    const slideNumber = parseInt(file.path.replace('ppt/slides/slide', '').replace('.xml', ''))

    const relsDoc = files.find(f => f.path === `ppt/slides/_rels/slide${slideNumber}.xml.rels`).doc

    const imagesEl = nodeListToArray(doc.getElementsByTagName('pptxImage'))

    for (let i = 0; i < imagesEl.length; i++) {
      const el = imagesEl[i]

      if (!el.textContent.includes('$pptxImage')) {
        throw new Error('Invalid pptxImage element')
      }

      const match = el.textContent.match(/\$pptxImage([^$]*)\$/)
      const imageConfig = JSON.parse(Buffer.from(match[1], 'base64').toString())

      let imageExtension
      let imageBuffer

      if (imageConfig.src && imageConfig.src.startsWith('data:')) {
        imageExtension = imageConfig.src.split(';')[0].split('/')[1]
        imageBuffer = Buffer.from(imageConfig.src.split(';')[1].substring('base64,'.length), 'base64')
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

        // some servers returns the image content type without the "image/" prefix
        imageExtension = extensionsParts.length === 1 ? extensionsParts[0] : extensionsParts[1]
        imageBuffer = Buffer.from(response.data)
      }

      imagesStartId++
      const relEl = relsDoc.createElement('Relationship')
      relEl.setAttribute('Id', `rId${imagesStartId}`)
      relEl.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')
      relEl.setAttribute('Target', `../media/imageJsReport${imagesStartId}.${imageExtension}`)

      files.push({
        path: `ppt/media/imageJsReport${imagesStartId}.${imageExtension}`,
        data: imageBuffer
      })

      relsDoc.getElementsByTagName('Relationships')[0].appendChild(relEl)

      const existsTypeForImageExtension = nodeListToArray(types.getElementsByTagName('Default')).find(
        d => d.getAttribute('Extension') === imageExtension
      ) != null

      if (!existsTypeForImageExtension) {
        const newDefault = contentTypesFile.doc.createElement('Default')
        newDefault.setAttribute('Extension', imageExtension)
        newDefault.setAttribute('ContentType', `image/${imageExtension}`)
        types.appendChild(newDefault)
      }

      const grpSp = el.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
      const aExt = grpSp.getElementsByTagName('p:grpSpPr')[0].getElementsByTagName('a:xfrm')[0].getElementsByTagName('a:ext')[0]
      const blip = grpSp.getElementsByTagName('a:blip')[0]

      let imageWidthEMU
      let imageHeightEMU

      if (imageConfig.width != null || imageConfig.height != null) {
        const imageDimension = imageSize(imageBuffer)
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
        imageWidthEMU = parseFloat(aExt.getAttribute('cx'))
        imageHeightEMU = parseFloat(aExt.getAttribute('cy'))
      } else {
        const imageDimension = imageSize(imageBuffer)
        imageWidthEMU = pxToEMU(imageDimension.width)
        imageHeightEMU = pxToEMU(imageDimension.height)
      }

      blip.setAttribute('r:embed', `rId${imagesStartId}`)

      aExt.setAttribute('cx', imageWidthEMU)
      aExt.setAttribute('cy', imageHeightEMU)

      grpSp.removeChild(el.parentNode.parentNode.parentNode.parentNode.parentNode)
    }
  }
}
