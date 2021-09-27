
module.exports = {
  name: 'npm',
  main: './lib/main.js',
  worker: './lib/worker.js',
  requires: {
    core: '3.x.x',
    studio: '3.x.x'
  },
  optionsSchema: {
    extensions: {
      npm: {
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
  }
}
