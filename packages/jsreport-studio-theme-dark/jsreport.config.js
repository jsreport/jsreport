
module.exports = {
  name: 'studio-theme-dark',
  main: './lib/main.js',
  dependencies: ['express', 'studio'],
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
  },
  optionsSchema: {
    extensions: {
      studio: {
        type: 'object',
        properties: {
          theme: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                enum: ['dark']
              }
            }
          }
        }
      }
    }
  }
}
