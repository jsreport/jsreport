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

async function shutdown () {
  try {
    await jsreport.close()
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
