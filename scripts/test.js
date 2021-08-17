const execSync = require('child_process').execSync

const jsreportPackages = [
  '@jsreport/jsreport-assets',
  '@jsreport/jsreport-authentication',
  '@jsreport/jsreport-authorization',
  '@jsreport/jsreport-base',
  '@jsreport/jsreport-child-templates',
  '@jsreport/jsreport-chrome-pdf',
  '@jsreport/jsreport-components',
  '@jsreport/jsreport-core',
  '@jsreport/jsreport-data',
  '@jsreport/jsreport-docx',
  '@jsreport/jsreport-docker-workers',
  '@jsreport/jsreport-express',
  '@jsreport/jsreport-freeze',
  '@jsreport/jsreport-fs-store',
  '@jsreport/jsreport-handlebars',
  '@jsreport/jsreport-html-to-xlsx',
  '@jsreport/jsreport-import-export',
  '@jsreport/jsreport-jsrender',
  '@jsreport/jsreport-licensing',
  '@jsreport/jsreport-mongodb-store',
  '@jsreport/jsreport-mssql-store',
  '@jsreport/jsreport-oracle-store',
  '@jsreport/jsreport-postgres-store',
  '@jsreport/jsreport-pdf-utils',
  '@jsreport/jsreport-pptx',
  '@jsreport/jsreport-reports',
  '@jsreport/jsreport-scripts',
  '@jsreport/jsreport-studio',
  '@jsreport/jsreport-scheduling',
  '@jsreport/jsreport-text',
  '@jsreport/jsreport-unoconv',
  '@jsreport/jsreport-version-control',
  '@jsreport/jsreport-xlsx',
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
