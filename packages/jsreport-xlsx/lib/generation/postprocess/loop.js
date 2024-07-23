const { DOMParser } = require('@xmldom/xmldom')
const recursiveStringReplaceAsync = require('../../recursiveStringReplaceAsync')
const { nodeListToArray, isWorksheetFile, getSheetInfo } = require('../../utils')

module.exports = async (files) => {
  const workbookPath = 'xl/workbook.xml'
  const workbookDoc = files.find((f) => f.path === workbookPath).doc
  const workbookRelsDoc = files.find((file) => file.path === 'xl/_rels/workbook.xml.rels').doc
  const workbookSheetsEls = nodeListToArray(workbookDoc.getElementsByTagName('sheet'))
  const workbookRelsEls = nodeListToArray(workbookRelsDoc.getElementsByTagName('Relationship'))

  for (const sheetFile of files.filter((f) => isWorksheetFile(f.path))) {
    const sheetInfo = getSheetInfo(sheetFile.path, workbookSheetsEls, workbookRelsEls)

    if (sheetInfo == null) {
      throw new Error(`Could not find sheet info for sheet at ${sheetFile.path}`)
    }

    // check if we need to updates tables
    sheetFile.data = await recursiveStringReplaceAsync(
      sheetFile.data.toString(),
      '<tablesUpdated>',
      '</tablesUpdated>',
      'g',
      async (val, content, hasNestedMatch) => {
        if (hasNestedMatch) {
          return val
        }

        const doc = new DOMParser().parseFromString(val)
        const tablesUpdatedEl = doc.documentElement
        const tableUpdatedEls = nodeListToArray(tablesUpdatedEl.getElementsByTagName('tableUpdated'))

        for (const tableUpdatedEl of tableUpdatedEls) {
          const tableDoc = files.find((f) => f.path === tableUpdatedEl.getAttribute('file'))?.doc

          if (tableDoc == null) {
            continue
          }

          tableDoc.documentElement.setAttribute('ref', tableUpdatedEl.getAttribute('ref'))

          const autoFilterEl = tableDoc.getElementsByTagName('autoFilter')[0]
          const autoFilterRefUpdatedEl = nodeListToArray(tableUpdatedEl.childNodes).find((el) => el.nodeName === 'autoFilterRef')

          if (autoFilterEl != null && autoFilterRefUpdatedEl != null) {
            autoFilterEl.setAttribute('ref', autoFilterRefUpdatedEl.getAttribute('ref'))
          }
        }

        return ''
      }
    )
  }
}
