const execSync = require('child_process').execSync

const jsreportPackages = [
  'jsreport-assets',
  'jsreport-authentication',
  'jsreport-authorization',
  'jsreport-base',
  'jsreport-child-templates',
  'jsreport-chrome-pdf',
  'jsreport-core',
  'jsreport-data',
  'jsreport-docx',
  'jsreport-docker-workers',
  'jsreport-express',
  'jsreport-freeze',
  'jsreport-fs-store',
  'jsreport-handlebars',
  'jsreport-html-to-xlsx',
  'jsreport-import-export',
  'jsreport-jsrender',
  'jsreport-licensing',
  'jsreport-mongodb-store',
  'jsreport-mssql-store',
  'jsreport-oracle-store',
  'jsreport-postgres-store',
  'jsreport-pdf-utils',
  'jsreport-pptx',
  'jsreport-reports',
  'jsreport-scripts',
  'jsreport-studio',
  'jsreport-scheduling',
  'jsreport-text',
  'jsreport-unoconv',
  'jsreport-version-control',
  'jsreport-xlsx',
  'jsreport'
]

const failedPackages = []
for (const pd of jsreportPackages) {
  try {
    execSync(`yarn workspace ${pd} test`, {
      stdio: 'inherit'
    })
  } catch (e) {
    failedPackages.push(pd)
  }
}

if (failedPackages.length) {
  console.error('failed packages', failedPackages)
  process.exit(1)
}
