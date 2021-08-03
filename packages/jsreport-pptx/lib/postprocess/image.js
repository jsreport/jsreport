
const sizeOf = require('image-size')
const { nodeListToArray } = require('../utils')

module.exports = (files) => {
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
      const imageSrc = el.getAttribute('src')
      const imageExtensions = imageSrc.split(';')[0].split('/')[1]
      const imageBuffer = Buffer.from(imageSrc.split(';')[1].substring('base64,'.length), 'base64')

      imagesStartId++
      const relEl = relsDoc.createElement('Relationship')
      relEl.setAttribute('Id', `rId${imagesStartId}`)
      relEl.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')
      relEl.setAttribute('Target', `../media/imageJsReport${imagesStartId}.${imageExtensions}`)

      files.push({
        path: `ppt/media/imageJsReport${imagesStartId}.${imageExtensions}`,
        data: imageBuffer
      })

      relsDoc.getElementsByTagName('Relationships')[0].appendChild(relEl)

      const grpSp = el.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
      const blip = grpSp.getElementsByTagName('a:blip')[0]
      blip.setAttribute('r:embed', `rId${imagesStartId}`)

      const imageDimension = sizeOf(imageBuffer)
      const imageWidthEMU = Math.round(imageDimension.width * 914400 / 96)
      const imageHeightEMU = Math.round(imageDimension.height * 914400 / 96)

      const aExt = grpSp.getElementsByTagName('a:ext')[0]
      aExt.setAttribute('cx', imageWidthEMU)
      aExt.setAttribute('cy', imageHeightEMU)

      grpSp.removeChild(el.parentNode.parentNode.parentNode.parentNode.parentNode)
    }
  }
}
