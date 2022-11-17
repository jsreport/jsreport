/* eslint no-unused-vars: 0 */
/* eslint no-new-func: 0 */
/* *global __rootDirectory */
function pptxList (data, options) {
  const Handlebars = require('handlebars')
  return Handlebars.helpers.each(data, options)
}

function pptxTable (data, options) {
  const Handlebars = require('handlebars')
  return Handlebars.helpers.each(data, options)
}

function pptxSlides (data, options) {
  const Handlebars = require('handlebars')
  return Handlebars.helpers.each(data, options)
}

function pptxImage (options) {
  const Handlebars = require('handlebars')

  if (!options.hash.src) {
    throw new Error(
      'pptxImage helper requires src parameter to be set'
    )
  }

  if (
    !options.hash.src.startsWith('data:image/png;base64,') &&
    !options.hash.src.startsWith('data:image/jpeg;base64,') &&
    !options.hash.src.startsWith('http://') &&
    !options.hash.src.startsWith('https://')
  ) {
    throw new Error(
      'pptxImage helper requires src parameter to be valid data uri for png or jpeg image or a valid url. Got ' +
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
      'pptxImage helper requires width parameter to be valid number with unit (cm or px). got ' +
        options.hash.width
    )
  }

  if (
    options.hash.height != null &&
      !isValidDimensionUnit(options.hash.height)
  ) {
    throw new Error(
      'pptxImage helper requires height parameter to be valid number with unit (cm or px). got ' +
        options.hash.height
    )
  }

  const content = `$pptxImage${
    Buffer.from(JSON.stringify({
      src: options.hash.src,
      width: options.hash.width,
      height: options.hash.height,
      usePlaceholderSize:
          options.hash.usePlaceholderSize === true ||
          options.hash.usePlaceholderSize === 'true'
    })).toString('base64')
  }$`

  return new Handlebars.SafeString(`<pptxImage>${content}</pptxImage>`)
}
