const { nodeListToArray, getPictureElInfo } = require('../utils')

module.exports = function processImage (files, drawingEl, relsDoc) {
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
