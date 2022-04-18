const fs = require('fs')
const stream = require('stream')
const zlib = require('zlib')
const merge = require('merge2')
const serialize = require('./serialize.js')
const fallback = require('./fallback.js')
const jsonToXml = require('./jsonToXml.js')
const { serializeOfficeXmls } = require('@jsreport/office')
const parseXlsx = serialize.parse

module.exports = async (reporter, definition, req, res) => {
  reporter.logger.info('xlsx transformation is starting', req)

  req.context.xlsxReadyForTransformation = true

  const xlsxOutputContent = await fs.promises.readFile(res.content)
  req.data.$xlsxTemplate = await parseXlsx(xlsxOutputContent)

  const { content: newContent } = await reporter.render({
    template: {
      content: req.data.$xlsxOriginalContent,
      engine: req.template.engine,
      recipe: 'html',
      helpers: req.template.helpers
    }
  }, req)

  delete req.context.xlsxReadyForTransformation

  reporter.logger.debug('Parsing xlsx content', req)

  const contentString = newContent.toString()

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

  reporter.logger.info('xlsx transformation was finished', req)
}

function stringToStream (str) {
  const s = new stream.Readable()
  s.push(str)
  s.push(null)
  return s
}
