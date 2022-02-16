const fs = require('fs')
const { response } = require('@jsreport/office')
const processXlsx = require('./processXlsx')

module.exports = async (reporter, definition, req, res) => {
  if (!req.template.xlsx || (!req.template.xlsx.templateAsset && !req.template.xlsx.templateAssetShortid)) {
    throw reporter.createError('xlsx-next requires template.xlsx.templateAsset or template.xlsx.templateAssetShortid to be set', {
      statusCode: 400
    })
  }

  if (req.template.engine !== 'handlebars') {
    throw reporter.createError('xlsx-next recipe can run only with handlebars', {
      statusCode: 400
    })
  }

  let templateAsset = req.template.xlsx.templateAsset

  if (req.template.xlsx.templateAssetShortid) {
    templateAsset = await reporter.documentStore.collection('assets').findOne({ shortid: req.template.xlsx.templateAssetShortid }, req)

    if (!templateAsset) {
      throw reporter.createError(`Asset with shortid ${req.template.xlsx.templateAssetShortid} was not found`, {
        statusCode: 400
      })
    }
  } else {
    if (!Buffer.isBuffer(templateAsset.content)) {
      templateAsset.content = Buffer.from(templateAsset.content, templateAsset.encoding || 'utf8')
    }
  }

  reporter.logger.info('xlsx generation is starting', req)

  const { pathToFile: outputPath } = await reporter.writeTempFile((uuid) => `${uuid}.xlsx`, '')

  const { xlsxFilePath } = await processXlsx(reporter)({
    xlsxTemplateContent: templateAsset.content,
    options: {
      imageFetchParallelLimit: definition.options.imageFetchParallelLimit
    },
    outputPath
  }, req)

  reporter.logger.info('xlsx generation was finished', req)

  res.stream = fs.createReadStream(xlsxFilePath)

  await response({
    previewOptions: definition.options.preview,
    officeDocumentType: 'xlsx',
    stream: res.stream,
    logger: reporter.logger
  }, req, res)
}
