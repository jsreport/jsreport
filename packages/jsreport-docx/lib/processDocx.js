const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const { customAlphabet } = require('nanoid')
const { decompress, saveXmlsToOfficeFile } = require('@jsreport/office')
const preprocess = require('./preprocess/preprocess.js')
const postprocess = require('./postprocess/postprocess.js')
const { contentIsXML } = require('./utils')
const decodeXML = require('./decodeXML')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)

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

    await preprocess(files)

    const filesToRender = files.filter(f => contentIsXML(f.data))

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

    contentToRender = `{{#docxContext type="global" evalId="${generateRandomId()}"}}${contentToRender}{{/docxContext}}`

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

    await postprocess(reporter, files, options)

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
