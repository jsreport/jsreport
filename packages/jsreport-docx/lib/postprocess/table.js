const { DOMParser } = require('@xmldom/xmldom')
const recursiveStringReplaceAsync = require('../recursiveStringReplaceAsync')
const { serializeXml, nodeListToArray } = require('../utils')

module.exports = async (files, headerFooterRefs) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<w:tbl>',
    '</w:tbl>',
    'g',
    async (val, content) => {
      const doc = new DOMParser().parseFromString(val)
      const tableEl = doc.documentElement

      processTableEl(tableEl, doc)

      return serializeXml(tableEl)
    },
    // we just want top level tbl elements, we are going to handle
    // the nested tables anyway by getting all tc elements
    true
  )

  for (const { doc: headerFooterDoc } of headerFooterRefs) {
    const tableEls = nodeListToArray(headerFooterDoc.getElementsByTagName('w:tbl'))

    for (const tableEl of tableEls) {
      processTableEl(tableEl, headerFooterDoc)
    }
  }
}

function processTableEl (tableEl, doc) {
  const cellEls = nodeListToArray(tableEl.getElementsByTagName('w:tc'))

  // normalize table cells to contain at least paragraph
  // this is needed because user can put conditions across cells
  // which may produce cells with no content elements
  for (let index = 0; index < cellEls.length; index++) {
    const cellEl = cellEls[index]
    const cellChildEls = nodeListToArray(cellEl.childNodes)
    const cellPropertiesElIndex = cellChildEls.findIndex((node) => node.nodeName === 'w:tcPr')
    const cellContentEls = cellPropertiesElIndex !== -1 ? cellChildEls.slice(cellPropertiesElIndex + 1) : []

    if (cellContentEls.length !== 0) {
      continue
    }

    cellEl.appendChild(doc.createElement('w:p'))
  }
}
