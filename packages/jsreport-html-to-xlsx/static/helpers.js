/* eslint no-unused-vars: 1 */
/* eslint no-new-func: 0 */
/* *global __rootDirectory */
;(function (global) {
  const tmpHandler = global.tmpHandler || require('tmpHandler.js')

  function jsrenderHandlebarsCompatibility (fn) {
    return function () {
      if (arguments.length && arguments[arguments.length - 1].name && arguments[arguments.length - 1].hash) {
        // handlebars
        const options = arguments[arguments.length - 1]

        this.ctx = {
          fromHandlebars: true,
          root: options.data.root,
          data: this
        }

        if (options.fn) {
          this.tagCtx = {
            render: options.fn
          }
        }
      } else {
        if (this.tagCtx) {
          this.ctx.data = this.tagCtx.view.data
        }
      }

      return fn.apply(this, arguments)
    }
  }

  function eachRows (data, options) {
    const maxRows = 1000
    let totalRows = 0
    let rowsCount = 0
    const files = []
    let chunks = []
    let contextData
    let Handlebars

    if (this.ctx.fromHandlebars) {
      Handlebars = require('handlebars')
    }

    if (options && options.data && Handlebars) {
      contextData = Handlebars.createFrame(options.data)
    }

    for (let i = 0; i < data.length; i++) {
      if (contextData) {
        contextData.index = i
      }

      const item = data[i]

      if (Handlebars) {
        chunks.push(this.tagCtx.render(item, { data: contextData }))
      } else {
        chunks.push(this.tagCtx.render(item))
      }

      if (this.ctx.root.$writeToFiles === true) {
        rowsCount++
        totalRows++

        if (rowsCount === maxRows) {
          const tempFile = tmpHandler.write(this.ctx.root.$tempAutoCleanupDirectory, chunks.join(''))
          files.push(tmpHandler.basename(tempFile))
          rowsCount = 0
          chunks = []
        }
      }
    }

    let result

    if (!this.ctx.root.$writeToFiles) {
      result = chunks.join('')

      if (Handlebars) {
        return new Handlebars.SafeString(result)
      }
    }

    if (chunks.length > 0) {
      const tempFile = tmpHandler.write(this.ctx.root.$tempAutoCleanupDirectory, chunks.join(''))
      files.push(tmpHandler.basename(tempFile))
    }

    result = `<tr id=${tmpHandler.generateTmpId()} data-rows-placeholder data-total-rows="${totalRows}" data-files="${files.join(',')}" />`

    if (Handlebars) {
      return new Handlebars.SafeString(result)
    }

    return result
  }

  const htmlToXlsxEachRows = jsrenderHandlebarsCompatibility(eachRows)

  global.__topLevelFunctions = { ...global.__topLevelFunctions, htmlToXlsxEachRows }
})(this)
