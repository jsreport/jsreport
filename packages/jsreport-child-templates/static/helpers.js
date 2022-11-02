/* eslint no-unused-vars: 0 */
/* eslint no-new-func: 0 */
/* *global __rootDirectory */

function childTemplateSerializeData (data) {
  return Buffer.from(JSON.stringify(data)).toString('base64')
}

function childTemplateParseData (dataStr) {
  return JSON.parse(Buffer.from(dataStr, 'base64').toString())
}

async function childTemplate (templateNameOrObject, opts) {
  const isHandlebars = typeof arguments[arguments.length - 1].lookupProperty === 'function'
  const isJsRender = this.tmpl && this.tmpl && typeof this.tmpl.fn === 'function'

  let currentContext
  if (isHandlebars) {
    currentContext = this
  }

  if (isJsRender) {
    currentContext = this.data
  }

  const jsreport = require('jsreport-proxy')

  const res = await jsreport.render({
    template: typeof templateNameOrObject === 'string'
      ? {
          name: templateNameOrObject
        }
      : templateNameOrObject,
    data: currentContext
  })

  if (res.meta.contentType && !res.meta.contentType.includes('text')) {
    throw new Error('Child template result needs to be a text. Consider changing recipe to a text based recipe like html.')
  }

  return res.content.toString()
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.childTemplateSerializeData = childTemplateSerializeData
  module.exports.childTemplateParseData = childTemplateParseData
}
