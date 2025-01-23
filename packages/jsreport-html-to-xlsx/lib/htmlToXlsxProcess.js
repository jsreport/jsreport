const path = require('path')
const fs = require('fs').promises
const { htmlEngines } = require('./autoDetectHtmlEngines')()
const chromePageEval = require('chrome-page-eval')
const phantomPageEval = require('phantom-page-eval')
const htmlToXlsx = require('@jsreport/html-to-xlsx')
const opentype = require('opentype.js')

const defaultFontPath = path.join(__dirname, '../static/Calibri 400.ttf')
const addRowsToBrowserFn = require('fs').readFileSync(path.join(__dirname, '../static/addRowsToBrowser.js')).toString()

const conversions = {}

module.exports = async function scriptHtmlToXlsxProcessing (inputs) {
  const { timeout, tmpDir, htmlEngine, html, xlsxTemplateContent, chromeOptions, phantomOptions, cheerioOptions, conversionOptions } = inputs
  const logs = []

  try {
    if (htmlEngines.chrome && conversions.chrome == null && htmlEngine === 'chrome') {
      const chromeEval = chromePageEval({ ...chromeOptions.eval, puppeteer: htmlEngines.chrome })

      conversions.chrome = htmlToXlsx({
        timeout,
        ...chromeOptions.conversion,
        extract: browserBasedEval(tmpDir, chromeEval)
      })
    }

    if (htmlEngines.phantom && conversions.phantom == null && htmlEngine === 'phantom') {
      const phantomPath = phantomOptions.eval.phantomPath != null ? phantomOptions.eval.phantomPath : htmlEngines.phantom.path
      const phantomEval = phantomPageEval({ ...phantomOptions.eval, phantomPath })

      conversions.phantom = htmlToXlsx({
        timeout,
        ...phantomOptions.conversion,
        extract: browserBasedEval(tmpDir, phantomEval)
      })
    }

    if (conversions.cheerio == null && htmlEngines.cheerio && htmlEngine === 'cheerio') {
      const cheerioPageEval = require('cheerio-page-eval')

      conversions.cheerio = htmlToXlsx({
        timeout,
        ...cheerioOptions.conversion,
        extract: cheerioPageEval(tmpDir, opentype.loadSync(defaultFontPath))
      })
    }

    const conversion = conversions[htmlEngine]

    if (conversion == null) {
      const engineError = new Error(`htmlEngine "${htmlEngine}" not found`)
      throw engineError
    }

    const stream = await conversion(
      html,
      conversionOptions,
      xlsxTemplateContent
    )

    const xlsxPath = stream.path

    stream.destroy()

    return {
      logs,
      htmlToXlsxFilePath: xlsxPath
    }
  } catch (e) {
    e.logs = logs
    throw e
  }
}

function browserBasedEval (tmpDir, extractImplementation) {
  return async function pageEval ({ html, uuid, ...restOptions }) {
    const htmlPath = path.join(tmpDir, `${uuid}-html-to-xlsx.html`)

    await fs.writeFile(htmlPath, html)

    const extractInfo = await extractImplementation({
      html: htmlPath,
      close: false,
      ...restOptions
    })

    let result
    let instance

    if (extractInfo.instance) {
      instance = extractInfo.instance
      result = extractInfo.result
    } else {
      result = extractInfo
    }

    const tables = Array.isArray(result) ? result : [result]

    const tablesLastIndex = tables.length - 1

    return tables.map((table, tableIdx) => ({
      name: table.name,
      getRows: async (rowCb) => {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
          try {
            for (const row of table.rows) {
              const isRowsPlaceholder = !Array.isArray(row)

              if (!isRowsPlaceholder) {
                rowCb(row)
              } else {
                await extractRowsFromPlaceholder(row, rowCb, {
                  tmpDir,
                  instance,
                  extractImplementation,
                  extractOptions: restOptions
                })
              }
            }

            if (tableIdx === tablesLastIndex && instance != null) {
              await instance.destroy()
            }

            resolve()
          } catch (e) {
            if (instance != null) {
              await instance.destroy()
            }

            reject(e)
          }
        })
      },
      rowsCount: table.rows.length
    }))
  }
}

async function extractRowsFromPlaceholder (placeholder, onRow, { tmpDir, instance, extractImplementation, extractOptions }) {
  for (const file of placeholder.files) {
    const filePath = path.join(tmpDir, file)
    const rowsStr = (await fs.readFile(filePath)).toString()

    const extractInfo = await extractImplementation({
      instance,
      close: false,
      ...extractOptions,
      scriptFn: addRowsToBrowserFn,
      args: [placeholder.id, rowsStr]
    })

    for (const row of extractInfo.result) {
      onRow(row)
    }
  }
}
