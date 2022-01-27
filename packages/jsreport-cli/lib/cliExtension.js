'use strict'

const path = require('path')
const detectAndRegisterExtensionsCommands = require('./detectAndRegisterExtensionsCommands')

module.exports = (reporter, definition) => {
  if (reporter.compilation) {
    reporter.compilation.resourceInTemp('nssm.exe', path.join(path.dirname(require.resolve('winser-with-api')), './bin/nssm.exe'))
    reporter.compilation.resourceInTemp('nssm64.exe', path.join(path.dirname(require.resolve('winser-with-api')), './bin/nssm64.exe'))
    reporter.compilation.resourceInTemp('WinRun.exe', path.join(path.dirname(require.resolve('silent-spawn')), './WinRun.exe'))
  }

  reporter.cli = {
    findCommandsInExtensions: async () => {
      const extensionsCommands = await detectAndRegisterExtensionsCommands(
        reporter.extensionsManager.extensions,
        { registerCommand: () => {} }
      )

      return extensionsCommands
    }
  }

  // only require commander and register route when the process was started from keep alive
  if (process.env.JSREPORT_CLI_DAEMON_PROCESS) {
    const Commander = require('./commander')

    reporter.on('express-configure', (app) => {
      app.post('/api/cli/render-keep-alive', async (req, res) => {
        try {
          const { cwd, args } = req.body

          const commander = Commander(cwd)

          const { error, logs } = await commander.startAndWait(args)

          const respBody = {}

          if (error) {
            respBody.message = error.message
            respBody.stack = error.stack
          }

          respBody.logs = logs

          res.status(error == null ? 200 : 400).json(respBody)
        } catch (e) {
          res.status(500).json({
            message: `Error while executing commander. ${e.message}`,
            stack: e.stack,
            logs: []
          })
        }
      })
    })
  }
}

module.exports.tempResources = ['nssm.exe', 'nssm64.exe', 'WinRun.exe']
