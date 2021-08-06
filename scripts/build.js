const execSync = require('child_process').execSync

const jsreportPackages = [
  'jsreport-assets',
  'jsreport-authentication',
  'jsreport-authorization',
  'jsreport-browser-client-dist',
  'jsreport-browser-client',
  'jsreport-chrome-pdf',
  'jsreport-data',
  'jsreport-docx',
  'jsreport-freeze',
  'jsreport-fs-store',
  'jsreport-html-to-xlsx',
  'jsreport-import-export',
  'jsreport-licensing',
  'jsreport-localization',
  'jsreport-pdf-utils',
  'jsreport-pptx',
  'jsreport-public-templates',
  'jsreport-reports',
  'jsreport-sample-template',
  'jsreport-scheduling',
  'jsreport-scripts',
  'jsreport-static-pdf',
  'jsreport-studio',
  'jsreport-tags',
  'jsreport-text',
  'jsreport-unoconv',
  'jsreport-version-control',
  'jsreport-xlsx'
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
