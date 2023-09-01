
module.exports = {
  name: 'freeze',
  main: 'lib/freeze.js',
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
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
