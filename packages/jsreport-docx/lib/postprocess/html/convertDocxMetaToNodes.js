const path = require('path')
const fs = require('fs')
const fsAsync = require('fs/promises')
const { DOMParser } = require('@xmldom/xmldom')
const { customAlphabet } = require('nanoid')
const generateRandomSuffix = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)
const borderStyles = require('./borderStyles')
const { getImageSizeInEMU } = require('../../imageUtils')
const { nodeListToArray, clearEl, createNode, findOrCreateChildNode, findChildNode, findDefaultStyleIdForName, getNewRelId, ptToHalfPoint, ptToTOAP, ptToEOAP } = require('../../utils')
const xmlTemplatesCache = new Map()

module.exports = async function convertDocxMetaToNodes (docxMeta, htmlEmbedDef, mode, { docPath, doc, relsDoc: _relsDoc, files, paragraphNode, numberingLock } = {}) {
  if (mode !== 'block' && mode !== 'inline') {
    throw new Error(`Invalid conversion mode "${mode}"`)
  }

  const contentTypesFile = files.find(f => f.path === '[Content_Types].xml')
  const typesEl = contentTypesFile.doc.getElementsByTagName('Types')[0]
  let relsDoc

  if (!_relsDoc) {
    // initialize rels doc if it doesn't exist, it is usually the case when there are header/footer
    const docBasename = path.posix.basename(docPath)
    const emptyRelsXMLStr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" />'
    const newRelsDoc = new DOMParser().parseFromString(emptyRelsXMLStr)

    relsDoc = newRelsDoc

    files.push({
      path: `word/_rels/${docBasename}.rels`,
      data: emptyRelsXMLStr,
      doc: newRelsDoc
    })
  } else {
    relsDoc = _relsDoc
  }

  const relsEl = relsDoc.getElementsByTagName('Relationships')[0]
  const stylesDoc = files.find(f => f.path === 'word/styles.xml').doc
  const pending = docxMeta.map((meta) => ({ item: meta }))
  const result = []
  const headingStylesIdCache = new Map()
  const listParagraphStyleIdCache = {}
  const numberingListsCache = new Map()
  const hyperlinkStyleIdCache = {}
  let maxDocPrId

  if (contentTypesFile.doc.documentElement.hasAttribute('drawingMaxDocPrId')) {
    maxDocPrId = parseInt(contentTypesFile.doc.documentElement.getAttribute('drawingMaxDocPrId'), 10)
  }

  let templateParagraphNode

  if (mode === 'block') {
    templateParagraphNode = paragraphNode.cloneNode(true)
    // inherit only the paragraph properties of the html embed call
    clearEl(templateParagraphNode, (c) => c.nodeName === 'w:pPr')
  }

  while (pending.length > 0) {
    const { parent, item: currentDocxMeta } = pending.shift()

    if (mode === 'block' && parent == null && (currentDocxMeta.type !== 'paragraph' && currentDocxMeta.type !== 'table')) {
      throw new Error(`Top level elements in docx meta for "${mode}" mode must be paragraphs or tables`)
    } else if (mode === 'inline' && parent == null && currentDocxMeta.type !== 'text' && currentDocxMeta.type !== 'break' && currentDocxMeta.type !== 'image') {
      throw new Error(`Top level elements in docx meta for "${mode}" mode must be text, image or break`)
    }

    if (currentDocxMeta.type === 'paragraph') {
      if (mode === 'inline') {
        throw new Error(`docx meta paragraph element can not be applied for "${mode}" mode`)
      }

      const containerEl = templateParagraphNode.cloneNode(true)

      const invalidChildMeta = currentDocxMeta.children.find((childMeta) => (
        childMeta.type !== 'text' &&
        childMeta.type !== 'break' &&
        childMeta.type !== 'image'
      ))

      if (invalidChildMeta != null) {
        throw new Error(`Invalid docx meta child "${invalidChildMeta.type}" found in paragraph`)
      }

      if (currentDocxMeta.title != null) {
        const pPrEl = findOrCreateChildNode(doc, 'w:pPr', containerEl)
        const pStyleEl = findOrCreateChildNode(doc, 'w:pStyle', pPrEl)
        const titleStyleId = addOrGetTitleStyle(stylesDoc, currentDocxMeta.title, headingStylesIdCache)
        pStyleEl.setAttribute('w:val', titleStyleId)
      }

      if (currentDocxMeta.list != null) {
        const numId = await addOrGetNumbering(files, currentDocxMeta.list, numberingListsCache, numberingLock)

        if (numId != null) {
          const pPrEl = findOrCreateChildNode(doc, 'w:pPr', containerEl)
          const pStyleEl = findOrCreateChildNode(doc, 'w:pStyle', pPrEl)
          const listParagraphStyleId = addOrGetListParagraphStyle(stylesDoc, listParagraphStyleIdCache)
          pStyleEl.setAttribute('w:val', listParagraphStyleId)
          const numPrEl = findOrCreateChildNode(doc, 'w:numPr', pPrEl)
          const iLvlEl = findOrCreateChildNode(doc, 'w:ilvl', numPrEl)
          iLvlEl.setAttribute('w:val', currentDocxMeta.list.level - 1)
          const numIdEl = findOrCreateChildNode(doc, 'w:numId', numPrEl)
          numIdEl.setAttribute('w:val', numId)
        }
      }

      if (currentDocxMeta.backgroundColor != null) {
        const pPrEl = findOrCreateChildNode(doc, 'w:pPr', containerEl)
        const existingShdEl = findChildNode('w:shd', pPrEl)

        if (existingShdEl != null) {
          pPrEl.removeChild(existingShdEl)
        }

        const backgroundColor = currentDocxMeta.backgroundColor.slice(1)
        pPrEl.insertBefore(createNode(doc, 'w:shd', { attributes: { 'w:val': 'clear', 'w:color': 'auto', 'w:fill': backgroundColor } }), pPrEl.firstChild)
      }

      if (currentDocxMeta.alignment != null) {
        if (currentDocxMeta.alignment.horizontal != null) {
          const pPrEl = findOrCreateChildNode(doc, 'w:pPr', containerEl)
          const jcEl = findOrCreateChildNode(doc, 'w:jc', pPrEl)
          jcEl.setAttribute('w:val', currentDocxMeta.alignment.horizontal)
        }
      }

      if (currentDocxMeta.indent != null) {
        if (currentDocxMeta.indent.left != null) {
          const pPrEl = findOrCreateChildNode(doc, 'w:pPr', containerEl)
          const indEl = findOrCreateChildNode(doc, 'w:ind', pPrEl)
          const indLeftInTOAP = ptToTOAP(currentDocxMeta.indent.left).toString()
          indEl.setAttribute('w:left', indLeftInTOAP)
        }

        if (currentDocxMeta.indent.right != null) {
          const pPrEl = findOrCreateChildNode(doc, 'w:pPr', containerEl)
          const indEl = findOrCreateChildNode(doc, 'w:ind', pPrEl)
          const indRightInTOAP = ptToTOAP(currentDocxMeta.indent.right).toString()
          indEl.setAttribute('w:right', indRightInTOAP)
        }
      }

      if (currentDocxMeta.spacing != null) {
        if (currentDocxMeta.spacing.before != null) {
          const pPrEl = findOrCreateChildNode(doc, 'w:pPr', containerEl)
          const spacingEl = findOrCreateChildNode(doc, 'w:spacing', pPrEl)
          const spacingBeforeInTOAP = ptToTOAP(currentDocxMeta.spacing.before).toString()
          spacingEl.setAttribute('w:before', spacingBeforeInTOAP)
        }

        if (currentDocxMeta.spacing.after != null) {
          const pPrEl = findOrCreateChildNode(doc, 'w:pPr', containerEl)
          const spacingEl = findOrCreateChildNode(doc, 'w:spacing', pPrEl)
          const spacingAfterInTOAP = ptToTOAP(currentDocxMeta.spacing.after).toString()
          spacingEl.setAttribute('w:after', spacingAfterInTOAP)
        }
      }

      if (parent == null) {
        result.push(containerEl)
      } else {
        parent.appendChild(containerEl)
      }

      const pendingItemsInCurrent = currentDocxMeta.children.map((meta) => ({
        parent: containerEl,
        item: meta
      }))

      if (pendingItemsInCurrent.length > 0) {
        pending.unshift(...pendingItemsInCurrent)
      }
    } else if (currentDocxMeta.type === 'table' || currentDocxMeta.type === 'row' || currentDocxMeta.type === 'cell') {
      if (mode === 'inline') {
        throw new Error(`docx meta ${currentDocxMeta.type} element can not be applied for "${mode}" mode`)
      }

      const validChildTypes = []

      if (currentDocxMeta.type === 'table') {
        validChildTypes.push('row')
      } else if (currentDocxMeta.type === 'row') {
        validChildTypes.push('cell')
      } else if (currentDocxMeta.type === 'cell') {
        validChildTypes.push('paragraph')
        validChildTypes.push('table')
      }

      const invalidChildMeta = currentDocxMeta.children.find((childMeta) => (
        !validChildTypes.includes(childMeta.type)
      ))

      if (invalidChildMeta != null) {
        throw new Error(`Invalid docx meta child "${invalidChildMeta.type}" found in ${currentDocxMeta.type}`)
      }

      let containerEl

      if (currentDocxMeta.type === 'table') {
        // validating that table has at least one row and one cell, if not
        // don't continue producing the table
        if (
          currentDocxMeta.children.length > 0 &&
          currentDocxMeta.children[0].type === 'row' &&
          currentDocxMeta.children[0].children.length > 0 &&
          currentDocxMeta.children[0].children[0].type === 'cell'
        ) {
          const tableWidth = currentDocxMeta.width != null ? currentDocxMeta.width : 0
          const tableWidthType = currentDocxMeta.width != null ? 'dxa' : 'auto'

          containerEl = createNode(doc, 'w:tbl', {
            children: [
              createNode(doc, 'w:tblPr', {
                children: [
                  createNode(doc, 'w:tblW', { attributes: { 'w:w': tableWidth, 'w:type': tableWidthType } }),
                  createNode(doc, 'w:tblInd', { attributes: { 'w:w': '0', 'w:type': 'dxa' } }),
                  createNode(doc, 'w:tblCellMar', {
                    children: [
                      createNode(doc, 'w:top', { attributes: { 'w:w': '0', 'w:type': 'dxa' } }),
                      createNode(doc, 'w:left', { attributes: { 'w:w': '108', 'w:type': 'dxa' } }),
                      createNode(doc, 'w:bottom', { attributes: { 'w:w': '0', 'w:type': 'dxa' } }),
                      createNode(doc, 'w:right', { attributes: { 'w:w': '108', 'w:type': 'dxa' } })
                    ]
                  }),
                  createNode(doc, 'w:tblBorders', {
                    children: [
                      createNode(doc, 'w:top', {
                        attributes: {
                          'w:val': getBorderStyle(currentDocxMeta.border?.top?.style, getBorderWidth(currentDocxMeta.border?.top?.width)),
                          'w:sz': getBorderWidth(currentDocxMeta.border?.top?.width),
                          'w:space': '0',
                          'w:color': getBorderColor(currentDocxMeta.border?.top?.color)
                        }
                      }),
                      createNode(doc, 'w:left', {
                        attributes: {
                          'w:val': getBorderStyle(currentDocxMeta.border?.left?.style, getBorderWidth(currentDocxMeta.border?.left?.width)),
                          'w:sz': getBorderWidth(currentDocxMeta.border?.left?.width),
                          'w:space': '0',
                          'w:color': getBorderColor(currentDocxMeta.border?.left?.color)
                        }
                      }),
                      createNode(doc, 'w:bottom', {
                        attributes: {
                          'w:val': getBorderStyle(currentDocxMeta.border?.bottom?.style, getBorderWidth(currentDocxMeta.border?.bottom?.width)),
                          'w:sz': getBorderWidth(currentDocxMeta.border?.bottom?.width),
                          'w:space': '0',
                          'w:color': getBorderColor(currentDocxMeta.border?.bottom?.color)
                        }
                      }),
                      createNode(doc, 'w:right', {
                        attributes: {
                          'w:val': getBorderStyle(currentDocxMeta.border?.right?.style, getBorderWidth(currentDocxMeta.border?.right?.width)),
                          'w:sz': getBorderWidth(currentDocxMeta.border?.right?.width),
                          'w:space': '0',
                          'w:color': getBorderColor(currentDocxMeta.border?.right?.color)
                        }
                      }),
                      createNode(doc, 'w:insideH', {
                        attributes: {
                          'w:val': getBorderStyle(currentDocxMeta.border?.base?.style, getBorderWidth(currentDocxMeta.border?.base?.width)),
                          'w:sz': getBorderWidth(currentDocxMeta.border?.base?.width),
                          'w:space': '0',
                          'w:color': getBorderColor(currentDocxMeta.border?.base?.color)
                        }
                      }),
                      createNode(doc, 'w:insideV', {
                        attributes: {
                          'w:val': getBorderStyle(currentDocxMeta.border?.base?.style, getBorderWidth(currentDocxMeta.border?.base?.width)),
                          'w:sz': getBorderWidth(currentDocxMeta.border?.base?.width),
                          'w:space': '0',
                          'w:color': getBorderColor(currentDocxMeta.border?.base?.color)
                        }
                      })
                    ]
                  }),
                  // the only required attr of this element is w:val which is a bitmask of
                  // the enabled options, the rest of attrs just describe the boolean values
                  // of the options applied
                  createNode(doc, 'w:tblLook', { attributes: { 'w:val': '04A0', 'w:firstRow': '1', 'w:lastRow': '0', 'w:firstColumn': '1', 'w:lastColumn': '0', 'w:noHBand': '0', 'w:noVBand': '1' } })
                ]
              }),
              createNode(doc, 'w:tblGrid', {
                children: currentDocxMeta.cols.map((colInfo) => {
                  return createNode(doc, 'w:gridCol', { attributes: { 'w:w': colInfo.width } })
                })
              })
            ]
          })
        }
      } else if (currentDocxMeta.type === 'row') {
        containerEl = createNode(doc, 'w:tr')

        if (currentDocxMeta.height != null) {
          containerEl.appendChild(createNode(doc, 'w:trPr', {
            children: [
              createNode(doc, 'w:trHeight', { attributes: { 'w:val': currentDocxMeta.height } })
            ]
          }))
        }
      } else if (currentDocxMeta.type === 'cell') {
        const cellPrChildren = [
          createNode(doc, 'w:tcW', { attributes: { 'w:w': currentDocxMeta.width, 'w:type': 'dxa' } })
        ]

        if (currentDocxMeta.backgroundColor != null) {
          const backgroundColor = currentDocxMeta.backgroundColor.slice(1)

          cellPrChildren.push(
            createNode(doc, 'w:shd', {
              attributes: {
                'w:val': 'clear',
                'w:color': 'auto',
                'w:fill': backgroundColor
              }
            })
          )
        }

        if (currentDocxMeta.alignment != null) {
          if (currentDocxMeta.alignment.vertical != null) {
            cellPrChildren.push(
              createNode(doc, 'w:vAlign', { attributes: { 'w:val': currentDocxMeta.alignment.vertical } })
            )
          }
        }

        if (currentDocxMeta.colspan != null) {
          cellPrChildren.push(
            createNode(doc, 'w:gridSpan', { attributes: { 'w:val': currentDocxMeta.colspan } })
          )
        }

        if (currentDocxMeta.vMerge === true) {
          cellPrChildren.push(
            createNode(doc, 'w:vMerge', { attributes: { 'w:val': 'continue' } })
          )
        } else if (currentDocxMeta.rowspan != null) {
          cellPrChildren.push(
            createNode(doc, 'w:vMerge', { attributes: { 'w:val': 'restart' } })
          )
        }

        if (currentDocxMeta.indent != null || currentDocxMeta.spacing != null) {
          const tcMarEl = createNode(doc, 'w:tcMar', {
            children: []
          })

          if (currentDocxMeta.spacing?.before != null) {
            tcMarEl.appendChild(
              createNode(doc, 'w:top', { attributes: { 'w:w': ptToTOAP(currentDocxMeta.spacing.before).toString(), 'w:type': 'dxa' } })
            )
          }

          if (currentDocxMeta.indent?.left != null) {
            tcMarEl.appendChild(
              createNode(doc, 'w:left', { attributes: { 'w:w': ptToTOAP(currentDocxMeta.indent.left).toString(), 'w:type': 'dxa' } })
            )
          }

          if (currentDocxMeta.spacing?.after != null) {
            tcMarEl.appendChild(
              createNode(doc, 'w:bottom', { attributes: { 'w:w': ptToTOAP(currentDocxMeta.spacing.after).toString(), 'w:type': 'dxa' } })
            )
          }

          if (currentDocxMeta.indent?.right != null) {
            tcMarEl.appendChild(
              createNode(doc, 'w:right', { attributes: { 'w:w': ptToTOAP(currentDocxMeta.indent.right).toString(), 'w:type': 'dxa' } })
            )
          }

          cellPrChildren.push(tcMarEl)
        }

        if (currentDocxMeta.border != null) {
          const tcBordersEl = createNode(doc, 'w:tcBorders', {
            children: [
            ]
          })

          if (currentDocxMeta.border.top != null) {
            tcBordersEl.appendChild(
              createNode(doc, 'w:top', {
                attributes: {
                  'w:val': getBorderStyle(currentDocxMeta.border.top.style, getBorderWidth(currentDocxMeta.border.top.width)),
                  'w:sz': getBorderWidth(currentDocxMeta.border.top.width),
                  'w:space': '0',
                  'w:color': getBorderColor(currentDocxMeta.border.top.color)
                }
              })
            )
          }

          if (currentDocxMeta.border.left != null) {
            tcBordersEl.appendChild(
              createNode(doc, 'w:left', {
                attributes: {
                  'w:val': getBorderStyle(currentDocxMeta.border.left.style, getBorderWidth(currentDocxMeta.border.left.width)),
                  'w:sz': getBorderWidth(currentDocxMeta.border.left.width),
                  'w:space': '0',
                  'w:color': getBorderColor(currentDocxMeta.border.left.color)
                }
              })
            )
          }

          if (currentDocxMeta.border.bottom != null) {
            tcBordersEl.appendChild(
              createNode(doc, 'w:bottom', {
                attributes: {
                  'w:val': getBorderStyle(currentDocxMeta.border.bottom.style, getBorderWidth(currentDocxMeta.border.bottom.width)),
                  'w:sz': getBorderWidth(currentDocxMeta.border.bottom.width),
                  'w:space': '0',
                  'w:color': getBorderColor(currentDocxMeta.border.bottom.color)
                }
              })
            )
          }

          if (currentDocxMeta.border.right != null) {
            tcBordersEl.appendChild(
              createNode(doc, 'w:right', {
                attributes: {
                  'w:val': getBorderStyle(currentDocxMeta.border.right.style, getBorderWidth(currentDocxMeta.border.right.width)),
                  'w:sz': getBorderWidth(currentDocxMeta.border.right.width),
                  'w:space': '0',
                  'w:color': getBorderColor(currentDocxMeta.border.right.color)
                }
              })
            )
          }

          cellPrChildren.push(tcBordersEl)
        }

        containerEl = createNode(doc, 'w:tc', {
          children: [
            createNode(doc, 'w:tcPr', {
              children: cellPrChildren
            })
          ]
        })
      }

      if (containerEl != null) {
        if (parent == null) {
          result.push(containerEl)
        } else {
          parent.appendChild(containerEl)
        }

        const pendingItemsInCurrent = currentDocxMeta.children.map((meta) => ({
          parent: containerEl,
          item: meta
        }))

        if (pendingItemsInCurrent.length > 0) {
          pending.unshift(...pendingItemsInCurrent)
        }
      }
    } else if (currentDocxMeta.type === 'text') {
      const runEl = htmlEmbedDef.tEl.parentNode.cloneNode(true)

      // inherit only the run properties of the html embed call
      clearEl(runEl, (c) => c.nodeName === 'w:rPr')

      if (currentDocxMeta.bold === true) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingBEl = findChildNode('w:b', rPrEl)

        if (existingBEl != null) {
          rPrEl.removeChild(existingBEl)
        }

        rPrEl.insertBefore(createNode(doc, 'w:b'), rPrEl.firstChild)
      }

      if (currentDocxMeta.italic === true) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingIEl = findChildNode('w:i', rPrEl)

        if (existingIEl != null) {
          rPrEl.removeChild(existingIEl)
        }

        rPrEl.insertBefore(createNode(doc, 'w:i'), rPrEl.firstChild)
      }

      if (currentDocxMeta.underline === true) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingUEl = findChildNode('w:u', rPrEl)

        if (existingUEl != null) {
          rPrEl.removeChild(existingUEl)
        }

        rPrEl.insertBefore(createNode(doc, 'w:u', { attributes: { 'w:val': 'single' } }), rPrEl.firstChild)
      }

      if (currentDocxMeta.subscript === true || currentDocxMeta.superscript === true) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingVertAlignEl = findChildNode('w:vertAlign', rPrEl)

        if (existingVertAlignEl != null) {
          rPrEl.removeChild(existingVertAlignEl)
        }

        const newVal = currentDocxMeta.superscript ? 'superscript' : 'subscript'

        rPrEl.insertBefore(createNode(doc, 'w:vertAlign', { attributes: { 'w:val': newVal } }), rPrEl.firstChild)
      }

      if (currentDocxMeta.strike === true) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingStrikeEl = findChildNode('w:strike', rPrEl)

        if (existingStrikeEl != null) {
          rPrEl.removeChild(existingStrikeEl)
        }

        rPrEl.insertBefore(createNode(doc, 'w:strike'), rPrEl.firstChild)
      }

      if (currentDocxMeta.preformatted === true) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingRFontsEl = findChildNode('w:rFonts', rPrEl)

        if (existingRFontsEl != null) {
          rPrEl.removeChild(existingRFontsEl)
        }

        const fontTableDoc = files.find(f => f.path === 'word/fontTable.xml').doc
        ensureFontDefinition(fontTableDoc, 'Courier')
        rPrEl.insertBefore(createNode(doc, 'w:rFonts', { attributes: { 'w:ascii': 'Courier', 'w:hAnsi': 'Courier' } }), rPrEl.firstChild)
      }

      if (currentDocxMeta.code === true) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingHighlightEl = findChildNode('w:highlight', rPrEl)

        if (existingHighlightEl != null) {
          rPrEl.removeChild(existingHighlightEl)
        }

        rPrEl.insertBefore(createNode(doc, 'w:highlight', { attributes: { 'w:val': 'lightGray' } }), rPrEl.firstChild)
      }

      if (currentDocxMeta.fontSize != null) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingSzEl = findChildNode('w:sz', rPrEl)

        if (existingSzEl != null) {
          rPrEl.removeChild(existingSzEl)
        }

        const existingSzCsEl = findChildNode('w:szCs', rPrEl)

        if (existingSzCsEl != null) {
          rPrEl.removeChild(existingSzCsEl)
        }

        const fontSizeInHalfPoint = ptToHalfPoint(currentDocxMeta.fontSize).toString()

        rPrEl.insertBefore(createNode(doc, 'w:szCs', { attributes: { 'w:val': fontSizeInHalfPoint } }), rPrEl.firstChild)
        rPrEl.insertBefore(createNode(doc, 'w:sz', { attributes: { 'w:val': fontSizeInHalfPoint } }), rPrEl.firstChild)
      }

      if (currentDocxMeta.fontFamily != null) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingRFontsEl = findChildNode('w:rFonts', rPrEl)

        if (existingRFontsEl != null) {
          rPrEl.removeChild(existingRFontsEl)
        }

        const fontFamily = currentDocxMeta.fontFamily
        rPrEl.insertBefore(createNode(doc, 'w:rFonts', { attributes: { 'w:ascii': fontFamily, 'w:hAnsi': fontFamily } }), rPrEl.firstChild)
      }

      if (currentDocxMeta.color != null) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingColorEl = findChildNode('w:color', rPrEl)

        if (existingColorEl != null) {
          rPrEl.removeChild(existingColorEl)
        }

        const color = currentDocxMeta.color.slice(1)
        rPrEl.insertBefore(createNode(doc, 'w:color', { attributes: { 'w:val': color } }), rPrEl.firstChild)
      }

      if (currentDocxMeta.backgroundColor != null) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingShdEl = findChildNode('w:shd', rPrEl)

        if (existingShdEl != null) {
          rPrEl.removeChild(existingShdEl)
        }

        const backgroundColor = currentDocxMeta.backgroundColor.slice(1)
        rPrEl.insertBefore(createNode(doc, 'w:shd', { attributes: { 'w:val': 'clear', 'w:color': 'auto', 'w:fill': backgroundColor } }), rPrEl.firstChild)
      }

      const textEl = createNode(doc, 'w:t', { attributes: { 'xml:space': 'preserve' } })
      textEl.textContent = currentDocxMeta.value

      runEl.appendChild(textEl)

      let newEl = runEl

      if (currentDocxMeta.link != null) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingRStyleEl = findChildNode('w:rStyle', rPrEl)

        if (existingRStyleEl != null) {
          rPrEl.removeChild(existingRStyleEl)
        }

        const hyperlinkStyleId = addOrGetHyperlinkStyle(stylesDoc, hyperlinkStyleIdCache)

        rPrEl.insertBefore(createNode(doc, 'w:rStyle', { attributes: { 'w:val': hyperlinkStyleId } }), rPrEl.firstChild)

        const hyperlinkRelId = addHyperlinkRel(relsDoc, currentDocxMeta.link)

        if (hyperlinkRelId) {
          newEl = createNode(doc, 'w:hyperlink', {
            attributes: { 'r:id': hyperlinkRelId },
            children: [runEl]
          })
        }
      }

      if (mode === 'block') {
        if (parent == null) {
          throw new Error(`docx meta text element can not exists without parent for "${mode}" mode`)
        }

        parent.appendChild(newEl)
      } else if (mode === 'inline') {
        result.push(newEl)
      }
    } else if (currentDocxMeta.type === 'break') {
      const attrs = {}

      if (currentDocxMeta.target === 'page') {
        attrs['w:type'] = 'page'
      }

      const runEl = createNode(doc, 'w:r', {
        children: [
          createNode(doc, 'w:br', { attributes: attrs })
        ]
      })

      if (mode === 'block') {
        if (parent == null) {
          throw new Error(`docx meta line break element can not exists without parent for "${mode}" mode`)
        }

        parent.appendChild(runEl)
      } else if (mode === 'inline') {
        result.push(runEl)
      }
    } else if (currentDocxMeta.type === 'image') {
      const runEl = htmlEmbedDef.tEl.parentNode.cloneNode(true)

      // inherit only the run properties of the html embed call
      clearEl(runEl, (c) => c.nodeName === 'w:rPr')

      const imageSize = currentDocxMeta.src.size
      const imageExtension = currentDocxMeta.src.extension
      const imageContent = currentDocxMeta.src.content

      if (imageContent.type === 'base64') {
        imageContent.type = 'buffer'
        imageContent.data = Buffer.from(imageContent.data, 'base64')
      }

      const newImageRelId = getNewRelId(relsDoc)

      const relEl = relsDoc.createElement('Relationship')

      relEl.setAttribute('Id', newImageRelId)

      relEl.setAttribute(
        'Type',
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'
      )

      relEl.setAttribute('Target', `media/imageDocx${newImageRelId}.${imageExtension}`)

      files.push({
        path: `word/media/imageDocx${newImageRelId}.${imageExtension}`,
        data: imageContent.type === 'path' ? fs.createReadStream(imageContent.data) : imageContent.data,
        // this will make it store the svg file to be stored correctly
        serializeFromDoc: false
      })

      const existsTypeForImageExtension = nodeListToArray(typesEl.getElementsByTagName('Default')).find(
        d => d.getAttribute('Extension') === imageExtension
      ) != null

      if (!existsTypeForImageExtension) {
        const newDefault = contentTypesFile.doc.createElement('Default')
        newDefault.setAttribute('Extension', imageExtension)
        newDefault.setAttribute('ContentType', `image/${imageExtension}`)
        typesEl.appendChild(newDefault)
      }

      relsEl.appendChild(relEl)

      const imageSizeEMU = getImageSizeInEMU(imageSize, {
        width: currentDocxMeta.width,
        height: currentDocxMeta.height
      })

      const imageWidthEMU = imageSizeEMU.width
      const imageHeightEMU = imageSizeEMU.height

      // we give as id the max id detected, we later modify this to the correct value
      // at the drawingObject post-processing
      const imageId = maxDocPrId != null ? maxDocPrId + 1 : 1
      const imageName = `Picture ${imageId}`

      maxDocPrId = imageId

      const imageMetaAttrs = {
        id: imageId,
        name: imageName
      }

      const docPrChildren = []
      const picCNvPrChildren = []

      if (currentDocxMeta.alt != null) {
        imageMetaAttrs.descr = currentDocxMeta.alt
      }

      if (currentDocxMeta.link != null) {
        const hyperlinkRelId = addHyperlinkRel(relsDoc, currentDocxMeta.link)

        if (hyperlinkRelId) {
          docPrChildren.push(
            createNode(doc, 'a:hlinkClick', {
              attributes: {
                'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
                'r:id': hyperlinkRelId
              }
            })
          )

          picCNvPrChildren.push(
            createNode(doc, 'a:hlinkClick', {
              attributes: {
                'r:id': hyperlinkRelId
              }
            })
          )
        }
      }

      const drawingEl = createNode(doc, 'w:drawing', {
        children: [
          createNode(doc, 'wp:inline', {
            attributes: {
              distT: '0',
              distB: '0',
              distL: '0',
              distR: '0'
            },
            children: [
              createNode(doc, 'wp:extent', { attributes: { cx: imageWidthEMU, cy: imageHeightEMU } }),
              createNode(doc, 'wp:effectExtent', { attributes: { l: '0', t: '0', r: '0', b: '0' } }),
              createNode(doc, 'wp:docPr', { attributes: { ...imageMetaAttrs }, children: docPrChildren }),
              createNode(doc, 'wp:cNvGraphicFramePr', {
                children: [
                  createNode(doc, 'a:graphicFrameLocks', { attributes: { 'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main', noChangeAspect: '1' } })
                ]
              }),
              createNode(doc, 'a:graphic', {
                attributes: { 'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main' },
                children: [
                  createNode(doc, 'a:graphicData', {
                    attributes: { uri: 'http://schemas.openxmlformats.org/drawingml/2006/picture' },
                    children: [
                      createNode(doc, 'pic:pic', {
                        attributes: { 'xmlns:pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture' },
                        children: [
                          createNode(doc, 'pic:nvPicPr', {
                            children: [
                              // we modify also the id of this node in the post image process based on the docPr id
                              createNode(doc, 'pic:cNvPr', { attributes: { ...imageMetaAttrs }, children: picCNvPrChildren }),
                              createNode(doc, 'pic:cNvPicPr')
                            ]
                          }),
                          createNode(doc, 'pic:blipFill', {
                            children: [
                              createNode(doc, 'a:blip', {
                                attributes: { 'r:embed': newImageRelId },
                                children: [
                                  createNode(doc, 'a:extLst', {
                                    children: [
                                      // this uri is an id for the useLocalDpi element used
                                      createNode(doc, 'a:ext', {
                                        attributes: { uri: '{28A0092B-C50C-407E-A947-70E740481C1C}' },
                                        children: [
                                          createNode(doc, 'a14:useLocalDpi', { attributes: { 'xmlns:a14': 'http://schemas.microsoft.com/office/drawing/2010/main', val: '0' } })
                                        ]
                                      })
                                    ]
                                  })
                                ]
                              }),
                              createNode(doc, 'a:stretch', {
                                children: [
                                  createNode(doc, 'a:fillRect')
                                ]
                              })
                            ]
                          }),
                          createNode(doc, 'pic:spPr', {
                            children: [
                              createNode(doc, 'a:xfrm', {
                                children: [
                                  createNode(doc, 'a:off', { attributes: { x: '0', y: '0' } }),
                                  createNode(doc, 'a:ext', { attributes: { cx: imageWidthEMU, cy: imageHeightEMU } })
                                ]
                              }),
                              createNode(doc, 'a:prstGeom', {
                                attributes: { prst: 'rect' },
                                children: [
                                  createNode(doc, 'a:avLst')
                                ]
                              })
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })

      runEl.appendChild(drawingEl)

      if (mode === 'block') {
        if (parent == null) {
          throw new Error(`docx meta image element can not exists without parent for "${mode}" mode`)
        }

        parent.appendChild(runEl)
      } else if (mode === 'inline') {
        result.push(runEl)
      }
    } else {
      throw new Error(`Unsupported docx node "${currentDocxMeta.type}"`)
    }
  }

  if (maxDocPrId != null) {
    contentTypesFile.doc.documentElement.setAttribute('drawingMaxDocPrId', maxDocPrId)
  }

  // comments are getting removed here as part of html content replacement,
  // we are going to reintroduce the block container if it needs it,
  // we need this otherwise the remove blocks logic will break and may produce
  // invalid parsing results (xml dom warnings)
  if (mode === 'block') {
    for (const el of result) {
      if (el.nodeName === 'w:p' && el.getAttribute('__block_helper_container__') === 'true') {
        const commentEl = nodeListToArray(el.childNodes).find((node) => (
          node.nodeName === '#comment' &&
          node.nodeValue === '__block_helper_container__'
        ))

        if (commentEl != null) {
          // if it has the comment, we are going to reintroduce it,
          // so it is ensured to be at the last child
          el.removeChild(commentEl)
        }

        const commentNode = doc.createComment('__block_helper_container__')
        el.appendChild(commentNode)
      }
    }
  }

  return result
}

function addOrGetTitleStyle (stylesDoc, titleLevel, cache) {
  if (cache.has(titleLevel)) {
    return cache.get(titleLevel)
  }

  const defaultNormalStyleId = findDefaultStyleIdForName(stylesDoc, 'Normal')

  if (defaultNormalStyleId == null || defaultNormalStyleId === '') {
    throw new Error('style for "Normal" not found')
  }

  const defaultParagraphFontStyleId = findDefaultStyleIdForName(stylesDoc, 'Default Paragraph Font', 'character')

  if (defaultParagraphFontStyleId == null || defaultParagraphFontStyleId === '') {
    throw new Error('style for "Default Paragraph Font" not found')
  }

  const stylesEl = stylesDoc.documentElement
  const existingStyleEls = findChildNode('w:style', stylesEl, true)
  const currentStyleEls = [...existingStyleEls]
  const randomSuffix = generateRandomSuffix()

  const createTitleStyleId = (tLvl) => {
    return `HdingTtle${randomSuffix}${tLvl}`
  }

  for (const currentTitleLevel of ['1', '2', '3', '4', '5', '6']) {
    const defaultHeadingTitleStyleId = findDefaultStyleIdForName(stylesDoc, `heading ${currentTitleLevel}`)

    if (defaultHeadingTitleStyleId == null || defaultHeadingTitleStyleId === '') {
      const titleStyleId = createTitleStyleId(currentTitleLevel)

      const [newTitleStyleEl, newTitleCharStyleEl] = createTitleStyle(
        stylesDoc,
        titleStyleId,
        currentTitleLevel,
        defaultNormalStyleId,
        defaultParagraphFontStyleId
      )

      stylesEl.insertBefore(newTitleStyleEl, currentStyleEls.at(-1).nextSibling)
      currentStyleEls.push(newTitleStyleEl)
      stylesEl.insertBefore(newTitleCharStyleEl, currentStyleEls.at(-1).nextSibling)
      currentStyleEls.push(newTitleCharStyleEl)
      cache.set(currentTitleLevel, titleStyleId)
    } else {
      cache.set(currentTitleLevel, defaultHeadingTitleStyleId)
    }
  }

  return cache.get(titleLevel)
}

function createTitleStyle (stylesDoc, titleStyleId, titleLevel, normalStyleId, paragraphFontStyleId) {
  const supportedTitleLevels = ['1', '2', '3', '4', '5', '6']

  if (!supportedTitleLevels.includes(titleLevel)) {
    throw new Error(`title level "${titleLevel}" not supported`)
  }

  const titleCharStyleId = `${titleStyleId}Char`
  const titleLevelInt = parseInt(titleLevel, 10)
  const outlineLevelInt = titleLevelInt - 1
  const uiPriority = getStyleUiPriority(stylesDoc, `heading ${titleLevel}`, '9')
  const beforeSpacing = titleLevelInt > 1 ? '40' : '240'
  let italic = false

  let size
  let color = '2F5496'
  const themeColor = 'accent1'
  let themeShade = 'BF'

  const result = []

  if (titleLevelInt === 1) {
    size = '32'
  } else if (titleLevelInt === 2) {
    size = '26'
  } else if (titleLevelInt === 3 || titleLevelInt === 6) {
    if (titleLevelInt === 3) {
      size = '24'
    }

    color = '1F3763'
    themeShade = '7F'
  } else if (titleLevelInt === 4) {
    italic = true
  }

  const newTitleStyle = createNode(stylesDoc, 'w:style', { attributes: { 'w:type': 'paragraph', 'w:styleId': titleStyleId } })
  newTitleStyle.appendChild(createNode(stylesDoc, 'w:name', { attributes: { 'w:val': `heading ${titleLevel}` } }))
  newTitleStyle.appendChild(createNode(stylesDoc, 'w:basedOn', { attributes: { 'w:val': normalStyleId } }))
  newTitleStyle.appendChild(createNode(stylesDoc, 'w:next', { attributes: { 'w:val': normalStyleId } }))
  newTitleStyle.appendChild(createNode(stylesDoc, 'w:link', { attributes: { 'w:val': titleCharStyleId } }))
  newTitleStyle.appendChild(createNode(stylesDoc, 'w:uiPriority', { attributes: { 'w:val': uiPriority } }))

  if (titleLevelInt > 1) {
    newTitleStyle.appendChild(createNode(stylesDoc, 'w:unhideWhenUsed'))
  }

  newTitleStyle.appendChild(createNode(stylesDoc, 'w:qFormat'))

  newTitleStyle.appendChild(createNode(stylesDoc, 'w:pPr', {
    children: [
      createNode(stylesDoc, 'w:keepNext'),
      createNode(stylesDoc, 'w:keepLines'),
      createNode(stylesDoc, 'w:spacing', { attributes: { 'w:before': beforeSpacing } }),
      createNode(stylesDoc, 'w:outlineLvl', { attributes: { 'w:val': outlineLevelInt } })
    ]
  }))

  const createTitleRunProperties = () => {
    const children = [
      createNode(stylesDoc, 'w:rFonts', {
        attributes: {
          'w:asciiTheme': 'majorHAnsi',
          'w:eastAsiaTheme': 'majorEastAsia',
          'w:hAnsiTheme': 'majorHAnsi',
          'w:cstheme': 'majorBidi'
        }
      })
    ]

    if (italic) {
      children.push(createNode(stylesDoc, 'w:i'))
      children.push(createNode(stylesDoc, 'w:iCs'))
    }

    children.push(createNode(stylesDoc, 'w:color', {
      attributes: {
        'w:val': color,
        'w:themeColor': themeColor,
        'w:themeShade': themeShade
      }
    }))

    if (size != null) {
      children.push(createNode(stylesDoc, 'w:sz', { attributes: { 'w:val': size } }))
      children.push(createNode(stylesDoc, 'w:szCs', { attributes: { 'w:val': size } }))
    }

    return createNode(stylesDoc, 'w:rPr', {
      children
    })
  }

  newTitleStyle.appendChild(createTitleRunProperties())
  result.push(newTitleStyle)

  const newTitleCharStyle = createNode(stylesDoc, 'w:style', { attributes: { 'w:type': 'character', 'w:customStyle': '1', 'w:styleId': titleCharStyleId } })
  newTitleCharStyle.appendChild(createNode(stylesDoc, 'w:name', { attributes: { 'w:val': `Heading Title ${titleLevel} Char` } }))
  newTitleCharStyle.appendChild(createNode(stylesDoc, 'w:basedOn', { attributes: { 'w:val': paragraphFontStyleId } }))
  newTitleCharStyle.appendChild(createNode(stylesDoc, 'w:link', { attributes: { 'w:val': titleStyleId } }))
  newTitleCharStyle.appendChild(createNode(stylesDoc, 'w:uiPriority', { attributes: { 'w:val': uiPriority } }))
  newTitleCharStyle.appendChild(createTitleRunProperties())

  result.push(newTitleCharStyle)

  return result
}

function addOrGetHyperlinkStyle (stylesDoc, cache) {
  if (cache.id != null) {
    return cache.id
  }

  const defaultParagraphFontStyleId = findDefaultStyleIdForName(stylesDoc, 'Default Paragraph Font', 'character')

  if (defaultParagraphFontStyleId == null || defaultParagraphFontStyleId === '') {
    throw new Error('style for "Default Paragraph Font" not found')
  }

  const stylesEl = stylesDoc.documentElement
  const existingStyleEls = findChildNode('w:style', stylesEl, true)
  const currentStyleEls = [...existingStyleEls]
  const randomSuffix = generateRandomSuffix()

  const defaultHyperlinkStyleId = findDefaultStyleIdForName(stylesDoc, 'Hyperlink', 'character')

  if (defaultHyperlinkStyleId == null || defaultHyperlinkStyleId === '') {
    const hyperlinkStyleId = `Hyprlnk${randomSuffix}`

    const newHyperlinkStyleEl = createHyperlinkStyle(
      stylesDoc,
      hyperlinkStyleId,
      defaultParagraphFontStyleId
    )

    stylesEl.insertBefore(newHyperlinkStyleEl, currentStyleEls.at(-1).nextSibling)
    currentStyleEls.push(newHyperlinkStyleEl)

    cache.id = hyperlinkStyleId
  } else {
    cache.id = defaultHyperlinkStyleId
  }

  return cache.id
}

function createHyperlinkStyle (stylesDoc, hyperlinkStyleId, paragraphFontStyleId) {
  const uiPriority = getStyleUiPriority(stylesDoc, 'Hyperlink', '99')

  return createNode(stylesDoc, 'w:style', {
    attributes: { 'w:type': 'character', 'w:styleId': hyperlinkStyleId },
    children: [
      createNode(stylesDoc, 'w:name', { attributes: { 'w:val': 'Hyperlink' } }),
      createNode(stylesDoc, 'w:basedOn', { attributes: { 'w:val': paragraphFontStyleId } }),
      createNode(stylesDoc, 'w:uiPriority', { attributes: { 'w:val': uiPriority } }),
      createNode(stylesDoc, 'w:unhideWhenUsed'),
      createNode(stylesDoc, 'w:rPr', {
        children: [
          createNode(stylesDoc, 'w:color', { attributes: { 'w:val': '0563C1', 'w:themeColor': 'hyperlink' } }),
          createNode(stylesDoc, 'w:u', { attributes: { 'w:val': 'single' } })
        ]
      })
    ]
  })
}

function addOrGetListParagraphStyle (stylesDoc, cache) {
  if (cache.id != null) {
    return cache.id
  }

  const defaultNormalStyleId = findDefaultStyleIdForName(stylesDoc, 'Normal')

  if (defaultNormalStyleId == null || defaultNormalStyleId === '') {
    throw new Error('style for "Normal" not found')
  }

  const stylesEl = stylesDoc.documentElement
  const existingStyleEls = findChildNode('w:style', stylesEl, true)
  const currentStyleEls = [...existingStyleEls]
  const randomSuffix = generateRandomSuffix()

  const defaultListParagraphStyleId = findDefaultStyleIdForName(stylesDoc, 'List Paragraph')

  if (defaultListParagraphStyleId == null || defaultListParagraphStyleId === '') {
    const listParagraphStyleId = `LstPrgph${randomSuffix}`

    const newListParagraphStyleEl = createListParagraphStyle(
      stylesDoc,
      listParagraphStyleId,
      defaultNormalStyleId
    )

    stylesEl.insertBefore(newListParagraphStyleEl, currentStyleEls.at(-1).nextSibling)
    currentStyleEls.push(newListParagraphStyleEl)

    cache.id = listParagraphStyleId
  } else {
    cache.id = defaultListParagraphStyleId
  }

  return cache.id
}

function createListParagraphStyle (stylesDoc, listParagraphStyleId, normalStyleId) {
  const uiPriority = getStyleUiPriority(stylesDoc, 'List Paragraph', '34')

  const newListParagraphStyleEl = createNode(stylesDoc, 'w:style', { attributes: { 'w:type': 'paragraph', 'w:styleId': listParagraphStyleId } })
  newListParagraphStyleEl.appendChild(createNode(stylesDoc, 'w:name', { attributes: { 'w:val': 'List Paragraph' } }))
  newListParagraphStyleEl.appendChild(createNode(stylesDoc, 'w:basedOn', { attributes: { 'w:val': normalStyleId } }))
  newListParagraphStyleEl.appendChild(createNode(stylesDoc, 'w:uiPriority', { attributes: { 'w:val': uiPriority } }))
  newListParagraphStyleEl.appendChild(createNode(stylesDoc, 'w:qFormat'))

  newListParagraphStyleEl.appendChild(createNode(stylesDoc, 'w:pPr', {
    children: [
      createNode(stylesDoc, 'w:ind', { attributes: { 'w:left': '720' } }),
      createNode(stylesDoc, 'w:contextualSpacing')
    ]
  }))

  return newListParagraphStyleEl
}

function addHyperlinkRel (relsDoc, linkInfo) {
  if (!relsDoc) {
    return
  }

  const newRelId = getNewRelId(relsDoc)

  relsDoc.documentElement.appendChild(
    createNode(relsDoc, 'Relationship', {
      attributes: {
        Id: newRelId,
        Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
        Target: linkInfo.target,
        TargetMode: 'External'
      }
    })
  )

  return newRelId
}

async function addOrGetNumbering (files, listInfo, cache, lock) {
  let numberingDoc
  let numId

  // NOTE: Word does not accept more than 9 levels, when this happens we skip the list style
  const MAX_LEVEL = 9
  const currentLvl = listInfo.level - 1

  if (currentLvl >= MAX_LEVEL) {
    return
  }

  // we need to lock this operation because the numbering is a shared document for main
  // document, header and footer, and we need to increase the id for each list sequentially
  await lock.acquire()

  try {
    const numberingFile = files.find(f => f.path === 'word/numbering.xml')

    if (cache.has(listInfo.id)) {
      numberingDoc = numberingFile.doc
      numId = cache.get(listInfo.id)
    } else {
      if (numberingFile == null) {
        const contentTypesDoc = files.find(f => f.path === '[Content_Types].xml').doc

        const numberingTypeRefEl = findChildNode((n) => (
          n.nodeName === 'Override' &&
          n.getAttribute('PartName') === '/word/numbering.xml'
        ), contentTypesDoc.documentElement)

        if (numberingTypeRefEl == null) {
          contentTypesDoc.documentElement.appendChild(
            createNode(contentTypesDoc, 'Override', {
              attributes: {
                PartName: '/word/numbering.xml',
                ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml'
              }
            })
          )
        }

        const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc

        const numberingRelEl = findChildNode((n) => (
          n.nodeName === 'Relationship' &&
          n.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering'
        ), documentRelsDoc.documentElement)

        if (numberingRelEl == null) {
          const newNumberingRelId = getNewRelId(documentRelsDoc)

          documentRelsDoc.documentElement.appendChild(
            createNode(documentRelsDoc, 'Relationship', {
              attributes: {
                Id: newNumberingRelId,
                Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering',
                Target: 'numbering.xml'
              }
            })
          )
        }

        const numberingTemplate = await loadTemplate('numbering.template.xml')
        numberingDoc = new DOMParser().parseFromString(numberingTemplate)

        files.push({
          path: 'word/numbering.xml',
          data: numberingDoc.toString(),
          // creates new doc
          doc: numberingDoc
        })
      } else {
        numberingDoc = numberingFile.doc
      }

      if (listInfo.type === 'ul') {
        const fontTableDoc = files.find(f => f.path === 'word/fontTable.xml').doc
        ensureFontDefinition(fontTableDoc, 'Symbol')
        ensureFontDefinition(fontTableDoc, 'Courier New')
        ensureFontDefinition(fontTableDoc, 'Wingdings')
      }

      const numberingEl = numberingDoc.documentElement

      const existingNumEls = findChildNode('w:num', numberingEl, true)
      const existingAbstractNumEls = findChildNode('w:abstractNum', numberingEl, true)

      const getMaxId = (els, idAttr, defaultId) => {
        return els.reduce((lastId, node) => {
          const nodeId = node.getAttribute(idAttr)
          const num = parseInt(nodeId, 10)

          if (num == null || isNaN(num)) {
            return lastId
          }

          if (num > lastId) {
            return num
          }

          return lastId
        }, defaultId)
      }

      numId = (getMaxId(existingNumEls, 'w:numId', 0) + 1).toString()
      const abstractNumId = getMaxId(existingAbstractNumEls, 'w:abstractNumId', -1) + 1

      const numEl = createNode(numberingDoc, 'w:num', {
        attributes: { 'w:numId': numId },
        children: [
          createNode(numberingDoc, 'w:abstractNumId', { attributes: { 'w:val': abstractNumId } })
        ]
      })

      const abstractNumAttributes = { 'w:abstractNumId': abstractNumId }

      if (listInfo.type === 'ol') {
        abstractNumAttributes['w15:restartNumberingAfterBreak'] = '0'
      }

      const abstractNumEl = createNode(numberingDoc, 'w:abstractNum', {
        attributes: abstractNumAttributes,
        children: [
          createNode(numberingDoc, 'w:multiLevelType', { attributes: { 'w:val': 'hybridMultilevel' } }),
          ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cLvl) => {
            const fontsPool = ['Symbol', 'Courier New', 'Wingdings']
            const poolIdx = cLvl % 3
            const currentFont = fontsPool[poolIdx]

            let numFmt = 'bullet'
            let text = ''

            if (listInfo.type === 'ol') {
              numFmt = 'decimal'
            }

            if (listInfo.type === 'ul') {
              if ([1, 4, 7].includes(cLvl)) {
                text = 'o'
              } else if ([2, 5, 8].includes(cLvl)) {
                // NOTE: be aware that this is a different symbol than the default
                // they may look the same rendered in the editor but they are different
                text = ''
              }
            } else if (listInfo.type === 'ol') {
              text = `%${cLvl + 1}.`
            }

            const opts = {
              start: listInfo.start ?? 1,
              numFmt,
              text,
              jc: 'left',
              indLeft: 720 * (cLvl + 1),
              indHanging: 360
            }

            if (listInfo.type === 'ul') {
              opts.fontAscii = currentFont
              opts.fontHansi = currentFont

              if (poolIdx === 1) {
                opts.fontCs = currentFont
              }

              opts.fontHint = 'default'
            }

            return createLvl(numberingDoc, cLvl, opts)
          })
        ]
      })

      const lastAbstractNumEl = existingAbstractNumEls.at(-1)

      if (lastAbstractNumEl == null) {
        numberingEl.appendChild(abstractNumEl)
      } else {
        numberingEl.insertBefore(abstractNumEl, lastAbstractNumEl.nextSibling)
      }

      const lastNumEl = existingNumEls.at(-1)

      if (lastNumEl == null) {
        numberingEl.appendChild(numEl)
      } else {
        numberingEl.insertBefore(numEl, lastNumEl.nextSibling)
      }

      cache.set(listInfo.id, numId)
    }

    // we have created all levels with tentative, now remove such attribute
    // for the current level so we indicate the docx that the level is being used
    const currentNumEl = findChildNode((n) => (
      n.nodeName === 'w:num' &&
      n.getAttribute('w:numId') === numId
    ), numberingDoc.documentElement)

    const currentAbstractNumIdEl = findChildNode('w:abstractNumId', currentNumEl)

    const currentAbstractNumEl = findChildNode((n) => (
      n.nodeName === 'w:abstractNum' &&
      n.getAttribute('w:abstractNumId') === currentAbstractNumIdEl.getAttribute('w:val')
    ), numberingDoc.documentElement)

    const targetLvl = currentLvl.toString()

    const currentLvlEl = findChildNode((n) => (
      n.nodeName === 'w:lvl' &&
      n.getAttribute('w:ilvl') === targetLvl
    ), currentAbstractNumEl)

    if (currentLvlEl.hasAttribute('w:tentative')) {
      currentLvlEl.removeAttribute('w:tentative')
    }
  } finally {
    lock.release()
  }

  return numId
}

function createLvl (numberingDoc, listLevel, opts) {
  const tentative = opts.tentative || true
  const start = opts.start || 1
  const numFmt = opts.numFmt || 'bullet'
  const text = opts.text || ''
  const jc = opts.js || 'left'
  const indLeft = opts.indLeft || 720
  const indHanging = opts.indHanging || 360

  const lvlEl = createNode(numberingDoc, 'w:lvl', { attributes: { 'w:ilvl': listLevel } })

  if (tentative) {
    lvlEl.setAttribute('w:tentative', '1')
  }

  lvlEl.appendChild(createNode(numberingDoc, 'w:start', { attributes: { 'w:val': start } }))
  lvlEl.appendChild(createNode(numberingDoc, 'w:numFmt', { attributes: { 'w:val': numFmt } }))
  lvlEl.appendChild(createNode(numberingDoc, 'w:lvlText', { attributes: { 'w:val': text } }))
  lvlEl.appendChild(createNode(numberingDoc, 'w:lvlJc', { attributes: { 'w:val': jc } }))

  lvlEl.appendChild(createNode(numberingDoc, 'w:pPr', {
    children: [
      createNode(numberingDoc, 'w:ind', { attributes: { 'w:left': indLeft, 'w:hanging': indHanging } })
    ]
  }))

  const fontAttrs = {}

  if (opts.fontAscii != null) {
    fontAttrs['w:ascii'] = opts.fontAscii
  }

  if (opts.fontHansi != null) {
    fontAttrs['w:hAnsi'] = opts.fontHansi
  }

  if (opts.fontCs != null) {
    fontAttrs['w:cs'] = opts.fontCs
  }

  if (opts.fontHint != null) {
    fontAttrs['w:hint'] = opts.fontHint
  }

  if (Object.keys(fontAttrs).length > 0) {
    lvlEl.appendChild(createNode(numberingDoc, 'w:rPr', {
      children: [
        createNode(numberingDoc, 'w:rFonts', { attributes: fontAttrs })
      ]
    }))
  }

  return lvlEl
}

function getStyleUiPriority (stylesDoc, name, defaultValue) {
  const stylesEl = stylesDoc.documentElement
  const latentStylesEl = findChildNode('w:latentStyles', stylesEl)

  if (latentStylesEl == null) {
    return defaultValue
  }

  const latentStyleEl = findChildNode((n) => (
    n.nodeName === 'w:lsdException' && n.getAttribute('w:name') === name
  ), latentStylesEl)

  if (latentStyleEl == null) {
    return defaultValue
  }

  const uiPriority = latentStyleEl.getAttribute('w:uiPriority')

  if (uiPriority == null || uiPriority === '') {
    return defaultValue
  }

  return uiPriority
}

function getBorderWidth (value) {
  return value != null ? ptToEOAP(value) : 4
}

function getBorderStyle (value, borderWidth) {
  if (borderWidth === 0) {
    return 'none'
  }

  return value != null && borderStyles.has(value) ? borderStyles.get(value) : 'single'
}

function getBorderColor (value) {
  return value != null ? value : 'auto'
}

function ensureFontDefinition (fontTableDoc, fontName) {
  const supportedFonts = ['Symbol', 'Courier', 'Courier New', 'Wingdings']

  if (!supportedFonts.includes(fontName)) {
    throw new Error(`font "${fontName}" not supported`)
  }

  const existingFontEl = findChildNode((n) => (
    n.nodeName === 'w:font' && n.getAttribute('w:name') === fontName
  ), fontTableDoc.documentElement)

  if (existingFontEl != null) {
    return
  }

  const fontsMap = {
    Symbol: {
      panose1: '05050102010706020507',
      charset: '02',
      family: 'decorative',
      pitch: 'variable',
      sig: ['00000000', '10000000', '00000000', '00000000', '80000000', '00000000']
    },
    Courier: {
      panose1: '00000000000000000000',
      charset: '00',
      family: 'auto',
      pitch: 'variable',
      sig: ['00000003', '00000000', '00000000', '00000000', '00000003', '00000000']
    },
    'Courier New': {
      panose1: '02070309020205020404',
      charset: '00',
      family: 'modern',
      pitch: 'fixed',
      sig: ['E0002AFF', '80000000', '00000008', '00000000', '000001FF', '00000000']
    },
    Wingdings: {
      panose1: '05000000000000000000',
      charset: '4D',
      family: 'decorative',
      pitch: 'variable',
      sig: ['00000003', '00000000', '00000000', '00000000', '80000001', '00000000']
    }
  }

  const info = fontsMap[fontName]

  fontTableDoc.documentElement.appendChild(
    createNode(fontTableDoc, 'w:font', {
      attributes: {
        'w:name': fontName
      },
      children: [
        createNode(fontTableDoc, 'w:panose1', { attributes: { 'w:val': info.panose1 } }),
        createNode(fontTableDoc, 'w:charset', { attributes: { 'w:val': info.charset } }),
        createNode(fontTableDoc, 'w:family', { attributes: { 'w:val': info.family } }),
        createNode(fontTableDoc, 'w:pitch', { attributes: { 'w:val': info.pitch } }),
        createNode(fontTableDoc, 'w:sig', {
          attributes: {
            'w:usb0': info.sig[0],
            'w:usb1': info.sig[1],
            'w:usb2': info.sig[2],
            'w:usb3': info.sig[3],
            'w:csb0': info.sig[4],
            'w:csb1': info.sig[5]
          }
        })
      ]
    })
  )
}

async function loadTemplate (templateName) {
  if (xmlTemplatesCache.has(templateName) && xmlTemplatesCache.get(templateName).content != null) {
    return xmlTemplatesCache.get(templateName).content
  }

  const item = xmlTemplatesCache.get(templateName) || {}

  xmlTemplatesCache.set(templateName, item)

  if (item.promise == null) {
    item.promise = fsAsync.readFile(path.join(__dirname, templateName))
  }

  item.content = (await item.promise).toString()

  return xmlTemplatesCache.get(templateName).content
}
