
const electronSchema = {
  type: 'object',
  properties: {
    strategy: {
      type: 'string',
      enum: ['dedicated-process', 'electron-ipc', 'electron-server']
    },
    numberOfWorkers: { type: 'number' },
    pingTimeout: { type: 'number' },
    portLeftBoundary: { type: 'number' },
    portRightBoundary: { type: 'number' },
    host: { type: 'string' },
    chromeComandLineSwitches: { type: 'object' },
    allowLocalFilesAccess: { type: 'boolean' },
    maxLogEntrySize: { type: 'number' }
  }
}

module.exports = {
  name: 'electron-pdf',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  dependencies: ['templates'],
  optionsSchema: {
    electron: { ...electronSchema },
    extensions: {
      'electron-pdf': { ...electronSchema }
    }
  },
  embeddedSupport: true,
  requires: {
    core: '3.x.x',
    studio: '3.x.x'
  }
}
