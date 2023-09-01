const office = require('@jsreport/office')

module.exports = {
  name: 'pptx',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: office.extendSchema('pptx', {
    type: 'object',
    properties: {
    }
  }),
  dependencies: ['assets'],
  requires: {
    core: '4.x.x',
    studio: '4.x.x',
    assets: '4.x.x'
  }
}
