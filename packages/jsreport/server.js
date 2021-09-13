const packageJson = require('./package.json')
let jsreport = require('./')({
  rootDirectory: __dirname,
  discover: false
})

const jsreportExtensions = Object.keys(packageJson.dependencies).filter((extName) => {
  return extName !== '@jsreport/jsreport-core' && extName.startsWith('@jsreport')
})

for (const extName of jsreportExtensions) {
  jsreport = jsreport.use(require(extName)())
}

if (process.env.FULL_BUILD != null) {
  const fullExtensions = [
    '@jsreport/jsreport-ejs',
    '@jsreport/jsreport-pug',
    '@jsreport/jsreport-azure-storage',
    // '@jsreport/jsreport-phantom-pdf',
    // '@jsreport/jsreport-phantom-image',
    '@jsreport/jsreport-mssql-store',
    '@jsreport/jsreport-postgres-store',
    '@jsreport/jsreport-mongodb-store',
    // '@jsreport/jsreport-wkhtmltopdf',
    '@jsreport/jsreport-html-to-text',
    '@jsreport/jsreport-html-embedded-in-docx',
    '@jsreport/jsreport-fs-store-aws-s3-persistence',
    '@jsreport/jsreport-fs-store-azure-storage-persistence',
    '@jsreport/jsreport-electron-pdf',
    '@jsreport/jsreport-unoconv'
  ]

  for (const extName of fullExtensions) {
    jsreport = jsreport.use(require(extName)())
  }
}

if (process.env.JSREPORT_CLI) {
  module.exports = jsreport
} else {
  jsreport.init().then(() => {
    // running
  }).catch((e) => {
    // error during startup
    console.error(e.stack)
    process.exit(1)
  })
}
