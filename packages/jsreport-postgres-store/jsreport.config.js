
module.exports = {
  name: 'postgres-store',
  main: './lib/main.js',
  requires: {
    core: '3.x.x'
  },
  optionsSchema: {
    store: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['postgres'] }
      }
    },
    blobStorage: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['postgres'] }
      }
    },
    extensions: {
      'postgres-store': {
        type: 'object',
        properties: {
          schemaCreation: { type: 'boolean', default: true },
          host: { type: 'string' },
          port: { type: 'number' },
          database: { type: 'string' },
          user: { type: 'string' },
          password: { type: 'string' },
          prefix: { type: 'string', default: 'jsreport_' }
        }
      }
    }
  }
}
