/* eslint no-unused-vars: 0 */
/* eslint no-new-func: 0 */
/* *global __rootDirectory */
function docxPageBreak () {
  const Handlebars = require('handlebars')
  return new Handlebars.SafeString('')
}

function docxRaw (options) {
  const Handlebars = require('handlebars')

  if (typeof options.hash.xml === 'string') {
    if (options.hash.xml.startsWith('<')) {
      return new Handlebars.SafeString(options.hash.xml)
    }
  }

  // Wrap not valid XML data as a literal, without any style
  return new Handlebars.SafeString('<w:r><w:t>' + options.hash.xml + '</w:t></w:r>')
}

function docxList (data, options) {
  const Handlebars = require('handlebars')
  return Handlebars.helpers.each(data, options)
}

function docxTable (data, options) {
  const Handlebars = require('handlebars')
  const optionsToUse = options == null ? data : options
  let currentData

  if (
    arguments.length === 1 &&
    (
      Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'rows') ||
      Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'columns') ||
      Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'ignore')
    )
  ) {
    // full table mode
    if (Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'rows')) {
      if (!Object.prototype.hasOwnProperty.call(optionsToUse.hash, 'columns')) {
        throw new Error('docxTable full table mode needs to have both rows and columns defined as params when processing row')
      }

      currentData = optionsToUse.hash.rows

      const newData = Handlebars.createFrame(optionsToUse.data)
      newData.rows = optionsToUse.hash.rows
      newData.columns = optionsToUse.hash.columns
      optionsToUse.data = newData

      const chunks = []

      if (!currentData || !Array.isArray(currentData)) {
        return new Handlebars.SafeString('')
      }

      for (let i = 0; i < currentData.length; i++) {
        newData.index = i
        chunks.push(optionsToUse.fn(this, { data: newData }))
      }

      return new Handlebars.SafeString(chunks.join(''))
    } else {
      let isInsideRowHelper = false

      if (optionsToUse.hash.columns) {
        currentData = optionsToUse.hash.columns
      } else if (optionsToUse.data && optionsToUse.data.columns) {
        isInsideRowHelper = true
        currentData = optionsToUse.data.columns
      } else {
        throw new Error('docxTable full table mode needs to have columns defined when processing column')
      }

      const chunks = []

      const newData = Handlebars.createFrame(optionsToUse.data)
      const rowIndex = newData.index || 0

      delete newData.index
      delete newData.key
      delete newData.first
      delete newData.last

      if (!currentData || !Array.isArray(currentData)) {
        return new Handlebars.SafeString('')
      }

      for (const [idx, item] of currentData.entries()) {
        // rowIndex + 1 because this is technically the second row on table after the row of table headers
        newData.rowIndex = isInsideRowHelper ? rowIndex + 1 : 0
        newData.columnIndex = idx
        chunks.push(optionsToUse.fn(isInsideRowHelper ? optionsToUse.data.rows[rowIndex][idx] : item, { data: newData }))
      }

      return new Handlebars.SafeString(chunks.join(''))
    }
  } else {
    currentData = data
  }

  return Handlebars.helpers.each(currentData, optionsToUse)
}

function docxStyle (options) {
  const Handlebars = require('handlebars')

  return new Handlebars.SafeString(
    `<docxStyle id="${options.hash.id}" textColor="${options.hash.textColor}" />`
  )
}

function docxImage (options) {
  const Handlebars = require('handlebars')

  if (!options.hash.src) {
    throw new Error(
      'docxImage helper requires src parameter to be set'
    )
  }

  if (
    !options.hash.src.startsWith('data:image/png;base64,') &&
      !options.hash.src.startsWith('data:image/jpeg;base64,') &&
      !options.hash.src.startsWith('http://') &&
      !options.hash.src.startsWith('https://')
  ) {
    throw new Error(
      'docxImage helper requires src parameter to be valid data uri for png or jpeg image or a valid url. Got ' +
        options.hash.src
    )
  }

  const isValidDimensionUnit = value => {
    const regexp = /^(\d+(.\d+)?)(cm|px)$/
    return regexp.test(value)
  }

  if (
    options.hash.width != null &&
      !isValidDimensionUnit(options.hash.width)
  ) {
    throw new Error(
      'docxImage helper requires width parameter to be valid number with unit (cm or px). got ' +
        options.hash.width
    )
  }

  if (
    options.hash.height != null &&
      !isValidDimensionUnit(options.hash.height)
  ) {
    throw new Error(
      'docxImage helper requires height parameter to be valid number with unit (cm or px). got ' +
        options.hash.height
    )
  }

  return new Handlebars.SafeString('$docxImage' + Buffer.from(JSON.stringify({
    src: options.hash.src,
    width: options.hash.width,
    height: options.hash.height,
    usePlaceholderSize:
        options.hash.usePlaceholderSize === true ||
        options.hash.usePlaceholderSize === 'true'
  })).toString('base64') + '$')
}

function docxCheckbox (options) {
  const Handlebars = require('handlebars')

  if (options.hash.value == null) {
    throw new Error('docxCheckbox helper requires value parameter')
  }

  options.hash.value = options.hash.value === 'true' || options.hash.value === true

  return new Handlebars.SafeString('$docxCheckbox' + Buffer.from(JSON.stringify(options.hash)).toString('base64') + '$')
}

function docxCombobox (options) {
  const Handlebars = require('handlebars')
  return new Handlebars.SafeString('$docxCombobox' + Buffer.from(JSON.stringify(options.hash)).toString('base64') + '$')
}

function docxChart (options) {
  const Handlebars = require('handlebars')

  if (options.hash.data == null) {
    throw new Error('docxChart helper requires data parameter to be set')
  }

  if (!Array.isArray(options.hash.data.labels) || options.hash.data.labels.length === 0) {
    throw new Error('docxChart helper requires data parameter with labels to be set, data.labels must be an array with items')
  }

  if (!Array.isArray(options.hash.data.datasets) || options.hash.data.datasets.length === 0) {
    throw new Error('docxChart helper requires data parameter with datasets to be set, data.datasets must be an array with items')
  }

  if (
    options.hash.options != null &&
      (
        typeof options.hash.options !== 'object' ||
        Array.isArray(options.hash.options)
      )
  ) {
    throw new Error('docxChart helper when options parameter is set, it should be an object')
  }

  return new Handlebars.SafeString('$docxChart' + Buffer.from(JSON.stringify(options.hash)).toString('base64') + '$')
}
