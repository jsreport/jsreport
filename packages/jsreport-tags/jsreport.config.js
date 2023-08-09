
module.exports = {
  name: 'tags',
  main: './lib/tags.js',
  requires: {
    core: '3.x.x',
    studio: '3.x.x'
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
