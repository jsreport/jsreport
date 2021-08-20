
module.exports = {
  name: 'tags',
  main: './lib/tags.js',
  requires: {
    core: '3.x.x',
    studio: '3.x.x'
  },
  optionsSchema: {
    extensions: {
      tags: {
        type: 'object',
        properties: {
          organizeByDefault: {
            type: 'boolean'
          }
        }
      }
    }
  }
}
