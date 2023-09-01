
const { extendSchema } = require('@jsreport/office')

module.exports = {
  name: 'html-to-xlsx',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: extendSchema('html-to-xlsx', {
    extensions: {
      'html-to-xlsx': {
        type: 'object',
        properties: {
          previewInExcelOnline: { type: 'boolean' },
          publicUriForPreview: { type: 'string' },
          chrome: {
            type: 'object',
            properties: {
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
        }
      }
    }
  }),
  dependencies: ['xlsx'],
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
  },
  hasPublicPart: false
}
