module.exports = {
  name: 'authorization',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  dependencies: ['authentication'],
  requires: {
    core: '3.x.x',
    studio: '3.x.x',
    authentication: '3.x.x'
  },
  skipInExeRender: true
}
