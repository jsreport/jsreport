const path = require('path')
const fs = require('fs')
const initializeApp = require('./_initializeApp')

const description = 'Initializes the current working directory to start a jsreport application (server.js, *.config.json and package.json)'
const command = 'init'
const positionalArgs = '[versionToInstall]'

exports.command = `${command} ${positionalArgs}`
exports.description = description

exports.builder = (yargs) => {
  const examples = getExamples(`jsreport ${command}`)

  examples.forEach((examp) => {
    yargs.example(examp[0], examp[1])
  })

  const commandOptions = {
    target: {
      alias: 't',
      description: 'Target path in which the init is going to execute',
      type: 'string'
    }
  }

  const options = Object.keys(commandOptions)

  return (
    yargs
      .usage(
        [
          `${description}\n`,
          `Usage:\n\njsreport ${command} [versionToInstall]\n`,
          'If no jsreport installation was found we will try to install the version of',
          'jsreport specified in `versionToInstall` and if it is not specified we will try to install the latest version'
        ].join('\n')
      )
      .positional('versionToInstall', {
        type: 'string',
        description: 'Specific jsreport version to install'
      })
      .group(options, 'Command options:')
      .options(commandOptions)
  )
}

exports.handler = (argv) => {
  const logger = argv.context.logger
  let cwd = argv.context.cwd
  let versionToInstall

  if (argv && argv.versionToInstall != null) {
    versionToInstall = argv.versionToInstall
  }

  if (argv.target != null) {
    cwd = path.resolve(cwd, argv.target)
    fs.mkdirSync(cwd, { recursive: true })
  }

  return initializeApp(
    cwd,
    logger,
    false,
    versionToInstall,
    typeof argv.context.customInstall === 'function' ? argv.context.customInstall : undefined
  )
}

function getExamples (command) {
  return [
    [`${command}`, 'Initializes and install the latest jsreport'],
    [`${command} 2.5.0`, 'Initializes and install jsreport version 2.5.0']
  ]
}
