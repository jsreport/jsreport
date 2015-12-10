var main = require('./main')

var Bootstrapper = function (options) {
  this.reporter = main(options)
}

Bootstrapper.prototype.start = function () {
  var self = this
  return this.reporter.init().then(function () {
    self.config = self.reporter.options
    return self
  })
}

module.exports = function (options) {
  console.log("Using bootstrapper is deprecated. Use require('jsreport').init() instead")
  return new Bootstrapper(options)
}

