const office = require('@jsreport/office')

module.exports = {
  name: 'pptx',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: office.extendSchema('pptx', {
    type: 'object',
    properties: {
      beta: {
        type: 'object',
        properties: {
          showWarning: { type: 'boolean', default: true }
        }
      }
    }
  }),
  dependencies: ['assets'],
  requires: {
    core: '2.x.x',
    studio: '2.x.x',
    assets: '1.x.x'
  }
}
