
module.exports = (reporter, definition) => {
  reporter.express = {}
  reporter.addRequestContextMetaConfig('http', { sandboxReadOnly: true })
  reporter.addRequestContextMetaConfig('http.query', { sandboxReadOnly: true })

  if (!definition.options.exposeHttpHeaders) {
    reporter.addRequestContextMetaConfig('http.headers', { sandboxHidden: true })
  } else {
    reporter.addRequestContextMetaConfig('http.headers', { sandboxReadOnly: true })
  }

  reporter.initializeListeners.add(definition.name, async () => {
    reporter.beforeRenderListeners.insert(0, 'express', (req, res) => {
      res.meta.headers = res.meta.headers || {}
    })

    reporter.afterRenderListeners.add('express', (req, res) => {
      res.meta.headers['Content-Type'] = res.meta.contentType

      if (!res.meta.headers['Content-Disposition']) {
        res.meta.reportName = isInvalidASCII(res.meta.reportName) ? 'report' : res.meta.reportName

        res.meta.headers['Content-Disposition'] = `inline;filename=${res.meta.reportName}.${res.meta.fileExtension}`

        if (req.options['Content-Disposition']) {
          res.meta.headers['Content-Disposition'] = req.options['Content-Disposition']
        }

        if (req.options.download) {
          res.meta.headers['Content-Disposition'] = res.meta.headers['Content-Disposition'].replace('inline;', 'attachment;')
        }
      }
    })
  })
}

function isInvalidASCII (str) {
  return [...str].some(char => char.charCodeAt(0) > 127)
}
