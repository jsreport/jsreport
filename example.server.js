var jsreport = require('jsreport')()

jsreport.init().then(function () {
  // running
}).catch(function (e) {
  // error during startup
  console.error(e.stack)
  process.exit(1)
})
