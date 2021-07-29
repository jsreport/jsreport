/*!
 * Copyright(c) 2014 Jan Blaha
 */

const regex = /<script[^>]*id=["'](.*?)["'].*type=["']text\/x-jsrender['"][^>]*?>([\s\S]*?)<\/script>/gi

module.exports = function () {
  return {
    compile: (html, { require }) => {
      const jsrender = require('jsrender')
      // load <script id="columnTemplate" type="text/x-jsrender"> ... </script> jsrender child templates
      const subtemplates = {}
      html = html.replace(regex, function (subtemplate, name, markup) {
        subtemplates[name] = markup // Add subtemplate markup to subtemplates hash
        return '' // Remove nested subtemplate declarations from html
      })

      const tmpl = jsrender.templates(html || ' ') // Compile main template
      jsrender.templates(subtemplates, tmpl) // Compile named subtemplates, scoped to main template
      return tmpl
    },
    execute: (templateSpec, helpers, data, { require }) => {
      const jsrender = require('jsrender')
      try {
        jsrender.views.tags(helpers)
        return templateSpec.render(data || {}, helpers) // Render to string
      } finally {
        // this way I am unregistering tags to hide them from other requests
        for (const key in helpers) {
          const tags = {}
          tags[key] = function () {

          }
          jsrender.views.tags(tags)
        }
      }
    }
  }
}
