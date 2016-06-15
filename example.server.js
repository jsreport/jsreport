var jsreport = require('jsreport')()

jsreport.init(function () {
  // running
}).catch(function (e) {
  // error during startup
  console.error(e.stack)
  throw e
})
