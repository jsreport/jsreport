const Docxtemplater = require('docxtemplater')
const JSZip = require('jszip')
const { response } = require('@jsreport/office')

module.exports = (reporter, definition) => async (req, res) => {
  if (!req.template.docxtemplater || (!req.template.docxtemplater.templateAsset && !req.template.docxtemplater.templateAssetShortid)) {
    throw reporter.createError('docxtemplater requires template.docxtemplater.templateAsset or template.docxtemplater.templateAssetShortid to be set', {
      statusCode: 400
    })
  }

  let templateAsset = req.template.docxtemplater.templateAsset

  if (req.template.docxtemplater.templateAssetShortid) {
    templateAsset = await reporter.documentStore.collection('assets').findOne({ shortid: req.template.docxtemplater.templateAssetShortid }, req)

    if (!templateAsset) {
      throw reporter.createError(`Asset with shortid ${req.template.docxtemplater.templateAssetShortid} was not found`, {
        statusCode: 400
      })
    }
  } else {
    if (!Buffer.isBuffer(templateAsset.content)) {
      templateAsset.content = Buffer.from(templateAsset.content, templateAsset.encoding || 'utf8')
    }
  }

  const zip = new JSZip(templateAsset.content)
  const docx = new Docxtemplater()
  docx.loadZip(zip)

  docx.setData(req.data)
  docx.render()

  return response({
    previewOptions: definition.options.preview,
    officeDocumentType: 'docx',
    buffer: docx.getZip().generate({ type: 'nodebuffer' })
  }, req, res)
}
