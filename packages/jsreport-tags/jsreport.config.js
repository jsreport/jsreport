
module.exports = {
  name: 'tags',
  main: './lib/tags.js',
  requires: {
    core: '2.x.x',
    studio: '2.x.x'
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
