const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const decodeXML = require('unescape')
const { decompress, saveXmlsToOfficeFile } = require('@jsreport/office')
const preprocess = require('./preprocess/preprocess')
const postprocess = require('./postprocess/postprocess')
const { contentIsXML, isWorksheetFile } = require('../utils')

module.exports = (reporter) => async (inputs, req) => {
  const { xlsxTemplateContent, options, outputPath } = inputs

  try {
    const files = await decompress()(xlsxTemplateContent)

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
        if (node.nodeType === 2 && node.nodeValue && node.nodeValue.includes('{{')) {
          const str = new XMLSerializer().serializeToString(node)
          return decodeXML(str)
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

    // we remove NUL unicode characters, which is the only character that is illegal in XML
    // eslint-disable-next-line no-control-regex
    const contents = newContent.toString().replace(/\u0000/g, '').split('$$$xlsxFile$$$')

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

    reporter.logger.debug('xlsx successfully zipped')

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
