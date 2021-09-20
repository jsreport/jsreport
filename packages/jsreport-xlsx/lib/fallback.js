const util = require('util')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const excelbuilder = require('msexcel-builder-extended')
const { response } = require('@jsreport/office')

module.exports = async (reporter, definition, req, res) => {
  const generationId = uuidv4()

  const result = res.content.toString()

  // ensures that reporter.options.tempAutoCleanupDirectory exists
  await reporter.ensureTempDirectoryExists()

  const workbook = excelbuilder.createWorkbook(reporter.options.tempAutoCleanupDirectory, `${generationId}.xlsx`)

  let start = result.indexOf('<worksheet')
  let sheetNumber = 1
  while (start >= 0) {
    const worksheet = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" + result.substring(
      start,
      result.indexOf('</worksheet>', start) + '</worksheet>'.length, start)

    const startSheetName = worksheet.indexOf('name=')
    let sheetName = 'Sheet ' + sheetNumber.toString()
    if (startSheetName > 0 && startSheetName < worksheet.indexOf('>', worksheet.indexOf('<worksheet'))) {
      const s = startSheetName + 'name="'.length
      const e = worksheet.indexOf('"', s)
      sheetName = worksheet.substring(s, e)
    }
    const sheet1 = workbook.createSheet(sheetName, 0, 0)
    sheet1.raw(worksheet)
    sheetNumber = sheetNumber + 1
    start = result.indexOf('<worksheet', start + 1)
  }

  if (result.indexOf('<styleSheet') > 0) {
    const stylesheet = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" + result.substring(
      result.indexOf('<styleSheet'),
      result.indexOf('</styleSheet>') + '</styleSheet>'.length)
    workbook.st.raw(stylesheet)
  }

  return util.promisify(workbook.save).call(workbook).then(() => {
    res.stream = fs.createReadStream(path.join(reporter.options.tempAutoCleanupDirectory, generationId + '.xlsx'))
    return response({
      previewOptions: definition.options.preview,
      officeDocumentType: 'xlsx',
      stream: res.stream
    }, req, res)
  }).catch(function (e) {
    throw reporter.createError(`Unable to parse xlsx template JSON string (maybe you are missing {{{xlsxPrint}}} at the end?): \n${
      res.content.toString().substring(0, 100)
    }...`, {
      weak: true,
      statusCode: 400
    })
  })
}
