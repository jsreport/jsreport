const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const { customAlphabet } = require('nanoid')
const { decompress, saveXmlsToOfficeFile } = require('@jsreport/office')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)
const preprocess = require('./preprocess/preprocess')
const postprocess = require('./postprocess/postprocess')
const { parseXML, contentIsXML, isWorksheetFile, getStyleFile, serializeXmlAsHandlebarsSafeOutput } = require('../utils')
const generationUtils = require('../generationUtils')
const cellUtils = require('../cellUtils')

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

    const evalId = generateRandomId()

    const sharedData = {
      get evalId () {
        return evalId
      },
      calcChainFilePath: null,
      fileDataMap: new Map(),
      helpers: {
        parseXML,
        generationUtils,
        cellUtils
      },
      DOMParser,
      // expose options as a getter fn because we dont want user to be able to alter
      // these values
      options: (configName) => {
        return options[configName]
      }
    }

    await preprocess(files, sharedData)

    const filesToEvaluate = ensureOrderOfFiles(files.filter(f => contentIsXML(f.data)))

    const dataTemplateParts = []
    const xmlTemplateParts = []
    const filesToRender = []

    for (const f of filesToEvaluate) {
      // we dont include the sharedStrings.xml file for handlebars processing because
      // it contains handlebars tags that we dont care to process, because we extract the tags
      // from its text during preprocess
      if (f.path === 'xl/sharedStrings.xml') {
        continue
      }

      const fileMeta = sharedData.fileDataMap.get(f.path)

      if (fileMeta?.dataTemplate) {
        dataTemplateParts.push(`{{#xlsxContext type="file" path="${f.path}"}}\n${fileMeta.dataTemplate}\n{{/xlsxContext}}`)
        delete fileMeta.dataTemplate
      }

      let xmlStr = serializeXmlAsHandlebarsSafeOutput(f.doc)

      xmlStr = xmlStr.replace(/<xlsxRemove>/g, '').replace(/<\/xlsxRemove>/g, '')

      // NOTE: we should evaluate depending on the kind of features we work on if this
      // check still makes sense, of if we should find a better way to decide
      // what file should be skipped from handlebars processing.
      // skip file from handlebars processing
      if (!xmlStr.includes('{{')) {
        continue
      }

      xmlStr = `{{#xlsxContext type="file" path="${f.path}"}}${xmlStr}{{/xlsxContext}}`

      filesToRender.push(f)
      xmlTemplateParts.push(xmlStr)
    }

    let dataTemplateToRender = ''

    if (dataTemplateParts.length > 0) {
      dataTemplateToRender = `{{#xlsxContext type="global"}}\n${dataTemplateParts.join('\n')}\n{{/xlsxContext}}`
    }

    let xmlTemplateToRender = ''

    if (xmlTemplateParts.length > 0) {
      xmlTemplateToRender = xmlTemplateParts.join('$$$xlsxFile$$$')
      xmlTemplateToRender = `{{#xlsxContext type="global"}}${xmlTemplateToRender}{{/xlsxContext}}`
    }

    reporter.logger.debug('Starting child request to render xlsx dynamic parts for generation step', req)

    req.context.__xlsxSharedData = sharedData

    // execute the data template phase, in this phase we expect to render any dynamic tags of the user,
    // the values produces from it are store in variables that are going to be used in the xml template phase
    await reporter.templatingEngines.evaluate({
      engine: req.template.engine,
      content: dataTemplateToRender,
      helpers: req.template.helpers,
      data: req.data
    }, {
      entity: req.template,
      entitySet: 'templates'
    }, req)

    // execute the xml template phase, in this phase we expect to produce the final content of the
    // xml files
    const newContent = await reporter.templatingEngines.evaluate({
      engine: req.template.engine,
      content: xmlTemplateToRender,
      helpers: req.template.helpers,
      data: {}
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

    await postprocess(files, sharedData)

    // we dont want the shared data live longer on the request
    delete req.context.__xlsxSharedData

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

  return filesSorted
}
