const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const { customAlphabet } = require('nanoid')
const { decompress, saveXmlsToOfficeFile } = require('@jsreport/office')
const preprocess = require('./preprocess/preprocess.js')
const postprocess = require('./postprocess/postprocess.js')
const { contentIsXML } = require('./utils')
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

    await preprocess(files, ctx)

    const filesToRender = ensureOrderOfFiles(files.filter(f => contentIsXML(f.data)))

    let contentToRender = filesToRender.map(f => {
      const xmlStr = new XMLSerializer().serializeToString(f.doc, undefined, (node) => {
        // we need to decode the xml entities for the attributes for handlebars to work ok
        if (node.nodeType === 2 && node.nodeValue && node.nodeValue.includes('{{')) {
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
      })

      return xmlStr.replace(/<docxRemove>/g, '').replace(/<\/docxRemove>/g, '')
    }).join('$$$docxFile$$$')

    // get the last ids to share it with templating
    for (const [key, idManager] of ctx.idManagers.all()) {
      ctx.templating.setGlobalValue(`${key}MaxNumId`, idManager.last.numId)
    }

    const extraGlobalAttrs = ctx.templating.serializeToHandlebarsAttrs(ctx.templating.allGlobalValues())
    const extraGlobalAttrsStr = extraGlobalAttrs.length > 0 ? ' ' + extraGlobalAttrs.join(' ') : ''

    contentToRender = `{{#docxContext type='global' evalId='${generateRandomId()}'${extraGlobalAttrsStr}}}${contentToRender}{{docxSData type='newFiles'}}{{/docxContext}}`

    reporter.logger.debug('Starting child request to render docx dynamic parts', req)

    const { content: newContent } = await reporter.render({
      template: {
        content: contentToRender,
        engine: req.template.engine,
        recipe: 'html',
        helpers: req.template.helpers
      }
    }, req)

    // we remove NUL, VERTICAL TAB unicode characters, which are characters that are illegal in XML
    // NOTE: we should likely find a way to remove illegal characters more generally, using some kind of unicode ranges
    // eslint-disable-next-line no-control-regex
    const contents = newContent.toString().replace(/\u0000|\u000b/g, '').split('$$$docxFile$$$')

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
    throw reporter.createError('Error while executing docx recipe', {
      original: e,
      weak: true
    })
  }
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
