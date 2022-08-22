
const path = require('path')
const { DOMParser } = require('@xmldom/xmldom')
const styleAttr = require('style-attr')
const recursiveStringReplaceAsync = require('../recursiveStringReplaceAsync')
const { nodeListToArray, findOrCreateChildNode } = require('../utils')

module.exports = async (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentFilePath = documentFile.path
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc
  const relationshipEls = nodeListToArray(documentRelsDoc.getElementsByTagName('Relationship'))

  let watermarkHeaderReferences = []

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<docxWatermarkHeaderRefs>',
    '</docxWatermarkHeaderRefs>',
    'g',
    async (val, content, hasNestedMatch) => {
      if (hasNestedMatch) {
        return val
      }

      const doc = new DOMParser().parseFromString(val)
      watermarkHeaderReferences = doc.documentElement.textContent.split(',')

      return ''
    }
  )

  for (const watermarkHeaderReference of watermarkHeaderReferences) {
    const relationshipEl = relationshipEls.find(r => (
      r.getAttribute('Id') === watermarkHeaderReference &&
      r.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header'
    ))

    if (relationshipEl == null) {
      continue
    }

    const headerPath = path.posix.join(path.posix.dirname(documentFilePath), relationshipEl.getAttribute('Target'))
    const headerDoc = files.find((file) => file.path === headerPath)?.doc

    if (headerDoc == null) {
      continue
    }

    const pictELS = nodeListToArray(headerDoc.getElementsByTagName('w:pict'))

    for (const pictEl of pictELS) {
      const watermarkShapeEl = nodeListToArray(pictEl.childNodes).find((el) => (
        el.nodeName === 'v:shape' &&
        el.getAttribute('id') != null &&
        el.getAttribute('id').startsWith('PowerPlusWaterMarkObject')
      ))

      if (watermarkShapeEl == null) {
        continue
      }

      const textPathEl = nodeListToArray(watermarkShapeEl.childNodes).find((el) => el.nodeName === 'v:textpath')

      if (textPathEl == null) {
        continue
      }

      const stringAttr = textPathEl.getAttribute('string')
      const match = stringAttr.match(/\$docxWatermark([^$]*)\$/)
      const watermarkConfig = JSON.parse(Buffer.from(match[1], 'base64').toString())

      if (watermarkConfig.enabled === false) {
        const parentEl = pictEl.parentNode

        parentEl.removeChild(pictEl)

        if (
          parentEl.nodeName === 'w:r' &&
          (
            parentEl.childNodes.length === 0 ||
            (
              parentEl.childNodes.length === 1 &&
              parentEl.childNodes[0].nodeName === 'w:rPr'
            )
          )
        ) {
          parentEl.parentNode.removeChild(parentEl)
        }

        continue
      }

      // remove watermark helper text
      textPathEl.setAttribute('string', stringAttr.replace(match[0], watermarkConfig.text))

      const existingShapeStyle = watermarkShapeEl.getAttribute('style')
      const existingTextStyle = textPathEl.getAttribute('style')

      if (existingTextStyle != null && watermarkConfig.style != null) {
        const shapeParsedStyle = styleAttr.parse(existingShapeStyle)
        const textParsedStyle = styleAttr.parse(existingTextStyle)

        if (watermarkConfig.style.fontFamily != null) {
          textParsedStyle['font-family'] = watermarkConfig.style.fontFamily
        }

        if (watermarkConfig.style.fontSize != null) {
          textParsedStyle['font-size'] = `${watermarkConfig.style.fontSize}pt`
        }

        if (watermarkConfig.style.fontBold === true) {
          textParsedStyle['font-weight'] = 'bold'
        } else if (watermarkConfig.style.fontBold === false) {
          delete textParsedStyle['font-weight']
        }

        if (watermarkConfig.style.fontItalic === true) {
          textParsedStyle['font-style'] = 'italic'
        } else if (watermarkConfig.style.fontItalic === false) {
          delete textParsedStyle['font-style']
        }

        if (watermarkConfig.style.fontColor != null) {
          watermarkShapeEl.setAttribute('fillcolor', watermarkConfig.style.fontColor)
        }

        if (watermarkConfig.style.transparency != null) {
          let valid = false
          const percentageRegExp = /^([0-9]{1,3})%$/

          const result = percentageRegExp.exec(watermarkConfig.style.transparency)
          let parsedPercentage

          if (result != null && result[1] != null) {
            parsedPercentage = parseInt(result[1], 10)

            if (parsedPercentage >= 0 && parsedPercentage <= 100) {
              valid = true
            }
          }

          if (!valid) {
            throw new Error(`watermark style transparency expected to be a value between 0% - 100%, current: ${watermarkConfig.style.transparency}`)
          }

          const fillEl = findOrCreateChildNode(headerDoc, 'v:fill', watermarkShapeEl)
          fillEl.setAttribute('opacity', `${100 - parsedPercentage}%`)
        }

        if (watermarkConfig.style.orientation === 'horizontal') {
          delete shapeParsedStyle.rotation
        } else if (watermarkConfig.style.orientation === 'diagonal') {
          shapeParsedStyle.rotation = 315
        }

        watermarkShapeEl.setAttribute('style', styleAttr.stringify(shapeParsedStyle))
        textPathEl.setAttribute('style', styleAttr.stringify(textParsedStyle))
      }
    }
  }
}
