var jsreport = require('jsreport')()

if (process.env.JSREPORT_CLI) {
  module.exports = jsreport
} else {
  jsreport.init().then(function () {
    // running
  }).catch(function (e) {
    // error during startup
    console.error(e.stack)
    process.exit(1)
  })
}
