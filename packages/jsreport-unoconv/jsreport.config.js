
module.exports = {
  name: 'unoconv',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  dependencies: ['templates', 'assets'],
  requires: {
    core: '2.x.x',
    studio: '2.x.x'
  },
  optionsSchema: {
    extensions: {
      unoconv: {
        type: 'object',
        properties: {
          command: { type: 'string', default: 'unoconv' }
        }
      }
    }
  }
}
