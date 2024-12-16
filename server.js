const jsreport = require('jsreport')({
  rootDirectory: __dirname
})

if (process.env.JSREPORT_CLI) {
  // export jsreport instance to make it possible to use jsreport-cli
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

/*
setInterval(() => {
  global.gc()
  const used = process.memoryUsage()
  for (let key in used) {
    console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`)
  }
}, 10000)
*/
