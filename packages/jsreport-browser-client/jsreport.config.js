
module.exports = {
  name: 'browser-client',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: {
    extensions: {
      'browser-client': {
        type: 'object',
        properties: {
          scriptLinkRootPath: { type: 'string' }
        }
      }
    }
  },
  dependencies: ['templates'],
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
  }
}
