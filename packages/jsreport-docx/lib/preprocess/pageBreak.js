const { nodeListToArray } = require('../utils')

module.exports = (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml').doc
  const generalTextElements = nodeListToArray(documentFile.getElementsByTagName('w:t'))

  for (const textEl of generalTextElements) {
    if (!textEl.textContent.includes('{{docxPageBreak}}')) {
      continue
    }

    const parts = textEl.textContent.split('{{docxPageBreak}}')

    if (parts[0] !== '') {
      const wrClone = textEl.parentNode.cloneNode(true)
      const textElClone = nodeListToArray(wrClone.childNodes).find((el) => el.nodeName === 'w:t')
      textElClone.textContent = parts[0]
      textEl.parentNode.parentNode.insertBefore(wrClone, textEl.parentNode)
    }

    if (parts[1] !== '') {
      const wrClone = textEl.parentNode.cloneNode(true)
      const textElClone = nodeListToArray(wrClone.childNodes).find((el) => el.nodeName === 'w:t')
      textElClone.textContent = parts[1]
      textEl.parentNode.parentNode.insertBefore(wrClone, textEl.parentNode.nextSibling)
    }

    const wrEl = textEl.parentNode
    const pageBreakPlaceholderEl = documentFile.createElement('docxPageBreak')
    pageBreakPlaceholderEl.textContent = 'newPage'

    wrEl.removeChild(textEl)
    wrEl.appendChild(pageBreakPlaceholderEl)
  }
}
