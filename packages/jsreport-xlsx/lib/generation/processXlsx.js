const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const { customAlphabet } = require('nanoid')
const { decompress, saveXmlsToOfficeFile } = require('@jsreport/office')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)
const preprocess = require('./preprocess/preprocess')
const postprocess = require('./postprocess/postprocess')
const { contentIsXML, isWorksheetFile, getStyleFile } = require('../utils')
const { decodeXML } = require('../cellUtils')

module.exports = (reporter) => async (inputs, req) => {
  const { xlsxTemplateContent, options, outputPath } = inputs

  try {
    let files
    try {
      files = await decompress()(xlsxTemplateContent)
    } catch (parseTemplateError) {
      throw reporter.createError('Failed to parse xlsx template input', {
        original: parseTemplateError
      })
    }

    for (const f of files) {
      if (contentIsXML(f.data)) {
        f.doc = new DOMParser().parseFromString(f.data.toString())
        f.data = f.data.toString()
      }
    }

    const ctx = { options }

    await preprocess(files, ctx)

    const [filesToRender, styleFile] = ensureOrderOfFiles(files.filter(f => contentIsXML(f.data)))

    const normalizeAttributeAndTextNode = (node) => {
      if (node.nodeType === 2 && node.nodeValue && node.nodeValue.includes('{{')) {
        // we need to decode the xml entities for the attributes for handlebars to work ok
        const str = new XMLSerializer().serializeToString(node)
        return decodeXML(str)
      } else if (
        // we need to decode the xml entities in text nodes for handlebars to work ok with partials
        node.nodeType === 3 && node.nodeValue &&
        (node.nodeValue.includes('{{>') || node.nodeValue.includes('{{#>'))
      ) {
        const str = new XMLSerializer().serializeToString(node)

        return str.replace(/{{#?&gt;/g, (m) => {
          return decodeXML(m)
        })
      }

      return node
    }

    let contentToRender = filesToRender.map(f => {
      let xmlStr = new XMLSerializer().serializeToString(f.doc, undefined, (node) => {
        if (node.nodeType === 1 && node.localName === 'c' && node.hasAttribute('__CT_t__')) {
          let callType = node.getAttribute('__CT_t__')
          const hasMultipleExpressionCall = node.getAttribute('__CT_m__') === '1'
          const calcChainUpdate = node.getAttribute('__CT_cCU__') === '1'
          const expressionValue = node.getAttribute('__CT_v__')
          const escapeValue = node.getAttribute('__CT_ve__') === '1'

          if (calcChainUpdate) {
            callType = callType.toLowerCase()
          }

          node.removeAttribute('__CT_t__')
          node.removeAttribute('__CT_m__')
          node.removeAttribute('__CT_cCU__')
          node.removeAttribute('__CT_v__')
          node.removeAttribute('__CT_ve__')

          // this will take care of removing xmlns, xmlns:prefix attributes that we don't want here
          const str = new XMLSerializer().serializeToString(
            node,
            undefined,
            normalizeAttributeAndTextNode
          ).replace(/ xmlns(:[a-z0-9]+)?="[^"]*"/g, '')

          const isSelfClosing = node.childNodes.length === 0
          let attrs
          let content

          if (isSelfClosing) {
            const closeTagStartIdx = str.lastIndexOf('/>')

            attrs = str.slice(2, closeTagStartIdx)
            content = ''
          } else {
            const openTagEndIdx = str.indexOf('>')
            const closeTagStartIdx = str.lastIndexOf('</')

            attrs = str.slice(2, openTagEndIdx)
            content = str.slice(openTagEndIdx + 1, closeTagStartIdx)
          }

          if (hasMultipleExpressionCall) {
            return `{{#${callType}${attrs}}}${content}{{/${callType}}}`
          }

          // for the handlebars call we want to avoid the extra character for escape param,
          // (size optimization) since the common case is that the handlebars call is
          // escaped {{}} expression, so instead we expect in the helper receive if the
          // value should be raw or not (the inverse of escape)
          const nValue = expressionValue.startsWith('(') ? expressionValue : `"${expressionValue}"`

          return `{{${callType} ${expressionValue}${escapeValue ? '' : ' 1'}${attrs} _n=${nValue}}}`
        }

        return normalizeAttributeAndTextNode(node)
      })

      xmlStr = xmlStr.replace(/<xlsxRemove>/g, '').replace(/<\/xlsxRemove>/g, '')

      if (ctx.autofitConfigured && styleFile?.path === f.path) {
        xmlStr = `{{#_D t='style'}}${xmlStr}{{/_D}}`
      }

      return xmlStr
    }).join('$$$xlsxFile$$$')

    contentToRender = `{{#xlsxContext type="global" evalId="${generateRandomId()}"}}${contentToRender}{{/xlsxContext}}`

    reporter.logger.debug('Starting child request to render xlsx dynamic parts for generation step', req)

    const newContent = await reporter.templatingEngines.evaluate({
      engine: req.template.engine,
      content: contentToRender,
      helpers: req.template.helpers,
      data: req.data
    }, {
      entity: req.template,
      entitySet: 'templates'
    }, req)

    // we remove NUL, VERTICAL TAB unicode characters, which are characters that are illegal in XML.
    // NOTE: we should likely find a way to remove illegal characters more generally, using some kind of unicode ranges
    // eslint-disable-next-line no-control-regex
    const contents = newContent.toString().replace(/\u0000|\u000b/g, '').split('$$$xlsxFile$$$')

    for (let i = 0; i < filesToRender.length; i++) {
      filesToRender[i].data = contents[i]
      // don't parse the sheets file, because after the templating engine execution
      // those documents can be a lot more bigger and parsing such big document is a performance
      // kill for the process
      if (!isWorksheetFile(filesToRender[i].path)) {
        filesToRender[i].doc = new DOMParser().parseFromString(contents[i])
      } else {
        // we remove the .doc for the xl/worksheets/*.xml files to be clear that it should not be used
        // for any of postprocess steps, instead when dealing with that document we should execute search/replace
        // based on string and regexp.
        delete filesToRender[i].doc
      }
    }

    await postprocess(files, ctx)

    for (const f of files) {
      let shouldSerializeFromDoc = contentIsXML(f.data) && !isWorksheetFile(f.path)

      if (f.serializeFromDoc != null) {
        shouldSerializeFromDoc = f.serializeFromDoc === true
      }

      if (shouldSerializeFromDoc) {
        f.data = Buffer.from(new XMLSerializer().serializeToString(f.doc))
      }
    }

    await saveXmlsToOfficeFile({
      outputPath,
      files
    })

    reporter.logger.debug('xlsx successfully zipped', req)

    return {
      xlsxFilePath: outputPath
    }
  } catch (e) {
    throw reporter.createError('Error while executing xlsx recipe', {
      original: e,
      weak: true
    })
  }
}

function ensureOrderOfFiles (files) {
  // we want to ensure a specific order of files for the render processing,
  // 1. ensure style file comes as the first
  // 2. ensure calcChain.xml comes after sheet files (we just put it at the end of everything)
  // this is required in child render for our handlebars logic to
  // correctly handle processing of our helpers
  const calcChainIdx = files.findIndex((file) => file.path === 'xl/calcChain.xml')
  const filesSorted = []

  const skipIndexesSet = new Set()

  const styleFile = getStyleFile(files)
  let styleIdx = -1

  if (styleFile != null) {
    styleIdx = files.findIndex((file) => file.path === styleFile.path)
  }

  for (const idx of [styleIdx, calcChainIdx]) {
    if (idx === -1) {
      continue
    }

    skipIndexesSet.add(idx)
  }

  if (styleIdx !== -1) {
    filesSorted.push(files[styleIdx])
  }

  for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
    if (skipIndexesSet.has(fileIdx)) {
      continue
    }

    filesSorted.push(files[fileIdx])
  }

  if (calcChainIdx !== -1) {
    filesSorted.push(files[calcChainIdx])
  }

  return [filesSorted, styleFile]
}
