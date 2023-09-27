const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const { decode } = require('html-entities')
const { decompress, saveXmlsToOfficeFile } = require('@jsreport/office')
const preprocess = require('./preprocess/preprocess')
const postprocess = require('./postprocess/postprocess')
const { contentIsXML, isWorksheetFile } = require('../utils')

const decodeXML = (str) => decode(str, { level: 'xml' })

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

    const meta = { options }

    await preprocess(files, meta)

    const filesToRender = files.filter(f => contentIsXML(f.data))

    const contentToRender = filesToRender.map(f => {
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

      return xmlStr.replace(/<xlsxRemove>/g, '').replace(/<\/xlsxRemove>/g, '')
    }).join('$$$xlsxFile$$$')

    reporter.logger.debug('Starting child request to render xlsx dynamic parts for generation step', req)

    const { content: newContent } = await reporter.render({
      template: {
        content: contentToRender,
        engine: req.template.engine,
        recipe: 'html',
        helpers: req.template.helpers
      }
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

    await postprocess(files, meta)

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
