
module.exports = {
  name: 'scripts',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  dependencies: ['data'],
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
  }
}
