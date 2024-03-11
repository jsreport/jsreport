const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const { decode } = require('html-entities')
const { decompress, saveXmlsToOfficeFile } = require('@jsreport/office')
const preprocess = require('./preprocess/preprocess.js')
const postprocess = require('./postprocess/postprocess.js')
const { contentIsXML } = require('./utils.js')

const decodeXML = (str) => decode(str, { level: 'xml' })

module.exports = async (reporter, inputs, req) => {
  const { pptxTemplateContent, outputPath } = inputs

  try {
    let files

    try {
      files = await decompress()(pptxTemplateContent)
    } catch (parseTemplateError) {
      throw reporter.createError('Failed to parse pptx template input', {
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

      return xmlStr.replace(/<pptxRemove>/g, '').replace(/<\/pptxRemove>/g, '')
    }).join('$$$pptxFile$$$')

    reporter.logger.debug('Starting child request to render pptx dynamic parts', req)

    const res = await reporter.render({
      template: {
        content: contentToRender,
        engine: req.template.engine,
        recipe: 'html',
        helpers: req.template.helpers
      }
    }, req)

    const newContent = await res.output.getBuffer()

    // we remove NUL, VERTICAL TAB unicode characters, which are characters that are illegal in XML.
    // NOTE: we should likely find a way to remove illegal characters more generally, using some kind of unicode ranges
    // eslint-disable-next-line no-control-regex
    const contents = newContent.toString().replace(/\u0000|\u000b/g, '').split('$$$pptxFile$$$')

    for (let i = 0; i < filesToRender.length; i++) {
      filesToRender[i].data = contents[i]
      filesToRender[i].doc = new DOMParser().parseFromString(contents[i])
    }

    await postprocess(files)

    for (const f of files) {
      let shouldSerializeFromDoc

      if (f.data == null) {
        shouldSerializeFromDoc = f.path.includes('.xml')
      } else {
        shouldSerializeFromDoc = contentIsXML(f.data)
      }

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

    reporter.logger.debug('pptx successfully zipped', req)

    return {
      pptxFilePath: outputPath
    }
  } catch (e) {
    throw reporter.createError('Error while executing pptx recipe', {
      original: e,
      weak: true
    })
  }
}
