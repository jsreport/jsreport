var packagejson = require('../package.json')
var commander = require('./reportingCommander')

module.exports = function (reporter) {
  reporter.options.logger = reporter.options.logger = {providerName: 'winston'}
  reporter.version = packagejson.version
  commander(reporter.options)
}
