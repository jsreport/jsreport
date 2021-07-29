module.exports = {
  name: 'test',
  main: 'main.js',
  optionsSchema: {
    extensions: {
      test: {
        type: 'object',
        properties: {
          publicProp: {
            type: 'string'
          },
          publicDeepProp: {
            type: 'object',
            properties: {
              foo: {
                type: 'string'
              },
              bar: {
                type: 'string'
              }
            }
          },
          publicArray: {
            type: 'array'
          },
          privateProp: {
            type: 'string'
          }
        }
      }
    }
  }
}
