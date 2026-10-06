
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
        },
        internalInitialArgs: {
          description: 'Internal use by jsreport default docker image to set image default args with user option to override it as usual',
          anyOf: [{
            type: 'string',
            '$jsreport-constantOrArray': []
          }, {
            type: 'array',
            items: { type: 'string' }
          }]
        }
      }
    },
    connectOptions: {
      type: 'object',
      properties: {
        browserWSEndpoint: { type: 'string' },
        browserURL: { type: 'string' }
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
