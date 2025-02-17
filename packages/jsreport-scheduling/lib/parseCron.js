const { CronExpressionParser } = require('cron-parser')

const cronPlaceholderRegExp = /^([^\s]+[\s]+)([^\s]+[\s]+)([^\s]+[\s]+)([^\s]+[\s]+)([^\s]+[\s]*)([^\s]+[\s]*)?$/

module.exports = function (cron, options = {}) {
  if (!cronPlaceholderRegExp.test(cron)) {
    throw new Error('Cron expression should have only 5 or 6 parts')
  }

  return CronExpressionParser.parse(cron, options)
}
