const jsreport = require('jsreport')()

if (process.env.JSREPORT_CLI) {
  module.exports = jsreport
} else {
  jsreport.init().then(() => {
    // running
  }).catch((e) => {
    // error during startup
    console.error(e)
    process.exit(1)
  })
}
