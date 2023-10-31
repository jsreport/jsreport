const { nodeListToArray } = require('../utils')

const regexp = /{{docxRaw [^{}]{0,500}}}/

// the problem is that the {{docxRaw}} literal is in a w:t element, which is supposed to only contain literal text,
// but we want the docxRaw helper to provide a raw XML fragment.
// Word 365 is not bothered by that, but other docx editors can be.
// E.g. Word Online displays a broken table and Libreoffice drops the run altogether.

// we find the {{docxRaw}} literal in the w:t element and move it up the tree so it is in its desired location.

module.exports = (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml').doc
  const generalTextElements = nodeListToArray(documentFile.getElementsByTagName('w:t'))

  for (const textEl of generalTextElements) {
    // there may be more than one docxRaw helper call in a single w:t
    while (textEl.textContent.includes('{{docxRaw')) {
      const xmlArg = textEl.textContent.match(/xml=([^}\s]+)[\s}]/)
      const replaceParentElementArg = textEl.textContent.match(/replaceParentElement=['"]([^'"]+)['"][\s}]/)
      if ((!xmlArg || !xmlArg[1]) && (!replaceParentElementArg || !replaceParentElementArg[1])) {
        throw new Error('Expected "xml" and "replaceParentElement" parameters for the docxRaw helper')
      }
      if (!xmlArg || !xmlArg[1]) {
        throw new Error('Expected "xml" parameter for the docxRaw helper')
      }
      if (!replaceParentElementArg || !replaceParentElementArg[1]) {
        throw new Error('Expected "replaceParentElement" parameter for the docxRaw helper')
      }
      const rawXML = xmlArg[1]

      // if the xml was specified inline, it means it was stored as part of the xml,
      // in this case we need to decode the XML at runtime, we specify that by using the inlineXML option
      if (rawXML.startsWith("'") || rawXML.startsWith('"')) {
        textEl.textContent = `${textEl.textContent.slice(0, xmlArg.index)}inlineXML=true ${textEl.textContent.slice(xmlArg.index)}`
      }

      const replaceParentElement = replaceParentElementArg[1]
      const helperCall = textEl.textContent.match(regexp)[0]
      const newNode = documentFile.createElement('docxRemove')
      newNode.textContent = helperCall

      const refElement = getReferenceElement(textEl, replaceParentElement)
      // insert the new node right after the reference element
      refElement.parentNode.insertBefore(newNode, refElement.nextSibling)

      // remove the helper from its original location
      textEl.textContent = textEl.textContent.replace(regexp, '')
    }
  }
}

function getReferenceElement (node, replaceParentElement) {
  for (node = node.parentNode; node.nodeName !== 'w:document'; node = node.parentNode) {
    if (node.nodeName === replaceParentElement) {
      return node
    }
  }

  throw new Error('Could not find a reference element that matches the "replaceParentElement" parameter of the docxRaw helper in the document tree: ' + replaceParentElement)
}
