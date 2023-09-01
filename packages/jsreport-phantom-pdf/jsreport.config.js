
const schema = {
  type: 'object',
  properties: {
    strategy: { type: 'string', enum: ['dedicated-process', 'phantom-server'] },
    proxyHttpsCallsToResources: { type: 'boolean' },
    numberOfWorkers: { type: 'number' },
    allowLocalFilesAccess: { type: 'boolean' },
    defaultPhantomjsVersion: { type: 'string' },
    host: { type: 'string' },
    portLeftBoundary: { type: 'number' },
    portRightBoundary: { type: 'number' }
  }
}

module.exports = {
  name: 'phantom-pdf',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: {
    phantom: { ...schema },
    extensions: {
      'phantom-pdf': { ...schema }
    }
  },
  requires: {
    core: '4.x.x',
    studio: '4.x.x',
    assets: '4.x.x'
  }
}
