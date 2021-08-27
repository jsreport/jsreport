const fs = require('fs')

if (fs.existsSync('c:\\jsreport') && fs.readdirSync('c:\\jsreport').length > 0) {
  if (!fs.existsSync('c:\\jsreport\\data')) {
    fs.mkdirSync('c:\\jsreport\\data')
  }
  fs.symlinkSync('c:\\jsreport\\data', 'c:\\app\\data')

  if (!fs.existsSync('c:\\jsreport\\jsreport.config.json')) {
    fs.copyFileSync('c:\\app\\jsreport.config.json', 'c:\\jsreport\\jsreport.config.json')
  }

  fs.symlinkSync('c:\\jsreport\\license-key.txt', 'c:\\app\\license-key.txt')
  fs.symlinkSync('c:\\jsreport\\jsreport.license.json', 'c:\\app\\jsreport.license.json')

  fs.unlinkSync('c:\\app\\jsreport.config.json')
  fs.symlinkSync('c:\\jsreport\\jsreport.config.json', 'c:\\app\\jsreport.config.json')
}

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
