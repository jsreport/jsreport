const jsreportInstance = require('jsreport-core')({
  discover: false
}).use(require('jsreport-express')())

if (require.main !== module) {
  module.exports = jsreportInstance
} else {
  jsreportInstance.init().then(function () {
    console.log('jsreport started')
  })
}
