const main = require('./lib/main.js')
let config = require('./jsreport.config.js')

module.exports = function (options) {
  config = Object.assign({}, config)
  config.options = Object.assign({}, options)
  config.main = main
  config.directory = __dirname
  return config
}

module.exports.MongoProvider = require('./lib/provider')
module.exports.GridFSBlobStorage = require('./lib/gridFSBlobStorage')
