const { response } = require('@jsreport/office')
const processDocx = require('./processDocx')

module.exports = async (reporter, definition, req, res) => {
  if (!req.template.docx || (!req.template.docx.templateAsset && !req.template.docx.templateAssetShortid)) {
    throw reporter.createError('docx requires template.docx.templateAsset or template.docx.templateAssetShortid to be set', {
      statusCode: 400
    })
  }

  if (req.template.engine !== 'handlebars') {
    throw reporter.createError('docx recipe can run only with handlebars', {
      statusCode: 400
    })
  }

  let templateAsset = req.template.docx.templateAsset

  if (templateAsset?.content != null && !Buffer.isBuffer(templateAsset.content)) {
    templateAsset.content = Buffer.from(templateAsset.content, templateAsset.encoding || 'base64')
  } else if (req.template.docx.templateAssetShortid) {
    templateAsset = await reporter.documentStore.collection('assets').findOne({ shortid: req.template.docx.templateAssetShortid }, req)

    if (!templateAsset) {
      throw reporter.createError(`Asset with shortid ${req.template.docx.templateAssetShortid} was not found`, {
        statusCode: 400
      })
    }
  }

  reporter.logger.info('docx generation is starting', req)

  const { pathToFile: outputPath } = await reporter.writeTempFile((uuid) => `${uuid}.docx`, '')

  const { docxFilePath } = await processDocx(reporter, {
    docxTemplateContent: templateAsset.content,
    options: {
      imageFetchParallelLimit: definition.options.imageFetchParallelLimit
    },
    outputPath
  }, req)

  reporter.logger.info('docx generation was finished', req)

  await response({
    previewOptions: definition.options.preview,
    officeDocumentType: 'docx',
    filePath: docxFilePath,
    logger: reporter.logger
  }, req, res)
}
