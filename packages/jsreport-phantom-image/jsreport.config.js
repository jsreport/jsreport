
const schema = {
  type: 'object',
  properties: {
    strategy: { type: 'string' },
    allowLocalFilesAccess: { type: 'boolean' }
  }
}

module.exports = {
  name: 'phantom-image',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  dependencies: ['templates'],
  optionsSchema: {
    phantom: { ...schema },
    extensions: {
      'phantom-image': { ...schema }
    }
  },
  requires: {
    core: '3.x.x',
    studio: '3.x.x',
    assets: '3.x.x'
  }
}
