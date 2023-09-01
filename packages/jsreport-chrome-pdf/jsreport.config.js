
const chromeSchema = {
  type: 'object',
  properties: {
    allowLocalFilesAccess: { type: 'boolean' },
    strategy: { type: 'string' },
    numberOfWorkers: { type: 'number' },
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
    migrateChromeNetworkIdleProp: {
      type: 'boolean',
      default: true
    },
    chrome: { ...chromeSchema },
    extensions: {
      'chrome-pdf': { ...chromeSchema }
    }
  },
  dependencies: ['puppeteer-compile'],
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
  }
}
