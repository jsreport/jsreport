
module.exports = function () {
  return {
    compile: (html, { require }) => {
      const pug = require('pug')
      return pug.compile(html)
    },
    execute: (templateSpec, helpers, data) => {
      // helpers will be available as `templateHelpers` inside templates
      const templateHelpers = helpers ? { templateHelpers: helpers } : { templateHelpers: {} }
      const locals = Object.assign({}, data, templateHelpers)
      return templateSpec(locals)
    }
  }
}
