const getIgnoreDefaults = require('./lib/ignoreDefaults')

module.exports = {
  name: 'fs-store',
  main: 'lib/main.js',
  optionsSchema: {
    store: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['fs'] }
      }
    },
    blobStorage: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['fs'] }
      }
    },
    extensions: {
      'fs-store': {
        type: 'object',
        properties: {
          dataDirectory: { type: 'string' },
          ignore: {
            anyOf: [
              {
                type: 'string',
                '$jsreport-constantOrArray': []
              },
              {
                type: 'array',
                items: { type: 'string' }
              }
            ],
            default: getIgnoreDefaults()
          },
          compactionEnabled: { type: 'boolean', default: true },
          compactionInterval: {
            type: ['string', 'number'],
            '$jsreport-acceptsDuration': true,
            default: 60000
          },
          corruptAlertThreshold: { type: 'number', default: 0.1 },
          persistenceQueueWaitingTimeout: {
            type: ['string', 'number'],
            '$jsreport-acceptsDuration': true,
            default: 60000
          },
          externalModificationsSync: { type: 'boolean', default: false },
          persistence: {
            type: 'object',
            default: {},
            properties: {
              provider: { type: 'string', enum: ['fs'], default: 'fs' },
              loadConcurrency: { type: 'number', default: 8 },
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
                    description: 'How long to wait before giving up and overwriting the existing lock. Multiplied by retry. This could be increased in cases when a long transaction like import may take longer than 3min.'
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
  },
  dependencies: [],
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
  }
}
