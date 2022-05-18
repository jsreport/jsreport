const path = require('path')
const fs = require('fs')

function getExtensionsPriority () {
  const extensionsPriorityMap = new Map()
  const order = getPriorityOrder()

  for (let i = 0; i < order.length; i++) {
    const pkg = order[i]
    extensionsPriorityMap.set(pkg, i + 1)
  }

  const packages = [...getPackagesInWorkspace().keys()]
  const packagesInWorkspaceWithNoPriority = []

  for (const pkg of packages) {
    if (!extensionsPriorityMap.has(pkg)) {
      packagesInWorkspaceWithNoPriority.push(pkg)
    }
  }

  if (packagesInWorkspaceWithNoPriority.length > 0) {
    console.log('\n=======')
    console.log('WARNING: the following packages are not defined in the priority order:\n')
    console.log(packagesInWorkspaceWithNoPriority.join('\n'))
    console.log('=======')
  }

  return extensionsPriorityMap
}

function getPackagesInWorkspace () {
  const results = new Map()
  const pkgs = fs.readdirSync(path.join(process.cwd(), 'packages')).filter((n) => n !== '.DS_Store')

  for (const pkgFolderName of pkgs) {
    const targetFile = path.join(process.cwd(), 'packages', pkgFolderName, 'package.json')

    try {
      const pkg = JSON.parse(fs.readFileSync(targetFile, 'utf8'))
      results.set(pkg.name, pkgFolderName)
    } catch (err) {
      console.error(`invalid package.json found at ${targetFile}`)
      throw err
    }
  }

  return results
}

function getExtensionsInOrder (extensions) {
  const newExtensions = [...extensions]
  const extensionsPriorityMap = getExtensionsPriority()

  // first appearance means that it has less dependant extensions
  newExtensions.sort((a, b) => {
    const aPriority = extensionsPriorityMap.get(a)

    if (aPriority == null) {
      throw new Error(`${a} does not have a priority defined`)
    }

    const bPriority = extensionsPriorityMap.get(b)

    if (bPriority == null) {
      throw new Error(`${b} does not have a priority defined`)
    }

    return aPriority - bPriority
  })

  return newExtensions
}

function getPriorityOrder () {
  return [
    '@bjrmatos/pkg',
    '@jsreport/reap',
    'serializator',
    'chrome-page-eval',
    'phantom-page-eval',
    'cheerio-page-eval',
    '@jsreport/odata-to-sql',
    'html-to-xlsx',
    '@jsreport/mingo',
    '@jsreport/advanced-workers',
    '@jsreport/jsreport-core',
    '@jsreport/office',
    '@jsreport/studio-dev',
    '@jsreport/jsreport-studio',
    '@jsreport/jsreport-jsrender',
    '@jsreport/jsreport-handlebars',
    '@jsreport/jsreport-licensing',
    '@jsreport/jsreport-base',
    '@jsreport/jsreport-child-templates',
    '@jsreport/jsreport-data',
    '@jsreport/browser-client',
    '@jsreport/jsreport-browser-client',
    '@jsreport/jsreport-express',
    '@jsreport/jsreport-assets',
    '@jsreport/jsreport-scripts',
    '@jsreport/jsreport-components',
    '@jsreport/jsreport-npm',
    '@jsreport/jsreport-freeze',
    '@jsreport/jsreport-tags',
    '@jsreport/jsreport-localization',
    '@jsreport/jsreport-reports',
    '@jsreport/jsreport-text',
    '@jsreport/jsreport-authentication',
    '@jsreport/jsreport-fs-store',
    '@jsreport/jsreport-authorization',
    '@jsreport/nodejs-client',
    '@jsreport/jsreport-scheduling',
    '@jsreport/jsreport-html-to-xlsx',
    '@jsreport/jsreport-xlsx',
    '@jsreport/jsreport-chrome-pdf',
    '@jsreport/jsreport-public-templates',
    '@jsreport/jsreport-cli',
    '@jsreport/pdfjs',
    '@jsreport/jsreport-pdf-utils',
    '@jsreport/jsreport-version-control',
    '@jsreport/jsreport-sample-template',
    '@jsreport/jsreport-static-pdf',
    '@jsreport/jsreport-docx',
    '@jsreport/jsreport-pptx',
    '@jsreport/jsreport-studio-theme-dark',
    // start external extensions
    '@jsreport/jsreport-office-password',
    '@jsreport/jsreport-mongodb-store',
    '@jsreport/sql-store',
    '@jsreport/jsreport-postgres-store',
    '@jsreport/jsreport-electron-pdf',
    '@jsreport/jsreport-pug',
    '@jsreport/jsreport-mssql-store',
    '@jsreport/jsreport-oracle-store',
    '@jsreport/jsreport-fs-store-aws-s3-persistence',
    '@jsreport/jsreport-fs-store-azure-storage-persistence',
    '@jsreport/jsreport-azure-storage',
    '@jsreport/jsreport-aws-s3-storage',
    '@jsreport/jsreport-version-control-git',
    '@jsreport/jsreport-html-to-text',
    '@jsreport/jsreport-html-embedded-in-docx',
    '@jsreport/jsreport-ejs',
    '@jsreport/jsreport-wkhtmltopdf',
    '@jsreport/jsreport-phantom-image',
    '@jsreport/jsreport-phantom-pdf',
    '@jsreport/jsreport-unoconv',
    '@jsreport/jsreport-docxtemplater',
    // end external extensions
    '@jsreport/jsreport-import-export',
    '@jsreport/jsreport-puppeteer-compile',
    '@jsreport/compile',
    'jsreport',
    '@jsreport/worker',
    '@jsreport/jsreport-docker-workers'
  ]
}

module.exports.getExtensionsPriority = getExtensionsPriority
module.exports.getExtensionsInOrder = getExtensionsInOrder
module.exports.getPackagesInWorkspace = getPackagesInWorkspace
