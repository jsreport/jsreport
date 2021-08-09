const office = require('@jsreport/office')

module.exports = {
  name: 'docxtemplater',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: office.extendSchema('docxtemplater', {}),
  dependencies: ['assets'],
  requires: {
    core: '2.x.x',
    studio: '2.x.x',
    assets: '3.x.x'
  }
}
