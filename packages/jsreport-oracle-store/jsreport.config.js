module.exports = {
  name: 'oracle-store',
  main: './lib/main.js',
  requires: {
    core: '3.x.x'
  },
  optionsSchema: {
    store: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['oracle'] }
      }
    },
    blobStorage: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['oracle'] }
      }
    },
    extensions: {
      'oracle-store': {
        type: 'object',
        properties: {
          schemaCreation: { type: 'boolean', default: true },
          user: { type: 'string' },
          password: { type: 'string' },
          connectionString: { type: 'string' },
          poolMin: { type: 'number', default: 0 },
          poolMax: { type: 'number', default: 20 },
          poolIncrement: { type: 'number', default: 1 }
        }
      }
    }
  }
}
