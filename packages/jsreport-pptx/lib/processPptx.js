const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const { customAlphabet } = require('nanoid')
const { decompress, saveXmlsToOfficeFile } = require('@jsreport/office')
const preprocess = require('./preprocess/preprocess.js')
const postprocess = require('./postprocess/postprocess.js')
const { contentIsXML } = require('./utils.js')
const decodeXML = require('./decodeXML')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)

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

    const sharedData = {
      evalId: generateRandomId(),
      // expose options as a getter fn because we dont want user to be able to alter
      // these values
      options: (configName) => {
        return null
      }
    }

    await preprocess(files, sharedData)

    const filesToRender = files.filter(f => contentIsXML(f.data))
    const filesSeparator = '$$$pptxFile$$$'

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
      const xmlStr = new XMLSerializer().serializeToString(f.doc, undefined, normalizeAttributeAndTextNode)

      return xmlStr.replace(/<\/?pptxRemove>/g, '')
    }).join(filesSeparator)

    contentToRender = `{{#pptxContext type='global'}}\n${contentToRender}\n{{pptxSData type='newFiles'}}{{/pptxContext}}`

    reporter.logger.debug('Executing template evaluation for pptx dynamic parts', req)

    req.context.__pptxSharedData = sharedData

    sharedData.getColWidth = function getColWidth (...args) {
      const getColWidth = require('./getColWidth')
      return getColWidth(...args)
    }

    sharedData.processTableGrid = function processTableGrid (...args) {
      const processTableGrid = require('./processTableGrid')
      return processTableGrid(...args)
    }

    const newContent = await reporter.templatingEngines.evaluate({
      engine: req.template.engine,
      content: contentToRender,
      helpers: req.template.helpers,
      data: req.data
    }, {
      entity: req.template,
      entitySet: 'templates'
    }, req)

    // we remove NUL, VERTICAL TAB unicode characters, which are characters that are illegal in XML
    // NOTE: we should likely find a way to remove illegal characters more generally, using some kind of unicode ranges
    // eslint-disable-next-line no-control-regex
    const contents = newContent.toString().replace(/\u0000|\u000b/g, '').split(filesSeparator)

    for (let i = 0; i < filesToRender.length; i++) {
      filesToRender[i].data = contents[i]
      filesToRender[i].doc = new DOMParser().parseFromString(contents[i])
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

    await postprocess(files, sharedData)

    // we dont want the shared data live longer on the request
    delete req.context.__pptxSharedData

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

      if (shouldSerializeFromDoc && f.doc != null) {
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
