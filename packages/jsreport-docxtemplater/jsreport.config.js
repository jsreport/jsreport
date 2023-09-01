const office = require('@jsreport/office')

module.exports = {
  name: 'docxtemplater',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: office.extendSchema('docxtemplater', {}),
  dependencies: ['assets'],
  requires: {
    core: '4.x.x',
    studio: '4.x.x',
    assets: '4.x.x'
  }
}
