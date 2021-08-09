/* eslint no-unused-vars: 0 */
/* eslint no-new-func: 0 */
/* *global __rootDirectory */
// eslint-disable-next-line prefer-const
let Handlebars = require('handlebars')

function pptxList (data, options) {
  return Handlebars.helpers.each(data, options)
}

function pptxTable (data, options) {
  return Handlebars.helpers.each(data, options)
}

function pptxSlides (data, options) {
  return Handlebars.helpers.each(data, options)
}

function pptxImage (options) {
  return new Handlebars.SafeString(`<pptxImage src="${options.hash.src}" />`)
}
