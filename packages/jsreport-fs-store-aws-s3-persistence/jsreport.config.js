
module.exports = {
  name: 'fs-store-aws-s3-persistence',
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
              provider: { type: 'string', enum: ['aws-s3'] }
            }
          }
        }
      },
      'fs-store-aws-s3-persistence': {
        type: 'object',
        properties: {
          accessKeyId: { type: 'string' },
          secretAccessKey: { type: 'string' },
          bucket: { type: 'string' },
          s3Options: { type: 'object' },
          lock: {
            type: 'object',
            properties: {
              queueName: { type: 'string' },
              region: { type: 'string' },
              enabled: { type: 'boolean' },
              attributes: {
                type: 'object'
              }
            }
          }
        }
      }
    }
  }
}
