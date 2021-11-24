
module.exports = {
  name: 'scripts',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  dependencies: ['data'],
  requires: {
    core: '3.x.x',
    studio: '3.x.x'
  }
}
