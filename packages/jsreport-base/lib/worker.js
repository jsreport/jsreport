const baseMatch = /(<html.*>[\s\S]*<head>)/m

module.exports = (reporter, definition) => {
  reporter.beforeRenderListeners.add('base', (req, res) => {
    const base = req.options.base || definition.options.url

    if (base) {
      if (req.template.content.indexOf('<base') !== -1) {
        reporter.logger.debug('Base url not injected because the html already includes it', req)
        return
      }

      const replacedBase = base.replace('${cwd}', 'file:///' + process.cwd().replace('\\', '/')) // eslint-disable-line
      req.template.content = req.template.content.replace(baseMatch, '$1<base href=\'' + replacedBase + '\' />')

      if (req.template.content.indexOf(replacedBase) !== -1) {
        reporter.logger.debug('Base url injected: ' + replacedBase, req)
      } else {
        reporter.logger.debug('Base url not injected because the html format was not recognized.', req)
      }
    } else {
      reporter.logger.debug('Base url not specified, skipping its injection.', req)
    }
  })
}
