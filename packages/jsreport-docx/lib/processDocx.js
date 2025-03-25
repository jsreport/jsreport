const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const { customAlphabet } = require('nanoid')
const { decompress, saveXmlsToOfficeFile } = require('@jsreport/office')
const preprocess = require('./preprocess/preprocess.js')
const postprocess = require('./postprocess/postprocess.js')
const { contentIsXML, nodeListToArray } = require('./utils')
const decodeXML = require('./decodeXML')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)
const createContext = require('./ctx')

module.exports = async (reporter, inputs, req) => {
  const { docxTemplateContent, options, outputPath } = inputs

  try {
    let files

    try {
      files = await decompress()(docxTemplateContent)
    } catch (parseTemplateError) {
      throw reporter.createError('Failed to parse docx template input', {
        original: parseTemplateError
      })
    }

    for (const f of files) {
      if (contentIsXML(f.data)) {
        f.doc = new DOMParser().parseFromString(f.data.toString())
        f.data = f.data.toString()
      }
    }

    const ctx = createContext('document', { options })

    const headerFooterRefs = await preprocess(files, ctx)

    const filesToRender = ensureOrderOfFiles(files.filter(f => contentIsXML(f.data)))
    const filesSeparator = '$$$docxFile$$$\n'

    // it is 2 because before render we prepend the global context call in new line
    const firstLine = 2
    let previousEndLine
    const lineToXmlFileMap = new Map([[1, '<docxContext global start>']])
    const lineToParagraphMap = new Map()

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

    const validPathsForParagraphs = ['word/document.xml', ...headerFooterRefs.map((r) => r.path)]
    const paragraphSeparator = '$$$p$$$\n'

    let contentToRender = filesToRender.map((f) => {
      const startLine = previousEndLine != null ? previousEndLine + 1 : firstLine
      let paragraphsCount = 0
      const paragraphsText = []

      const xmlStr = new XMLSerializer().serializeToString(f.doc, undefined, (node) => {
        if (validPathsForParagraphs.includes(f.path) && node.nodeType === 1 && node.tagName === 'w:p') {
          paragraphsCount++
          // this will take care of removing xmlns, xmlns:prefix attributes that we don't want here
          const str = new XMLSerializer().serializeToString(
            node,
            undefined,
            normalizeAttributeAndTextNode
          ).replace(/ xmlns(:[a-z0-9]+)?="[^"]*"/g, '')

          paragraphsText.push(str)

          // we include new lines for each paragraph in these documents to help
          // identify the problematic line for handlebars compile errors. we need to do
          // this because handlebars error does not expose the columnNumber for all its
          // compile errors, so we need to rely on the line number to identify the error,
          // with that in mind we include each paragraph in new lines
          return `${paragraphSeparator}${str}`
        }

        return normalizeAttributeAndTextNode(node)
      })

      if (paragraphsCount > 0) {
        // we add 2 because the first line is xml declaration and the second line is the
        // content before paragraph
        const paragraphStartLine = startLine + 2
        for (let paragraphLine = paragraphStartLine; paragraphLine < paragraphStartLine + paragraphsCount; paragraphLine++) {
          const paragraphIdx = paragraphLine - paragraphStartLine
          lineToParagraphMap.set(paragraphLine, paragraphsText[paragraphIdx])
        }
      }

      // we add 1 because that is the number of extra lines xml serialization produces for
      // each xml file (a normal document serialized produces one line of xml declaration,
      // and one line of the xml content)
      const endLine = startLine + (paragraphsCount > 0 ? paragraphsCount : 0) + 1

      for (let currentLine = startLine; currentLine <= endLine; currentLine++) {
        lineToXmlFileMap.set(currentLine, f.path)
      }

      previousEndLine = endLine

      return xmlStr.replace(/<\/?docxRemove>/g, '')
    }).join(filesSeparator) // the extra lines is to help to map the files to content

    // get the last ids to share it with templating
    for (const [key, idManager] of ctx.idManagers.all()) {
      ctx.templating.setGlobalValue(`${key}MaxNumId`, idManager.last.numId)
    }

    const extraGlobalAttrs = ctx.templating.serializeToHandlebarsAttrs(ctx.templating.allGlobalValues())
    const extraGlobalAttrsStr = extraGlobalAttrs.length > 0 ? ' ' + extraGlobalAttrs.join(' ') : ''

    // add the global context in new lines to prevent any error in there modifying the
    // lines mapping of files
    lineToXmlFileMap.set(previousEndLine + 1, '<docxContext global end>')
    contentToRender = `{{#docxContext type='global' evalId='${generateRandomId()}'${extraGlobalAttrsStr}}}\n${contentToRender}\n{{docxSData type='newFiles'}}{{/docxContext}}`

    reporter.logger.debug('Starting child request to render docx dynamic parts', req)

    let newContent

    try {
      newContent = await reporter.templatingEngines.evaluate({
        engine: req.template.engine,
        content: contentToRender,
        helpers: req.template.helpers,
        data: req.data
      }, {
        entity: req.template,
        entitySet: 'templates'
      }, req)
    } catch (renderErr) {
      // decorate the error with the xml file path in which it happened,
      // .property will be "content" when the error happens at handlebars compile time (syntax errors).
      // it is important to be aware that we can only trust lineNumber to be present, because
      // handlebars compile error may contain detailed properties or just the line number.
      if (renderErr.property === 'content' && renderErr.lineNumber != null) {
        const xmlFilePath = lineToXmlFileMap.get(renderErr.lineNumber)

        if (xmlFilePath != null) {
          // TODO: in the future we should set same property .docFilePath at runtime
          // to provide more context to the error message. basically we need to wrap
          // execution in try/catch and set .docFilePath in there to the file which
          // has the problem
          renderErr.docFilePath = xmlFilePath
        }

        const paragraphStr = lineToParagraphMap.get(renderErr.lineNumber)

        if (paragraphStr != null) {
          renderErr.docxSurroundingText = extractTextFromParagraphStr(paragraphStr)
        }
      }

      throw renderErr
    }

    // we remove NUL, VERTICAL TAB unicode characters, which are characters that are illegal in XML
    // NOTE: we should likely find a way to remove illegal characters more generally, using some kind of unicode ranges
    // eslint-disable-next-line no-control-regex
    const contents = newContent.toString().replace(/\u0000|\u000b|/g, '').replaceAll(paragraphSeparator, '').split(filesSeparator)

    for (let i = 0; i < filesToRender.length; i++) {
      filesToRender[i].data = contents[i]
      // don't parse the word/document.xml file, because after the templating engine execution
      // that documents can be a lot more bigger and parsing such big document is a performance
      // kill for the process
      if (filesToRender[i].path !== 'word/document.xml') {
        filesToRender[i].doc = new DOMParser().parseFromString(contents[i])
      } else {
        // we remove the .doc for the word/document.xml file to be clear that it should not be used
        // for any of postprocess steps, instead when dealing with that document we should execute search/replace
        // based on string and regexp.
        delete filesToRender[i].doc
      }
    }

    // if these are any new files generated during the render
    for (let i = filesToRender.length; i < contents.length; i++) {
      const info = contents[i]
      const separator = info.indexOf('\n')
      const filePath = info.slice(0, separator)
      const content = Buffer.from(info.slice(separator + 1), 'base64')

      files.push({
        path: filePath,
        data: content
      })
    }

    await postprocess(reporter, files, ctx)

    for (const f of files) {
      let shouldSerializeFromDoc = contentIsXML(f.data) && f.path !== 'word/document.xml'

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

    reporter.logger.debug('docx successfully zipped', req)

    return {
      docxFilePath: outputPath
    }
  } catch (e) {
    let errMsg = 'Error while executing docx recipe'

    if (e.docFilePath != null) {
      const docFilePath = e.docFilePath
      delete e.docFilePath
      errMsg += ` (xml file: ${docFilePath})`
    }

    if (e.docxSurroundingText != null) {
      const docxSurroundingText = e.docxSurroundingText
      delete e.docxSurroundingText
      errMsg += `\nThe docx template contains an invalid handlebars syntax. Locate the text "${
        docxSurroundingText
      }". There might be a syntax error, missing character or a missing closing call for a block helper causing the template to be malformed`
    }

    throw reporter.createError(errMsg, {
      original: e,
      weak: true
    })
  }
}

function extractTextFromParagraphStr (paragraphStr) {
  let result

  const doc = new DOMParser().parseFromString(paragraphStr)
  const textEls = nodeListToArray(doc.getElementsByTagName('w:t'))

  for (const textEl of textEls) {
    let currentText

    if (textEl.getAttribute('xml:space') === 'preserve') {
      currentText = textEl.textContent
    } else {
      currentText = textEl.textContent.trim()
    }

    result = result == null ? currentText : result + currentText
  }

  return result
}

function ensureOrderOfFiles (files) {
  // we want to ensure a specific order of files for the render processing,
  // 1. ensure [Content_Types].xml], word/_rels/document.xml.rels are the latest files
  // this is required in child render for our handlebars logic to
  // correctly handle processing of our helpers
  const contentTypesIdx = files.findIndex(f => f.path === '[Content_Types].xml')
  const documentRelsIdx = files.findIndex(f => f.path === 'word/_rels/document.xml.rels')
  const filesSorted = []

  const skipIndexesSet = new Set()

  for (const idx of [contentTypesIdx, documentRelsIdx]) {
    if (idx === -1) {
      continue
    }

    skipIndexesSet.add(idx)
  }

  for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
    if (skipIndexesSet.has(fileIdx)) {
      continue
    }

    filesSorted.push(files[fileIdx])
  }

  if (contentTypesIdx !== -1) {
    filesSorted.push(files[contentTypesIdx])
  }

  if (documentRelsIdx !== -1) {
    filesSorted.push(files[documentRelsIdx])
  }

  return filesSorted
}
