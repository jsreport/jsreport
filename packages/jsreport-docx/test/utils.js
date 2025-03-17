const path = require('path')
const { DOMParser } = require('@xmldom/xmldom')
const sax = require('sax')
const { decompress } = require('@jsreport/office')
const { nodeListToArray, getPictureElInfo } = require('../lib/utils')

module.exports.getDocumentsFromDocxBuf = async function getDocumentsFromDocxBuf (docxBuf, documentPaths, options = {}) {
  const files = await decompress()(docxBuf)
  const targetFiles = []

  for (const documentPath of documentPaths) {
    const fileRef = files.find((f) => f.path === documentPath)
    targetFiles.push(fileRef)
  }

  const result = targetFiles.map((file) => {
    if (file == null) {
      return null
    }

    const fileContent = file.data.toString()

    if (options.strict) {
      // strict parser will fail on invalid entities found in xml
      const parser = sax.parser(true)

      try {
        parser.write(fileContent).close()
      } catch (stringParsingError) {
        stringParsingError.message = `Error parsing xml file at ${file.path}: ${stringParsingError.message}`
        throw stringParsingError
      }
    }

    return new DOMParser().parseFromString(fileContent)
  })

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

  const textNodesMatching = { start: 0, nodes: [], complete: false }

  for (const textNode of allTextNodes) {
    const end = textNodesMatching.start + (textNode.textContent.length - 1)

    if (
      (
        textNodesMatching.start >= target.start &&
        textNodesMatching.start <= target.end
      ) || (
        end >= target.start &&
        end <= target.end
      ) || (
        end > target.end
      )
    ) {
      textNodesMatching.nodes.push(textNode)
    }

    textNodesMatching.start = end + 1

    if (textNodesMatching.start > target.end) {
      textNodesMatching.complete = true
    }

    if (textNodesMatching.complete) {
      break
    }
  }

  return textNodesMatching.nodes
}

async function getImageEl (bufOrFile, _target, all = false) {
  let file

  if (Buffer.isBuffer(bufOrFile)) {
    const files = await decompress()(bufOrFile)
    const target = _target || 'word/document.xml'
    file = files.find(f => f.path === target)
  } else {
    file = bufOrFile
  }

  if (file == null) {
    return all ? [] : undefined
  }

  const doc = new DOMParser().parseFromString(
    file.data.toString()
  )

  if (doc == null) {
    return all ? [] : undefined
  }

  const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))
  const results = []

  for (const drawingEl of drawingEls) {
    const pictureInfo = getPictureElInfo(drawingEl)

    if (pictureInfo.picture == null) {
      continue
    }

    results.push(pictureInfo.picture)
  }

  return all ? results : results[0]
}

module.exports.getImageEl = getImageEl

module.exports.getImageMeta = async function getImageMeta (buf, _target, all = false) {
  const files = await decompress()(buf)
  const targetPath = _target || 'word/document.xml'
  const targetFile = files.find(f => f.path === targetPath)
  const relsFilename = `${path.posix.basename(targetPath)}.rels`
  const targetRelsFile = files.find(f => f.path === `word/_rels/${relsFilename}`)
  let targetRelEls = []

  if (targetRelsFile != null) {
    const targetRelsDoc = new DOMParser().parseFromString(
      targetRelsFile.data.toString()
    )

    const targetRelsEl = targetRelsDoc.getElementsByTagName('Relationships')[0]
    targetRelEls = nodeListToArray(targetRelsEl.getElementsByTagName('Relationship'))
  }

  const pictureEls = await getImageEl(targetFile, _target, true)
  const results = []

  for (const pictureEl of pictureEls) {
    const meta = {}

    const blipEl = pictureEl.getElementsByTagName('a:blip')[0]
    const currentImageRelId = blipEl.getAttribute('r:embed')

    let currentRelEl = targetRelEls.find((el) => el.getAttribute('Id') === currentImageRelId)

    // checks to see if the image is svg
    const extLstEl = nodeListToArray(blipEl.childNodes).find((el) => el.nodeName === 'a:extLst')
    const existingSVGBlipExt = nodeListToArray(extLstEl.childNodes).find((el) => el.getAttribute('uri') === '{96DAC541-7B7A-43D3-8B79-37D633B846F1}')

    if (existingSVGBlipExt) {
      const existingAsvgBlipEl = nodeListToArray(existingSVGBlipExt.childNodes).find((el) => el.nodeName === 'asvg:svgBlip')
      currentRelEl = targetRelEls.find((el) => el.getAttribute('Id') === existingAsvgBlipEl.getAttribute('r:embed'))
    }

    if (currentRelEl) {
      const imagePath = path.posix.join(path.posix.dirname(path.posix.dirname(targetRelsFile.path)), currentRelEl.getAttribute('Target'))

      meta.image = {
        name: path.posix.basename(imagePath),
        extension: path.posix.extname(imagePath),
        path: imagePath,
        content: files.find(f => f.path === imagePath).data
      }
    }

    const aExtEl = pictureEl.getElementsByTagName('a:xfrm')[0].getElementsByTagName('a:ext')[0]

    meta.size = {
      width: parseFloat(aExtEl.getAttribute('cx')),
      height: parseFloat(aExtEl.getAttribute('cy'))
    }

    results.push(meta)
  }

  return all ? results : results[0]
}
