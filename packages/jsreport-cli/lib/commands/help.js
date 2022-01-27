const cliui = require('cliui')
const chalk = require('chalk')
const omit = require('lodash.omit')

const description = 'Prints information about a command or topic'
const command = 'help'
const positionalArgs = '[commandOrTopic]'

exports.command = `${command} ${positionalArgs}`
exports.description = description

function getExamples (command) {
  return [
    [`${command} render`, 'Print information about the render command'],
    [`${command} start`, 'Print information about the start command'],
    [`${command} config`, 'Print information about jsreport configuration input format']
  ]
}

exports.builder = (yargs) => {
  const examples = getExamples(`jsreport ${command}`)

  examples.forEach((examp) => {
    yargs.example(examp[0], examp[1])
  })

  return (
    yargs
      .usage([
        `${description}\n`,
        `Usage:\n\njsreport ${command} <commandOrTopic>\n`,
        'Topics Available:\n',
        'config -> print details about the configuration shape and types that the current jsreport instance in project supports\n'
      ].join('\n'))
      // we just define positional argument here to describe it for help usage,
      // but in order to have the property "argv.commandOrTopic" with sanitized value we will need to put the
      // positional argument in the command string too, however in this case we can't do that because
      // the help command has some conflicts with the yargs.help()
      .positional('commandOrTopic', {
        type: 'string',
        description: 'Command or Topic to get help usage'
      })
      // we need to handle the help option directly since there is a conflict
      // in yargs when a custom command is called the same that the option used in .help()
      // (that option registers an implicit command with the same name that the option passed)
      .option('help', {
        global: true,
        alias: 'h',
        description: 'Show Help',
        type: 'boolean'
      })
      .check((argv, hash) => {
        if (argv && argv.help) {
          return true
        }

        if (!argv || !argv.commandOrTopic) {
          throw new Error('"commandOrTopic" argument is required')
        }

        return true
      })
  )
}

exports.handler = async (argv) => {
  const context = argv.context
  const cwd = context.cwd
  const logger = context.logger
  const getInstance = context.getInstance
  const initInstance = context.initInstance
  let commandOrTopic = argv.commandOrTopic
  let helpResult

  const getCommandHelp = context.getCommandHelp

  if (argv.help) {
    commandOrTopic = 'help'
  }

  if (commandOrTopic === 'config') {
    logger.debug(`searching information about "${commandOrTopic}" as topic`)

    let jsreportInstance

    try {
      let _instance

      // look up for an instance in CWD
      try {
        _instance = await getInstance(cwd)
      } catch (e) {
        const error = new Error('Couldn\'t find a jsreport installation necessary to check the configuration options')

        error.originalError = e

        throw error
      }

      logger.debug('disabling express extension..')

      if (typeof _instance === 'function') {
        jsreportInstance = _instance()
      } else {
        jsreportInstance = _instance
      }

      jsreportInstance.options = jsreportInstance.options || {}
      jsreportInstance.options.extensions = jsreportInstance.options.extensions || {}
      jsreportInstance.options.extensions.express = Object.assign(
        {},
        jsreportInstance.options.extensions.express,
        { start: false }
      )

      await initInstance(jsreportInstance)
    } catch (e) {
      return onCriticalError(e)
    }

    try {
      helpResult = schemaToConfigFormat(jsreportInstance, jsreportInstance.optionsValidator.getRootSchema())
    } catch (e) {
      return onCriticalError(e)
    }
  } else {
    logger.debug(`searching information about "${commandOrTopic}" as command`)

    try {
      helpResult = await getCommandHelp(commandOrTopic, context)
    } catch (e) {
      if (e.notFound !== true) {
        return onCriticalError(e)
      }
    }

    if (helpResult != null && typeof helpResult === 'string') {
      helpResult = { output: helpResult }
    }
  }

  if (!helpResult) {
    return logger.info(`no information found for command or topic "${commandOrTopic}", to get the list of commands supported on your installation run "jsreport -h" and try again with a supported command or topic`)
  }

  logger.info(helpResult.output)

  return helpResult
}

function onCriticalError (err) {
  const error = new Error(`A critical error occurred while trying to execute the ${command} command`)
  error.originalError = err
  throw error
}

function schemaToConfigFormat (instance, rootSchema) {
  const rawUI = cliui()
  const outputUI = cliui()

  function convert (ui, addStyles = true) {
    try {
      ui.div({
        text: 'Configuration format description for local jsreport instance:',
        padding: [0, 0, 1, 0]
      })

      ui.div('{')

      printProperties(ui, rootSchema.properties, {
        defaults: instance.defaults,
        required: rootSchema.required,
        addStyles
      })

      ui.div('}')

      return ui.toString()
    } catch (e) {
      e.message = `A problem happened while trying to convert schema to help description. ${e.message}`
      throw e
    }
  }

  const results = {}
  const toConvert = [rawUI, outputUI]

  toConvert.forEach((ui, idx) => {
    if (idx === 0) {
      results.raw = convert(ui, false)
    } else {
      results.output = convert(ui)
    }
  })

  return results
}

function printProperties (ui, props, {
  required = [],
  defaults,
  level = 1,
  printRestProps = false,
  addStyles = true
}) {
  const baseLeftPadding = level === 1 ? 2 : 3

  const knowProps = [
    'type', 'required', 'properties', 'items', 'not', 'anyOf', 'allOf', 'oneOf',
    'default', 'defaultNotInitialized', 'enum', 'format', 'pattern',
    'description', 'title', '$jsreport-constantOrArray'
  ]

  if (props == null) {
    return
  }

  let bold

  if (addStyles) {
    bold = chalk.bold
  } else {
    bold = (i) => i
  }

  const propsKeys = Array.isArray(props) ? props : Object.keys(props)
  const totalKeys = propsKeys.length

  propsKeys.forEach((key, index) => {
    const isLastKey = index === totalKeys - 1
    let propName
    let schema
    let customCase
    let defaultToUse
    let shouldStringifyDefault = true
    let isRequired = false

    if (Array.isArray(key)) {
      propName = key[0]
      schema = key[1]
    } else {
      propName = key
      schema = props[propName]
    }

    let shouldAddTopPadding = true

    if (index === 0 && level === 1) {
      shouldAddTopPadding = false
    }

    const getPadding = (l) => {
      return [shouldAddTopPadding ? 1 : 0, 0, 0, l * baseLeftPadding]
    }

    const content = {
      padding: getPadding(level)
    }

    if (propName !== '') {
      content.text = `"${bold(propName)}":`
    } else {
      content.text = '-'
    }

    if (propName !== '' && required.indexOf(propName) !== -1) {
      isRequired = true
    }

    if (schema.type) {
      let type = schema.type

      if (Array.isArray(type)) {
        type = type.join(' | ')
      } else if (type === 'array' && schema.items && schema.items.type) {
        type = Array.isArray(schema.items.type) ? schema.items.type.join(' | ') : schema.items.type
        type = `array<${type}>`
      }

      content.text += ` <${bold(type)}>`
    } else {
      if (schema.not != null && typeof schema.not === 'object') {
        content.text += ` <${bold('any type that is not valid against the description below')}>`
        customCase = 'not'
      } else if (Array.isArray(schema.anyOf)) {
        content.text += ` <${bold('any type that is valid against at least with one of the descriptions below')}>`
        customCase = 'anyOf'
      } else if (Array.isArray(schema.allOf)) {
        content.text += ` <${bold('any type that is valid against all the descriptions below')}>`
        customCase = 'allOf'
      } else if (Array.isArray(schema.oneOf)) {
        content.text += ` <${bold('any type that is valid against just one of the descriptions below')}>`
        customCase = 'oneOf'
      } else if (schema.description != null) {
        content.text += ` <${bold('any')}>`
      } else {
        // only schemas structures that are not implemented gets printed in raw form,
        // this means that we should analize the raw schema printed and then support it
        content.text += ` <raw schema: ${JSON.stringify(schema)}>`
      }
    }

    if (isRequired) {
      content.text += ` (${bold('required')})`
    }

    if (
      defaults &&
      typeof defaults === 'object' &&
      defaults[propName] !== undefined &&
      (
        typeof defaults[propName] === 'string' ||
        typeof defaults[propName] === 'boolean' ||
        typeof defaults[propName] === 'number' ||
        defaults[propName] === null
      )
    ) {
      defaultToUse = defaults[propName]
    } else if (schema.default !== undefined) {
      defaultToUse = schema.default
    } else if (schema.defaultNotInitialized !== undefined) {
      defaultToUse = schema.defaultNotInitialized

      if (typeof defaultToUse === 'string' && /^<.*>$/.test(defaultToUse)) {
        shouldStringifyDefault = false
      }
    }

    if (defaultToUse !== undefined) {
      if (shouldStringifyDefault) {
        content.text += ` (default: ${bold(JSON.stringify(defaultToUse))})`
      } else {
        content.text += ` (default: ${bold(defaultToUse)})`
      }
    }

    let allowed

    if (schema.enum != null) {
      allowed = schema.enum
    } else if (schema.type === 'string' && schema['$jsreport-constantOrArray'] != null) {
      allowed = schema['$jsreport-constantOrArray']
    }

    if (Array.isArray(allowed) && allowed.length > 0) {
      content.text += ` (allowed values: ${bold(allowed.map((value) => {
        return JSON.stringify(value)
      }).join(', '))})`
    }

    if (
      typeof schema.type === 'string' ||
      (Array.isArray(schema.type) && schema.type.indexOf('string') !== -1)
    ) {
      if (schema.format != null) {
        content.text += ` (format: ${schema.format})`
      }

      if (schema.pattern != null) {
        content.text += ` (pattern: ${schema.pattern})`
      }
    }

    if (printRestProps) {
      const restProps = omit(schema, knowProps)

      if (restProps && Object.keys(restProps).length > 0) {
        content.text += ` (raw schema: ${JSON.stringify(restProps)})`
      }
    }

    if (schema.description != null) {
      content.text += ` -> ${schema.description}`
    }

    if (
      schema.type === 'object' &&
      schema.properties != null &&
      Object.keys(schema.properties).length > 0
    ) {
      content.text += ' {'
    } else if (
      schema.type === 'array' &&
      (Array.isArray(schema.items) ||
      (schema.items &&
      schema.items.type &&
      schema.items.type === 'object' &&
      schema.items.properties != null &&
      Object.keys(schema.items.properties).length > 0))
    ) {
      content.text += ' ['
    } else if (!isLastKey && propName !== '') {
      content.text += ','
    }

    ui.div(content)

    if (customCase != null) {
      if (customCase === 'not') {
        printProperties(ui, [['', schema.not]], { level: level + 1 })
      } else if (
        (customCase === 'anyOf' ||
        customCase === 'allOf' ||
        customCase === 'oneOf') &&
        Array.isArray(schema[customCase]) &&
        schema[customCase].length > 0
      ) {
        printProperties(ui, schema[customCase].map((s) => {
          return ['', s]
        }), { level: level + 1, printRestProps: true })
      }
    } else if (
      schema.type === 'object' &&
      schema.properties != null &&
      Object.keys(schema.properties).length > 0
    ) {
      const hasDefault = (
        defaults &&
        typeof defaults === 'object' &&
        typeof defaults[propName] === 'object'
      )

      printProperties(ui, schema.properties, {
        level: level + 1,
        required: schema.required,
        defaults: hasDefault ? defaults[propName] : undefined
      })

      ui.div({ text: `}${!isLastKey ? ',' : ''}`, padding: content.padding })
    } else if (
      schema.type === 'array' &&
      schema.items &&
      schema.items.type === 'object' &&
      schema.items.properties != null &&
      Object.keys(schema.items.properties).length > 0
    ) {
      ui.div({ text: '{', padding: getPadding(level + 1) })

      printProperties(ui, schema.items.properties, {
        level: level + 2,
        required: schema.items.required
      })

      ui.div({ text: '}', padding: getPadding(level + 1) })
      ui.div({ text: `]${!isLastKey ? ',' : ''}`, padding: content.padding })
    } else if (schema.type === 'array' && Array.isArray(schema.items)) {
      printProperties(ui, schema.items.map((s, idx) => {
        return [`item at ${idx} index should be`, s]
      }), { level: level + 1 })
      ui.div({ text: `]${!isLastKey ? ',' : ''}`, padding: content.padding })
    }
  })
}
