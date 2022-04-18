const fs = require('fs')
const { response } = require('@jsreport/office')

module.exports = async (reporter, definition, req, res) => {
  const generate = require('./generation')
  const xlsxOutputPath = await generate(reporter, definition, req, res)

  const $xlsxOriginalContent = req.data.$xlsxOriginalContent || ''
  if ($xlsxOriginalContent.trim() !== '') {
    const transform = require('./transformation')

    res.content = xlsxOutputPath

    await transform(reporter, definition, req, res)
  } else {
    res.stream = fs.createReadStream(xlsxOutputPath)
  }

  await response({
    previewOptions: definition.options.preview,
    officeDocumentType: 'xlsx',
    stream: res.stream,
    logger: reporter.logger
  }, req, res)
}
