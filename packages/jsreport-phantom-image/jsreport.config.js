
const schema = {
  type: 'object',
  properties: {
    strategy: { type: 'string' },
    proxyHttpsCallsToResources: { type: 'boolean' },
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
    core: '4.x.x',
    studio: '4.x.x',
    assets: '4.x.x'
  }
}
