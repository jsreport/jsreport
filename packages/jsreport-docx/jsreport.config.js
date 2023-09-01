const office = require('@jsreport/office')

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
      }
    }
  }),
  dependencies: ['assets'],
  requires: {
    core: '4.x.x',
    studio: '4.x.x',
    assets: '4.x.x'
  }
}
