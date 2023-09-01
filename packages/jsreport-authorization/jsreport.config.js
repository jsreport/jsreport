module.exports = {
  name: 'authorization',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  dependencies: ['authentication'],
  requires: {
    core: '4.x.x',
    studio: '4.x.x',
    authentication: '4.x.x'
  },
  skipInExeRender: true
}
