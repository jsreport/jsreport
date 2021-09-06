module.exports = {
  name: 'wkhtmltopdf',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  dependencies: ['templates'],
  optionsSchema: {
    extensions: {
      wkhtmltopdf: {
        type: 'object',
        properties: {
          execOptions: {
            type: 'object',
            properties: {
              env: { type: 'object' },
              maxBuffer: { type: 'number' }
            }
          },
          allowLocalFilesAccess: { type: 'boolean' }
        }
      }
    }
  },
  requires: {
    core: '3.x.x',
    studio: '3.x.x',
    assets: '3.x.x'
  }
}
