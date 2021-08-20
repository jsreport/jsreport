module.exports = {
  name: 'pdf-utils',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  dependencies: [],
  requires: {
    core: '3.x.x',
    studio: '3.x.x'
  },
  optionsSchema: {
    extensions: {
      'pdf-utils': {
        type: 'object',
        properties: {
          maxSignaturePlaceholderLength: { type: 'number', default: 8192 }
        }
      }
    }
  }
}
