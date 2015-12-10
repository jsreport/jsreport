var fs = require('fs')
var extend = require('node.extend')

module.exports = function (reporter) {
  var original = reporter.init

  reporter.init = function () {
    return original.call(reporter).then(function () {
      if (reporter.options.render) {
        return reporter.render(extend(true, reporter.options.render, reporter.options.template || {})).then(function (resp) {
          var wstream = fs.createWriteStream(reporter.options.output)
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
    })
  }
}
