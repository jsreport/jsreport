var path = require('path')

module.exports = function (reporter, definition) {
  reporter.extensionsManager.engines.push({
    name: 'test',
    pathToEngine: require('path').join(__dirname, 'engine.js')
  })

  if (reporter.compilation) {
    reporter.compilation.resource('resource', path.join(__dirname, 'resource.txt'))
    reporter.compilation.script('external', path.join(__dirname, 'external.js'))
  }

  if (reporter.execution) {
    reporter.test = {
      resource: reporter.execution.resource('resource'),
      include: require(path.join(__dirname, 'external.js'))
    }
  }
}
