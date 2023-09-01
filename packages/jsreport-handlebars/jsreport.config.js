module.exports = {
  name: 'handlebars',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  hasPublicPart: false,
  requires: {
    core: '4.x.x'
  },
  optionsSchema: {
    extensions: {
      handlebars: {
        type: 'object',
        properties: {
          handlebarsModulePath: {
            type: 'string',
            description: 'Specifies a path to a custom handlebars. this module will be used for the template engine evaluation and will be an available module in helpers'
          }
        }
      }
    }
  }
}
