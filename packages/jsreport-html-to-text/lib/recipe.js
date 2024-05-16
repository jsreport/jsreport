const extend = require('node.extend.without.arrays')
const { convert } = require('html-to-text')

module.exports = (reporter, definition) => async (request, response) => {
  const globalOptions = extend(true, {}, definition.options || {})
  const localOptions = extend(true, {}, request.template.htmlToText || {})
  const options = extend(true, {}, globalOptions, localOptions)
  const baseElements = {}
  const selectors = []

  if (options.tablesSelectAll === true) {
    selectors.push({ selector: 'table', format: 'dataTable' })
  } else if (!Array.isArray(options.tables)) {
    const tables = (options.tables || '').split(',').filter((x) => x !== '')

    for (const table of tables) {
      selectors.push({ selector: table, format: 'dataTable' })
    }
  }

  if (options.uppercaseHeadings === false) {
    selectors.push({ selector: 'h1', options: { uppercase: false } })
    selectors.push({ selector: 'table', options: { uppercaseHeaderCells: false } })
  }

  if (options.singleNewLineParagraphs === true) {
    selectors.push({ selector: 'p', options: { leadingLineBreaks: 1, trailingLineBreaks: 1 } })
    selectors.push({ selector: 'pre', options: { leadingLineBreaks: 1, trailingLineBreaks: 1 } })
  }

  if (options.baseElement != null || options.baseElement !== '') {
    baseElements.selectors = (options.baseElement || '').split(',').filter((x) => x !== '')

    if (baseElements.selectors.length === 0) {
      delete baseElements.selectors
    }
  }

  baseElements.returnDomByDefault = options.returnDomByDefault == null ? true : options.returnDomByDefault === true

  if (
    (options.linkHrefBaseUrl != null && options.linkHrefBaseUrl !== '') ||
    options.hideLinkHrefIfSameAsText === true ||
    options.ignoreHref === true ||
    options.ignoreImage === true
  ) {
    const linkOptions = {}
    const imgOptions = {}

    if (options.linkHrefBaseUrl != null && options.linkHrefBaseUrl !== '') {
      linkOptions.baseUrl = options.linkHrefBaseUrl
      imgOptions.baseUrl = options.linkHrefBaseUrl
    }

    if (options.hideLinkHrefIfSameAsText) {
      linkOptions.hideLinkHrefIfSameAsText = true
    }

    if (options.ignoreHref) {
      linkOptions.ignoreHref = true
    }

    if (Object.keys(linkOptions).length > 0) {
      selectors.push({ selector: 'a', options: linkOptions })
    }

    if (options.ignoreImage) {
      selectors.push({ selector: 'img', format: 'skip' })
    } else if (Object.keys(imgOptions).length > 0) {
      selectors.push({ selector: 'img', options: imgOptions })
    }
  }

  let longWordSplit = {}

  longWordSplit = { ...options.longWordSplit }
  longWordSplit.wrapCharacters = options.longWordSplit?.wrapCharacters || (options.longWordSplitWrapCharacters || '').split(',')
  longWordSplit.wrapCharacters = longWordSplit.wrapCharacters.filter((x) => x !== '')
  longWordSplit.forceWrapOnLimit = options.longWordSplit?.forceWrapOnLimit || options.longWordSplitForceWrapOnLimit
  longWordSplit.forceWrapOnLimit = longWordSplit.forceWrapOnLimit === true

  let textContent

  try {
    const content = (await response.output.getBuffer()).toString()

    const convertOptions = {
      baseElements,
      selectors,
      preserveNewlines: options.preserveNewlines === true,
      decodeEntities: options.decodeEntities == null ? true : options.decodeEntities === true
    }

    if (options.wordWrap != null && options.wordWrap !== '') {
      convertOptions.wordwrap = options.wordWrap === 0 ? false : options.wordWrap
    }

    if (Object.keys(longWordSplit).length > 0) {
      convertOptions.longWordSplit = longWordSplit
    }

    textContent = convert(content, convertOptions)
  } catch (e) {
    const error = new Error(e.message)
    error.stack = e.stack

    throw reporter.createError('Error while processing html-to-text', {
      original: error,
      weak: true
    })
  }

  await response.output.update(Buffer.from(textContent))

  response.meta.contentType = request.template.contentType || 'text/plain'
  response.meta.fileExtension = request.template.fileExtension || 'txt'

  const contentDisposition = request.template.contentDisposition || 'inline'

  response.meta.contentDisposition = contentDisposition + (
    contentDisposition.indexOf(';') !== -1 ? '' : ';filename=' + response.meta.reportName + '.' + response.meta.fileExtension
  )
}
