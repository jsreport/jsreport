module.exports = {
  name: 'fs-store-azure-storage-persistence',
  main: 'lib/main.js',
  dependencies: ['fs-store'],
  requires: {
    core: '3.x.x'
  },
  optionsSchema: {
    extensions: {
      'fs-store': {
        type: 'object',
        properties: {
          persistence: {
            type: 'object',
            properties: {
              provider: { type: 'string', enum: ['azure-storage'] }
            }
          }
        }
      },
      'fs-store-azure-storage-persistence': {
        type: 'object',
        properties: {
          accountName: { type: 'string' },
          accountKey: { type: 'string' },
          container: { type: 'string' },
          lock: {
            type: 'object',
            properties: {
              retry: {
                type: ['string', 'number'],
                '$jsreport-acceptsDuration': true
              },
              leaseDuration: {
                type: ['string', 'number'],
                '$jsreport-acceptsDuration': true
              },
              enabled: { type: 'boolean' }
            }
          }
        }
      }
    }
  }
}
