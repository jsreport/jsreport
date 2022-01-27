const getCommandEventName = require('./getCommandEventName')

// wrapping builder to allow some customizations in the api for commands
module.exports = (commander, {
  commandName,
  commandDescription,
  commandBuilder,
  commandConfig,
  globalOptions
}) => (yargs) => {
  let shouldGenerateUsage = true
  let originalUsageFn
  let originalCheckFn
  let originalOptionFn
  let originalOptionsFn
  let commandCheckFn

  if (typeof yargs.usage === 'function') {
    originalUsageFn = yargs.usage

    // we expose .usage but just for the message case
    yargs.usage = (msg) => {
      shouldGenerateUsage = false
      return originalUsageFn.apply(yargs, [msg])
    }
  }

  if (typeof yargs.check === 'function') {
    originalCheckFn = yargs.check

    yargs.check = (fn) => {
      commandCheckFn = fn
      return yargs
    }
  }

  if (typeof yargs.option === 'function') {
    originalOptionFn = yargs.option

    // default options to be global: false
    yargs.option = (key, opt) => {
      if (opt && opt.global == null) {
        opt.global = false
      }

      return originalOptionFn.apply(yargs, [key, opt])
    }
  }

  if (typeof yargs.options === 'function') {
    originalOptionsFn = yargs.options

    // default options to be global: false
    yargs.options = (keyOrOpts, opt) => {
      if (keyOrOpts && opt == null) {
        Object.entries(keyOrOpts).forEach(([key, keyConf]) => {
          if (keyConf && keyConf.global == null) {
            keyConf.global = false
          }
        })
      }

      if (opt && opt.global == null) {
        opt.global = false
      }

      return originalOptionFn.apply(yargs, [keyOrOpts, opt])
    }
  }

  const modYargs = commandBuilder(yargs)

  if (typeof yargs.usage === 'function') {
    yargs.usage = originalUsageFn
    modYargs.usage = originalUsageFn

    if (shouldGenerateUsage) {
      modYargs.usage(commandDescription + '\n\nUsage:\n\njsreport ' + commandName)
    }
  }

  if (typeof yargs.check === 'function') {
    yargs.check = originalCheckFn
    modYargs.check = originalCheckFn
  }

  if (typeof yargs.option === 'function') {
    yargs.option = originalOptionFn
    modYargs.option = originalOptionFn
  }

  if (typeof yargs.options === 'function') {
    yargs.options = originalOptionsFn
    modYargs.options = originalOptionsFn
  }

  modYargs.check((...args) => {
    const argv = args[0]

    const unsupportedGlobalOptions = globalOptions.options.filter((opt) => {
      return commandConfig.globalOptions.indexOf(opt) === -1
    })

    unsupportedGlobalOptions.forEach((opt) => {
      if (argv[opt]) {
        throw new Error(opt + ' global option is not supported in this command')
      }
    })

    if (commandCheckFn) {
      return commandCheckFn.apply(undefined, args)
    }

    return true
  }, false)

  if (typeof modYargs.fail === 'function') {
    // making command strict and registering a generalized fail function
    modYargs.fail((msg, err) => {
      // do nothing when error comes from command promise itself,
      // the propagation of error will be done automatically by promise chain
      if (msg == null) {
        return
      }

      let errForEvent = err

      if (errForEvent == null) {
        errForEvent = new Error(msg)
      }

      commander.emit('command.error', commandName, errForEvent)
      commander.emit(getCommandEventName(commandName, 'error'), errForEvent)

      const defaultErr = new Error(`${commandName} command error:\n${msg}\ntype jsreport ${commandName} -h to get help about usage and available options`)

      defaultErr.cleanState = true

      throw defaultErr
    })
  }

  if (commandConfig.disableStrictOptions !== true) {
    modYargs.strict()
  } else {
    modYargs.strict(false)
  }

  return modYargs
}
