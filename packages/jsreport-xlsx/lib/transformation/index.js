const fs = require('fs')
const stream = require('stream')
const zlib = require('zlib')
const merge = require('merge2')
const serialize = require('./serialize.js')
const jsonToXml = require('./jsonToXml.js')
const { serializeOfficeXmls } = require('@jsreport/office')
const parseXlsx = serialize.parse

module.exports = async (reporter, definition, req, res) => {
  reporter.logger.info('xlsx transformation is starting', req)

  const resContent = await res.output.getBuffer()
  const xlsxOutputContent = await fs.promises.readFile(resContent)
  req.data.$xlsxTemplate = await parseXlsx(xlsxOutputContent)

  reporter.logger.debug('Parsing xlsx content', req)

  req.context.asyncHandlebars = true

  const contentString = await reporter.templatingEngines.evaluate({
    engine: req.template.engine,
    content: req.data.$xlsxOriginalContent,
    helpers: req.template.helpers,
    data: req.data
  }, {
    entity: req.template,
    entitySet: 'templates'
  }, req)

  req.context.asyncHandlebars = false

  // we need to call afterTemplatingEnginesExecutedListeners to ensure the assets are extracted
  const fakeRes = reporter.Response(`xlsx-transformation-${req.context.id}`)

  await fakeRes.output.update(Buffer.from(contentString))

  await reporter.afterTemplatingEnginesExecutedListeners.fire(req, fakeRes)

  let content

  try {
    content = (await fakeRes.output.getBuffer()).toString()
    content = JSON.parse(content)
  } catch (e) {
    throw reporter.createError('Error parsing xlsx content, aren\'t you missing {{{xlsxPrint}}}?', {
      statusCode: 400,
      weak: true,
      original: e
    })
  }

  const $xlsxTemplate = content.$xlsxTemplate
  const $files = content.$files || []

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

  const newOfficeFilePath = await serializeOfficeXmls({ reporter, files, officeDocumentType: 'xlsx' }, req, res)

  reporter.logger.info('xlsx transformation was finished', req)

  return newOfficeFilePath
}

function stringToStream (str) {
  const s = new stream.Readable()
  s.push(str)
  s.push(null)
  return s
}
