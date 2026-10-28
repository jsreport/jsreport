const path = require('path')
const { getColumnFor } = require('../../../cellUtils')
const { nodeListToArray, processOpeningTag, getDataHelperCall } = require('../../../utils')

module.exports.prepareAutoFit = prepareAutoFit

// keeps the columns with autofit configured (with the {{xlsxColAutofit}} call in a comment of the first row),
// it registers the content manager of <cols> (the widths are set at runtime), at the end it replaces <cols>
// with the helper call that renders the final cols and removes the {{xlsxColAutofit}} calls from the comments
function prepareAutoFit (sheet, files) {
  const colsEl = sheet.doc.getElementsByTagName('cols')[0]

  // looking for autofit comments in the sheet
  const autoFitConfigured = findAutoFitConfigured(sheet.path, sheet.doc, sheet.relsFile?.doc, files)
  const isAutofitConfigured = autoFitConfigured.length > 0

  if (isAutofitConfigured) {
    sheet.contentManagers.set('cols', {
      prepare: () => {
        const elements = Array.from(colsEl?.childNodes ?? [])

        return {
          parts: {
            col: {
              type: 'simpleCollection',
              idAttrs: ['min', 'max']
            }
          },
          elements
        }
      }
    })
  }

  return {
    // the autofit configurations ({ row, column, shapeEl, commentEl }), one for each {{xlsxColAutofit}} call
    getConfigured () {
      return autoFitConfigured
    },
    isConfigured () {
      return isAutofitConfigured
    },
    // the letters of the columns with autofit configured
    getEnabledColumns () {
      // we expect the column to be 1 based
      return autoFitConfigured.map((r) => getColumnFor(r.column + 1)[0])
    },
    // if autofit is configured, we are going to customize the cols so we need to wrap it in helper
    finish () {
      if (!isAutofitConfigured) {
        return
      }

      const sheetDataEl = sheet.doc.getElementsByTagName('sheetData')[0]
      let targetColsEl = colsEl

      // if there is no <cols> we initialize it
      if (targetColsEl == null) {
        targetColsEl = sheet.doc.createElement('cols')
        sheetDataEl.parentNode.insertBefore(targetColsEl, sheetDataEl)
      }

      if (targetColsEl.childNodes.length > 0) {
        const parentOfColsEl = targetColsEl.parentNode
        const newColsEl = targetColsEl.cloneNode()

        // fast way to remove children, iterating all children and using .removeChild is
        // very slow in big documents
        parentOfColsEl.replaceChild(
          newColsEl,
          targetColsEl
        )

        targetColsEl = newColsEl
      }

      targetColsEl.appendChild(
        processOpeningTag(sheet.doc, false, getDataHelperCall('renderContent', {
          name: 'cols'
        }, { isBlock: false }))
      )

      // remove {{xlsxColAutofit}} calls and remove comments and shapes from
      // their respective documents if needed
      for (const conf of autoFitConfigured) {
        const tEls = nodeListToArray(conf.commentEl.getElementsByTagName('t'))
        let shouldRemoveComment = false

        if (tEls.length === 1) {
          const expectedRegexp = /^{{xlsxColAutofit( [^}]*)?}}$/
          shouldRemoveComment = expectedRegexp.test(tEls[0].textContent)
        } else if (tEls[0].textContent.endsWith(':')) {
          const remainingText = tEls.slice(1).map((el) => el.textContent).join('')
          const expectedRegexp = /^\r?\n?{{xlsxColAutofit( [^}]*)?}}$/
          shouldRemoveComment = expectedRegexp.test(remainingText)
        }

        if (shouldRemoveComment) {
          conf.commentEl.parentNode.removeChild(conf.commentEl)
          conf.shapeEl.parentNode.removeChild(conf.shapeEl)
        } else {
          // when comment is not going to be removed we remove just the helper call text
          // and if there is no more text in the element remove it
          const tCallEl = tEls.find((tEl) => tEl.textContent.startsWith('{{xlsxColAutofit'))
          tCallEl.textContent = tCallEl.textContent.replace(/{{xlsxColAutofit( [^}]*)?}}/, '')

          if (tCallEl.textContent === '') {
            tCallEl.parentNode.removeChild(tCallEl)
          }
        }
      }
    }
  }
}

function findAutoFitConfigured (sheetFilepath, sheetDoc, sheetRelsDoc, files) {
  const result = []
  const legacyDrawingEls = nodeListToArray(sheetDoc.getElementsByTagName('legacyDrawing'))
  const relationshipEls = sheetRelsDoc == null ? [] : nodeListToArray(sheetRelsDoc.getElementsByTagName('Relationship'))
  const commentRelEl = relationshipEls.find((el) => el.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments')

  let commentsDoc

  if (commentRelEl != null) {
    const commentsFilePath = path.posix.join(path.posix.dirname(sheetFilepath), commentRelEl.getAttribute('Target'))
    commentsDoc = files.find((file) => file.path === commentsFilePath)?.doc
  }

  if (commentsDoc == null) {
    return result
  }

  const commentEls = nodeListToArray(commentsDoc.getElementsByTagName('comment'))

  for (const legacyDrawingEl of legacyDrawingEls) {
    const rId = legacyDrawingEl.getAttribute('r:id')

    if (rId == null) {
      continue
    }

    const relationshipEl = relationshipEls.find((el) => {
      return el.getAttribute('Id') === rId && el.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing'
    })

    if (relationshipEl == null) {
      continue
    }

    const vmlDrawingFilePath = path.posix.join(path.posix.dirname(sheetFilepath), relationshipEl.getAttribute('Target'))
    const vmlDrawingDoc = files.find((file) => file.path === vmlDrawingFilePath)?.doc

    if (vmlDrawingDoc == null) {
      continue
    }

    const vShapeEls = nodeListToArray(vmlDrawingDoc.getElementsByTagName('v:shape'))

    for (const vShapeEl of vShapeEls) {
      const vClientDataEl = vShapeEl.getElementsByTagName('x:ClientData')[0]

      if (vClientDataEl == null) {
        continue
      }

      const type = vClientDataEl.getAttribute('ObjectType')

      if (type !== 'Note') {
        continue
      }

      const vClientDataRowEl = vClientDataEl.getElementsByTagName('x:Row')[0]
      const vClientDataColumnEl = vClientDataEl.getElementsByTagName('x:Column')[0]

      if (vClientDataRowEl == null || vClientDataColumnEl == null) {
        continue
      }

      const rowIdx = parseInt(vClientDataRowEl.textContent, 10)
      const columnIdx = parseInt(vClientDataColumnEl.textContent, 10)

      if (rowIdx !== 0) {
        continue
      }

      // we expect the column to be 1 based
      const expectedRef = `${getColumnFor(columnIdx + 1)[0]}${rowIdx + 1}`

      const commentEl = commentEls.find((el) => {
        return el.getAttribute('ref') === expectedRef
      })

      if (commentEl == null) {
        continue
      }

      const textEl = nodeListToArray(commentEl.childNodes).find((el) => el.nodeName === 'text')

      if (textEl == null) {
        continue
      }

      const tEls = nodeListToArray(textEl.getElementsByTagName('t'))

      for (const tEl of tEls) {
        if (tEl.textContent.startsWith('{{xlsxColAutofit')) {
          result.push({
            row: rowIdx,
            column: columnIdx,
            shapeEl: vShapeEl,
            commentEl: commentEl
          })
          break
        }
      }
    }
  }

  return result
}
