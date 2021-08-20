
module.exports = {
  name: 'freeze',
  main: 'lib/freeze.js',
  requires: {
    core: '3.x.x',
    studio: '3.x.x'
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
