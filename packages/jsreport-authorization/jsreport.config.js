module.exports = {
  name: 'authorization',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: {
    extensions: {
      authorization: {
        type: 'object',
        properties: {
          allowInsertInRootFolderWithoutEditPermissions: {
            type: 'boolean',
            default: true,
            description: 'If enabled, allows inserting entities in the root folder without requiring the user to have edit permissions, when disabled the insert will be rejected if user does not have valid permissions.'
          }
        }
      }
    }
  },
  dependencies: ['authentication'],
  requires: {
    core: '4.x.x',
    studio: '4.x.x',
    authentication: '4.x.x'
  },
  skipInExeRender: true
}
