
module.exports = {
  name: 'freeze',
  main: 'lib/freeze.js',
  requires: {
    core: '2.x.x',
    studio: '2.x.x'
  },
  optionsSchema: {
    extensions: {
      freeze: {
        type: 'object',
        properties: {
          hardFreeze: { type: 'boolean' }
        }
      }
    }
  }
}
