
module.exports = function getCommandEventName (command, event) {
  return `command.${command}.${event}`
}
