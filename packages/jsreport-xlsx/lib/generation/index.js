const path = require('path')
const fs = require('fs/promises')
const processXlsx = require('./processXlsx')
let defaultXlsxWorkbook

module.exports = async (reporter, definition, req, res) => {
  let templateAsset

  if (
    (!req.template.xlsx || (!req.template.xlsx.templateAssetShortid && !req.template.xlsx.templateAsset))
  ) {
    if (!defaultXlsxWorkbook) {
      defaultXlsxWorkbook = await fs.readFile(path.join(__dirname, '../../static/defaultNewWorkbook.xlsx'))
    }

    templateAsset = templateAsset || {}
    templateAsset.content = defaultXlsxWorkbook
  }

  if (req.template.xlsx && req.template.xlsx.templateAsset && req.template.xlsx.templateAsset.content) {
    templateAsset = templateAsset || {}
    templateAsset.content = Buffer.from(req.template.xlsx.templateAsset.content, req.template.xlsx.templateAsset.encoding || 'base64')
  } else if (req.template.xlsx && req.template.xlsx.templateAssetShortid) {
    const assetFound = await reporter.documentStore.collection('assets').findOne({ shortid: req.template.xlsx.templateAssetShortid }, req)

    if (!assetFound) {
      if (!req.template.xlsx.templateAssetShortid) {
        throw reporter.createError('Unable to find xlsx template. xlsx template not specified', {
          statusCode: 404
        })
      }

      throw reporter.createError(`Unable to find xlsx template with shortid ${req.template.xlsx.templateAssetShortid}`, {
        statusCode: 404
      })
    } else {
      templateAsset = templateAsset || {}
      templateAsset.content = assetFound.content
    }
  }

  if (!templateAsset) {
    throw reporter.createError('Unable to find xlsx template for xlsx recipe execution', {
      statusCode: 400
    })
  }

  if (req.template.engine !== 'handlebars') {
    const { pathToFile: outputPath } = await reporter.writeTempFile((uuid) => `${uuid}.xlsx`, templateAsset.content)
    reporter.logger.debug('xlsx generation skipped. template engine is not handlebars')
    return outputPath
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

  return xlsxFilePath
}
