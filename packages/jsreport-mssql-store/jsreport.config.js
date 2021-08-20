
module.exports = {
  name: 'mssql-store',
  main: './lib/main.js',
  requires: {
    core: '3.x.x'
  },
  optionsSchema: {
    store: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['mssql'] }
      }
    },
    blobStorage: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['mssql'] }
      }
    },
    extensions: {
      'mssql-store': {
        type: 'object',
        properties: {
          schemaCreation: { type: 'boolean', default: true },
          schema: { type: 'string', default: 'dbo' },
          uri: { type: 'string' },
          user: { type: 'string' },
          password: { type: 'string' },
          server: { type: 'string' },
          database: { type: 'string' },
          options: { type: 'object' },
          prefix: { type: 'string', default: 'jsreport_' }
        }
      }
    }
  }
}
