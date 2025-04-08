
module.exports = {
  name: 'libreoffice',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  dependencies: ['templates', 'assets'],
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
  },
  optionsSchema: {
    extensions: {
      libreoffice: {
        type: 'object',
        properties: {
          sofficePath: {
            type: ['string'],
            description: 'Specify path to soffice binary. The default is to search for soffice in default paths.'
          }
        }
      }
    }
  }
}
