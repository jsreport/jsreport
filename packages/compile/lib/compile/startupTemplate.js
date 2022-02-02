// Dynamically constructed main entry for the jsreport executable
'use strict'

// eslint-disable-next-line
const runtime = $runtime

module.exports = runtime({
  // eslint-disable-next-line
  originalProjectDir: $originalProjectDir,
  shortid: '$shortid',
  version: '$version',
  // eslint-disable-next-line
  resources: $resources,
  // eslint-disable-next-line
  requireExtensions: $requireExtensions,
  // eslint-disable-next-line
  requireCliExtensionsCommands: $requireCliExtensionsCommands,
  getJsreport: () => {
    let wasDefined = false

    if (process.env.JSREPORT_CLI != null) {
      wasDefined = true
    }

    // eslint-disable-next-line
    const instance = $entryPoint

    if (!instance) {
      throw new Error('jsreport entry point must return valid jsreport instance')
    }

    if (!wasDefined) {
      delete process.env.JSREPORT_CLI
    }

    return instance
  },
  // eslint-disable-next-line
  handleArguments: $handleArguments
})
