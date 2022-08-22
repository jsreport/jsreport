const { DOMParser } = require('@xmldom/xmldom')
const { decompress } = require('@jsreport/office')
const { nodeListToArray } = require('../lib/utils')

module.exports.getDocumentsFromDocxBuf = async function getDocumentsFromDocxBuf (docxBuf, documentPaths, options = {}) {
  const files = await decompress()(docxBuf)
  const targetFiles = []

  for (const documentPath of documentPaths) {
    const fileRef = files.find((f) => f.path === documentPath)
    targetFiles.push(fileRef)
  }

  const result = targetFiles.map((file) => (
    file != null ? new DOMParser().parseFromString(file.data.toString()) : null
  ))

  if (options.returnFiles) {
    return {
      files,
      documents: result
    }
  }

  return result
}

module.exports.getTextNodesMatching = function getTextNodesMatching (doc, targetText) {
  const allTextNodes = nodeListToArray(doc.getElementsByTagName('w:t')).filter((t) => {
    return t.textContent != null && t.textContent !== ''
  })

  let fullStr = ''

  for (const textNode of allTextNodes) {
    fullStr += textNode.textContent
  }

  const regexp = new RegExp(targetText)
  const match = fullStr.match(regexp)

  if (match == null) {
    return []
  }

  const target = {
    start: match.index,
    end: match.index + targetText.length - 1
  }

  const textNodesMatching = allTextNodes.reduce((acu, textNode) => {
    if (acu.complete) {
      return acu
    }

    const end = acu.start + (textNode.textContent.length - 1)

    if (
      (
        acu.start >= target.start &&
        acu.start <= target.end
      ) || (
        acu.end >= target.start &&
        acu.end <= target.end
      )
    ) {
      acu.nodes.push(textNode)
    }

    acu.start = end + 1

    if (acu.start > target.end) {
      acu.complete = true
    }

    return acu
  }, { start: 0, nodes: [], complete: false })

  return textNodesMatching.nodes
}

module.exports.getImageSize = async function getImageSize (buf) {
  const files = await decompress()(buf)
  const doc = new DOMParser().parseFromString(
    files.find(f => f.path === 'word/document.xml').data.toString()
  )
  const drawingEl = doc.getElementsByTagName('w:drawing')[0]
  const pictureEl = findDirectPictureChild(drawingEl)
  const aExtEl = pictureEl.getElementsByTagName('a:xfrm')[0].getElementsByTagName('a:ext')[0]

  return {
    width: parseFloat(aExtEl.getAttribute('cx')),
    height: parseFloat(aExtEl.getAttribute('cy'))
  }
}

module.exports.findDirectPictureChild = findDirectPictureChild

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
