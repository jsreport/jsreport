
module.exports = {
  name: 'azure-storage',
  main: './lib/main.js',
  dependencies: [],
  requires: {
    core: '3.x.x'
  },
  optionsSchema: {
    blobStorage: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['azure-storage'] }
      }
    },
    extensions: {
      'azure-storage': {
        type: 'object',
        properties: {
          accountName: { type: 'string' },
          accountKey: { type: 'string' },
          container: { type: 'string' },
          connectionString: { type: 'string' }
        }
      }
    }
  }
}
