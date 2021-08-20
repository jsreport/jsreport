
module.exports = {
  name: 'sample-template',
  main: 'lib/sample.js',
  optionsSchema: {
    extensions: {
      'sample-template': {
        type: 'object',
        properties: {
          createSamples: { type: 'boolean' },
          skipCreateSamplesModal: { type: 'boolean', default: false },
          forceCreation: { type: 'boolean' }
        }
      }
    }
  },
  dependencies: ['data', 'chrome-pdf'],
  requires: {
    core: '3.x.x',
    studio: '3.x.x'
  },
  hasPublicPart: false,
  skipInExeRender: true
}
