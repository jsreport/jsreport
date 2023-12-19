const htmlDocx = require('html-docx-js-typescript')
const juice = require('juice')
const { response } = require('@jsreport/office')

module.exports = (reporter, definition) => async (req, res) => {
  let docxContent

  try {
    const htmlContent = (await res.output.getBuffer()).toString()
    const docxBuffer = await htmlDocx.asBlob(juice(htmlContent))
    docxContent = docxBuffer.toString('base64')
  } catch (err) {
    const error = new Error(err.message)
    error.stack = err.stack

    throw reporter.createError('Error while processing html into docx', {
      original: error,
      weak: true
    })
  }

  await response({
    previewOptions: definition.options.preview,
    officeDocumentType: 'docx',
    buffer: Buffer.from(docxContent, 'base64'),
    logger: reporter.logger
  }, req, res)
}
