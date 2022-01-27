const initializeApp = require('./_initializeApp')

const description = 'Repairs current working directory to start a jsreport application (It re-creates files server.js, *.config.json and package.json)'
const command = 'repair'
const positionalArgs = '[versionToInstall]'

exports.command = `${command} ${positionalArgs}`
exports.description = description

exports.builder = (yargs) => {
  const examples = getExamples(`jsreport ${command}`)

  examples.forEach((examp) => {
    yargs.example(examp[0], examp[1])
  })

  return (
    yargs
      .usage([
        `${description}\n`,
        `Usage:\n\njsreport ${command} [versionToInstall]\n`,
        'If no jsreport installation was found we will try to install the version of',
        'jsreport specified in `versionToInstall` and if it is not specified we will try to install the latest version'
      ].join('\n'))
      .positional('versionToInstall', {
        type: 'string',
        description: 'Specific jsreport version to install'
      })
  )
}

exports.handler = (argv) => {
  const logger = argv.context.logger
  const cwd = argv.context.cwd
  let versionToInstall

  if (argv && argv.versionToInstall != null) {
    versionToInstall = argv.versionToInstall
  }

  return initializeApp(
    cwd,
    logger,
    true,
    versionToInstall,
    typeof argv.context.customInstall === 'function' ? argv.context.customInstall : undefined
  )
}

function getExamples (command) {
  return [
    [`${command}`, 'Repairs and install the latest jsreport if not found'],
    [`${command} 2.5.0`, 'Repairs and install jsreport version 2.5.0 if not found']
  ]
}
