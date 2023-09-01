const office = require('@jsreport/office')

const schema = {
  type: 'object',
  properties: {
    previewInExcelOnline: { type: 'boolean' },
    publicUriForPreview: { type: 'string' },
    escapeAmp: { type: 'boolean' },
    addBufferSize: { type: 'number' },
    numberOfParsedAddIterations: { type: 'number' },
    showExcelOnlineWarning: { type: 'boolean', default: true }
  }
}

module.exports = {
  name: 'xlsx',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: office.extendSchema('xlsx', {
    xlsx: { ...schema },
    extensions: {
      xlsx: { ...schema }
    }
  }),
  dependencies: ['data'],
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
  }
}
