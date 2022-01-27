const getCommandEventName = require('./getCommandEventName')

module.exports = async function executeCommand (commander, commandName, argv) {
  const command = commander._commands[commandName]

  if (!command) {
    throw new Error(`"${commandName}" command is not a valid command`)
  }

  if (typeof command.handler !== 'function') {
    throw new Error(`"${commandName}" command doesn't have a valid handler`)
  }

  const commandHandler = command.handler

  commander.emit('command.init', commandName, argv)
  commander.emit(getCommandEventName(commandName, 'init'), argv)

  let resolveValue

  try {
    resolveValue = await commandHandler(argv)

    commander.emit('command.success', commandName, resolveValue)
    commander.emit(getCommandEventName(commandName, 'success'), resolveValue)

    return resolveValue
  } catch (errorInCommand) {
    commander.emit('command.error', commandName, errorInCommand)
    commander.emit(getCommandEventName(commandName, 'error'), errorInCommand)
    // propagating error
    throw errorInCommand
  } finally {
    commander.emit('command.finish', commandName)
    commander.emit(getCommandEventName(commandName, 'finish'))
  }
}
