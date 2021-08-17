const extend = require('node.extend.without.arrays')
const convert = require('html-to-text')

module.exports = (reporter, definition) => async (request, response) => {
  const globalOptions = extend(true, {}, definition.options || {})
  const localOptions = extend(true, {}, request.template.htmlToText || {})
  const options = extend(true, {}, globalOptions, localOptions)

  if (!Array.isArray(options.tables)) {
    options.tables = (options.tables || '').split(',')
  }
  if (options.tablesSelectAll === true) {
    options.tables = true
  }

  options.longWordSplit = options.longWordSplit || {}
  options.longWordSplit.wrapCharacters = options.longWordSplit.wrapCharacters || (options.longWordSplitWrapCharacters || '').split(',')
  options.longWordSplit.forceWrapOnLimit = options.longWordSplit.forceWrapOnLimit || options.forceWrapOnLimit

  let textContent

  try {
    textContent = convert.htmlToText(response.content.toString(), options)
  } catch (e) {
    const error = new Error(e.message)
    error.stack = e.stack

    throw reporter.createError('Error while processing html-to-text', {
      original: error,
      weak: true
    })
  }

  response.content = Buffer.from(textContent)

  response.meta.contentType = request.template.contentType || 'text/plain'
  response.meta.fileExtension = request.template.fileExtension || '.txt'

  const contentDisposition = request.template.contentDisposition || 'inline'

  response.meta.contentDisposition = contentDisposition + (
    contentDisposition.indexOf(';') !== -1 ? '' : ';filename=' + response.meta.reportName + '.' + response.meta.fileExtension
  )
}
