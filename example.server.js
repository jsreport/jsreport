var jsreport = require('jsreport')()

if (require.main !== module) {
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
