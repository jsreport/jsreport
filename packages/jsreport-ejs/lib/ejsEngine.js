const extend = require('node.extend.without.arrays')

module.exports = (opts = {}) => {
  return {
    compile: (html, { require }) => {
      const ejs = require('ejs')
      return ejs.compile(html)
    },
    execute: (templateSpec, helpers, data) => {
      const ejsMix = extend(true, helpers, data)
      delete ejsMix.filename
      return templateSpec(ejsMix)
    }
  }
}
