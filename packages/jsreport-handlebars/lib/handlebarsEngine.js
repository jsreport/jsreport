/*!
 * Copyright(c) 2016 Jan Blaha
 */
const pattern = /%}%/g

module.exports = (opts = {}) => {
  const handlebars = require(opts.handlebarsModulePath)

  return {
    compile: (html, { require, context }) => {
      const handlebarsInstance = handlebars.create()
      const results = matchRecursiveRegExp(html, '{', '}', 'g')
      let changed = 0

      results.forEach((info) => {
        if (!info.match.startsWith('#')) {
          return
        }

        const currentOffset = info.offset + (changed * 2)

        html = `${html.slice(0, currentOffset)}${info.match}%}%${html.slice(currentOffset + info.match.length + 1)}`

        changed++
      })

      try {
        // this compiles a template representation that does not depend on the current
        // handlebars, we care about this because template can be cached and we need to
        // ensure that the template does not get bound to some previous handlebars
        // instance of different render

        const templateSpecStr = handlebarsInstance.precompile(html)
        const templateSpec = new Function(`return ${templateSpecStr}`)() // eslint-disable-line
        return templateSpec
      } catch (e) {
        if (e.message && e.message.includes('Parse error on line')) {
          e.lineNumber = parseInt(e.message.match(/Parse error on line ([0-9]+):/)[1])
        }

        throw e
      }
    },
    createContext: () => {
      const handlebarsInstance = handlebars.create()
      return {
        handlebars: handlebarsInstance,
        Handlebars: handlebarsInstance
      }
    },
    onRequire: (moduleName, { context }) => {
      if (moduleName === 'handlebars') {
        return context.handlebars
      }
    },
    execute: (templateSpec, helpers, data, { require }) => {
      const handlebarsInstance = require('handlebars')
      const template = handlebarsInstance.template(templateSpec)

      for (const h in helpers) {
        if (Object.prototype.hasOwnProperty.call(helpers, h)) {
          handlebarsInstance.registerHelper(h, helpers[h])
        }
      }

      return template(data)
    },
    unescape: (str) => str.replace(pattern, '}')
  }
}

// taken from: http://blog.stevenlevithan.com/archives/javascript-match-recursive-regexp
function matchRecursiveRegExp (str, left, right, flags) {
  const f = flags || ''
  const g = f.indexOf('g') > -1
  const x = new RegExp(left + '|' + right, 'g' + f.replace(/g/g, ''))
  const l = new RegExp(left, f.replace(/g/g, ''))
  const a = []
  let t
  let s
  let m

  do {
    t = 0

    // eslint-disable-next-line no-cond-assign
    while (m = x.exec(str)) {
      if (l.test(m[0])) {
        if (!t++) s = x.lastIndex
      } else if (t) {
        if (!--t) {
          const match = str.slice(s, m.index)
          a.push({
            offset: s,
            match
          })

          if (!g) return a
        }
      }
    }
  } while (t && (x.lastIndex = s))

  return a
}
