const path = require('path')
const fs = require('fs')
const { nanoid } = require('nanoid')
const inquirer = require('inquirer')

const description = 'Generates a jsreport configuration file (*.config.json) based on some questions'
const command = 'configure'

exports.command = command
exports.description = description

exports.builder = (yargs) => {
  const commandOptions = {
    print: {
      alias: 't',
      description: 'Print the generated configuration to the console instead to save it to a file',
      type: 'boolean'
    }
  }

  const options = Object.keys(commandOptions)

  return (
    yargs
      .group(options, 'Command options:')
      .options(commandOptions)
  )
}

exports.handler = async (argv) => {
  const shouldJustPrint = argv.print
  const context = argv.context
  const cwd = context.cwd
  const logger = context.logger
  const localConfigPath = path.join(cwd, 'jsreport.config.json')

  let answers

  if (argv.context.answers != null && typeof argv.context.answers === 'object') {
    logger.debug('questions already answered..')

    // just useful for testing
    answers = argv.context.answers
  } else {
    logger.debug('starting with questions..')

    const questions = [
      {
        type: 'input',
        name: 'serverPort',
        message: 'Specify the http port for web server:',
        default: 5488,
        validate: (input) => {
          const valid = !isNaN(parseInt(input, 10))

          if (valid) {
            return true
          }

          return 'port must be a valid number'
        },
        filter: (input) => {
          return parseInt(input, 10)
        }
      },
      {
        type: 'confirm',
        name: 'serverAuthEnabled',
        message: 'Do you want to enable authentication in web server?',
        default: false
      },
      {
        type: 'input',
        name: 'serverAuthUsername',
        message: 'Specify the admin username to use in web server authentication:',
        default: 'admin',
        when: (answers) => {
          return answers.serverAuthEnabled
        }
      },
      {
        type: 'password',
        name: 'serverAuthPassword',
        message: 'Specify the admin password to use in web server authentication:',
        validate: (input) => {
          const valid = (String(input) !== '')

          if (valid) {
            return true
          }

          return 'password can\'t be empty'
        },
        when: (answers) => {
          return answers.serverAuthEnabled
        }
      },
      {
        type: 'input',
        name: 'serverAuthCookieSecret',
        message: 'Specify a secret text for the authentication cookie session:',
        default: () => {
          return nanoid(16)
        },
        validate: (input) => {
          if (input.length > 0) {
            return true
          }

          return 'secret must be not empty'
        },
        when: (answers) => {
          return answers.serverAuthEnabled
        }
      },
      {
        type: 'confirm',
        name: 'trustUserCode',
        message: 'Do you trust the user code and want to disable sandboxing? (sandboxing slightly degrades performance but adds security when running external code)',
        default: false
      },
      {
        type: 'input',
        name: 'reportTimeout',
        message: (answers) => {
          return 'Specify the general timeout for rendering:'
        },
        default: 60000,
        validate: (input) => {
          const valid = !isNaN(parseInt(input, 10))

          if (valid) {
            return true
          }

          return 'reportTimeout must be a valid number'
        },
        filter: (input) => {
          return parseInt(input, 10)
        }
      },
      {
        type: 'confirm',
        name: 'createExamples',
        message: 'Would you like that we create some default examples for you?',
        default: true
      }
    ]

    answers = await inquirer.prompt(questions)
  }

  const extensionsConf = {}
  const config = {}

  logger.debug('finishing with questions..')
  logger.debug('answers:')
  logger.debug(JSON.stringify(answers, null, 2))

  config.httpPort = answers.serverPort

  if (answers.serverAuthEnabled) {
    extensionsConf.authentication = {
      cookieSession: {
        secret: answers.serverAuthCookieSecret
      },
      admin: {
        username: answers.serverAuthUsername,
        password: answers.serverAuthPassword
      },
      enabled: true
    }
  } else {
    extensionsConf.authentication = {
      cookieSession: {},
      admin: {
        username: 'admin',
        password: 'password'
      },
      enabled: false
    }
  }

  config.store = {
    provider: 'fs'
  }

  config.blobStorage = {
    provider: 'fs'
  }

  config.logger = {
    console: { transport: 'console', level: 'debug' },
    file: { transport: 'file', level: 'info', filename: 'logs/reporter.log' },
    error: { transport: 'file', level: 'error', filename: 'logs/error.log' }
  }

  config.trustUserCode = answers.trustUserCode === true

  if (answers.createExamples) {
    extensionsConf['sample-template'] = {
      createSamples: true
    }
  }

  config.reportTimeout = answers.reportTimeout

  config.workers = {
    numberOfWorkers: 2
  }

  config.extensions = extensionsConf

  if (shouldJustPrint) {
    logger.info('generated config:')
    logger.info(JSON.stringify(config, null, 2))
  } else {
    logger.debug('generated config:')
    logger.debug(JSON.stringify(config, null, 2))
  }

  if (shouldJustPrint) {
    return {
      config: config
    }
  }

  const configFile = localConfigPath

  fs.writeFileSync(configFile, JSON.stringify(config, null, 2))

  logger.info('config saved in:', configFile)

  return {
    config: config,
    filePath: configFile
  }
}
