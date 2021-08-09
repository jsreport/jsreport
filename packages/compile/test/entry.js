const jsreportInstance = require('@jsreport/jsreport-core')({
  discover: false
}).use(require('@jsreport/jsreport-express')())

if (require.main !== module) {
  module.exports = jsreportInstance
} else {
  jsreportInstance.init().then(function () {
    console.log('jsreport started')
  })
}
