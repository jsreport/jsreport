const path = require('path')
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const { customAlphabet } = require('nanoid')
const { decompress, saveXmlsToOfficeFile } = require('@jsreport/office')
const generateRandomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)
const preprocess = require('./preprocess/preprocess')
const postprocess = require('./postprocess/postprocess')
const { createIdCollectionManager } = require('./idManager')
const { parseXML, contentIsXML, isWorksheetFile, getStyleFile, serializeXmlAsHandlebarsSafeOutput } = require('../utils')
const generationUtils = require('../generationUtils')
const cellUtils = require('../cellUtils')
const chartUtils = require('../chartUtils')

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

    const filesToXMLParse = []
    let filesWithHandlebars = 0

    for (const f of files) {
      if (!contentIsXML(f.data)) {
        continue
      }

      filesToXMLParse.push(f)

      if (f.data.includes('{{')) {
        filesWithHandlebars++
      }
    }

    // this speeds up and avoid big memory consumption for legacy templates (templates with no handlebars tags)
    if (filesWithHandlebars === 0) {
      reporter.logger.info('xlsx generation skipped. no dynamic parts found', req)
      return
    }

    for (const f of filesToXMLParse) {
      f.doc = new DOMParser().parseFromString(f.data.toString())
      f.data = f.data.toString()
    }

    const evalId = generateRandomId()

    const sharedData = {
      get evalId () {
        return evalId
      },
      idManagers: createIdCollectionManager(),
      calcChainFilePath: null,
      // dynamic files are xml files that are expected to be processed in iterations
      // and producing more files (instances) from it
      dynamicFileMap: new Map(),
      // the current metadata about the files in the base template xlsx
      fileDataMap: new Map(),
      changes: {
        files: new Map()
      },
      helpers: {
        parseXML,
        dirname: (filePath) => {
          return path.posix.dirname(filePath)
        },
        relativeFilename: (baseFilePath, targetFilePath) => {
          return path.posix.relative(baseFilePath, targetFilePath)
        },
        generationUtils,
        cellUtils,
        chartUtils
      },
      // expose options as a getter fn because we dont want user to be able to alter
      // these values
      options: (configName) => {
        return options[configName]
      }
    }

    await preprocess(files, sharedData)

    const dataTemplateParts = []

    for (const [filePath, fileMeta] of sharedData.fileDataMap) {
      if (!fileMeta.dataTemplate) {
        continue
      }

      dataTemplateParts.push(`{{#xlsxContext type="file" path="${filePath}"}}\n${fileMeta.dataTemplate}\n{{/xlsxContext}}`)
      delete fileMeta.dataTemplate
    }

    let dataTemplateToRender = ''

    if (dataTemplateParts.length > 0) {
      dataTemplateToRender = `{{#xlsxContext type="global" dataTemplate=true}}\n${dataTemplateParts.join('\n')}\n{{/xlsxContext}}`
    }

    reporter.logger.debug('Executing template evaluation for xlsx dynamic parts in the generation step', req)

    req.context.__xlsxSharedData = sharedData

    // execute the data template phase, in this phase we expect to render any dynamic tags of the user,
    // the values produces from it are stored in variables that are going to be used in the xml template phase,
    // the render of this template is not expected to produce any output, all values that we care about are stored in variables.
    // (async helpers calls from the user are evaluated here just at specific boundaries, the cells itself)
    await reporter.templatingEngines.evaluate({
      engine: req.template.engine,
      content: dataTemplateToRender,
      helpers: req.template.helpers,
      data: req.data
    }, {
      entity: req.template,
      entitySet: 'templates'
    }, req)

    const filesToEvaluate = ensureOrderOfFiles(files.filter(f => contentIsXML(f.data)))
    const xmlTemplateParts = []
    const filesToRender = []

    for (const f of filesToEvaluate) {
      // we dont include the sharedStrings.xml file for handlebars processing because
      // it contains handlebars tags that we dont care to process, because we extract the tags
      // from its text during preprocess
      if (f.path === 'xl/sharedStrings.xml') {
        continue
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

      const dynamicFileMeta = sharedData.dynamicFileMap.has(f.path)

      if (dynamicFileMeta) {
        xmlStr = `{{#xlsxContext type="dynamicFile" path="${f.path}"}}{{#xlsxContext type="file" path=this}}${xmlStr}{{/xlsxContext}}{{/xlsxContext}}`
      } else {
        xmlStr = `{{#xlsxContext type="file" path="${f.path}"}}${xmlStr}{{/xlsxContext}}`
      }

      filesToRender.push(f)
      xmlTemplateParts.push(xmlStr)
    }

    let xmlTemplateToRender = ''

    if (xmlTemplateParts.length > 0) {
      xmlTemplateToRender = xmlTemplateParts.join('$$$xlsxFile$$$')
      xmlTemplateToRender = `{{#xlsxContext type="global"}}${xmlTemplateToRender}{{/xlsxContext}}`
    }

    // execute the xml template phase, in this phase we expect to produce the final content of the
    // xml files (async helpers calls from the user are not here, so we can construct the xml safely)
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
      const currentFile = filesToRender[i]
      const dynamicFileMeta = sharedData.dynamicFileMap.get(currentFile.path)
      const toProcess = []

      if (dynamicFileMeta) {
        const instances = contents[i].split('$$$xlsxInstanceFile$$$')

        for (let instanceIdx = 0; instanceIdx < instances.length; instanceIdx++) {
          const instanceContent = instances[instanceIdx]
          let targetFile

          if (instanceIdx === 0) {
            // when processing dynamic file, the first instance always map to the
            // file that already exists in files
            targetFile = currentFile
          } else {
            const instancePath = dynamicFileMeta.instances[instanceIdx]?.path

            if (!instancePath) {
              throw new Error(`Missing path for instance ${instanceIdx} of dynamic file ${currentFile.path}`)
            }

            targetFile = {
              path: instancePath,
              data: ''
            }

            files.push(targetFile)
          }

          toProcess.push([targetFile, instanceContent])
        }
      } else {
        toProcess.push([currentFile, contents[i]])
      }

      for (const [linkedFile, content] of toProcess) {
        linkedFile.data = content

        // don't parse the sheets file, because after the templating engine execution
        // those documents can be a lot more bigger and parsing such big document is a performance
        // kill for the process
        if (!isWorksheetFile(linkedFile.path)) {
          linkedFile.doc = new DOMParser().parseFromString(content)
        } else {
          // we remove the .doc for the xl/worksheets/*.xml files to be clear that it should not be used
          // for any of postprocess steps, instead when dealing with that document we should execute search/replace
          // based on string and regexp.
          delete linkedFile.doc
        }
      }
    }

    // add any new files added directly through the sharedData.changes.files api
    for (const [filePath, bufContent] of sharedData.changes.files) {
      files.push({
        path: filePath,
        data: bufContent
      })
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
