const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray } = require('./utils')

module.exports = function processContentTypes (data, xmlStr) {
  const { newDefaultContentTypes } = data

  if (newDefaultContentTypes.size === 0) {
    return xmlStr
  }

  const doc = new DOMParser().parseFromString(`<docxXml>${xmlStr}</docxXml>`)
  const defaultEls = nodeListToArray(doc.getElementsByTagName('Default'))

  const existingDefaultContentTypes = new Map(
    defaultEls.map((el) => [el.getAttribute('Extension'), el.getAttribute('ContentType')])
  )

  const refNode = defaultEls.length > 0 ? defaultEls[defaultEls.length - 1] : doc.documentElement.firstChild

  for (const [extension, contentType] of newDefaultContentTypes) {
    if (existingDefaultContentTypes.has(extension)) {
      continue
    }

    const defaultEl = doc.createElement('Default')
    defaultEl.setAttribute('Extension', extension)
    defaultEl.setAttribute('ContentType', contentType)
    doc.documentElement.insertBefore(defaultEl, refNode.nextSibling)
  }

  const items = nodeListToArray(doc.documentElement.childNodes)
  const result = items.map((el) => el.toString()).join('')
  return result
}
