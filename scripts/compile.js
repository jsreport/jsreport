const path = require('path')
const fs = require('fs')
const fsAsync = require('fs/promises')
const childProcess = require('child_process')
const archiver = require('archiver')

const packageManager = 'yarn'

run().catch((err) => {
  console.error('Error while running compile script:', err)
  process.exit(1)
})

async function run () {
  process.chdir(path.resolve(__dirname, '../'))
  console.log('starting exe compilation')

  const packageJsonContent = await fsAsync.readFile('./package.json')
  const originalPackageJson = JSON.parse(packageJsonContent)
  const originalYarnLock = await fsAsync.readFile('./yarn.lock')

  originalPackageJson.resolutions = getResolutionsForDuplicatedPackages()

  await fsAsync.writeFile('./package.json', `${JSON.stringify(originalPackageJson, null, 2)}\n`)

  console.log(`running ${packageManager} install with packages resolutions set to ensure deps are correctly de-duplicated..`)

  childProcess.execSync(`${packageManager} install --check-files`, { stdio: 'inherit' })

  console.log(`copying files for executable compilation. ${packageManager === 'npm' ? 'node_modules' : 'packages'}/jsreport-cli/example.config.json -> jsreport.config.json, executable-license.txt -> license.txt`)

  const configFile = {
    name: 'jsreport.config.json',
    path: path.join(__dirname, '../', 'executable.config.json')
  }

  const licenseFile = {
    name: 'license.txt',
    path: path.join(__dirname, '../', 'license.txt')
  }

  const extensionsList = ['puppeteer-compile', ...JSON.parse(fs.readFileSync(path.join(__dirname, '../jsreport.config.json')).toString()).extensionsList]

  fs.copyFileSync(path.join(__dirname, '../', `${packageManager === 'npm' ? 'node_modules' : 'packages'}/jsreport-cli/example.config.json`), configFile.path)
  fs.copyFileSync(path.join(__dirname, '../', 'executable-license.txt'), licenseFile.path)

  console.log('running compilation "npx jsreport-compile"..')

  childProcess.execSync('npx jsreport-compile', {
    stdio: 'inherit',
    env: {
      ...process.env,
      configFile: configFile.path,
      extensionsList
    }
  })

  const exeFile = {
    name: process.platform === 'win32' ? 'jsreport.exe' : 'jsreport',
    path: path.join(__dirname, '../', process.platform === 'win32' ? 'jsreport.exe' : 'jsreport')
  }

  const compressionTarget = process.platform === 'win32' ? 'zip' : 'tar'

  const outputFile = path.join(__dirname, '../', process.platform === 'win32' ? 'jsreport-win.zip' : `jsreport-${process.platform === 'darwin' ? 'osx' : 'linux'}.tar.gz`)

  console.log(`creating ${compressionTarget} file "${outputFile}"..`)

  const outputStream = fs.createWriteStream(outputFile)

  let archive

  if (compressionTarget === 'zip') {
    archive = archiver('zip')
  } else {
    archive = archiver('tar', {
      gzip: true,
      gzipOptions: {
        level: 1
      }
    })
  }

  await new Promise((resolve, reject) => {
    outputStream.on('close', () => {
      resolve()
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(outputStream)

    archive
      .append(fs.createReadStream(exeFile.path), { name: exeFile.name, mode: 0o777 })
      .append(fs.createReadStream(licenseFile.path), { name: licenseFile.name })
      .finalize()
  })

  console.log(`discarding ${licenseFile.path} file..`)

  fs.unlinkSync(licenseFile.path)

  console.log('compilation finished')

  await fsAsync.writeFile('./package.json', packageJsonContent)
  await fsAsync.writeFile('./yarn.lock', originalYarnLock)

  console.log(`running ${packageManager} install again to ensure deps are left as original before compilation..`)

  childProcess.execSync(`${packageManager} install --check-files`, { stdio: 'inherit' })

  console.log('done!')
}

// The use of resolutions is to manually specify to yarn what versions
// of packages we want, this allows us to stop duplicating some packages.
function getResolutionsForDuplicatedPackages () {
  return {}

  // NOTE: If we want to enable the resolutions,
  // we need to inspect/analyze the vfs output of compilation
  // and investigate which packages can be de-duplicated safely.
  // this list bellow is OLD now.
  // return {
  //   'md5.js': '1.3.5',
  //   'component-emitter': '1.3.0',
  //   'fd-slicer': '1.1.0',
  //   querystring: '0.2.1',
  //   semver: '7.3.5',
  //   bluebird: '3.7.2',
  //   extsprintf: '1.4.0',
  //   yauzl: '2.10.0',
  //   colors: '1.4.0',
  //   'sprintf-js': '1.1.2',
  //   'socket.io-parser': '3.4.1',
  //   util: '0.11.1',
  //   'mime-db': '1.48.0',
  //   'mime-types': '2.1.31',
  //   'invert-kv': '2.0.0',
  //   'crc32-stream': '3.0.1',
  //   estraverse: '5.2.0',
  //   'bn.js': '5.2.0',
  //   'get-stream': '5.2.0',
  //   /* fsevents: '2.3.2', */
  //   chokidar: '3.5.1',
  //   cookie: '0.4.1',
  //   qs: '6.10.1',
  //   'http-errors': '1.8.0',
  //   'form-data': '3.0.1',
  //   /* WE CAN NOT FORCE archiver to this version because we have other packages that need other version for node 16 support */
  //   /* archiver: '3.1.1', */
  //   lodash: '4.17.21',
  //   inherits: '2.0.4',
  //   bytes: '3.1.0',
  //   isarray: '2.0.5',
  //   'supports-color': '8.1.1',
  //   'source-map': '0.6.1',
  //   'define-property': '2.0.2',
  //   domelementtype: '2.2.0',
  //   pify: '4.0.1',
  //   'extend-shallow': '3.0.2',
  //   'is-extendable': '1.0.1',
  //   'safe-buffer': '5.2.1',
  //   'kind-of': '6.0.3',
  //   rimraf: '3.0.2',
  //   string_decoder: '1.3.0',
  //   'source-map-support': '0.5.19',
  //   'strip-ansi': '6.0.0',
  //   minimist: '1.2.5',
  //   mkdirp: '0.5.5',
  //   debug: '4.3.2',
  //   ms: '2.1.3',
  //   'ansi-styles': '4.3.0',
  //   'pkg-dir': '4.2.0',
  //   xmlbuilder: '11.0.1',
  //   'find-up': '5.0.0',
  //   domutils: '2.7.0',
  //   'has-values': '1.0.0',
  //   '@babel/helper-validator-identifier': '7.14.5',
  //   'is-number': '7.0.0',
  //   'has-value': '1.0.0',
  //   'to-regex-range': '5.0.1',
  //   'for-in': '1.0.2',
  //   'mimic-fn': '2.1.0',
  //   'make-dir': '2.1.0',
  //   'to-fast-properties': '2.0.0',
  //   globals: '13.9.0',
  //   'base64-js': '1.5.1',
  //   'emojis-list': '3.0.0',
  //   'fill-range': '7.0.1',
  //   tmp: '0.1.0',
  //   lcid: '2.0.0',
  //   decamelize: '4.0.0',
  //   'regenerator-runtime': '0.13.7',
  //   'find-cache-dir': '2.1.0',
  //   json5: '2.2.0',
  //   'ansi-regex': '5.0.0',
  //   buffer: '5.7.1',
  //   pump: '3.0.0',
  //   braces: '3.0.2',
  //   'mute-stream': '0.0.8',
  //   'memory-fs': '0.5.0'
  // }
}
