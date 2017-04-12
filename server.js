var jsreport = require('./')({rootDirectory: __dirname})

if (process.env.JSREPORT_CLI) {
  module.exports = jsreport
} else {
  jsreport.init().then(function () {
  }).catch(function (e) {
    console.trace(e)
    process.exit(1)
  })
}
