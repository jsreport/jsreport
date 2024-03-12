module.exports = async (reporter, req, res) => {
  let pdfAsset
  let pdfAssetPath

  if (req.template.staticPdf && req.template.staticPdf.pdfAssetShortid) {
    const assetEntity = await reporter.documentStore.collection('assets').findOne({
      shortid: req.template.staticPdf.pdfAssetShortid
    }, req)

    if (!assetEntity) {
      throw reporter.createError(`Source Asset with shortid ${req.template.staticPdf.pdfAssetShortid} was not found`, {
        statusCode: 400
      })
    }

    pdfAssetPath = await reporter.folders.resolveEntityPath(assetEntity, 'assets', req)

    if (assetEntity.content == null) {
      throw reporter.createError(`Source PDF asset ${pdfAssetPath} should contain PDF`, {
        statusCode: 400
      })
    }

    reporter.logger.debug(`static-pdf is using asset ${pdfAssetPath}`, req)

    pdfAsset = assetEntity.content
  } else if (req.template.staticPdf?.pdfAsset != null) {
    if (Buffer.isBuffer(req.template.staticPdf.pdfAsset.content)) {
      pdfAsset = req.template.staticPdf.pdfAsset.content
    } else {
      if (!req.template.staticPdf.pdfAsset.encoding) {
        throw reporter.createError('Missing value for req.template.staticPdf.pdfAsset.encoding, encoding is required', {
          statusCode: 400
        })
      }

      pdfAsset = Buffer.from(req.template.staticPdf.pdfAsset.content, req.template.staticPdf.pdfAsset.encoding)
    }

    reporter.logger.debug('static-pdf is using inline content', req)
  }

  if (!pdfAsset) {
    throw reporter.createError('Source PDF asset was not specified, specify either req.template.staticPdf.pdfAssetShortid or req.template.staticPdf.pdfAsset', {
      statusCode: 400
    })
  }

  const resultType = require('file-type')(pdfAsset)

  if (!resultType || resultType.ext !== 'pdf') {
    throw reporter.createError(`Source PDF asset${pdfAssetPath != null ? ` ${pdfAssetPath}` : ''} should contain PDF${resultType && resultType.mime ? `. referenced asset is ${resultType.mime}` : ''}`, {
      statusCode: 400
    })
  }

  await res.output.update(pdfAsset)

  res.meta.contentType = 'application/pdf'
  res.meta.fileExtension = 'pdf'
}
