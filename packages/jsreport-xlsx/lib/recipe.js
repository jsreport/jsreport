const { response } = require('@jsreport/office')

module.exports = async (reporter, definition, req, res) => {
  const generate = require('./generation')
  let xlsxOutputPath = await generate(reporter, definition, req, res)

  const $xlsxOriginalContent = req.data.$xlsxOriginalContent || ''

  if ($xlsxOriginalContent.trim() !== '') {
    const transform = require('./transformation')

    await res.output.update(Buffer.from(xlsxOutputPath))

    xlsxOutputPath = await transform(reporter, definition, req, res)
  }

  await response({
    previewOptions: definition.options.preview,
    officeDocumentType: 'xlsx',
    filePath: xlsxOutputPath,
    logger: reporter.logger
  }, req, res)
}
