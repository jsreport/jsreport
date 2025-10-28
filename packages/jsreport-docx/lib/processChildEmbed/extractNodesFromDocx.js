const path = require('path')
const { customAlphabet } = require('nanoid')
const { DOMParser } = require('@xmldom/xmldom')
const { decompress } = require('@jsreport/office')
const { getExtractMetadata } = require('./supportedElements')
const { nodeListToArray, contentIsXML, getPictureElInfo } = require('../utils')
const concatTags = require('../preprocess/concatTags')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)

module.exports = async function extractNodesFromDocx (targetDocxBuffer, data) {
  const nodes = []
  let files

  try {
    files = await decompress()(targetDocxBuffer)
  } catch (parseTemplateError) {
    throw new Error('Failed to parse docx input, unable to extract elements for child embed')
  }

  const defaultParseFiles = ['word/document.xml', 'word/_rels/document.xml.rels']

  for (const f of files) {
    if (defaultParseFiles.includes(f.path) && contentIsXML(f.data)) {
      f.doc = new DOMParser().parseFromString(f.data.toString())
      f.data = f.data.toString()
    }
  }

  const documentFile = files.find(f => f.path === 'word/document.xml')

  if (documentFile == null) {
    return nodes
  }

  const targetFiles = [documentFile]

  // concat tags of document.xml because the child docx may have the handlebars tags spread in multiple nodes
  concatTags(targetFiles)

  const documentDoc = documentFile.doc
  const bodyEl = nodeListToArray(documentDoc.documentElement.childNodes).find((el) => el.nodeName === 'w:body')

  if (bodyEl == null) {
    return nodes
  }

  const paragraphEls = nodeListToArray(bodyEl.childNodes).filter((el) => el.nodeName === 'w:p')

  for (const paragraphEl of paragraphEls) {
    const newParagraphEl = extractParagraph(files, data, paragraphEl)

    if (newParagraphEl == null) {
      continue
    }

    nodes.push(newParagraphEl)
  }

  return nodes
}

function extractParagraph (files, data, referenceParagraphEl) {
  const newParagraphEl = referenceParagraphEl.cloneNode(true)
  const toProcess = [{ el: newParagraphEl, id: [0] }]
  const itemsMap = new Map()
  const pendingMap = new Map()
  let previousItem

  const checkPreviousItem = () => {
    if (previousItem && previousItem.id.length > 1) {
      let idParts = [...previousItem.id]

      while (idParts != null) {
        const id = idParts.join('.')
        let nextIdParts

        const pendingCount = pendingMap.get(id)

        if (pendingCount === 0) {
          const item = itemsMap.get(id)

          transformElement(files, data, item.el)

          const parentIdParts = idParts.slice(0, -1)
          const parentId = parentIdParts.join('.')
          const parentPendingCount = pendingMap.get(parentId) ?? 0

          if (parentPendingCount > 0) {
            pendingMap.set(parentId, parentPendingCount - 1)
            nextIdParts = parentIdParts
          }
        }

        idParts = nextIdParts
      }
    }
  }

  do {
    checkPreviousItem()

    const current = toProcess.shift()

    previousItem = current
    itemsMap.set(current.id.join('.'), current)
    pendingMap.set(current.id.join('.'), 0)

    const meta = getExtractMetadata(current.el.nodeName)

    // if there is no metadata leave the node as it is
    if (meta == null) {
      continue
    }

    let isValid = true

    if (meta.validate != null) {
      isValid = meta.validate(current.el)
    }

    if (!isValid) {
      current.el.parentNode.removeChild(current.el)
      continue
    }

    if (meta.allowedAttributes != null) {
      keepAttributes(current.el, meta.allowedAttributes)
    }

    const restOfChildren = keepChildren(current.el, meta.allowedChildren)

    if (restOfChildren.length > 0) {
      const newItems = restOfChildren.map((el, idx) => ({ el, id: [...current.id, idx] }))
      pendingMap.set(current.id.join('.'), restOfChildren.length)
      toProcess.push(...newItems)
    }
  } while (toProcess.length > 0)

  checkPreviousItem()

  return newParagraphEl
}

function transformElement (files, data, el) {
  const { idManagers, newDefaultContentTypes, newDocumentRels, newFiles } = data
  if (el.nodeName === 'w:drawing') {
    const pictureElInfo = getPictureElInfo(el)
    const pictureEl = pictureElInfo.picture

    if (!pictureEl) {
      el.parentNode.removeChild(el)
      return
    }

    const blipEl = pictureEl.getElementsByTagName('a:blip')[0]

    if (!blipEl) {
      el.parentNode.removeChild(el)
      return
    }

    const extLstElInBlip = nodeListToArray(blipEl.childNodes).find((child) => child.nodeName === 'a:extLst')
    const extElInBlip = nodeListToArray(extLstElInBlip?.childNodes ?? []).find((child) => child.nodeName === 'a:ext')
    const asvgElInBlip = nodeListToArray(extElInBlip?.childNodes ?? []).find((child) => child.nodeName === 'asvg:svgBlip')

    const toExtract = []

    if (asvgElInBlip) {
      toExtract.push({
        targetBlipEl: asvgElInBlip,
        relId: asvgElInBlip.getAttribute('r:embed')
      })

      toExtract.push({
        targetBlipEl: blipEl,
        relId: blipEl.getAttribute('r:embed')
      })
    } else {
      toExtract.push({
        targetBlipEl: blipEl,
        relId: blipEl.getAttribute('r:embed')
      })
    }

    const validImageExtensions = ['jpg', 'jpeg', 'png', 'svg']
    const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc

    const relEls = nodeListToArray(
      documentRelsDoc.getElementsByTagName('Relationship')
    )

    for (const { targetBlipEl, relId } of toExtract) {
      const imageRelEl = relEls.find((relEl) => {
        return (
          relEl.getAttribute('Id') === relId &&
          relEl.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'
        )
      })

      if (!imageRelEl) {
        el.parentNode.removeChild(el)
        continue
      }

      const imagePath = path.posix.join('word/', imageRelEl.getAttribute('Target'))
      const imageFile = files.find(f => f.path === imagePath)

      if (!imageFile) {
        el.parentNode.removeChild(el)
        continue
      }

      let imageExtension = path.extname(imagePath).slice(1).toLowerCase()

      if (imageExtension === 'jpg') {
        imageExtension = 'jpeg'
      }

      if (!validImageExtensions.includes(imageExtension)) {
        el.parentNode.removeChild(el)
        continue
      }

      const newImageRelId = idManagers.get('documentRels').generate().id
      let imageName = `imageDocx${newImageRelId}.${imageExtension}`

      while (files.find(f => f.path === `word/media/${imageName}`) != null) {
        imageName = `imageDocx${newImageRelId}_${generateRandomId()}.${imageExtension}`
      }

      newDocumentRels.add({
        id: newImageRelId,
        type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
        target: `media/${imageName}`
      })

      newFiles.set(`word/media/${imageName}`, Buffer.from(imageFile.data))

      if (!newDefaultContentTypes.has(imageExtension)) {
        newDefaultContentTypes.set(imageExtension, `image/${imageExtension}${imageExtension === 'svg' ? '+xml' : ''}`)
      }

      targetBlipEl.setAttribute('r:embed', newImageRelId)
    }
  }
}

function keepChildren (el, allowedChildren) {
  const childEls = nodeListToArray(el.childNodes)
  const restChildren = []

  for (const childEl of childEls) {
    // if there is no explicit allowed children passed then all children are allowed
    const isAllowed = !Array.isArray(allowedChildren) ? true : allowedChildren.includes(childEl.nodeName)

    if (!isAllowed) {
      childEl.parentNode.removeChild(childEl)
    } else {
      restChildren.push(childEl)
    }
  }

  return restChildren
}

function keepAttributes (el, allowedAttrs) {
  const attrs = nodeListToArray(el.attributes)

  for (const attr of attrs) {
    // if there is no explicit allowed attrs passed then all attrs are allowed,
    // xmlns: attrs are always allowed
    const isAllowed = (
      attr.nodeName.startsWith('xmlns:') ||
      (!Array.isArray(allowedAttrs) ? true : allowedAttrs.includes(attr.nodeName))
    )

    if (!isAllowed) {
      el.removeAttribute(attr.nodeName)
    }
  }
}
