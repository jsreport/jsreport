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
  return new Handlebars.SafeString(`<pptxImage src="${options.hash.src}" />`)
}
