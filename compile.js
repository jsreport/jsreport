const path = require('path')
const fs = require('fs')
const childProcess = require('child_process')
const rimraf = require('rimraf')
const archiver = require('archiver')

async function run () {
  console.log('starting exe compilation')

  console.log('running fresh npm install to ensure deps are correctly installed..')

  childProcess.execSync('npm install', { stdio: 'inherit' })

  const duplicates = [
    'node_modules/listener-collection/node_modules/bluebird',
    'node_modules/nconf/node_modules/yargs',
    'node_modules/jsreport-scheduling/node_modules/moment',
    'node_modules/extract-zip/node_modules/yauzl',
    'node_modules/uglify-js/node_modules/source-map',
    'node_modules/jsreport-fs-store/node_modules/mingo',
    'node_modules/jsreport-cli/node_modules/semver',
    'node_modules/cross-spawn/node_modules/semver',
    'node_modules/fsevents/node_modules/semver',
    'node_modules/extract-zip/node_modules/concat-stream',
    'node_modules/cfb/node_modules/commander',
    'node_modules/uglify-js/node_modules/commander',
    'node_modules/commander',
    'node_modules/external-editor/node_modules/iconv-lite',
    'node_modules/fsevents/node_modules/iconv-lite',
    'node_modules/html-to-xlsx/node_modules/uuid',
    'node_modules/fsevents/node_modules/rimraf',
    'node_modules/fsevents/node_modules/mkdirp',
    'node_modules/hogan.js/node_modules/mkdirp',
    'node_modules/xml2js-preserve-spaces/node_modules/xmlbuilder',
    'node_modules/msexcel-builder-extended/node_modules/xmlbuilder',
    'node_modules/send/node_modules/statuses',
    'node_modules/finalhandler/node_modules/statuses',
    'node_modules/express/node_modules/statuses',
    'node_modules/fsevents/node_modules/object-assign',
    'node_modules/minimist',
    'node_modules/fsevents/node_modules/minimist',
    'node_modules/fsevents/node_modules/rc/node_modules/minimist',
    'node_modules/unicode-trie/node_modules/pako',
    'node_modules/htmlparser2/node_modules/readable-stream',
    'node_modules/dicer/node_modules/readable-stream',
    'node_modules/busboy/node_modules/readable-stream',
    'node_modules/fsevents/node_modules/readable-stream',
    'node_modules/serve-favicon/node_modules/safe-buffer',
    'node_modules/simple-odata-server/node_modules/safe-buffer',
    'node_modules/fsevents/node_modules/safe-buffer',
    'node_modules/msexcel-builder-extended/node_modules/archiver',
    'node_modules/fsevents/node_modules/sax',
    'node_modules/dicer/node_modules/string_decoder',
    'node_modules/busboy/node_modules/string_decoder',
    'node_modules/fsevents/node_modules/string_decoder',
    'node_modules/jsreport-core/node_modules/json-schema-traverse',
    'node_modules/msexcel-builder-extended/node_modules/zip-stream',
    'node_modules/fsevents/node_modules/set-blocking',
    'node_modules/fsevents/node_modules/ini',
    'node_modules/fsevents/node_modules/strip-json-comments',
    'node_modules/fsevents/node_modules/glob',
    'node_modules/fsevents/node_modules/yallist',
    'node_modules/fsevents/node_modules/balanced-match',
    'node_modules/fsevents/node_modules/brace-expansion',
    'node_modules/fsevents/node_modules/path-is-absolute',
    'node_modules/fsevents/node_modules/core-util-is',
    'node_modules/fsevents/node_modules/os-homedir',
    'node_modules/fsevents/node_modules/os-tmpdir',
    'node_modules/fsevents/node_modules/signal-exit',
    'node_modules/fsevents/node_modules/fs.realpath',
    'node_modules/fsevents/node_modules/inflight',
    'node_modules/fsevents/node_modules/inherits',
    'node_modules/fsevents/node_modules/process-nextick-args',
    'node_modules/fsevents/node_modules/abbrev',
    'node_modules/snapdragon/node_modules/extend-shallow',
    'node_modules/braces/node_modules/extend-shallow',
    'node_modules/fill-range/node_modules/extend-shallow',
    'node_modules/expand-brackets/node_modules/extend-shallow',
    'node_modules/extglob/node_modules/extend-shallow',
    'node_modules/set-value/node_modules/extend-shallow',
    'node_modules/compress-commons/node_modules/normalize-path',
    'node_modules/anymatch/node_modules/normalize-path',
    'node_modules/socket.io-client/node_modules/component-emitter',
    'node_modules/engine.io-client/node_modules/component-emitter',
    'node_modules/socket.io-parser/node_modules/component-emitter',
    'node_modules/winston/node_modules/colors',
    'node_modules/fsevents/node_modules/isarray',
    'node_modules/busboy/node_modules/isarray',
    'node_modules/dicer/node_modules/isarray',
    'node_modules/isarray',
    'node_modules/reap2/node_modules/bytes',
    'node_modules/is-accessor-descriptor',
    'node_modules/is-data-descriptor',
    'node_modules/is-descriptor',
    'node_modules/is-extendable',
    'node_modules/snapdragon-node/node_modules/define-property',
    'node_modules/snapdragon/node_modules/define-property',
    'node_modules/class-utils/node_modules/define-property',
    'node_modules/static-extend/node_modules/define-property',
    'node_modules/object-copy/node_modules/define-property',
    'node_modules/base/node_modules/define-property',
    'node_modules/expand-brackets/node_modules/define-property',
    'node_modules/extglob/node_modules/define-property'
  ]

  console.log('removing duplicated deps..')

  // removing duplicated deps that we are sure that not break code
  duplicates.forEach((fpath) => {
    rimraf.sync(path.join(__dirname, fpath))
  })

  console.log('running "npm dedupe" after manual remove of deps..')

  childProcess.execSync('npm dedupe', { stdio: 'inherit' })

  console.log(`copying files for executable compilation. node_modules/jsreport-cli/example.config.json -> dev.config.json, executable-license.txt -> license.txt`)

  const configFile = {
    name: 'dev.config.json',
    path: path.join(__dirname, 'dev.config.json')
  }

  const licenseFile = {
    name: 'license.txt',
    path: path.join(__dirname, 'license.txt')
  }

  fs.copyFileSync(path.join(__dirname, 'node_modules/jsreport-cli/example.config.json'), configFile.path)
  fs.copyFileSync(path.join(__dirname, 'executable-license.txt'), licenseFile.path)

  console.log('running compilation "npx jsreport-compile"..')

  childProcess.execSync('npx jsreport-compile', { stdio: 'inherit' })

  const exeFile = {
    name: process.platform === 'win32' ? 'jsreport.exe' : 'jsreport',
    path: path.join(__dirname, process.platform === 'win32' ? 'jsreport.exe' : 'jsreport')
  }

  const compressionTarget = process.platform === 'win32' ? 'zip' : 'tar'

  const outputFile = path.join(__dirname, process.platform === 'win32' ? 'jsreport-win.zip' : `jsreport-${process.platform === 'darwin' ? 'osx' : 'linux'}.tar.gz`)

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

  console.log(`discarting ${licenseFile.path} file..`)

  fs.unlinkSync(licenseFile.path)

  console.log('discarting changes to package-lock.json "git checkout -- package-lock.json"..')

  childProcess.execSync('git checkout -- package-lock.json', { stdio: 'inherit' })

  console.log('compilation finished')

  console.log('running fresh npm install again to ensure deps are left as original before compilation..')

  childProcess.execSync('npm install', { stdio: 'inherit' })

  console.log('done!')
}

run().catch((err) => {
  console.error('Error while running compile script:', err)
  process.exit(1)
})
