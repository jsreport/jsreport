const office = require('@jsreport/jsreport-office')

module.exports = {
  name: 'docx',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: office.extendSchema('docx', {
    type: 'object',
    properties: {
      imageFetchParallelLimit: {
        type: 'number',
        default: 5,
        description: 'specifies the number of images that can be processed at the same time'
      },
      beta: {
        type: 'object',
        default: {},
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
