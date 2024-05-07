const fs = require('fs')
const axios = require('axios')
const FormData = require('form-data')

const officeDocuments = {
  docx: {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  },
  pptx: {
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  },
  xlsx: {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
}

module.exports = async function response ({
  previewOptions: { publicUri, enabled },
  officeDocumentType,
  filePath,
  buffer,
  logger
}, req, res) {
  const isRenderResponse = res.__isJsreportResponse__ === true
  let result

  if (officeDocuments[officeDocumentType] == null) {
    throw new Error(`Unsupported office document type "${officeDocumentType}"`)
  }

  const isPreviewRequest = req.options.preview === true || req.options.preview === 'true'
  let isOfficePreviewRequest

  if (
    req.options.office == null ||
    req.options.office.preview == null
  ) {
    isOfficePreviewRequest = isPreviewRequest
  } else {
    isOfficePreviewRequest = req.options.office.preview === true || req.options.office.preview === 'true'
  }

  if (enabled === false || !isOfficePreviewRequest) {
    if (isRenderResponse) {
      await res.output.update(buffer || filePath)
    } else {
      result = buffer || filePath
    }

    res.meta.fileExtension = officeDocumentType
    res.meta.contentType = officeDocuments[officeDocumentType].contentType
    res.meta.officeDocumentType = officeDocumentType
    return result
  }

  logger.debug('preparing office preview', req)

  const form = new FormData()
  const formContent = buffer || fs.createReadStream(filePath)

  form.append('field', formContent, `file.${officeDocumentType}`)

  let resp

  const targetPublicUri = publicUri || 'http://jsreport.net/temp'

  try {
    resp = await axios.post(targetPublicUri, form, {
      headers: form.getHeaders(),
      // axios by default has no limits but there is a bug
      // https://github.com/axios/axios/issues/1362 (when following redirects) in
      // which the default limit is not taking into account, so we set it explicitly
      maxContentLength: Infinity
    })
  } catch (e) {
    let message = `${officeDocumentType} file upload to ${targetPublicUri} failed.`

    // the explicit destroy here allows the http globalAgent to release the socket,
    // which keeps a reference to the input data we send to target public server, (even if a stream)
    // this reference prevents memory to be released immediately, if the input document is like >100mb
    // the explicit destroy here is an improvement, if we don't do this explicit destroy the socket
    // is anyway released in like 1 minute, so this is more an enhancement rather than a bug fix
    if (e.request != null && !e.request.destroyed) {
      e.request.destroy()
    }

    if (e.response && e.response.status && e.response.status === 413) {
      message += ' File is too big and it pass the upload limits of server.'
    }
    message += ' Returning plain document for download.'
    message += ` (full error: ${e.message})`

    logger.error(message, req)

    if (isRenderResponse) {
      await res.output.update(buffer || filePath)
    } else {
      result = buffer || filePath
    }

    res.meta.fileExtension = officeDocumentType
    res.meta.contentType = officeDocuments[officeDocumentType].contentType
    res.meta.officeDocumentType = officeDocumentType
    return result
  }

  const iframe = `<iframe style="height:100%;width:100%" src="https://view.officeapps.live.com/op/view.aspx?src=${
    encodeURIComponent((targetPublicUri + '/') + resp.data)
  }" />`

  const htmlBuffer = Buffer.from(`<html><head><title>${res.meta.reportName}</title><body>${iframe}</body></html>`)

  if (isRenderResponse) {
    await res.output.update(htmlBuffer)
  } else {
    result = htmlBuffer
  }

  res.meta.contentType = 'text/html'
  res.meta.fileExtension = 'html'
  return result
}
