
const chromeSchema = {
  type: 'object',
  properties: {
    allowLocalFilesAccess: { type: 'boolean' },
    strategy: { type: 'string', defaultNotInitialized: 'dedicated-process' },
    numberOfWorkers: { type: 'number', defaultNotInitialized: '<The number of CPU cores in the machine>' },
    puppeteerInstance: {
      description: 'Specifies a custom instance of puppeteer to use. you can pass here the export of require("puppeteer")'
    },
    launchOptions: {
      type: 'object',
      properties: {
        args: {
          anyOf: [{
            type: 'string',
            '$jsreport-constantOrArray': []
          }, {
            type: 'array',
            items: { type: 'string' }
          }]
        }
      }
    }
  }
}

module.exports = {
  name: 'chrome-pdf',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: {
    chrome: { ...chromeSchema },
    extensions: {
      'chrome-pdf': { ...chromeSchema }
    }
  },
  dependencies: ['puppeteer-compile'],
  requires: {
    core: '2.x.x',
    studio: '2.x.x'
  }
}
