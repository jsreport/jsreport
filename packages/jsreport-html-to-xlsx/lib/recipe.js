const fs = require('fs')
const { response } = require('@jsreport/office')
const htmlToXlsx = require('html-to-xlsx')
const htmlToXlsxProcess = require('./htmlToXlsxProcess')

module.exports = (reporter, definition) => async (req, res) => {
  const htmlEngines = definition.options.htmlEngines
  const htmlToXlsxOptions = req.template.htmlToXlsx || {}
  const baseXlsxTemplate = req.template.baseXlsxTemplate || {}

  if (htmlToXlsxOptions.htmlEngine == null) {
    if (htmlEngines.includes('chrome')) {
      htmlToXlsxOptions.htmlEngine = 'chrome'
    } else if (htmlEngines.includes('phantom')) {
      htmlToXlsxOptions.htmlEngine = 'phantom'
    } else {
      htmlToXlsxOptions.htmlEngine = 'cheerio'
    }
  }

  const chromeOptions = {
    conversion: Object.assign({}, reporter.options.chrome, definition.options),
    eval: Object.assign({}, reporter.options.chrome, definition.options.chrome)
  }

  Object.assign(chromeOptions.eval, {
    ...(chromeOptions.eval.launchOptions || {}),
    args: [
      '--window-size=12800000000000,1024',
      ...(
        chromeOptions.eval.launchOptions && chromeOptions.eval.launchOptions.args ? chromeOptions.eval.launchOptions.args : []
      )
    ]
  })

  const phantomEvalOptions = {
    tmpDir: definition.options.tmpDir,
    clean: false
  }

  const cheerioOptions = {
    conversion: Object.assign({}, definition.options)
  }

  if (reporter.options.phantom && reporter.options.phantom.path) {
    // global phantom path possible filled in future by compilation
    phantomEvalOptions.phantomPath = reporter.options.phantom.path
  }

  const phantomOptions = {
    conversion: Object.assign({}, definition.options),
    eval: phantomEvalOptions
  }

  const conversionOptions = {}

  if (htmlToXlsxOptions.htmlEngine === 'cheerio') {
    conversionOptions.defaults = {
      fontFamily: 'Calibri',
      fontSize: '16px',
      verticalAlign: 'middle'
    }
  } else {
    conversionOptions.styles = [`
      * {
        font-family: Calibri;
        font-size: 16px;
      }
    `]

    conversionOptions.scriptFn = htmlToXlsx.getScriptFn()
    conversionOptions.waitForJS = htmlToXlsxOptions.waitForJS
    conversionOptions.waitForJSVarName = 'JSREPORT_READY_TO_START'
  }

  reporter.logger.info('html-to-xlsx generation is starting', req)

  let xlsxTemplateBuf

  if (
    htmlToXlsxOptions.templateAssetShortid ||
    (htmlToXlsxOptions.templateAsset && htmlToXlsxOptions.templateAsset.content) ||
    baseXlsxTemplate.content ||
    baseXlsxTemplate.shortid
  ) {
    reporter.logger.info('html-to-xlsx is going to insert table generation into base xlsx template', req)

    if (htmlToXlsxOptions.templateAsset && htmlToXlsxOptions.templateAsset.content) {
      xlsxTemplateBuf = Buffer.from(htmlToXlsxOptions.templateAsset.content, htmlToXlsxOptions.templateAsset.encoding || 'utf8')
    } else if (baseXlsxTemplate.content) {
      xlsxTemplateBuf = Buffer.from(req.template.baseXlsxTemplate.content, 'base64')
    } else {
      if (
        !baseXlsxTemplate.shortid &&
        !htmlToXlsxOptions.templateAssetShortid
      ) {
        throw reporter.createError('No valid base xlsx template specified, make sure to set a correct one', {
          weak: true
        })
      }

      let docs
      let xlsxTemplateShortid

      if (htmlToXlsxOptions.templateAssetShortid) {
        xlsxTemplateShortid = htmlToXlsxOptions.templateAssetShortid
        docs = await reporter.documentStore.collection('assets').find({
          shortid: xlsxTemplateShortid
        }, req)
      } else {
        xlsxTemplateShortid = baseXlsxTemplate.shortid
        docs = await reporter.documentStore.collection('xlsxTemplates').find({
          shortid: xlsxTemplateShortid
        }, req)
      }

      if (!docs.length) {
        throw reporter.createError(`Unable to find xlsx template with shortid ${xlsxTemplateShortid}`, {
          statusCode: 404
        })
      }

      if (htmlToXlsxOptions.templateAssetShortid) {
        xlsxTemplateBuf = docs[0].content
      } else {
        xlsxTemplateBuf = docs[0].contentRaw
      }
    }
  }

  const result = await htmlToXlsxProcess(
    {
      tmpDir: definition.options.tmpDir,
      htmlEngine: htmlToXlsxOptions.htmlEngine,
      html: res.content.toString(),
      xlsxTemplateContent: xlsxTemplateBuf,
      chromeOptions,
      phantomOptions,
      cheerioOptions,
      conversionOptions
    },
    req
  )

  if (result.logs) {
    result.logs.forEach(m => {
      reporter.logger[m.level](m.message, { ...req, timestamp: m.timestamp })
    })
  }

  if (result.error) {
    const error = new Error(result.error.message)
    error.stack = result.error.stack

    throw reporter.createError('Error while executing html-to-xlsx recipe', {
      original: error,
      weak: true
    })
  }

  reporter.logger.info('html-to-xlsx generation was finished', req)

  res.stream = fs.createReadStream(result.htmlToXlsxFilePath)

  return response({
    previewOptions: definition.options.preview,
    officeDocumentType: 'xlsx',
    stream: res.stream,
    logger: reporter.logger
  }, req, res)
}
