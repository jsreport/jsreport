
const schema = {
  type: 'object',
  properties: {
    licenseKey: { type: 'string' },
    useSavedLicenseInfo: { type: 'boolean', default: true },
    licenseInfoPath: { type: 'string' },
    development: { type: 'boolean', default: false }
  }
}

module.exports = {
  name: 'licensing',
  main: 'lib/licensing.js',
  optionsSchema: {
    'license-key': { type: 'string' },
    licenseKey: { type: 'string' },
    license: schema,
    extensions: {
      licensing: schema
    }
  },
  dependencies: [],
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
  },
  skipInExeRender: true
}
