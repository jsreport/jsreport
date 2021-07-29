const { nodeListToArray } = require('../utils')

module.exports = function processImage (files, drawingEl) {
  const relsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc

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

  // to support hyperlink generation in a loop, we need to insert the hyperlink definition into
  // the document xml, so when template engine runs it evaluates with the correct data context
  const hyperlinkRelId = linkClickEl.getAttribute('r:id')

  const hyperlinkRelEl = nodeListToArray(relsDoc.getElementsByTagName('Relationship')).find((el) => {
    return el.getAttribute('Id') === hyperlinkRelId
  })

  const hyperlinkRelElClone = hyperlinkRelEl.cloneNode()

  const decodedTarget = decodeURIComponent(hyperlinkRelElClone.getAttribute('Target'))

  if (decodedTarget.includes('{{')) {
    hyperlinkRelElClone.setAttribute('Target', decodedTarget)
  }

  pictureEl.insertBefore(hyperlinkRelElClone, pictureEl.firstChild)
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
