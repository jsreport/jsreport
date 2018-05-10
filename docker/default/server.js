const jsreport = require('jsreport')()

if (process.env.JSREPORT_CLI) {
  module.exports = jsreport
} else {
  jsreport.init().then(() => {
  }).catch((e) => {
    console.trace(e)
    process.exit(1)
  })
}
