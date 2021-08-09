const fs = require('fs')
const fallback = require('./fallback.js')
const jsonToXml = require('./jsonToXml.js')
const stream = require('stream')
const zlib = require('zlib')
const merge = require('merge2')
const { response, serializeOfficeXmls } = require('@jsreport/office')

const stringToStream = (str) => {
  const s = new stream.Readable()
  s.push(str)
  s.push(null)
  return s
}

module.exports = async (reporter, definition, req, res) => {
  reporter.logger.debug('Parsing xlsx content', req)

  const contentString = res.content.toString()

  let $xlsxTemplate
  let $files

  try {
    const content = JSON.parse(contentString)
    $xlsxTemplate = content.$xlsxTemplate
    $files = content.$files
  } catch (e) {
    reporter.logger.warn('Unable to parse xlsx template JSON string (maybe you are missing {{{xlsxPrint}}} at the end?): \n' + contentString.substring(0, 100) + '... \n' + e.stack, req)
    return fallback(reporter, definition, req, res)
  }

  const files = Object.keys($xlsxTemplate).map((k) => {
    if (k.includes('xl/media/') || k.includes('.bin')) {
      return {
        path: k,
        data: Buffer.from($xlsxTemplate[k], 'base64')
      }
    }

    if (k.includes('.xml')) {
      const xmlAndFiles = jsonToXml($xlsxTemplate[k])
      const fullXml = xmlAndFiles.xml

      if (fullXml.indexOf('&&') < 0) {
        return {
          path: k,
          data: Buffer.from(fullXml, 'utf8')
        }
      }

      const xmlStream = merge()

      if (fullXml.indexOf('&&') < 0) {
        return {
          path: k,
          data: Buffer.from(fullXml, 'utf8')
        }
      }

      let xml = fullXml

      while (xml) {
        const separatorIndex = xml.indexOf('&&')

        if (separatorIndex < 0) {
          xmlStream.add(stringToStream(xml))
          xml = ''
          continue
        }

        xmlStream.add(stringToStream(xml.substring(0, separatorIndex)))
        xmlStream.add(fs.createReadStream($files[xmlAndFiles.files.shift()]).pipe(zlib.createInflate()))
        xml = xml.substring(separatorIndex + '&&'.length)
      }

      return {
        path: k,
        data: xmlStream
      }
    }

    return {
      path: k,
      data: Buffer.from($xlsxTemplate[k], 'utf8')
    }
  })

  await serializeOfficeXmls({ reporter, files, officeDocumentType: 'xlsx' }, req, res)
  return response({
    previewOptions: definition.options.preview,
    officeDocumentType: 'xlsx',
    stream: res.stream,
    logger: reporter.logger
  }, req, res)
}
