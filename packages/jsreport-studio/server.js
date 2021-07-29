const jsreport = require('jsreport')()

jsreport.init().then(function () {
  console.log('running')
}).catch(function (e) {
  console.error(e)
})
