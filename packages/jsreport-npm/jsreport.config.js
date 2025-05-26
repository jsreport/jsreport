
module.exports = {
  name: 'npm',
  main: './lib/main.js',
  worker: './lib/worker.js',
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
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
          },
          lock: {
            type: 'object',
            properties: {
              stale: {
                type: ['string', 'number'],
                '$jsreport-acceptsDuration': true,
                default: 5000,
                description: 'After how long the not refreshed lock is considered as expired.'
              },
              wait: {
                type: ['string', 'number'],
                '$jsreport-acceptsDuration': true,
                default: 60000,
                description: 'How long to wait before giving up and overwriting the existing lock. Multiplied by retry.'
              },
              retries: {
                type: 'number',
                default: 50,
                description: 'Number of retries when acquiring lock fails.'
              },
              retryWait: {
                type: ['string', 'number'],
                '$jsreport-acceptsDuration': true,
                default: 200,
                description: 'How long to wait before the retries.'
              }
            },
            default: {}
          }
        }
      }
    }
  }
}
