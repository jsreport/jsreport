#!/usr/bin/env node
let defaultOutput = 'jsreport'

if (process.platform === 'win32') {
  defaultOutput = 'jsreport.exe'
}

const argv = require('yargs')
  .usage(`Usage: $0 -i [server.js] -o [${defaultOutput}]`)
  .options('d', {
    alias: 'debug',
    type: 'boolean',
    default: false,
    desc: 'Enables debugging mode which includes more logs and does not delete intermediate startup script'
  })
  .options('i', {
    demandOption: true,
    alias: 'input',
    desc: 'Script bootstraping jsreport.',
    default: 'server.js'
  }).options('o', {
    alias: 'output',
    desc: 'The output binary',
    default: defaultOutput
  })
  .options('n', {
    alias: 'nodeVersion',
    desc: 'The node version to compile against with',
    default: '16'
  })
  .help()
  .example('$0')
  .example('$0 -i startup.js -o ' + defaultOutput)
  .argv

require('../')(argv).then(() => exit()).catch((err) => {
  console.error('Error while trying to compile:')
  console.error(err)
  exit(1)
})

function exit (exitCode) {
  process.exit(exitCode)
}
