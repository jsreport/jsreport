
module.exports = {
  name: 'scripts',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: {
    extensions: {
      scripts: {
        type: 'object',
        properties: {
          allowedModules: {
            anyOf: [{
              type: 'string',
              '$jsreport-constantOrArray': ['*']
            }, {
              type: 'array',
              items: { type: 'string' }
            }]
          }
        }
      }
    }
  },
  dependencies: ['data'],
  requires: {
    core: '2.x.x',
    studio: '2.x.x'
  },
  embeddedSupport: true
}
