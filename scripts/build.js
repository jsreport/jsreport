const execSync = require('child_process').execSync

const jsreportPackages = [
  '@jsreport/jsreport-assets',
  '@jsreport/jsreport-authentication',
  '@jsreport/jsreport-authorization',
  '@jsreport/browser-client',
  '@jsreport/jsreport-browser-client',
  '@jsreport/jsreport-chrome-pdf',
  '@jsreport/jsreport-components',
  '@jsreport/jsreport-data',
  '@jsreport/jsreport-docx',
  '@jsreport/jsreport-docxtemplater',
  '@jsreport/jsreport-ejs',
  '@jsreport/jsreport-electron-pdf',
  '@jsreport/jsreport-freeze',
  '@jsreport/jsreport-fs-store',
  '@jsreport/jsreport-html-embedded-in-docx',
  '@jsreport/jsreport-html-to-text',
  '@jsreport/jsreport-html-to-xlsx',
  '@jsreport/jsreport-import-export',
  '@jsreport/jsreport-licensing',
  '@jsreport/jsreport-localization',
  '@jsreport/jsreport-office-password',
  '@jsreport/jsreport-phantom-pdf',
  '@jsreport/jsreport-phantom-image',
  '@jsreport/jsreport-pdf-utils',
  '@jsreport/jsreport-pptx',
  '@jsreport/jsreport-public-templates',
  '@jsreport/jsreport-pug',
  '@jsreport/jsreport-reports',
  '@jsreport/jsreport-sample-template',
  '@jsreport/jsreport-scheduling',
  '@jsreport/jsreport-scripts',
  '@jsreport/jsreport-static-pdf',
  '@jsreport/jsreport-studio',
  '@jsreport/jsreport-tags',
  '@jsreport/jsreport-text',
  '@jsreport/jsreport-unoconv',
  '@jsreport/jsreport-version-control',
  '@jsreport/jsreport-wkhtmltopdf',
  '@jsreport/jsreport-xlsx'
]

const failedPackages = []
for (const pd of jsreportPackages) {
  try {
    console.log(`--running package ${pd}--`)
    execSync(`yarn workspace ${pd} build`, {
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
