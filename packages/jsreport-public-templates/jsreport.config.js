
module.exports = {
  name: 'public-templates',
  main: 'lib/main.js',
  dependencies: ['authentication', 'authorization'],
  requires: {
    core: '3.x.x'
  },
  embeddedSupport: true,
  skipInExeRender: true
}
