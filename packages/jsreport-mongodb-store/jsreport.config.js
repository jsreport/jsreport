module.exports = {
  name: 'mongodb-store',
  main: './lib/main.js',
  dependencies: [],
  requires: {
    core: '3.x.x'
  },
  optionsSchema: {
    store: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['mongodb'] }
      }
    },
    blobStorage: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['mongodb'] }
      }
    },
    extensions: {
      'mongodb-store': {
        type: 'object',
        properties: {
          uri: { type: 'string' },
          authDb: { type: 'string' },
          databaseName: { type: 'string' },
          username: { type: 'string' },
          password: { type: 'string' },
          address: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } }
            ]
          },
          port: {
            oneOf: [
              { type: 'number' },
              { type: 'array', items: { type: 'number' } }
            ]
          },
          prefix: { type: 'string', default: '' },
          replicaSet: { type: 'string' },
          ssl: { type: 'boolean' },
          connectOptions: { type: 'object', description: 'Any option that can be passed to the internal mongodb connection' }
        }
      }
    }
  },
  skipInExeRender: true,
  hasPublicPart: false
}
