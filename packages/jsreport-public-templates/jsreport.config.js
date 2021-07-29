
module.exports = {
  name: 'public-templates',
  main: 'lib/main.js',
  dependencies: ['authentication', 'authorization'],
  requires: {
    core: '2.x.x'
  },
  embeddedSupport: true,
  skipInExeRender: true
}
