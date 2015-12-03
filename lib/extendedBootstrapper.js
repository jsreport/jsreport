var bootstrapper = require('jsreport-core').Bootstrapper || require('jsreport-core').bootstrapper
var commander = require('./reportingCommander')
var fs = require('fs')
var extend = require('node.extend')
var packagejson = require('../package.json')
var path = require('path')

module.exports = function (options) {
  options = options || {}
  options.rootDirectory = options.rootDirectory || path.join(__dirname, '../../../')
  var b = bootstrapper(options)
  commander(b.config)
  var original = b.start

  b.start = function () {
    return original.call(b).then(function (out) {
      if (b.config.render) {
        return b.reporter.render(extend(true, b.config.render, b.config.template || {})).then(function (resp) {
          var wstream = fs.createWriteStream(b.config.output)
          resp.stream.pipe(wstream)
          wstream.on('close', function () {
            process.nextTick(function () {
              process.exit()
            })
          })
        }).catch(function (e) {
          console.log(e)
          process.exit()
        })
      }

      out.reporter.version = packagejson.version

      return out
    })
  }

  return b
}
