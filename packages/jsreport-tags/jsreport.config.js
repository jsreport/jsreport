
module.exports = {
  name: 'tags',
  main: './lib/tags.js',
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
  },
  optionsSchema: {
    extensions: {
      studio: {
        type: 'object',
        properties: {
          entityTreeGroupMode: {
            type: 'string',
            enum: ['tags']
          }
        }
      }
    }
  }
}
