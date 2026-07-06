const fs = require('fs')
const { customAlphabet } = require('nanoid')
const { DOMParser } = require('@xmldom/xmldom')
const { getImageSizeInEMU } = require('../imageUtils')
const { nodeListToArray, serializeXml, getNewRelId, createNode } = require('../utils')
const recursiveStringReplaceAsync = require('../recursiveStringReplaceAsync')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)

module.exports = async (files, headerFooterRefs, sharedData) => {
  const contentTypesDoc = files.find(f => f.path === '[Content_Types].xml').doc
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const documentFile = files.find(f => f.path === 'word/document.xml')

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<docxNewImage>',
    '</docxNewImage>',
    'g',
    async (val, content, hasNestedMatch) => {
      const doc = new DOMParser({
        xmlns: {
          c: 'http://schemas.openxmlformats.org/drawingml/2006/chart',
          a: 'http://schemas.openxmlformats.org/drawingml/2006/main'
        }
      }).parseFromString(val)

      const docEl = doc.documentElement
      const containerREl = nodeListToArray(docEl.getElementsByTagName('w:r'))[0]
      const newDrawingImageEl = processImageCreation(files, sharedData, containerREl, doc, documentRelsDoc, contentTypesDoc)

      if (newDrawingImageEl === '') {
        return newDrawingImageEl
      }

      const refEl = containerREl.getElementsByTagName('w:t')[0]

      if (refEl == null) {
        throw new Error('Cannot find the reference element for image creation')
      }

      refEl.parentNode.replaceChild(newDrawingImageEl, refEl)

      return serializeXml(containerREl)
    }
  )

  for (const { doc: headerFooterDoc, relsDoc: headerFooterRelsDoc } of headerFooterRefs) {
    if (headerFooterRelsDoc == null) {
      continue
    }

    const docxNewImageEls = nodeListToArray(headerFooterDoc.getElementsByTagName('docxNewImage'))

    for (const docxNewImageEl of docxNewImageEls) {
      const containerREl = nodeListToArray(docxNewImageEl.getElementsByTagName('w:r'))[0]
      const newDrawingImageEl = processImageCreation(files, sharedData, containerREl, headerFooterDoc, headerFooterRelsDoc, contentTypesDoc)

      if (newDrawingImageEl !== '') {
        const refEl = containerREl.getElementsByTagName('w:t')[0]

        if (refEl == null) {
          throw new Error('Cannot find the reference element for image creation')
        }

        refEl.parentNode.replaceChild(newDrawingImageEl, refEl)
      } else {
        docxNewImageEl.parentNode.removeChild(docxNewImageEl)
      }
    }
  }
}

function processImageCreation (files, sharedData, containerREl, doc, relsDoc, contentTypesDoc) {
  if (containerREl == null) {
    throw new Error('Cannot find the container element for image creation')
  }

  const docxImageConfigTextEl = nodeListToArray(containerREl.getElementsByTagName('w:t')).find(tEl => tEl.textContent.includes('$docxImage'))

  if (docxImageConfigTextEl == null) {
    throw new Error('Cannot find the text element containing the docxImage configuration')
  }

  const match = docxImageConfigTextEl.textContent.match(/\$docxImage([^$]*)\$/)

  if (match == null) {
    throw new Error('Cannot find the docxImage configuration for image creation')
  }

  const imageConfig = JSON.parse(Buffer.from(match[1], 'base64').toString())

  const imageSize = imageConfig.image.size
  const imageExtension = imageConfig.image.extension
  const imageContent = imageConfig.image.content

  if (imageContent.type === 'base64') {
    imageContent.type = 'buffer'
    imageContent.data = Buffer.from(imageContent.data, 'base64')
  }

  const newDocPrId = sharedData.idManagers.get('docPr').generate().id
  const newImageLabelName = `Picture ${newDocPrId}`

  const newImageRelId = getNewRelId(relsDoc)

  const relEl = relsDoc.createElement('Relationship')

  relEl.setAttribute('Id', newImageRelId)

  relEl.setAttribute(
    'Type',
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'
  )

  let docxImageName = `imageDocx${newImageRelId}.${imageExtension}`

  while (files.find(f => f.path === `word/media/${docxImageName}`) != null) {
    docxImageName = `imageDocx${newImageRelId}_${generateRandomId()}.${imageExtension}`
  }

  relEl.setAttribute('Target', `media/${docxImageName}`)

  files.push({
    path: `word/media/${docxImageName}`,
    data: imageContent.type === 'path' ? fs.createReadStream(imageContent.data) : imageContent.data,
    // this will make it store the svg file to be stored correctly
    serializeFromDoc: false
  })

  const relsEl = relsDoc.getElementsByTagName('Relationships')[0]
  const types = contentTypesDoc.getElementsByTagName('Types')[0]

  const existsTypeForImageExtension = nodeListToArray(types.getElementsByTagName('Default')).find(
    d => d.getAttribute('Extension') === imageExtension
  ) != null

  if (!existsTypeForImageExtension) {
    const newDefault = contentTypesDoc.createElement('Default')
    newDefault.setAttribute('Extension', imageExtension)
    newDefault.setAttribute('ContentType', `image/${imageExtension}${imageExtension === 'svg' ? '+xml' : ''}`)
    types.appendChild(newDefault)
  }

  relsEl.appendChild(relEl)

  const imageSizeEMU = getImageSizeInEMU(imageSize, {
    // if user has specified custom width/height and the
    // exif orientation is greater or equal than 5 then we
    // invert the width/height to make it easier for the user
    // to get the size they want
    width: imageConfig.image.orientation >= 5 ? imageConfig.height : imageConfig.width,
    height: imageConfig.image.orientation >= 5 ? imageConfig.width : imageConfig.height
  })

  const imageWidthEMU = imageSizeEMU.width
  const imageHeightEMU = imageSizeEMU.height

  let flipH
  let flipV
  let imageRotation60thsDegree

  // values for the exif orientation tag
  // https://exiftool.org/TagNames/EXIF.html#:~:text=0x0112,8%20=%20Rotate%20270%20CW
  if (imageConfig.image.orientation === 2) {
    flipH = true
  } else if (imageConfig.image.orientation === 3) {
    imageRotation60thsDegree = 180
  } else if (imageConfig.image.orientation === 4) {
    flipV = true
  } else if (imageConfig.image.orientation === 5) {
    flipV = true
    imageRotation60thsDegree = 90
  } else if (imageConfig.image.orientation === 6) {
    imageRotation60thsDegree = 90
  } else if (imageConfig.image.orientation === 7) {
    flipV = true
    imageRotation60thsDegree = 270
  } else if (imageConfig.image.orientation === 8) {
    imageRotation60thsDegree = 270
  }

  // user rotation has precedence over exif orientation
  if (imageConfig.rotation != null) {
    // round to avoid using float values
    imageRotation60thsDegree = Math.round(imageConfig.rotation)
  }

  // user flip has precedence over exif orientation
  if (imageConfig.flip === 'horizontal') {
    flipH = true
  } else if (imageConfig.flip === 'vertical') {
    flipV = true
  } else if (imageConfig.flip === 'horizontal-vertical') {
    flipH = true
    flipV = true
  }

  const extensionEls = [
    createNode(doc, 'a:ext', {
      attributes: {
        uri: '{28A0092B-C50C-407E-A947-70E740481C1C}'
      },
      children: [
        createNode(doc, 'a14:useLocalDpi', {
          attributes: {
            'xmlns:a14': 'http://schemas.microsoft.com/office/drawing/2010/main',
            val: '0'
          }
        })
      ]
    })
  ]

  if (imageExtension === 'svg') {
    extensionEls.push(
      createNode(doc, 'a:ext', {
        attributes: {
          uri: '{96DAC541-7B7A-43D3-8B79-37D633B846F1}'
        },
        children: [
          createNode(doc, 'asvg:svgBlip', {
            attributes: {
              'xmlns:asvg': 'http://schemas.microsoft.com/office/drawing/2016/SVG/main',
              'r:embed': newImageRelId
            }
          })
        ]
      })
    )
  }

  const newDrawingImageEl = createNode(doc, 'w:drawing', {
    children: [
      createNode(doc, 'wp:inline', {
        attributes: {
          distT: '0',
          distB: '0',
          distL: '0',
          distR: '0'
        },
        children: [
          createNode(doc, 'wp:extent', {
            attributes: {
              cx: imageWidthEMU,
              cy: imageHeightEMU
            }
          }),
          createNode(doc, 'wp:effectExtent', {
            attributes: {
              l: '0',
              t: '0',
              r: '0',
              b: '0'
            }
          }),
          createNode(doc, 'wp:docPr', {
            attributes: {
              id: newDocPrId,
              name: newImageLabelName
            }
          }),
          createNode(doc, 'wp:cNvGraphicFramePr', {
            children: [
              createNode(doc, 'a:graphicFrameLocks', {
                attributes: {
                  'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
                  noChangeAspect: '1'
                }
              })
            ]
          }),
          createNode(doc, 'a:graphic', {
            attributes: {
              'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main'
            },
            children: [
              createNode(doc, 'a:graphicData', {
                attributes: {
                  uri: 'http://schemas.openxmlformats.org/drawingml/2006/picture'
                },
                children: [
                  createNode(doc, 'pic:pic', {
                    attributes: {
                      'xmlns:pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture'
                    },
                    children: [
                      createNode(doc, 'pic:nvPicPr', {
                        children: [
                          createNode(doc, 'pic:cNvPr', {
                            attributes: {
                              id: newDocPrId,
                              name: newImageLabelName
                            }
                          }),
                          createNode(doc, 'pic:cNvPicPr')
                        ]
                      }),
                      createNode(doc, 'pic:blipFill', {
                        children: [
                          // when the image is SVG, docx allows that we set here a reference to a fallback png image,
                          // the fallback is used in office versions that don't support SVG (< office 2016).
                          // however since we only have access to the svg file, we don't set any fallback and just
                          // set the reference to the same svg file.
                          // NOTE: office seems to also use the fallback image for the preview (when the office file is shown in the OS file explorer)
                          // so in our implementation (which does not use fallback image) we just see an empty frame in the preview but
                          // the svg image works as expected inside the office
                          createNode(doc, 'a:blip', {
                            attributes: {
                              'r:embed': newImageRelId
                            },
                            children: [
                              createNode(doc, 'a:extLst', {
                                children: extensionEls
                              })
                            ]
                          }),
                          createNode(doc, 'a:stretch', {
                            children: [
                              createNode(doc, 'a:fillRect')
                            ]
                          })
                        ]
                      }),
                      createNode(doc, 'pic:spPr', {
                        children: [
                          createNode(doc, 'a:xfrm', {
                            attributes: [
                              { name: 'rot', value: imageRotation60thsDegree != null ? imageRotation60thsDegree * 60000 : null },
                              { name: 'flipH', value: flipH != null ? (flipH === true ? '1' : '0') : null },
                              { name: 'flipV', value: flipV != null ? (flipV === true ? '1' : '0') : null }
                            ].reduce((acc, attr) => {
                              if (attr.value == null) {
                                return acc
                              }

                              acc[attr.name] = attr.value

                              return acc
                            }, {}),
                            children: [
                              createNode(doc, 'a:off', {
                                attributes: {
                                  x: '0',
                                  y: '0'
                                }
                              }),
                              createNode(doc, 'a:ext', {
                                attributes: {
                                  cx: imageWidthEMU,
                                  cy: imageHeightEMU
                                }
                              })
                            ]
                          }),
                          createNode(doc, 'a:prstGeom', {
                            attributes: {
                              prst: 'rect'
                            },
                            children: [
                              createNode(doc, 'a:avLst')
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  })

  return newDrawingImageEl
}
