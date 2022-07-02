
const schema = {
  type: 'object',
  properties: {
    strategy: { type: 'string', enum: ['dedicated-process', 'phantom-server'] },
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
    core: '3.x.x',
    studio: '3.x.x',
    assets: '3.x.x'
  }
}
