// Dynamicaly constructed main entry for the jsreport executable
'use strict'

const runtime = $runtime

module.exports = runtime({
  originalProjectDir: $originalProjectDir,
  shortid: '$shortid',
  version: '$version',
  resources: $resources,
  requireExtensions: $requireExtensions,
  requireCliExtensionsCommands: $requireCliExtensionsCommands,
  getJsreport: () => {
    let wasDefined = false

    if (process.env.JSREPORT_CLI != null) {
      wasDefined = true
    }

    const instance = $entryPoint

    if (!instance) {
      throw new Error('jsreport entry point must return valid jsreport instance')
    }

    if (!wasDefined) {
      delete process.env.JSREPORT_CLI
    }

    return instance
  },
  handleArguments: $handleArguments
})
