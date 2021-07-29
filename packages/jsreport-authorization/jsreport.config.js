module.exports = {
  name: 'authorization',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  dependencies: ['authentication'],
  requires: {
    core: '2.x.x',
    studio: '2.x.x',
    authentication: '2.x.x'
  },
  skipInExeRender: true
}
