module.exports = {
  name: 'aws-s3-storage',
  main: 'lib/main.js',
  dependencies: [],
  requires: {
    core: '3.x.x'
  },
  optionsSchema: {
    blobStorage: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['aws-s3-storage'] }
      }
    },
    extensions: {
      'aws-s3-storage': {
        type: 'object',
        properties: {
          accessKeyId: { type: 'string' },
          secretAccessKey: { type: 'string' },
          bucket: { type: 'string' },
          s3Options: { type: 'object' }
        }
      }
    }
  }
}
